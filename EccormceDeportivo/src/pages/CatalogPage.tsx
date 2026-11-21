import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductCard } from '../components/catalog/ProductCard';
import { ProductCardSkeleton } from '../components/catalog/ProductCardSkeleton';
import { Navbar } from '../components/layout/Navbar';
import { CartDrawer } from '../components/cart/CartDrawer';
import { 
  Search, 
  X, 
  ChevronDown, 
  SlidersHorizontal, 
  ShieldCheck, 
  MessageCircle, 
  Truck
} from 'lucide-react';
import { productService } from '../services/productService';
import type { Product, ProductCategory } from '../types';
import logoImg from '../assets/img/logoSinFondo.png';
import { useSeo } from '../utils/useSeo';

const SLUG_TO_CATEGORY: Record<string, ProductCategory> = {
  'geles-energeticos': 'Geles Energéticos',
  'hidratacion-electrolitos': 'Hidratación y Electrolitos',
  'bebidas-energeticas': 'Bebidas Energéticas',
  'recuperacion-proteinas': 'Recuperación y Proteínas',
  'packs-rendimiento': 'Packs y Rendimiento',
};

const CATEGORY_TO_SLUG: Record<string, string> = {
  'Geles Energéticos': 'geles-energeticos',
  'Hidratación y Electrolitos': 'hidratacion-electrolitos',
  'Bebidas Energéticas': 'bebidas-energeticas',
  'Recuperación y Proteínas': 'recuperacion-proteinas',
  'Packs y Rendimiento': 'packs-rendimiento',
};

export const CatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('categoria');

  const [isLoading, setIsLoading] = useState(true);
  const [activeProducts, setActiveProducts] = useState<Product[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(24);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Resolver categoría inicial desde param
  const initialCategory = useMemo(() => {
    if (!categoryParam) return 'Todos';
    const normalized = categoryParam.toLowerCase();
    if (SLUG_TO_CATEGORY[normalized]) return SLUG_TO_CATEGORY[normalized];
    return categoryParam;
  }, [categoryParam]);

  useSeo({
    title: initialCategory !== 'Todos' ? `${initialCategory} en Pasto - Catálogo Oficial` : 'Catálogo de Suplementos y Geles en Pasto',
    description: `Catálogo oficial de nutrición deportiva SiS en Pasto (Nariño). Geles energéticos, hidratación y electrolitos con entrega gratis el mismo día en la ciudad.`,
    keywords: 'geles energeticos pasto, suplementos deportivos pasto, comprar sis pasto nariño, hidratacion ciclismo pasto',
    canonicalUrl: 'https://victoria-frontend-web.onrender.com/catalogo',
  });

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [sortBy, setSortBy] = useState<'recientes' | 'precio-asc' | 'precio-desc'>('recientes');
  const [isSortOpen, setIsSortOpen] = useState(false);

  const catalogRef = useRef<HTMLDivElement>(null);

  const [fetchError, setFetchError] = useState(false);

  const loadProducts = () => {
    setIsLoading(true);
    setFetchError(false);
    productService.getProducts().then((res) => {
      setActiveProducts(res.data.filter((p: any) => p.activo !== false));
      setIsLoading(false);
    }).catch(() => {
      setFetchError(true);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (categoryParam) {
      const normalized = categoryParam.toLowerCase();
      const resolved = SLUG_TO_CATEGORY[normalized] || categoryParam;
      setSelectedCategory(resolved);
      setTimeout(() => {
        catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else {
      setSelectedCategory('Todos');
    }
  }, [categoryParam]);

  // Resetear paginación cada vez que cambien filtros o búsqueda
  useEffect(() => {
    setVisibleCount(24);
  }, [selectedCategory, searchTerm, sortBy]);

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(cat);
    if (cat === 'Todos') {
      setSearchParams({});
    } else {
      const slug = CATEGORY_TO_SLUG[cat] || cat;
      setSearchParams({ categoria: slug });
    }
  };

  const categories = [
    'Todos', 
    'Geles Energéticos', 
    'Hidratación y Electrolitos', 
    'Bebidas Energéticas', 
    'Recuperación y Proteínas',
    'Packs y Rendimiento'
  ];

  // Catálogo alimentado de la base de datos PostgreSQL
  const allCatalogProducts = activeProducts;

  // Contadores por categoría
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      Todos: allCatalogProducts.length,
      'Geles Energéticos': allCatalogProducts.filter(p => p.categoria === 'Geles Energéticos').length,
      'Hidratación y Electrolitos': allCatalogProducts.filter(p => p.categoria === 'Hidratación y Electrolitos').length,
      'Bebidas Energéticas': allCatalogProducts.filter(p => p.categoria === 'Bebidas Energéticas').length,
      'Recuperación y Proteínas': allCatalogProducts.filter(p => p.categoria === 'Recuperación y Proteínas').length,
      'Packs y Rendimiento': allCatalogProducts.filter(p => p.categoria === 'Packs y Rendimiento').length,
    };
    return counts;
  }, [allCatalogProducts]);

  // Ocultar los filtros de categoría con 0 productos
  const visibleCategories = useMemo(() => {
    return categories.filter((cat) => cat === 'Todos' || (categoryCounts[cat] ?? 0) > 0);
  }, [categories, categoryCounts]);

  const filteredAndSortedProducts = useMemo(() => {
    let result = [...allCatalogProducts];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.nombre.toLowerCase().includes(lowerSearch) || 
        p.descripcion?.toLowerCase().includes(lowerSearch)
      );
    }

    if (selectedCategory !== 'Todos') {
      result = result.filter(p => p.categoria === selectedCategory);
    }

    switch (sortBy) {
      case 'precio-asc':
        result.sort((a, b) => a.precio - b.precio);
        break;
      case 'precio-desc':
        result.sort((a, b) => b.precio - a.precio);
        break;
      case 'recientes':
      default:
        result.sort((a, b) => String(b.id).localeCompare(String(a.id)));
        break;
    }

    return result;
  }, [allCatalogProducts, searchTerm, selectedCategory, sortBy]);

  // Paginación "Cargar más"
  const displayedProducts = useMemo(() => {
    return filteredAndSortedProducts.slice(0, visibleCount);
  }, [filteredAndSortedProducts, visibleCount]);

  // Scroll Infinito Automático: carga más productos conforme el cliente baja en celular o PC
  useEffect(() => {
    if (visibleCount >= filteredAndSortedProducts.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 12, filteredAndSortedProducts.length));
        }
      },
      { threshold: 0.1, rootMargin: '300px' }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [visibleCount, filteredAndSortedProducts.length]);

  return (
    <div className="min-h-screen bg-dark-base bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] flex flex-col">
      <Navbar />

      {/* ── HEADER BANNER (SIN GLOW EN TÍTULOS) ── */}
      <section className="relative py-8 sm:py-12 md:py-14 border-b border-white/10 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(#ccff00_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-volt" />
                <span className="text-gray-300 font-medium text-xs tracking-wider uppercase">
                  Catálogo Oficial Endurance // SiS
                </span>
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black italic uppercase tracking-tighter text-white leading-none">
                Nutrición de <br />
                <span className="text-volt">Alto Rendimiento</span>
              </h1>
              <p className="text-gray-400 mt-3 text-xs sm:text-sm md:text-base font-medium max-w-xl leading-relaxed">
                Geles isotónicos, electrolitos científicos y bebidas energéticas formuladas para romper tus marcas personales en ciclismo, running y triatlón.
              </p>
            </div>

            {/* Micro métricas de catálogo */}
            <div className="flex items-center gap-4 sm:gap-6 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
              <div className="text-left">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-white block leading-none">
                  {allCatalogProducts.length}
                </span>
                <span className="text-xs text-gray-400 uppercase tracking-wider mt-1 block">
                  Productos Élite
                </span>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="text-left">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-volt block leading-none">
                  100%
                </span>
                <span className="text-xs text-gray-400 uppercase tracking-wider mt-1 block">
                  Informed Sport
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTENIDO PRINCIPAL: FILTROS + GRID ── */}
      <main ref={catalogRef} className="flex-grow max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 w-full relative z-10">

        {/* ── BARRA DE BÚSQUEDA Y ORDENAMIENTO (NEUTROS, SIN LIMA EN REPOSO) ── */}
        <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
          {/* Buscador */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar geles, electrolitos, SiS Beta Fuel..."
              className="w-full bg-dark-surface border border-white/10 hover:border-white/20 focus:border-volt rounded-xl pl-9 sm:pl-10 pr-9 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-volt transition-all font-medium"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>

          {/* Selector de ordenamiento */}
          <div className="relative shrink-0">
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-1.5 sm:gap-2 bg-dark-surface border border-white/10 hover:border-white/20 text-gray-300 hover:text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all min-h-[44px] min-w-[44px]"
              aria-label="Ordenar productos"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
              <span className="hidden sm:inline">
                {sortBy === 'recientes' ? 'Novedades' : sortBy === 'precio-asc' ? 'Menor Precio' : 'Mayor Precio'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform text-gray-400 ${isSortOpen ? 'rotate-180 text-white' : ''}`} />
            </button>

            {isSortOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-dark-surface border border-white/15 rounded-xl shadow-2xl py-1.5 z-30">
                {[
                  { id: 'recientes', label: 'Más Recientes' },
                  { id: 'precio-asc', label: 'Precio: Menor a Mayor' },
                  { id: 'precio-desc', label: 'Precio: Mayor a Menor' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSortBy(opt.id as any);
                      setIsSortOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                      sortBy === opt.id ? 'text-volt bg-white/5 font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── PESTAÑAS DE CATEGORÍAS (SIN CATEGORÍAS EN 0, CONTADOR GRIS) ── */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 pb-3 mb-6 sm:mb-8">
          {visibleCategories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count = categoryCounts[cat] ?? 0;

            return (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`relative shrink-0 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-150 flex items-center gap-2 border select-none min-h-[44px] ${
                  isSelected
                    ? 'bg-volt text-dark-base border-volt font-bold'
                    : 'bg-dark-surface text-gray-400 hover:text-white border-white/10 hover:border-white/20'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded transition-colors ${
                    isSelected
                      ? 'bg-black/15 text-gray-700'
                      : 'bg-white/5 text-gray-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── RESULTADOS Y CONTEO ── */}
        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-xs text-gray-400 font-mono uppercase tracking-wider">
            Mostrando <span className="text-white font-bold">{Math.min(displayedProducts.length, filteredAndSortedProducts.length)}</span> de <span className="text-white font-bold">{filteredAndSortedProducts.length}</span> {filteredAndSortedProducts.length === 1 ? 'producto' : 'productos'}
            {selectedCategory !== 'Todos' && (
              <> en <span className="text-white font-bold">{selectedCategory}</span></>
            )}
          </p>
          {selectedCategory !== 'Todos' && (
            <button
              onClick={() => handleCategoryClick('Todos')}
              className="text-xs text-gray-400 hover:text-white font-mono uppercase underline tracking-wider transition-colors min-h-[44px] flex items-center"
            >
              Ver todo el catálogo
            </button>
          )}
        </div>

        {/* ── CUADRÍCULA DE PRODUCTOS (4 ESCRITORIO, 3 TABLET, 2 MÓVIL) ── */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 xl:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredAndSortedProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 xl:gap-6">
              {displayedProducts.map((product, idx) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  index={idx}
                />
              ))}
            </div>

            {/* Sentinel invisible para disparo automático de Scroll Infinito */}
            <div ref={observerTarget} className="h-4 w-full pointer-events-none" />

            {/* Contador de estado y Feedback amigable */}
            <div className="mt-8 sm:mt-12 flex flex-col items-center justify-center gap-2">
              <p className="text-xs text-gray-400 font-mono uppercase tracking-wider">
                {displayedProducts.length >= filteredAndSortedProducts.length ? (
                  <span>
                    Mostrando todos los <span className="text-volt font-bold">{filteredAndSortedProducts.length}</span> productos
                  </span>
                ) : (
                  <span>
                    Mostrando <span className="text-white font-bold">{displayedProducts.length}</span> de <span className="text-white font-bold">{filteredAndSortedProducts.length}</span> productos
                  </span>
                )}
              </p>

              {/* Si quedan productos y el cliente prefiere tocar el botón o su navegador no tiene IntersectionObserver */}
              {visibleCount < filteredAndSortedProducts.length && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 12)}
                  className="mt-2 min-h-[44px] min-w-[44px] px-8 py-2.5 bg-dark-surface hover:bg-white/5 border border-white/15 hover:border-volt/40 text-gray-300 hover:text-white font-semibold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-sm"
                >
                  Cargar más productos
                </button>
              )}
            </div>
          </>
        ) : (
          /* Estado vacío o error de conexión */
          fetchError ? (
            <div className="bg-dark-surface border border-amber-500/30 rounded-2xl p-10 sm:p-16 text-center my-6">
              <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 text-amber-300">
                <Truck className="w-7 h-7" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-white mb-2">
                Conectando con el inventario de Pasto
              </h3>
              <p className="text-gray-400 text-xs sm:text-sm max-w-md mx-auto mb-6">
                El servidor está iniciando la conexión con la base de datos de productos. Si tarda unos segundos, por favor presiona reintentar.
              </p>
              <button
                type="button"
                onClick={loadProducts}
                className="bg-volt hover:bg-volt-hover text-dark-base font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all min-h-[44px]"
              >
                Reintentar Conexión
              </button>
            </div>
          ) : (
            <div className="bg-dark-surface border border-white/10 rounded-2xl p-10 sm:p-16 text-center my-6">
              <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-gray-300">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-white mb-2">
                No se encontraron productos
              </h3>
              <p className="text-gray-400 text-xs sm:text-sm max-w-md mx-auto mb-6">
                No hay coincidencias para "{searchTerm}" en la categoría {selectedCategory}. Prueba buscando otro término o restablece los filtros.
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  handleCategoryClick('Todos');
                }}
                className="bg-volt hover:bg-volt-hover text-dark-base font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all min-h-[44px]"
              >
                Restablecer Filtros
              </button>
            </div>
          )
        )}

        {/* ── BANNER ASESORÍA DEPORTIVA ── */}
        <div className="mt-12 sm:mt-16 bg-dark-surface border border-white/10 rounded-2xl p-6 sm:p-10 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div>
              <span className="text-gray-400 font-semibold text-xs tracking-wider uppercase block mb-1.5">
                ASESORÍA NUTRICIONAL DE CARRERA
              </span>
              <h4 className="text-xl sm:text-2xl md:text-3xl font-black italic uppercase text-white tracking-tight">
                ¿Planeando tu maratón o fondo en bicicleta?
              </h4>
              <p className="text-gray-400 text-xs sm:text-sm mt-1 max-w-xl">
                Nuestros especialistas calculan tus gramos de carbohidratos por hora según tu ritmo objetivo, desnivel y peso.
              </p>
            </div>
            <a
              href="https://wa.me/573224197485?text=Hola,%20quisiera%20asesor%C3%ADa%20sobre%20mi%20estrategia%20nutricional%20con%20SiS."
              target="_blank"
              rel="noreferrer"
              className="bg-volt hover:bg-volt-hover text-dark-base font-bold text-xs uppercase tracking-wider px-7 py-3.5 rounded-xl flex items-center justify-center gap-2.5 transition-all shrink-0 min-h-[44px]"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Hablar con un Asesor</span>
            </a>
          </div>
        </div>
      </main>

      {/* ── FOOTER TRUST ── */}
      <footer className="border-t border-white/10 py-8 mt-12 bg-dark-base">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 font-mono">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="Victoria" className="h-6 w-auto object-contain opacity-70" />
            <span>© {new Date().getFullYear()} Victoria Sports Nutrition // Endurance Division</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-gray-300" /> Despacho Colombia</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-gray-300" /> 100% Original SiS</span>
          </div>
        </div>
      </footer>

      <CartDrawer />
    </div>
  );
};
