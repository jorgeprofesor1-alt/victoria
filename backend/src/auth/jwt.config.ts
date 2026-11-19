/**
 * Centraliza y valida la configuración del secreto JWT.
 * Falla de forma inmediata e intransigente si no existe o si tiene menos de 32 caracteres.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error(
      'FATAL ERROR DE SEGURIDAD: La variable de entorno JWT_SECRET es obligatoria y debe tener al menos 32 caracteres de longitud.'
    );
  }
  return secret.trim();
}
