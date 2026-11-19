import { getJwtSecret } from '../auth/jwt.config';
import { generateSecureOrderCode, OrdersService } from './orders.service';
import { NotFoundException } from '@nestjs/common';

describe('LOTE 1 Security Tests (SEC-01, SEC-02, SEC-03, SEC-12)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('SEC-03: JWT Secret Validation', () => {
    it('debe lanzar error crítico si JWT_SECRET no existe', () => {
      delete process.env.JWT_SECRET;
      expect(() => getJwtSecret()).toThrow(
        /FATAL ERROR DE SEGURIDAD: La variable de entorno JWT_SECRET es obligatoria/
      );
    });

    it('debe lanzar error crítico si JWT_SECRET tiene menos de 32 caracteres', () => {
      process.env.JWT_SECRET = 'clave-corta-insegura-123';
      expect(() => getJwtSecret()).toThrow(
        /al menos 32 caracteres/
      );
    });

    it('debe aceptar y retornar un JWT_SECRET válido de al menos 32 caracteres', () => {
      process.env.JWT_SECRET = 'secreto_super_seguro_de_alta_entropia_victoria_2026';
      expect(getJwtSecret()).toBe('secreto_super_seguro_de_alta_entropia_victoria_2026');
    });
  });

  describe('SEC-12: Generación Segura de Código de Pedido', () => {
    it('debe generar códigos con formato PED-XXXX-XXXX sin caracteres ambiguos (0, O, 1, I, L)', () => {
      const regex = /^PED-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;
      const ambiguousRegex = /[0O1IL]/;

      for (let i = 0; i < 50; i++) {
        const code = generateSecureOrderCode();
        expect(code).toMatch(regex);
        expect(ambiguousRegex.test(code)).toBe(false);
      }
    });

    it('debe generar códigos únicos con alta entropía', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        codes.add(generateSecureOrderCode());
      }
      expect(codes.size).toBe(1000);
    });
  });

  describe('SEC-02: Rastreo de Pedidos Seguro y Anti-Enumeración', () => {
    let mockPrisma: any;
    let ordersService: OrdersService;

    beforeEach(() => {
      mockPrisma = {
        pedido: {
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
        },
      };
      ordersService = new OrdersService(mockPrisma);
    });

    it('debe rechazar consultas con subcadenas ("3", "300", "PED", "PED-") con 404 genérico', async () => {
      const invalidQueries = [
        { cod: '3', tel: '' },
        { cod: '300', tel: '' },
        { cod: 'PED', tel: '' },
        { cod: 'PED-', tel: '' },
        { cod: 'PED-K9X2-M4P7', tel: '300' }, // teléfono incompleto
      ];

      for (const q of invalidQueries) {
        await expect(ordersService.trackOrder(q.cod, q.tel)).rejects.toThrow(
          NotFoundException
        );
        await expect(ordersService.trackOrder(q.cod, q.tel)).rejects.toThrow(
          'No encontramos un pedido con esos datos'
        );
      }
    });

    it('debe rechazar con 404 genérico si el código existe pero el teléfono no coincide', async () => {
      mockPrisma.pedido.findFirst.mockResolvedValue({
        id: 'uuid-1',
        codigo: 'PED-K9X2-M4P7',
        telefono: '3235087561',
        nombreCliente: 'Carlos Rodríguez',
        direccion: 'Calle 100 # 20-30',
        ciudad: 'Bogotá',
        metodoEnvio: 'Nacional',
        metodoPago: 'Nequi',
        total: 50000,
        comprobantePago: '/uploads/comprobantes/secret.webp',
        detalles: [],
      });

      // Teléfono incorrecto
      await expect(
        ordersService.trackOrder('PED-K9X2-M4P7', '3109999999')
      ).rejects.toThrow('No encontramos un pedido con esos datos');
    });

    it('debe devolver pedido con PII enmascarada y sin URL de comprobante cuando código y teléfono coinciden', async () => {
      mockPrisma.pedido.findFirst.mockResolvedValue({
        id: 'uuid-1',
        codigo: 'PED-K9X2-M4P7',
        telefono: '3235087561',
        nombreCliente: 'Carlos Alberto Rodríguez',
        direccion: 'Calle 100 # 20-30',
        ciudad: 'Bogotá',
        metodoEnvio: 'Nacional',
        metodoPago: 'Nequi',
        total: 50000,
        comprobantePago: '/uploads/comprobantes/privado-secreto.webp',
        detalles: [],
      });

      const result = await ordersService.trackOrder('PED-K9X2-M4P7', '573235087561');

      // Nombre enmascarado
      expect(result.nombreCliente).toBe('Carlos A.');
      // Teléfono enmascarado (solo últimos 2 dígitos)
      expect(result.telefono).toBe('******61');
      // Dirección sin números específicos
      expect(result.direccion).toBe('Zona urbana en Bogotá');
      // Indicador booleano en lugar de URL privada
      expect(result.tieneComprobante).toBe(true);
      expect((result as any).comprobantePago).toBeUndefined();
    });
  });
});
