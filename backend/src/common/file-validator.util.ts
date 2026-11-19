import { BadRequestException } from '@nestjs/common';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export type AllowedImageMime = 'image/jpeg' | 'image/png' | 'image/webp';
export type AllowedReceiptMime = AllowedImageMime | 'application/pdf';

/**
 * Verifica si los primeros bytes del buffer coinciden con una secuencia esperada.
 */
function matchesHeader(buffer: Buffer, bytes: number[]): boolean {
  if (buffer.length < bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buffer[i] !== bytes[i]) return false;
  }
  return true;
}

/**
 * Detecta el tipo MIME real inspeccionando los magic bytes del buffer binario.
 */
export function detectRealMimeType(buffer: Buffer): AllowedReceiptMime | null {
  if (!buffer || buffer.length < 4) {
    return null;
  }

  // Rechazo explícito de ejecutables y scripts peligrosos
  // Windows PE (MZ)
  if (matchesHeader(buffer, [0x4D, 0x5A])) {
    return null;
  }
  // Linux ELF
  if (matchesHeader(buffer, [0x7F, 0x45, 0x4C, 0x46])) {
    return null;
  }

  // Detección de SVG o XML/HTML incrustado (XSS vector)
  const headerUtf8 = buffer.slice(0, 100).toString('utf8').toLowerCase();
  if (
    headerUtf8.includes('<svg') ||
    headerUtf8.includes('<?xml') ||
    headerUtf8.includes('<html') ||
    headerUtf8.includes('<script')
  ) {
    return null;
  }

  // 1. JPEG: FF D8 FF
  if (matchesHeader(buffer, [0xFF, 0xD8, 0xFF])) {
    return 'image/jpeg';
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (matchesHeader(buffer, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) {
    return 'image/png';
  }

  // 3. WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  if (
    buffer.length >= 12 &&
    matchesHeader(buffer.slice(0, 4), [0x52, 0x49, 0x46, 0x46]) && // 'RIFF'
    matchesHeader(buffer.slice(8, 12), [0x57, 0x45, 0x42, 0x50])  // 'WEBP'
  ) {
    return 'image/webp';
  }

  // 4. PDF: %PDF- (25 50 44 46 2D)
  if (matchesHeader(buffer, [0x25, 0x50, 0x44, 0x46, 0x2D])) {
    return 'application/pdf';
  }

  return null;
}

/**
 * Valida de forma estricta imágenes de productos (SEC-07):
 * - Tamaño máximo 5 MB.
 * - Formatos admitidos: JPEG, PNG, WEBP.
 * - Validación obligatoria de magic bytes reales.
 */
export function validateProductImageFile(file: Express.Multer.File): AllowedImageMime {
  if (!file || !file.buffer) {
    throw new BadRequestException('Debes proporcionar un archivo de imagen');
  }

  if (file.buffer.length > MAX_FILE_SIZE_BYTES || (file.size && file.size > MAX_FILE_SIZE_BYTES)) {
    throw new BadRequestException('La imagen excede el límite máximo permitido de 5 MB');
  }

  const realMime = detectRealMimeType(file.buffer);
  if (!realMime || realMime === 'application/pdf') {
    throw new BadRequestException(
      'Formato de imagen inválido o no admitido. Solo se aceptan archivos JPG, PNG o WEBP con cabeceras binarias auténticas.',
    );
  }

  return realMime;
}

/**
 * Valida de forma estricta archivos de comprobante de pago (SEC-07):
 * - Tamaño máximo 5 MB.
 * - Formatos admitidos: JPEG, PNG, WEBP o PDF.
 * - Validación obligatoria de magic bytes reales (%PDF- para PDF).
 */
export function validateReceiptFile(file: Express.Multer.File): {
  realMime: AllowedReceiptMime;
  isPdf: boolean;
} {
  if (!file || !file.buffer) {
    throw new BadRequestException('Debes proporcionar un archivo de comprobante');
  }

  if (file.buffer.length > MAX_FILE_SIZE_BYTES || (file.size && file.size > MAX_FILE_SIZE_BYTES)) {
    throw new BadRequestException('El comprobante excede el límite máximo permitido de 5 MB');
  }

  const realMime = detectRealMimeType(file.buffer);
  if (!realMime) {
    throw new BadRequestException(
      'Formato de comprobante inválido. Solo se admiten imágenes JPG, PNG, WEBP o documentos PDF auténticos.',
    );
  }

  return {
    realMime,
    isPdf: realMime === 'application/pdf',
  };
}
