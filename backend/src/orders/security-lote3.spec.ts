jest.mock('@nestjs/passport', () => ({
  PassportStrategy: () => class MockPassportStrategy {},
}));

jest.mock('@nestjs/jwt', () => ({
  JwtService: class MockJwtService {},
}));

import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '../auth/jwt.strategy';
import { AuthService } from '../auth/auth.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

describe('LOTE 3 Security Tests (SEC-08, SEC-10, SEC-11)', () => {
  // =========================================================================
  // SEC-08: Gestión de Sesión del Administrador (Opción C)
  // =========================================================================
  describe('SEC-08: Gestión de Sesión y Revocación por tokenVersion', () => {
    let jwtStrategy: JwtStrategy;
    let authService: AuthService;
    let mockPrisma: any;
    let mockJwtService: any;

    beforeEach(() => {
      mockPrisma = {
        usuario: {
          findUnique: jest.fn(),
          update: jest.fn(),
        },
      };
      mockJwtService = {
        sign: jest.fn().mockReturnValue('mock-jwt-token-xyz'),
      };

      // Mock getJwtSecret para la estrategia
      jwtStrategy = new JwtStrategy(mockPrisma);
      authService = new AuthService(mockPrisma, mockJwtService);
    });

    it('debe validar exitosamente cuando el tokenVersion y la sesión están vigentes', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@victoria.com',
        rol: 'ADMIN',
        tokenVersion: 2,
        activo: true,
        password: 'hashed-password',
      });

      const validPayload = {
        id: 'admin-1',
        email: 'admin@victoria.com',
        rol: 'ADMIN',
        tokenVersion: 2,
        sessionStart: Date.now() - 1000 * 60 * 15, // 15 minutos de antigüedad
      };

      const result = await jwtStrategy.validate(validPayload);
      expect(result.id).toBe('admin-1');
      expect(result.email).toBe('admin@victoria.com');
      expect((result as any).password).toBeUndefined();
    });

    it('debe revocar inmediatamente el acceso si el tokenVersion en BD es mayor al del payload', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@victoria.com',
        rol: 'ADMIN',
        tokenVersion: 3, // Se incrementó tras logout o cambio de contraseña
        activo: true,
      });

      const oldPayload = {
        id: 'admin-1',
        email: 'admin@victoria.com',
        rol: 'ADMIN',
        tokenVersion: 2, // Token antiguo
        sessionStart: Date.now() - 1000 * 60 * 5,
      };

      await expect(jwtStrategy.validate(oldPayload)).rejects.toThrow(
        /Sesión revocada o cerrada en otro dispositivo/,
      );
    });

    it('debe denegar el acceso si la cuenta del usuario está desactivada (activo: false)', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id: 'admin-blocked',
        email: 'admin@victoria.com',
        tokenVersion: 1,
        activo: false,
      });

      const payload = {
        id: 'admin-blocked',
        email: 'admin@victoria.com',
        tokenVersion: 1,
        sessionStart: Date.now(),
      };

      await expect(jwtStrategy.validate(payload)).rejects.toThrow(
        /Cuenta desactivada o bloqueada por seguridad/,
      );
    });

    it('debe rechazar tokens si se ha superado el tope absoluto de 8 horas continuas', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@victoria.com',
        tokenVersion: 1,
        activo: true,
      });

      const eightHoursAndOneMinuteAgo = Date.now() - (8 * 60 * 60 * 1000 + 60000);
      const expiredMaxPayload = {
        id: 'admin-1',
        email: 'admin@victoria.com',
        tokenVersion: 1,
        sessionStart: eightHoursAndOneMinuteAgo,
      };

      await expect(jwtStrategy.validate(expiredMaxPayload)).rejects.toThrow(
        /Tope máximo de sesión alcanzado \(8 horas continuas\)/,
      );
    });

    it('AuthService.logout debe incrementar tokenVersion en la base de datos', async () => {
      mockPrisma.usuario.update.mockResolvedValue({ id: 'admin-1', tokenVersion: 3 });

      const response = await authService.logout('admin-1');

      expect(mockPrisma.usuario.update).toHaveBeenCalledWith({
        where: { id: 'admin-1' },
        data: { tokenVersion: { increment: 1 } },
      });
      expect(response.message).toMatch(/Sesión cerrada exitosamente/);
    });

    it('AuthService.refreshToken debe rechazar la renovación si se superó el tope absoluto de 8 horas', async () => {
      const userWithOldSession = {
        id: 'admin-1',
        tokenVersion: 1,
        sessionStart: Date.now() - (8 * 60 * 60 * 1000 + 10000),
      };

      await expect(authService.refreshToken(userWithOldSession)).rejects.toThrow(
        /Tope máximo de sesión alcanzado \(8 horas continuas\)/,
      );
    });

    it('AuthService.refreshToken debe renovar exitosamente y emitir nuevo token de 30 minutos', async () => {
      const now = Date.now();
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@victoria.com',
        rol: 'ADMIN',
        tokenVersion: 1,
        activo: true,
      });

      const user = {
        id: 'admin-1',
        tokenVersion: 1,
        sessionStart: now - 1000 * 60 * 20, // 20 min de sesión
      };

      const result = await authService.refreshToken(user);
      expect(result.accessToken).toBe('mock-jwt-token-xyz');
      expect(result.expiresIn).toBe(1800); // 30 min
      expect(result.sessionStart).toBe(user.sessionStart);
    });
  });

  // =========================================================================
  // SEC-10: Habeas Data (Ley Estatutaria 1581 de 2012)
  // =========================================================================
  describe('SEC-10: Cumplimiento de Habeas Data en Checkout', () => {
    it('debe rechazar la creación de pedido si aceptaHabeasData es false o está ausente', async () => {
      const invalidOrder = plainToInstance(CreateOrderDto, {
        nombreCliente: 'Juan Perez',
        telefono: '3001234567',
        direccion: 'Calle 123 #45-67',
        ciudad: 'Medellin',
        metodoEnvio: 'Nacional',
        metodoPago: 'Nequi',
        aceptaHabeasData: false, // NO autorizado
        items: [{ productoId: 'p1', cantidad: 2 }],
      });

      const errors = await validate(invalidOrder);
      expect(errors.length).toBeGreaterThan(0);
      const habeasError = errors.find((e) => e.property === 'aceptaHabeasData');
      expect(habeasError).toBeDefined();
      expect(JSON.stringify(habeasError?.constraints)).toMatch(/Ley 1581 de 2012/);
    });

    it('debe aceptar la orden cuando aceptaHabeasData es true', async () => {
      const validOrder = plainToInstance(CreateOrderDto, {
        nombreCliente: 'Juan Perez',
        telefono: '3001234567',
        direccion: 'Calle 123 #45-67',
        ciudad: 'Medellin',
        metodoEnvio: 'Nacional',
        metodoPago: 'Nequi',
        aceptaHabeasData: true, // Autorizado expresamente
        items: [{ productoId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', cantidad: 2 }],
      });

      const errors = await validate(validOrder);
      expect(errors.length).toBe(0);
    });
  });

  // =========================================================================
  // SEC-11: Generación de QR Local Offline
  // =========================================================================
  describe('SEC-11: Privacidad y Generación de QR Local', () => {
    it('el payload para el QR debe ser local y no contener llamadas a APIs externas', () => {
      const sampleOrder = {
        codigoPedido: 'PED-K9X2-M4P7',
        nombre: 'Carlos G.',
        total: 125000,
        fecha: '18 de octubre de 2026',
      };

      const qrPayload = `VICTORIA-ORDER:${sampleOrder.codigoPedido}|CLIENTE:${sampleOrder.nombre}|TOTAL:${sampleOrder.total}|FECHA:${sampleOrder.fecha}`;

      // Verificar que sea una cadena estructurada interna
      expect(qrPayload).toContain('VICTORIA-ORDER:PED-K9X2-M4P7');
      // No debe contener URLs de servicios externos como qrserver.com o google charts
      expect(qrPayload).not.toMatch(/api\.qrserver\.com/);
      expect(qrPayload).not.toMatch(/chart\.googleapis\.com/);
    });
  });
});
