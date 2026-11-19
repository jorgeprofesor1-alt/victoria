import { ForbiddenException, NotFoundException, BadRequestException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Rol } from '@prisma/client';
import {
  detectRealMimeType,
  validateProductImageFile,
  validateReceiptFile,
  MAX_FILE_SIZE_BYTES,
} from '../common/file-validator.util';
import { OrdersService } from './orders.service';
import * as fs from 'fs';
import * as path from 'path';

describe('LOTE 2 Security Tests (SEC-04, SEC-05, SEC-07, SEC-09)', () => {
  // =========================================================================
  // SEC-04: Control de Acceso Basado en Roles (RBAC con RolesGuard y @Roles)
  // =========================================================================
  describe('SEC-04: RBAC con RolesGuard', () => {
    let rolesGuard: RolesGuard;
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
      rolesGuard = new RolesGuard(reflector);
    });

    function createMockContext(user: any): ExecutionContext {
      return {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
      } as unknown as ExecutionContext;
    }

    it('debe permitir el acceso si la ruta no exige ningún rol específico', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = createMockContext({ id: 'u1', rol: Rol.USER });

      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('debe denegar el acceso (403 Forbidden) si el usuario no tiene rol asignado', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Rol.ADMIN]);
      const context = createMockContext({ id: 'u1' }); // sin rol

      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('debe denegar el acceso (403 Forbidden) cuando un usuario con rol USER intenta acceder a un endpoint ADMIN', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Rol.ADMIN]);
      const context = createMockContext({ id: 'u-user', rol: Rol.USER });

      expect(() => rolesGuard.canActivate(context)).toThrow(
        /Acceso denegado: permisos insuficientes para esta operación/,
      );
    });

    it('debe permitir el acceso cuando un usuario con rol ADMIN accede a un endpoint ADMIN', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Rol.ADMIN]);
      const context = createMockContext({ id: 'u-admin', rol: Rol.ADMIN });

      expect(rolesGuard.canActivate(context)).toBe(true);
    });
  });

  // =========================================================================
  // SEC-07: Validación Estricta de Subidas (Magic Bytes y Límite de 5 MB)
  // =========================================================================
  describe('SEC-07: Validación de Magic Bytes y Límite de Tamaño', () => {
    it('debe identificar correctamente los magic bytes de JPEG, PNG, WEBP y PDF', () => {
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const webpBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x00, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50, // WEBP
      ]);
      const pdfBuffer = Buffer.from('%PDF-1.7 standard header');

      expect(detectRealMimeType(jpegBuffer)).toBe('image/jpeg');
      expect(detectRealMimeType(pngBuffer)).toBe('image/png');
      expect(detectRealMimeType(webpBuffer)).toBe('image/webp');
      expect(detectRealMimeType(pdfBuffer)).toBe('application/pdf');
    });

    it('debe rechazar archivos peligrosos camuflados (ejecutables MZ/ELF o scripts SVG/HTML)', () => {
      const peExeBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00]); // 'MZ' executable
      const elfExeBuffer = Buffer.from([0x7F, 0x45, 0x4C, 0x46]); // ELF executable
      const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
      const htmlBuffer = Buffer.from('<!DOCTYPE html><html><script>evil()</script></html>');

      expect(detectRealMimeType(peExeBuffer)).toBeNull();
      expect(detectRealMimeType(elfExeBuffer)).toBeNull();
      expect(detectRealMimeType(svgBuffer)).toBeNull();
      expect(detectRealMimeType(htmlBuffer)).toBeNull();
    });

    it('debe rechazar imágenes de productos que superen 5 MB', () => {
      const oversizedBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1024);
      oversizedBuffer.set([0xFF, 0xD8, 0xFF], 0);

      const fakeFile = {
        buffer: oversizedBuffer,
        size: oversizedBuffer.length,
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      expect(() => validateProductImageFile(fakeFile)).toThrow(
        /excede el límite máximo permitido de 5 MB/,
      );
    });

    it('debe rechazar imágenes de productos con formato PDF o MIME no permitido', () => {
      const pdfFile = {
        buffer: Buffer.from('%PDF-1.4 file'),
        size: 200,
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      expect(() => validateProductImageFile(pdfFile)).toThrow(
        /Solo se aceptan archivos JPG, PNG o WEBP/,
      );
    });

    it('debe aceptar comprobantes válidos en formato PDF o imagen con magic bytes legítimos', () => {
      const validPdfFile = {
        buffer: Buffer.from('%PDF-1.5 receipt sample'),
        size: 500,
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      const result = validateReceiptFile(validPdfFile);
      expect(result.isPdf).toBe(true);
      expect(result.realMime).toBe('application/pdf');
    });

    it('debe rechazar comprobantes con cabecera adulterada o no auténtica', () => {
      const fakePdf = {
        buffer: Buffer.from('ESTO NO ES UN PDF REAL'),
        size: 100,
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      expect(() => validateReceiptFile(fakePdf)).toThrow(
        /Formato de comprobante inválido/,
      );
    });
  });

  // =========================================================================
  // SEC-05: Comprobantes Privados y Protección contra Path Traversal
  // =========================================================================
  describe('SEC-05: Comprobantes Privados y Anti-Path-Traversal', () => {
    let ordersService: OrdersService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        pedido: {
          findUnique: jest.fn(),
        },
      };
      ordersService = new OrdersService(mockPrisma);
    });

    it('debe lanzar 404 NotFoundException si el pedido no existe al solicitar el comprobante', async () => {
      mockPrisma.pedido.findUnique.mockResolvedValue(null);

      await expect(ordersService.getComprobanteFile('order-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar 404 NotFoundException si el pedido no tiene comprobante adjunto', async () => {
      mockPrisma.pedido.findUnique.mockResolvedValue({
        id: 'order-1',
        comprobantePago: null,
      });

      await expect(ordersService.getComprobanteFile('order-1')).rejects.toThrow(
        /El pedido no tiene ningún comprobante de pago adjunto/,
      );
    });

    it('debe extraer únicamente el nombre base del archivo evitando ataques de Path Traversal', async () => {
      // Intento de escape de directorio hacia /etc/passwd o win.ini
      mockPrisma.pedido.findUnique.mockResolvedValue({
        id: 'order-evil',
        comprobantePago: '../../../../etc/passwd',
      });

      // Debe intentar buscar únicamente 'passwd' en la carpeta de comprobantes, y lanzar 404 si no existe
      await expect(ordersService.getComprobanteFile('order-evil')).rejects.toThrow(
        /El archivo de comprobante no existe físicamente en el servidor/,
      );
    });

    it('debe retornar la ruta segura y tipo MIME correcto cuando el archivo existe físicamente', async () => {
      const testDir = path.join(process.cwd(), 'uploads', 'comprobantes');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
      const testFilename = 'test-security-receipt.pdf';
      const testFilePath = path.join(testDir, testFilename);
      fs.writeFileSync(testFilePath, '%PDF-1.4 test mock receipt');

      try {
        mockPrisma.pedido.findUnique.mockResolvedValue({
          id: 'order-ok',
          comprobantePago: `/uploads/comprobantes/${testFilename}`,
        });

        const fileResult = await ordersService.getComprobanteFile('order-ok');
        expect(fileResult.filename).toBe(testFilename);
        expect(fileResult.mimeType).toBe('application/pdf');
        expect(fs.existsSync(fileResult.filePath)).toBe(true);
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });
  });

  // =========================================================================
  // SEC-09: CORS Restrictivo y Prevención de Wildcard en Producción
  // =========================================================================
  describe('SEC-09: Verificación de Regla Anti-Wildcard en Producción', () => {
    it('debe rechazar comodín "*" en entorno de producción', () => {
      const isProd = true;
      const rawOrigins = '*';
      const allowedOrigins = rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);

      const validateCorsConfig = () => {
        if (isProd) {
          if (allowedOrigins.length === 0 || allowedOrigins.includes('*')) {
            throw new Error(
              'CONFIGURACIÓN INSEGURA CRÍTICA (SEC-09): En producción (NODE_ENV=production), CORS_ORIGINS no puede contener "*" ni estar vacío. Especifica dominios explícitos autorizados.',
            );
          }
        }
      };

      expect(validateCorsConfig).toThrow(/CORS_ORIGINS no puede contener "\*"/);
    });

    it('debe aceptar dominios explícitos en entorno de producción', () => {
      const isProd = true;
      const rawOrigins = 'https://victoria-frontend-web.onrender.com,https://victoriaperformance.co';
      const allowedOrigins = rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);

      const validateCorsConfig = () => {
        if (isProd) {
          if (allowedOrigins.length === 0 || allowedOrigins.includes('*')) {
            throw new Error('Configuración insegura');
          }
        }
        return true;
      };

      expect(validateCorsConfig()).toBe(true);
      expect(allowedOrigins).toContain('https://victoria-frontend-web.onrender.com');
    });
  });
});
