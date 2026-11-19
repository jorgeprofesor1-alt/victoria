import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '../../types';
import { useCartStore } from '../../store/useCartStore';
import { ShoppingCart, Check, Loader2, Package } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, index = 0 }) => {
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);

  const [imageError, setImageError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const isOutOfStock = product.stock <= 0;

  // 1. Etiqueta única superior izquierda: Descuento % > "Nuevo" > ninguna
  const hasDiscount = Boolean(product.precioAntes && product.precioAntes > product.precio);
  const discountPercent = hasDiscount
    ? Math.round(((product.precioAntes! - product.precio) / product.precioAntes!) * 100)
    : 0;

  const isNew = Boolean(
    product.badges?.some((b) => {
      const clean = b.toLowerCase();
      return clean.includes('nuevo') || clean.includes('new');
    })
  );

  const singleBadge = hasDiscount
    ? `-${discountPercent}%`
    : isNew
      ? 'Nuevo'
      : null;

  // 2. Marca: extraída de datos o nombres conocidos (opcional, no deja hueco)
  const brand = useMemo(() => {
    if ((product as any).marca) return (product as any).marca;
    const knownBrands = [
      'SiS',
      'Science in Sport',
      'Enervit',
      'Maurten',
      'GU',
      'Hammer Nutrition',
      'Hammer',
      'Clif',
      'Tailwind',
      '226ERS',
      'PowerBar',
      'Skratch Labs'
    ];
    for (const b of knownBrands) {
      if (product.nombre.toLowerCase().startsWith(b.toLowerCase())) return b;
      if (product.especificaciones?.['Origen']?.toLowerCase().includes(b.toLowerCase())) return b;
    }
    return null;
  }, [product]);

  // 3. Dato clave: 13px gris ("22g carbohidratos · 60 ml"), opcional sin hueco
  const keyData = useMemo(() => {
    if (product.especificaciones) {
      const carbs = product.especificaciones['Carbohidratos'] || product.especificaciones['Carbs'];
      const content = product.especificaciones['Contenido'] || product.especificaciones['Porción'] || product.especificaciones['Presentación'];
      const parts = [carbs, content].filter(Boolean);
      if (parts.length > 0) return parts.join(' · ');
    }
    const carbMatch = product.descripcion?.match(/(\d+\s*g\s*(?:de\s*)?carbohidratos)/i);
    const mlMatch = product.nombre?.match(/(\d+\s*ml|\d+\s*g|\d+\s*oz)/i);
    if (carbMatch || mlMatch) {
      return [carbMatch?.[1], mlMatch?.[1]].filter(Boolean).join(' · ');
    }
    return null;
  }, [product]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdding || isAdded || isOutOfStock) return;

    setIsAdding(true);
    addItem(product);

    setTimeout(() => {
      setIsAdding(false);
      setIsAdded(true);
      setTimeout(() => {
        setIsAdded(false);
      }, 1500);
    }, 250);
  };

  const handleNavigate = () => {
    navigate(`/producto/${product.slug}`);
  };

  return (
    <article
      tabIndex={0}
      role="article"
      aria-label={product.nombre}
      onClick={handleNavigate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNavigate();
        }
      }}
      className="group relative bg-dark-surface border border-white/10 hover:border-volt hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt transition-all duration-200 rounded-2xl overflow-hidden cursor-pointer flex flex-col h-full select-none"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* ── 1. IMAGEN 1:1 CON PANEL CLARO UNIFORME ── */}
      <div className="relative w-full aspect-square bg-[#F4F5F7] rounded-t-2xl p-3 sm:p-4 flex items-center justify-center overflow-hidden shrink-0">
        {/* Etiqueta única en esquina superior izquierda */}
        {singleBadge && (
          <span className="absolute top-2.5 left-2.5 z-10 bg-[#0F131C] text-white text-xs font-semibold px-2 py-0.5 rounded-md shadow-sm pointer-events-none">
            {singleBadge}
          </span>
        )}

        {/* Imagen o panel neutro si hay error/ausencia */}
        {imageError || !product.imagenUrl ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-200 rounded-lg">
            <Package className="w-9 h-9 stroke-[1.5] text-gray-400" />
            <span className="text-[11px] font-medium text-gray-500 mt-1">Sin imagen</span>
          </div>
        ) : (
          <img
            src={product.imagenUrl}
            alt={product.nombre}
            onError={() => setImageError(true)}
            className={`w-full h-full object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105 ${
              isOutOfStock ? 'opacity-40 grayscale' : ''
            }`}
            loading="lazy"
          />
        )}
      </div>

      {/* ── 2. CONTENIDO TEXTUAL (FLEX-1 CON ALTURAS PREDECIBLES) ── */}
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        {/* Marca (reemplaza a la categoría repetida, desaparece sin dejar hueco) */}
        {brand && (
          <span className="text-xs text-gray-400 font-medium truncate block mb-1">
            {brand}
          </span>
        )}

        {/* Nombre del producto (sans-serif 500-600, 14-16px, altura reservada para 2 líneas) */}
        <h3 className="text-sm sm:text-base font-semibold text-gray-100 leading-snug line-clamp-2 h-[2.5rem] sm:h-[2.75rem] group-hover:text-white transition-colors">
          {product.nombre}
        </h3>

        {/* Dato clave deportivo (13px gris, omite sin romper alineación) */}
        {keyData && (
          <p className="text-[13px] text-gray-400 leading-tight truncate mt-1">
            {keyData}
          </p>
        )}

        {/* ── 3. BASELINE FIJO: PRECIO Y BOTÓN AGREGAR ── */}
        <div className="mt-auto pt-3 border-t border-white/[0.08] flex flex-col gap-2.5">
          {/* Precio: blanco, monospace, 18-20px */}
          <div className="flex items-baseline flex-wrap gap-2 min-h-[24px]">
            <span className="text-lg sm:text-xl font-bold font-mono text-white leading-none">
              ${product.precio.toLocaleString('es-CO')}
            </span>
            {hasDiscount && (
              <div className="flex items-baseline gap-1.5">
                <span className="text-[13px] text-gray-400 line-through font-mono leading-none">
                  ${product.precioAntes!.toLocaleString('es-CO')}
                </span>
                <span className="text-xs text-gray-400 font-mono leading-none">
                  -{discountPercent}%
                </span>
              </div>
            )}
          </div>

          {/* Botón Agregar: ancho completo, alto 40-44px, lima sólido con texto oscuro */}
          <button
            type="button"
            disabled={isOutOfStock || isAdding}
            onClick={handleAddToCart}
            aria-label={`Agregar ${product.nombre} al carrito`}
            className={`w-full h-10 sm:h-11 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 select-none ${
              isOutOfStock
                ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                : isAdded
                  ? 'bg-volt text-dark-base cursor-default'
                  : 'bg-volt hover:bg-volt-hover active:scale-[0.98] text-dark-base shadow-sm'
            }`}
          >
            {isOutOfStock ? (
              <span>Agotado</span>
            ) : isAdding ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Agregando...</span>
              </span>
            ) : isAdded ? (
              <span className="flex items-center gap-1.5 font-black">
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Agregado ✓</span>
              </span>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                <span>Agregar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
};
