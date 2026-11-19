import type { OrderPayload } from '../types';

/**
 * Número oficial de WhatsApp de la tienda (configurable por variable de entorno).
 * Por defecto usa el celular del profesor Jorge Eliécer Eraso Montenegro.
 */
export const DEFAULT_STORE_WHATSAPP = '573224197485';

/**
 * Cuentas oficiales de recaudo para soporte y validación de transferencias.
 */
export const OFFICIAL_PAYMENT_ACCOUNTS = {
  nequi: {
    nombre: 'Nequi',
    numero: '322 419 7485',
    titular: 'Jorge Eliécer Eraso Montenegro',
    documento: 'C.C. 12979447',
  },
  bancolombia: {
    nombre: 'Bancolombia (Cuenta de Ahorros)',
    numero: '97282801772',
    titular: 'Jorge Eliécer Eraso Montenegro',
    documento: 'C.C. 12979447',
  },
};

/**
 * Normaliza cualquier número de teléfono (remueve caracteres no numéricos
 * y asegura el código de país de Colombia +57 si es un celular de 10 dígitos).
 */
export function normalizePhoneNumber(rawPhone: string | undefined | null): string {
  if (!rawPhone) return DEFAULT_STORE_WHATSAPP;
  
  // Eliminar todo lo que no sea dígito
  let digits = rawPhone.replace(/\D/g, '');

  // Si tiene 10 dígitos y empieza por 3 (estándar móvil Colombia, ej: 3224197485)
  if (digits.length === 10 && digits.startsWith('3')) {
    return `57${digits}`;
  }

  // Si ya tiene el prefijo 57 y 12 dígitos en total (ej: 573224197485)
  if (digits.length === 12 && digits.startsWith('57')) {
    return digits;
  }

  // Si el usuario ingresó más o menos dígitos pero contiene al menos 10
  if (digits.length >= 10 && !digits.startsWith('57')) {
    return `57${digits.slice(-10)}`;
  }

  return digits || DEFAULT_STORE_WHATSAPP;
}

/**
 * Obtiene el número de WhatsApp oficial configurado para la tienda.
 */
export function getStoreWhatsAppNumber(): string {
  const envNumber = import.meta.env.VITE_STORE_WHATSAPP_NUMBER;
  return normalizePhoneNumber(envNumber || DEFAULT_STORE_WHATSAPP);
}

/**
 * Retorna la URL base del sitio web actual para enlaces de rastreo.
 */
function getBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://victoria-frontend-web.onrender.com';
}

/**
 * Genera el enlace de WhatsApp que el CLIENTE envía a la TIENDA
 * para confirmar su pedido y remitir el comprobante de pago.
 */
export function generateWhatsAppUrl(orderData: OrderPayload, hasUploadedVoucher: boolean = false): string {
  const itemsText = (orderData.items || [])
    .map((item) => `  • ${item.cantidad}x ${item.nombre} → $${(item.precio * item.cantidad).toLocaleString('es-CO')}`)
    .join('\n');

  const storePhone = getStoreWhatsAppNumber();
  const trackingUrl = `${getBaseUrl()}/pedido/${orderData.codigoPedido}?telefono=${encodeURIComponent(orderData.telefono)}`;

  const isNequi = (orderData.metodoPago || '').toLowerCase().includes('nequi');
  const accountInfo = isNequi 
    ? `${OFFICIAL_PAYMENT_ACCOUNTS.nequi.nombre}: ${OFFICIAL_PAYMENT_ACCOUNTS.nequi.numero}`
    : `${OFFICIAL_PAYMENT_ACCOUNTS.bancolombia.nombre}: ${OFFICIAL_PAYMENT_ACCOUNTS.bancolombia.numero}`;

  const voucherNote = hasUploadedVoucher
    ? `✅ *Comprobante de pago cargado en la web.* Adjunto también la captura aquí para validación inmediata.`
    : `📎 *Adjunto la captura del comprobante de transferencia a este mensaje.*`;

  const cleanCodigo = orderData.codigoPedido.startsWith('#') 
    ? orderData.codigoPedido 
    : `#${orderData.codigoPedido}`;

  const message = `⚡ *ORDEN CONFIRMADA - VICTORIA PERFORMANCE NUTRITION* ⚡

¡Hola equipo Victoria! Acabo de registrar mi pedido en la tienda oficial y deseo validar mi pago.

📋 *Detalle del Pedido:*
*Código:* ${cleanCodigo}
*Fecha:* ${orderData.fecha}

🛒 *Suplementación Solicitada (SiS):*
${itemsText}

💰 *Liquidación Total:*
- *Subtotal:* $${orderData.subtotal.toLocaleString('es-CO')}
- *Costo de Envío:* $${orderData.costoEnvio.toLocaleString('es-CO')} (${orderData.tipoEnvio === 'domicilio' ? 'Envío Local' : 'Envío Nacional Asegurado'})
- *TOTAL A VALIDAR:* $${orderData.total.toLocaleString('es-CO')}

📍 *Destino y Datos de Despacho:*
- *Atleta:* ${orderData.nombre}
- *Celular:* ${orderData.telefono}
- *Ciudad:* ${orderData.ciudad}
- *Dirección:* ${orderData.direccion}
- *Observaciones:* ${orderData.notas?.trim() || 'Sin observaciones'}

💳 *Transferencia Realizada a:* ${accountInfo}

${voucherNote}

🔗 *Ver Mi Pedido y Recibo Digital en Vivo:*
${trackingUrl}

──────────────────────────
🏛️ Victoria Performance Nutrition • Jorge Eliécer Eraso Montenegro (C.C. 12979447)
📍 Pasto, Nariño, Colombia • Envío local sin costo en la ciudad
🔬 100% Original SiS • Informed Sport Certified
🛡️ Compra protegida por Ley 1480 de 2011 (Estatuto del Consumidor)
──────────────────────────`;

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${storePhone}?text=${encodedMessage}`;
}

/**
 * Genera el texto del mensaje de notificación que el ADMINISTRADOR envía al CLIENTE
 * cuando cambia o actualiza el estado de su pedido.
 * Cubre exhaustivamente los 6 estados del sistema:
 * - PENDIENTE
 * - PAGADO
 * - EN_PREPARACION
 * - ENVIADO
 * - ENTREGADO
 * - CANCELADO
 */
export function generateOrderStatusMessage(
  order: {
    codigo: string;
    nombreCliente: string;
    telefono: string;
    ciudad?: string;
    direccion?: string;
    total?: number;
    metodoPago?: string;
  },
  newStatus: string,
  extraNotes?: string
): string {
  const clientName = order.nombreCliente.trim().split(' ')[0] || order.nombreCliente;
  const cleanCodigo = order.codigo.startsWith('#') ? order.codigo : `#${order.codigo}`;
  const trackingUrl = `${getBaseUrl()}/pedido/${order.codigo}?telefono=${encodeURIComponent(order.telefono || '')}`;
  const formattedTotal = (order.total || 0).toLocaleString('es-CO');

  switch (newStatus) {
    case 'PENDIENTE':
      return `¡Hola ${clientName}! 👋 Te saludamos de *Victoria Performance Nutrition*.

Registramos con éxito tu solicitud para el pedido *${cleanCodigo}* por un valor total de *$${formattedTotal}*.

⏳ *Estado:* PENDIENTE DE PAGO / COMPROBANTE
Para iniciar de inmediato el alistamiento y despacho de tus suplementos SiS, por favor realiza la transferencia a cualquiera de nuestras cuentas oficiales:

📱 *Nequi:* ${OFFICIAL_PAYMENT_ACCOUNTS.nequi.numero}
🏦 *Bancolombia (Ahorros):* ${OFFICIAL_PAYMENT_ACCOUNTS.bancolombia.numero}
Titular: ${OFFICIAL_PAYMENT_ACCOUNTS.bancolombia.titular}

${extraNotes ? `ℹ️ *Nota del equipo:* ${extraNotes}\n` : ''}
Una vez realizada, puedes compartirnos el soporte por este chat o subirlo directamente aquí:
🔗 *Rastreo y comprobante web:*
${trackingUrl}

¡Quedamos muy atentos para despachar tu suplementación lo antes posible! 🚴‍♂️⚡`;

    case 'PAGADO':
      return `¡Hola ${clientName}! 💳✅ ¡Excelente noticia de *Victoria Performance Nutrition*!

Hemos verificado exitosamente el pago de tu pedido *${cleanCodigo}* por valor de *$${formattedTotal}*.

🔒 *Estado:* PAGO CONFIRMADO Y VALIDADO
Tu orden ha sido aprobada por Tesorería y pasa de inmediato a nuestra línea de empaque y alistamiento en bodega.

${extraNotes ? `ℹ️ *Nota del equipo:* ${extraNotes}\n` : ''}
🔗 *Puedes seguir el progreso en tiempo real aquí:*
${trackingUrl}

Te notificaremos tan pronto como tu paquete sea entregado a la transportadora. ¡Gracias por confiar en nutrición deportiva de élite! 🔥⚡`;

    case 'EN_PREPARACION':
      return `¡Hola ${clientName}! 📦⚡ Te saludamos del equipo de *Victoria Performance Nutrition*.

Te informamos que tu pedido *${cleanCodigo}* ha cambiado a estado:
🛠️ *EN PREPARACIÓN / ALISTAMIENTO EN BODEGA*

Nuestro equipo logístico está empacando cuidadosamente tus suplementos de resistencia Science in Sport (SiS) con sellos de protección para garantizar su perfecta integridad.

📍 *Datos de Entrega:*
- *Atleta:* ${order.nombreCliente}
- *Ciudad:* ${order.ciudad || 'Colombia'}
- *Dirección:* ${order.direccion || 'Dirección registrada'}

${extraNotes ? `ℹ️ *Detalles del alistamiento:* ${extraNotes}\n` : ''}
🔗 *Monitorea tu pedido en vivo aquí:*
${trackingUrl}

Te enviaremos los datos de despacho y guía en cuanto salga de bodega. ¡A romper tus marcas en tu próximo entrenamiento! 🚴‍♂️🏃‍♂️`;

    case 'ENVIADO':
      return `¡Hola ${clientName}! 🚚💨 ¡Tu pedido *${cleanCodigo}* ya va en camino!

📦 *Estado:* DESPACHADO / EN RUTA
Tus suplementos SiS han sido entregados a la transportadora para entrega segura.

📍 *Dirección de Destino:*
${order.direccion || 'Dirección registrada'}, ${order.ciudad || 'Colombia'}
${extraNotes ? `\n🏷️ *Datos de Envío / Guía:* ${extraNotes}\n` : ''}
🔗 *Rastrea tu pedido y mira tu recibo digital:*
${trackingUrl}

💡 *Recomendación:* Mantente atento a tu teléfono para recibir la entrega de la transportadora. Cualquier inquietud, estamos atentos en este mismo chat. ¡A darlo todo en la ruta! 🔥🚴‍♂️`;

    case 'ENTREGADO':
      return `¡Hola ${clientName}! 🏆✅ Te confirmamos que tu pedido *${cleanCodigo}* ha sido registrado como:

🎉 *ENTREGADO CON ÉXITO*
Esperamos que disfrutes al máximo tu nutrición deportiva especializada Science in Sport (SiS) 100% original.

🔗 *Detalle de entrega y recibo digital:*
${trackingUrl}

⭐ *¿Qué tal fue tu experiencia con Victoria?*
Tu opinión es fundamental para nosotros. Si tienes un minuto, cuéntanos cómo fue tu experiencia o etiquétanos en tus entrenamientos.

¡Muchos éxitos y gracias por ser parte del #TeamVictoria! 🚴‍♂️🏃‍♀️⚡`;

    case 'CANCELADO':
      return `Hola ${clientName}, te escribimos de *Victoria Performance Nutrition*.

Te informamos que tu orden *${cleanCodigo}* ha sido registrada como *CANCELADA*.
${extraNotes ? `\nℹ️ *Motivo:* ${extraNotes}\n` : ''}
Si ya realizaste la transferencia o consideras que se trata de un error, por favor respóndenos a este mensaje adjuntando el comprobante para darte soporte prioritario inmediato.

🔗 *Consultar orden:* ${trackingUrl}`;

    default:
      return `¡Hola ${clientName}! Te escribimos de *Victoria Performance Nutrition* respecto a tu pedido *${cleanCodigo}*.
Estado actual: *${newStatus}*.
🔗 *Ver pedido en vivo:* ${trackingUrl}
${extraNotes ? `\nℹ️ *Nota:* ${extraNotes}` : ''}`;
  }
}

/**
 * Genera el enlace de WhatsApp que el ADMINISTRADOR abre para contactar al CLIENTE
 * con el mensaje de notificación precargado según el estado.
 */
export function generateAdminStatusWhatsAppUrl(
  order: {
    codigo: string;
    nombreCliente: string;
    telefono: string;
    ciudad?: string;
    direccion?: string;
    total?: number;
    metodoPago?: string;
  },
  newStatus: string,
  extraNotes?: string
): string {
  const customerPhone = normalizePhoneNumber(order.telefono);
  const message = generateOrderStatusMessage(order, newStatus, extraNotes);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${customerPhone}?text=${encodedMessage}`;
}

/**
 * Genera el enlace de WhatsApp que el CLIENTE abre desde la página de rastreo
 * para consultar directamente a la tienda sobre su pedido.
 */
export function generateCustomerInquiryWhatsAppUrl(order: {
  codigo: string;
  nombreCliente: string;
  ciudad?: string;
  estado?: string;
}): string {
  const storePhone = getStoreWhatsAppNumber();
  const cleanCodigo = order.codigo.startsWith('#') ? order.codigo : `#${order.codigo}`;
  const message = `¡Hola Victoria Performance! 👋 Quisiera consultar sobre mi pedido *${cleanCodigo}* a nombre de *${order.nombreCliente}* (Ciudad: ${order.ciudad || 'Colombia'}). Actualmente figura en estado *${order.estado || 'En proceso'}*. ¿Me podrían brindar más información o actualización? ¡Muchas gracias!`;
  return `https://wa.me/${storePhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Abre un enlace de WhatsApp de manera segura sin ser bloqueado por navegadores.
 */
export function openWhatsAppLink(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
