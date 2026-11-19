import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import helmet from 'helmet';
import { getJwtSecret } from './auth/jwt.config';

async function bootstrap() {
  // Verificación estricta de variables críticas al arranque
  getJwtSecret();

  const isProd = process.env.NODE_ENV === 'production';
  const rawOrigins =
    process.env.CORS_ORIGINS ||
    (isProd
      ? ''
      : 'http://localhost:5173,http://localhost:3000,http://localhost:4173');
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Validación estricta de CORS en producción (SEC-09): NUNCA permitir wildcard
  if (isProd) {
    if (allowedOrigins.length === 0 || allowedOrigins.includes('*')) {
      throw new Error(
        'CONFIGURACIÓN INSEGURA CRÍTICA (SEC-09): En producción (NODE_ENV=production), CORS_ORIGINS no puede contener "*" ni estar vacío. Especifica dominios explícitos autorizados.',
      );
    }
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Configuración de Proxy Reverso (Render / Cloudflare):
  // Permite que req.ip y el Throttler identifiquen la IP real del cliente desde X-Forwarded-For
  app.set('trust proxy', 1);

  // Cabeceras de seguridad HTTP con Helmet (permitiendo recursos estáticos cross-origin)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        (!isProd && allowedOrigins.includes('*'))
      ) {
        callback(null, true);
      } else {
        callback(new Error(`Origen ${origin} no permitido por CORS`));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Prefix
  app.setGlobalPrefix('api/v1');

  // Validation Pipe global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Static Assets (SEC-05): Servir EXCLUSIVAMENTE imágenes públicas de productos
  // Los comprobantes de pago están en una carpeta privada y NO se sirven como activos estáticos
  const baseUploadDir = process.env.UPLOAD_DIR || 'uploads';
  const productsUploadDir = join(process.cwd(), baseUploadDir, 'products');
  if (!fs.existsSync(productsUploadDir)) {
    fs.mkdirSync(productsUploadDir, { recursive: true });
  }
  app.useStaticAssets(productsUploadDir, {
    prefix: '/uploads/products/',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://0.0.0.0:${port}/api/v1`);
}
bootstrap();
