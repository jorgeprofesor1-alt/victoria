import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Search,
  Truck,
  PackageCheck,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  MessageCircle,
  FileText,
  Upload,
  MapPin,
  Check,
  Loader2,
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { Navbar } from '../components/layout/Navbar';
import { orderService } from '../services/orderService';
import { getImageUrl } from '../utils/image';
import { OfficialReceiptModal } from '../components/orders/OfficialReceiptModal';
import { generateCustomerInquiryWhatsAppUrl } from '../utils/whatsapp';
import type { OrderPayload } from '../types';

export const OrderTrackingPage: React.FC = () => {
  const { codigo } = useParams<{ codigo?: string }>();
  const [searchParams] = useSearchParams();
  const codeParam = searchParams.get('codigo') || searchParams.get('q') || codigo || '';
  const phoneParam = searchParams.get('telefono') || '';

  const [orderCode, setOrderCode] = useState(codeParam);
  const [orderPhone, setOrderPhone] = useState(phoneParam);
  const [isLoading, setIsLoading] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Modal de Recibo Oficial
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Upload de comprobante desde la página de rastreo
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchOrderData = async (targetCode: string, targetPhone: string) => {
    const cleanCode = targetCode.trim();
    const cleanPhone = targetPhone.replace(/\D/g, '').slice(-10);

    if (!cleanCode || cleanPhone.length < 10) {
      toast.error('Por favor, ingresa el código de pedido y tu celular de 10 dígitos.');
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    try {
      const data = await orderService.trackOrders(cleanCode, cleanPhone);
      if (data && data.codigo) {
        setActiveOrder(data);
      } else {
        setActiveOrder(null);
        toast.error('No encontramos un pedido con esos datos');
      }
    } catch (err: any) {
      setActiveOrder(null);
      toast.error('No encontramos un pedido con esos datos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (codeParam) {
      setOrderCode(codeParam);
    }
    if (phoneParam) {
      setOrderPhone(phoneParam);
    }
    if (codeParam && phoneParam && phoneParam.replace(/\D/g, '').length >= 10) {
      fetchOrderData(codeParam, phoneParam);
    }
  }, [codeParam, phoneParam]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrderData(orderCode, orderPhone);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeOrder) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo excede el tamaño máximo permitido de 5 MB.');
      return;
    }

    setIsUploading(true);
    try {
      await orderService.uploadComprobante(activeOrder.codigo, file, orderPhone);
      setActiveOrder((prev: any) => ({ ...prev, tieneComprobante: true }));
      toast.success('¡Comprobante cargado con éxito! Tesorería lo revisará a la brevedad.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al subir el comprobante');
    } finally {
      setIsUploading(false);
    }
  };

  // Mapeo de estados a pasos de la línea de tiempo
  const getStepProgress = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return 1;
      case 'PAGADO':
      case 'EN_PREPARACION':
        return 2;
      case 'ENVIADO':
        return 3;
      case 'ENTREGADO':
        return 4;
      case 'CANCELADO':
        return -1;
      default:
        return 1;
    }
  };

  const currentStep = activeOrder ? getStepProgress(activeOrder.estado) : 0;

  // Adaptar orden al tipo OrderPayload para el modal de recibo
  const receiptOrderPayload: OrderPayload | null = activeOrder
    ? {
        codigoPedido: activeOrder.codigo,
        nombre: activeOrder.nombreCliente,
        telefono: activeOrder.telefono,
        ciudad: activeOrder.ciudad,
        direccion: activeOrder.direccion,
        notas: activeOrder.notas || '',
        tipoEnvio: activeOrder.metodoEnvio === 'Local' ? 'domicilio' : 'nacional',
        metodoPago: activeOrder.metodoPago?.toLowerCase() === 'nequi' ? 'nequi' : 'bancolombia',
        items: (activeOrder.detalles || []).map((d: any) => ({
          id: d.producto?.id || d.id,
          nombre: d.producto?.nombre || 'Producto SiS',
          slug: d.producto?.slug || '',
          categoria: d.producto?.categoria?.nombre || 'Nutrición Deportiva',
          precio: d.precio,
          descripcion: d.producto?.descripcion || '',
          imagenUrl: d.producto?.imagen || '',
          stock: 10,
          badges: [],
          cantidad: d.cantidad,
        })),
        subtotal: (activeOrder.detalles || []).reduce((acc: number, d: any) => acc + d.precio * d.cantidad, 0),
        costoEnvio: activeOrder.total - (activeOrder.detalles || []).reduce((acc: number, d: any) => acc + d.precio * d.cantidad, 0),
        total: activeOrder.total,
        fecha: new Date(activeOrder.createdAt).toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      }
    : null;

  return (
    <div className="min-h-screen bg-dark-base text-gray-200">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-12">
        
        {/* ── HEADER DEL PORTAL ── */}
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-volt/10 border border-volt/20 text-volt text-xs font-mono font-bold uppercase tracking-wider">
            <Truck className="w-3.5 h-3.5" />
            <span>Portal de Trazabilidad Seguro</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
            Rastreo Oficial de Pedidos
          </h1>

          <p className="text-sm sm:text-base text-gray-400 max-w-lg mx-auto">
            Por tu seguridad y privacidad, ingresa el código exacto de tu pedido y el número de celular registrado.
          </p>
        </div>

        {/* ── BUSCADOR DE PEDIDOS SEGURO (CÓDIGO + TELÉFONO OBLIGATORIOS) ── */}
        <div className="bg-dark-surface border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl mb-10">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                placeholder="Código de pedido (ej: PED-2A8X-9M4L)"
                className="w-full pl-12 pr-4 py-3.5 bg-dark-card border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-volt focus:ring-1 focus:ring-volt font-mono text-sm transition-all"
              />
            </div>

            <div className="relative flex-1">
              <Phone className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="tel"
                required
                maxLength={10}
                value={orderPhone}
                onChange={(e) => setOrderPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="Celular registrado (10 dígitos)"
                className="w-full pl-12 pr-4 py-3.5 bg-dark-card border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-volt focus:ring-1 focus:ring-volt font-mono text-sm transition-all"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3.5 bg-volt hover:bg-[#ccff00] text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.3)] disabled:opacity-50 active:scale-95 shrink-0 min-h-[44px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Consultando...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Rastrear Pedido</span>
                </>
              )}
            </button>
          </form>
          <p className="text-[11px] text-gray-400 font-mono mt-3">
            💡 <strong>Ayuda:</strong> Tu código tiene el formato <strong>PED-XXXX-XXXX</strong> y lo recibiste en tu mensaje de confirmación de WhatsApp tras registrar tu compra.
          </p>
        </div>

        {/* ── VISTA PRINCIPAL DEL PEDIDO ENCONTRADO ── */}
        {activeOrder && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* Banner de Estado Hero */}
            <div className="bg-dark-surface border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                      #{activeOrder.codigo}
                    </span>
                    <span
                      className={`text-xs font-bold font-mono px-3 py-1 rounded-full border uppercase tracking-wider ${
                        activeOrder.estado === 'ENTREGADO'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : activeOrder.estado === 'ENVIADO'
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                          : activeOrder.estado === 'EN_PREPARACION'
                          ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                          : activeOrder.estado === 'CANCELADO'
                          ? 'bg-red-500/10 border-red-500/30 text-red-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      }`}
                    >
                      {activeOrder.estado === 'PENDIENTE'
                        ? '🟡 Pendiente de Pago'
                        : activeOrder.estado === 'EN_PREPARACION'
                        ? '📦 En Alistamiento / Bodega'
                        : activeOrder.estado === 'ENVIADO'
                        ? '🚚 En Camino / Despachado'
                        : activeOrder.estado === 'ENTREGADO'
                        ? '🏆 Entregado al Atleta'
                        : '❌ Cancelado'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono mt-1">
                    Registrado el {new Date(activeOrder.createdAt).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReceiptModal(true)}
                    className="px-4 py-2 bg-dark-card hover:bg-white/10 text-white border border-white/10 hover:border-volt/40 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 min-h-[44px]"
                  >
                    <FileText className="w-4 h-4 text-volt" />
                    <span>Recibo Oficial (PDF)</span>
                  </button>
                </div>
              </div>

              {/* ── LÍNEA DE TIEMPO INTERACTIVA EN VIVO ── */}
              {activeOrder.estado !== 'CANCELADO' ? (
                <div className="py-8">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center relative">
                    
                    {/* Paso 1: Pedido Registrado */}
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-volt text-black flex items-center justify-center font-black mb-2 shadow-[0_0_20px_rgba(204,255,0,0.4)]">
                        <Check className="w-6 h-6 stroke-[3]" />
                      </div>
                      <p className="text-xs font-bold text-white uppercase tracking-wider">
                        1. Pedido Creado
                      </p>
                      <p className="text-[11px] text-volt font-mono font-bold">Completado</p>
                    </div>

                    {/* Paso 2: Validación de Pago */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-black mb-2 transition-all ${
                          currentStep >= 2 || activeOrder.tieneComprobante
                            ? 'bg-volt text-black shadow-[0_0_20px_rgba(204,255,0,0.4)]'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                        }`}
                      >
                        {currentStep >= 2 ? (
                          <Check className="w-6 h-6 stroke-[3]" />
                        ) : (
                          <Clock className="w-6 h-6" />
                        )}
                      </div>
                      <p className="text-xs font-bold text-white uppercase tracking-wider">
                        2. Verificación Pago
                      </p>
                      <p
                        className={`text-[11px] font-mono font-bold ${
                          currentStep >= 2
                            ? 'text-volt'
                            : activeOrder.tieneComprobante
                            ? 'text-amber-400'
                            : 'text-gray-400'
                        }`}
                      >
                        {currentStep >= 2
                          ? 'Confirmado'
                          : activeOrder.tieneComprobante
                          ? 'Comprobante en Revisión'
                          : 'Pendiente de Pago'}
                      </p>
                    </div>

                    {/* Paso 3: Embalaje SiS */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-black mb-2 transition-all ${
                          currentStep >= 3
                            ? 'bg-volt text-black shadow-[0_0_20px_rgba(204,255,0,0.4)]'
                            : currentStep === 2
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse'
                            : 'bg-dark-card border border-white/10 text-gray-500'
                        }`}
                      >
                        {currentStep >= 3 ? (
                          <Check className="w-6 h-6 stroke-[3]" />
                        ) : (
                          <PackageCheck className="w-6 h-6" />
                        )}
                      </div>
                      <p className="text-xs font-bold text-white uppercase tracking-wider">
                        3. Alistamiento
                      </p>
                      <p
                        className={`text-[11px] font-mono font-bold ${
                          currentStep >= 3
                            ? 'text-volt'
                            : currentStep === 2
                            ? 'text-purple-400'
                            : 'text-gray-500'
                        }`}
                      >
                        {currentStep >= 3
                          ? 'Listo en Bodega'
                          : currentStep === 2
                          ? 'Empacando'
                          : 'En Espera'}
                      </p>
                    </div>

                    {/* Paso 4: Entrega */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-black mb-2 transition-all ${
                          currentStep === 4
                            ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                            : 'bg-dark-card border border-white/10 text-gray-500'
                        }`}
                      >
                        {currentStep === 4 ? (
                          <Check className="w-6 h-6 stroke-[3]" />
                        ) : (
                          <Truck className="w-6 h-6" />
                        )}
                      </div>
                      <p className="text-xs font-bold text-white uppercase tracking-wider">
                        4. En Ruta / Entrega
                      </p>
                      <p
                        className={`text-[11px] font-mono font-bold ${
                          currentStep === 4 ? 'text-emerald-400' : 'text-gray-500'
                        }`}
                      >
                        {currentStep === 4 ? 'Entregado' : 'Pendiente'}
                      </p>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-rose-400">
                  <p className="font-bold text-sm">Este pedido fue cancelado.</p>
                </div>
              )}

              {/* ── BANNER PARA SUBIR COMPROBANTE ── */}
              {activeOrder.estado === 'PENDIENTE' && (
                <div className="bg-dark-card border border-white/10 rounded-xl p-5 mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-volt" />
                      <p className="text-xs font-bold text-white uppercase tracking-wider">
                        ¿Ya realizaste la transferencia?
                      </p>
                    </div>
                    {activeOrder.tieneComprobante && (
                      <span className="text-[10px] text-volt bg-volt/10 border border-volt/20 px-2 py-0.5 rounded-full font-bold">
                        Comprobante Adjuntado
                      </span>
                    )}
                  </div>

                  {activeOrder.tieneComprobante ? (
                    <div className="flex items-center gap-3 text-xs text-gray-300 bg-dark-base p-3 rounded-lg border border-white/5">
                      <CheckCircle2 className="w-4 h-4 text-volt shrink-0" />
                      <span>
                        Tu comprobante ya está registrado en el sistema. El equipo de tesorería lo validará para pasar a empaque.
                      </span>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                        Adjunta tu comprobante Nequi o Bancolombia (máximo 5 MB, formato JPG, PNG, WEBP o PDF) para que tu pedido sea priorizado.
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="px-5 py-2.5 bg-volt hover:bg-[#ccff00] text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all flex items-center gap-2 shadow-md disabled:opacity-50 min-h-[44px]"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Cargando...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            <span>Subir Comprobante Ahora</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* ── DETALLE DEL PEDIDO Y PRODUCTOS ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Columna Izquierda: Productos (2 cols) */}
              <div className="md:col-span-2 bg-dark-surface border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-volt" />
                  <span>Suplementos SiS en este Pedido</span>
                </h3>

                <div className="divide-y divide-white/5">
                  {(activeOrder.detalles || []).map((item: any) => (
                    <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={getImageUrl(item.producto?.imagen)}
                          alt={item.producto?.nombre || 'Producto'}
                          className="w-12 h-12 rounded-xl border border-white/10 bg-black/40 object-contain p-1 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">
                            {item.producto?.nombre || 'Producto SiS'}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">
                            {item.cantidad} x ${item.precio.toLocaleString('es-CO')}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-white shrink-0">
                        ${(item.precio * item.cantidad).toLocaleString('es-CO')}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-white/10 flex justify-between items-center text-sm">
                  <span className="font-bold uppercase text-gray-400 text-xs">Total Liquidado</span>
                  <span className="font-mono font-black text-2xl text-volt">
                    ${activeOrder.total.toLocaleString('es-CO')} COP
                  </span>
                </div>
              </div>

              {/* Columna Derecha: Datos de Entrega y Soporte (1 col) */}
              <div className="space-y-6">
                
                {/* Datos de Entrega (Enmascarados por Seguridad) */}
                <div className="bg-dark-surface border border-white/10 rounded-2xl p-6 shadow-xl space-y-3">
                  <h4 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-volt" />
                    <span>Destino de Envío</span>
                  </h4>

                  <div className="text-xs text-gray-300 space-y-1.5 leading-relaxed font-sans">
                    <p><strong className="text-white">Atleta:</strong> {activeOrder.nombreCliente}</p>
                    <p><strong className="text-white">Celular:</strong> {activeOrder.telefono}</p>
                    <p><strong className="text-white">Destino:</strong> {activeOrder.direccion}</p>
                    <p><strong className="text-white">Método:</strong> {activeOrder.metodoEnvio} Asegurado</p>
                    <p><strong className="text-white">Pago:</strong> {activeOrder.metodoPago}</p>
                  </div>
                </div>

                {/* Contacto Directo WhatsApp */}
                <div className="bg-gradient-to-br from-[#121624] to-[#0A0D14] border border-[#25D366]/20 rounded-2xl p-6 shadow-xl space-y-3">
                  <div className="flex items-center gap-2 text-[#25D366]">
                    <MessageCircle className="w-5 h-5" />
                    <h4 className="font-bold text-sm uppercase tracking-wider text-white">
                      ¿Preguntas sobre tu Pedido?
                    </h4>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Escribe directamente a nuestra línea oficial de atención para consultar avances o requerimientos especiales.
                  </p>
                  <a
                    href={generateCustomerInquiryWhatsAppUrl(activeOrder)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 bg-[#25D366] hover:bg-[#20ba5a] text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 min-h-[44px]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Chatear por WhatsApp</span>
                  </a>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ── MENSAJE SI NO HA BUSCADO O NO ENCONTRÓ ── */}
        {!activeOrder && hasSearched && !isLoading && (
          <div className="text-center py-12 bg-dark-surface border border-white/10 rounded-2xl p-8 space-y-4">
            <XCircle className="w-12 h-12 text-gray-500 mx-auto" />
            <h3 className="text-xl font-bold text-white uppercase">
              No se encontraron pedidos
            </h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              No encontramos un pedido con esos datos. Verifica haber escrito el código completo y los 10 dígitos del celular registrado.
            </p>
          </div>
        )}

        {/* ── SELLOS DE GARANTÍA LEGAL ── */}
        <div className="mt-16 pt-8 border-t border-white/10 text-center">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
            <div className="flex items-center justify-center gap-3 text-xs text-gray-400">
              <ShieldCheck className="w-4 h-4 text-volt" />
              <span>Garantía de Originalidad SiS</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-xs text-gray-400">
              <Truck className="w-4 h-4 text-volt" />
              <span>Despachos Asegurados</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-xs text-gray-400">
              <CheckCircle2 className="w-4 h-4 text-volt" />
              <span>Registro INVIMA Garantizado</span>
            </div>
          </div>
        </div>

      </div>

      {receiptOrderPayload && (
        <OfficialReceiptModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          order={receiptOrderPayload}
        />
      )}
    </div>
  );
};
