import React, { useState, useMemo } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  ShoppingCart, 
  Home, 
  Tag, 
  User, 
  X, 
  ChevronRight, 
  Plus, 
  Minus, 
  Trash2, 
  Check, 
  Package, 
  CreditCard,
  Smartphone,
  Maximize2
} from 'lucide-react';

// Datos de productos de prueba
const INITIAL_PRODUCTS = [
  {
    id: '1',
    name: 'Brown Leather Oxford',
    translatedName: 'Zapato Oxford Cuero Café',
    category: 'Casual',
    price: 200,
    stock: 32,
    sales: 120,
    dateAdded: '2024-01-15',
    image: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=500&auto=format&fit=crop&q=80',
    colorBg: 'bg-amber-50'
  },
  {
    id: '2',
    name: 'Nike Air Max',
    translatedName: 'Nike Air Max',
    category: 'Running',
    price: 1000,
    stock: 2,
    sales: 240,
    dateAdded: '2024-02-10',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80',
    colorBg: 'bg-neutral-100'
  },
  {
    id: '3',
    name: 'White Low-Top Sneaker',
    translatedName: 'Tenis Blanco Casual',
    category: 'Casual',
    price: 500,
    stock: 0,
    sales: 85,
    dateAdded: '2024-01-20',
    image: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500&auto=format&fit=crop&q=80',
    colorBg: 'bg-stone-100'
  },
  {
    id: '4',
    name: 'Nike Running Shoe',
    translatedName: 'Nike Running Shoe',
    category: 'Running',
    price: 1000,
    stock: 2,
    sales: 195,
    dateAdded: '2024-02-28',
    image: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=500&auto=format&fit=crop&q=80',
    colorBg: 'bg-gray-100'
  },
  {
    id: '5',
    name: 'Nike Kyrie Basketball',
    translatedName: 'Nike Kyrie Basketball',
    category: 'Basketball',
    price: 1200,
    stock: 5,
    sales: 310,
    dateAdded: '2024-03-01',
    image: 'https://images.unsplash.com/photo-1579338559194-a162d19bf842?w=500&auto=format&fit=crop&q=80',
    colorBg: 'bg-blue-50'
  },
  {
    id: '6',
    name: 'Nike Training Shoe',
    translatedName: 'Nike Training Shoe',
    category: 'Training',
    price: 800,
    stock: 12,
    sales: 150,
    dateAdded: '2024-02-05',
    image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&auto=format&fit=crop&q=80',
    colorBg: 'bg-pink-50'
  }
];

const CATEGORIES = ['All', 'Casual', 'Running', 'Basketball', 'Training'];

const SORT_OPTIONS = [
  { id: 'most-sold', label: 'Most sold', esLabel: 'Más vendidos' },
  { id: 'name-asc', label: 'Name (A → Z)', esLabel: 'Nombre (A → Z)' },
  { id: 'name-desc', label: 'Name (Z → A)', esLabel: 'Nombre (Z → A)' },
  { id: 'price-low', label: 'Price (Low → High)', esLabel: 'Precio (Bajo → Alto)' },
  { id: 'price-high', label: 'Price (High → Low)', esLabel: 'Precio (Alto → Bajo)' },
  { id: 'date-newest', label: 'Date added (Newest First)', esLabel: 'Fecha agregada (Reciente)' },
  { id: 'date-oldest', label: 'Date added (Oldest first)', esLabel: 'Fecha agregada (Antiguo)' },
  { id: 'most-recent', label: 'Most Recent', esLabel: 'Recientes' }
];

export default function App() {
  // Estados principales
  const [products] = useState(INITIAL_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState('most-sold');
  const [tempSort, setTempSort] = useState('most-sold');
  const [tempCategory, setTempCategory] = useState('All');
  
  // Modales y Vistas
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pos'); // 'pos', 'cart', 'discounts', 'profile'
  const [phoneFrame, setPhoneFrame] = useState(true);

  // Carrito de compras
  const [cart, setCart] = useState([
    { product: INITIAL_PRODUCTS[0], quantity: 2 },
    { product: INITIAL_PRODUCTS[1], quantity: 1 },
    { product: INITIAL_PRODUCTS[3], quantity: 2 }
  ]);

  // Toast / Notificaciones sencillas
  const [toastMessage, setToastMessage] = useState('');

  const showNotification = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Función para agregar al carrito
  const addToCart = (product) => {
    if (product.stock === 0) {
      showNotification(`¡Agotado! ${product.name} no tiene stock disponible.`);
      return;
    }

    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          showNotification(`Has alcanzado el límite de stock de ${product.name}`);
          return prevCart;
        }
        return prevCart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { product, quantity: 1 }];
      }
    });

    showNotification(`Añadido: ${product.name}`);
  };

  // Modificar cantidad en carrito
  const updateQuantity = (productId, delta) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.product.stock) {
            showNotification(`Límite de stock disponible alcanzado.`);
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean);
    });
  };

  // Total de items en el carrito
  const totalCartCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  // Total a pagar
  const totalPrice = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  }, [cart]);

  // Filtrado y Ordenamiento de Productos
  const filteredProducts = useMemo(() => {
    return products
      .filter(product => {
        const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              product.translatedName.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        switch (selectedSort) {
          case 'most-sold':
            return b.sales - a.sales;
          case 'name-asc':
            return a.name.localeCompare(b.name);
          case 'name-desc':
            return b.name.localeCompare(a.name);
          case 'price-low':
            return a.price - b.price;
          case 'price-high':
            return b.price - a.price;
          case 'date-newest':
          case 'most-recent':
            return new Date(b.dateAdded) - new Date(a.dateAdded);
          case 'date-oldest':
            return new Date(a.dateAdded) - new Date(b.dateAdded);
          default:
            return 0;
        }
      });
  }, [products, selectedCategory, searchQuery, selectedSort]);

  // Abrir modal de filtros con copia de estados
  const openFilterModal = () => {
    setTempSort(selectedSort);
    setTempCategory(selectedCategory);
    setIsFilterOpen(true);
  };

  // Aplicar filtros desde modal
  const applyFilters = () => {
    setSelectedSort(tempSort);
    setSelectedCategory(tempCategory);
    setIsFilterOpen(false);
  };

  // Limpiar filtros
  const clearFilters = () => {
    setTempSort('most-sold');
    setTempCategory('All');
  };

  return (
    <div className="min-h-screen bg-slate-200 text-slate-800 flex flex-col items-center justify-center p-2 sm:p-6 font-sans select-none">
      
      {/* Botón superior de configuración para activar/desactivar el marco de smartphone */}
      <div className="mb-4 flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm text-xs font-semibold text-slate-600">
        <button 
          onClick={() => setPhoneFrame(!phoneFrame)} 
          className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors"
        >
          {phoneFrame ? <Maximize2 className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
          <span>{phoneFrame ? 'Vista Completa' : 'Vista Smartphone'}</span>
        </button>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500">Demo Punto de Venta POS</span>
      </div>

      {/* Contenedor Principal (Marco de Teléfono o Vista Abierta) */}
      <div className={`relative bg-slate-50 overflow-hidden transition-all duration-300 ${
        phoneFrame 
          ? 'w-[390px] h-[812px] rounded-[48px] shadow-2xl border-[10px] border-slate-900 ring-1 ring-black/10' 
          : 'w-full max-w-md h-[840px] rounded-3xl shadow-xl border border-slate-300'
      }`}>

        {/* Notificación Toast flotante */}
        {toastMessage && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white text-xs px-4 py-2 rounded-full shadow-lg backdrop-blur-sm animate-bounce text-center max-w-[85%] border border-white/10">
            {toastMessage}
          </div>
        )}

        {/* Barra de estado superior de iPhone */}
        <div className="pt-3 px-7 pb-1 flex justify-between items-center text-xs font-semibold text-slate-900 z-10 relative">
          <span>9:41</span>
          <div className="flex items-center space-x-1.5">
            <svg className="w-4 h-3 text-slate-900 fill-current" viewBox="0 0 16 12">
              <path d="M1 10h2v2H1zm4-3h2v5H5zm4-3h2v8H9zm4-4h2v12h-2z"/>
            </svg>
            <svg className="w-3.5 h-3 text-slate-900 fill-current" viewBox="0 0 16 12">
              <path d="M8 2a6 6 0 0 1 6 6h-2a4 4 0 0 0-4-4 4 4 0 0 0-4 4H2a6 6 0 0 1 6-6z"/>
            </svg>
            <div className="w-5 h-2.5 border border-slate-900 rounded-sm p-0.5 flex items-center">
              <div className="bg-slate-900 w-full h-full rounded-2xs"></div>
            </div>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
        <div className="h-[calc(100%-80px)] overflow-y-auto px-5 pt-2 pb-24 no-scrollbar">

          {activeTab === 'pos' && (
            <>
              {/* Encabezado Punto de Venta */}
              <div className="flex justify-between items-center my-3">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Point of Sale</h1>
                
                {/* Botón de Carrito Superior con Badge */}
                <button 
                  onClick={() => setIsCartOpen(true)} 
                  className="relative p-2 text-slate-800 hover:text-indigo-600 transition-colors"
                  aria-label="Ver carrito"
                >
                  <ShoppingCart className="w-6 h-6" />
                  {totalCartCount > 0 && (
                    <span className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-slate-50">
                      {totalCartCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Barra de Búsqueda y Filtro */}
              <div className="flex items-center gap-2.5 mb-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white pl-10 pr-4 py-2.5 rounded-2xl text-sm border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-400 shadow-xs transition-all"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Botón Abrir Modal Filtros */}
                <button
                  onClick={openFilterModal}
                  className="p-2.5 bg-white border border-slate-200/80 rounded-2xl text-slate-700 hover:bg-slate-100 transition-all shadow-xs flex items-center justify-center shrink-0 active:scale-95"
                >
                  <SlidersHorizontal className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              {/* Categorías (Pills con Scroll Horizontal) */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-5 py-1 -mx-5 px-5">
                {CATEGORIES.map(category => {
                  const isActive = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'bg-slate-200/60 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>

              {/* Grilla de Productos */}
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                  <Package className="w-12 h-12 stroke-[1.5] mb-2 text-slate-300" />
                  <p className="text-sm font-medium">No se encontraron productos</p>
                  <button 
                    onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
                    className="mt-3 text-xs text-indigo-600 font-semibold hover:underline"
                  >
                    Restablecer búsqueda
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3.5 pb-6">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="group bg-white rounded-2xl p-2.5 border border-slate-100 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer active:scale-[0.98]"
                    >
                      {/* Imagen con fondo de tarjeta suave */}
                      <div className={`w-full h-32 rounded-xl mb-3 flex items-center justify-center overflow-hidden relative ${product.colorBg}`}>
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80';
                          }}
                        />
                        {/* Overlay al pasar el cursor */}
                        <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-indigo-600 p-1.5 rounded-full shadow-sm transition-opacity transform translate-y-2 group-hover:translate-y-0">
                            <Plus className="w-4 h-4 stroke-[3]" />
                          </span>
                        </div>
                      </div>

                      {/* Información del Producto */}
                      <div>
                        <h3 className="font-bold text-slate-900 text-xs line-clamp-1 group-hover:text-indigo-600 transition-colors">
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1 text-xs">
                          <span className="font-extrabold text-slate-900">${product.price.toLocaleString()}</span>
                          <span className="text-slate-300">•</span>
                          <span className={`font-semibold text-[11px] ${
                            product.stock === 0 ? 'text-rose-500' : 'text-slate-400'
                          }`}>
                            {product.stock} ea
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* VISTAS SECUNDARIAS (Navegación) */}
          {activeTab === 'discounts' && (
            <div className="py-8 text-center">
              <Tag className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-slate-800">Descuentos y Promociones</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Aplica cupones especiales o crea promociones para clientes frecuentes.
              </p>
              <div className="mt-6 space-y-2">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 text-left shadow-xs">
                  <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">DESCUENTO POS</span>
                  <h4 className="font-bold text-slate-800 mt-1 text-sm">15% OFF Calzado de Running</h4>
                  <p className="text-xs text-slate-400">Válido en compras mayores a $1,000</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-xl border-2 border-indigo-200">
                JD
              </div>
              <h2 className="text-lg font-bold text-slate-800">John Doe</h2>
              <p className="text-xs text-slate-500">Cajero Principal • Turno Mañana</p>
              
              <div className="mt-6 bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 text-left shadow-xs">
                <div className="p-3.5 flex justify-between items-center text-xs font-semibold text-slate-700">
                  <span>Ventas del día</span>
                  <span className="text-indigo-600 font-bold">$12,450.00</span>
                </div>
                <div className="p-3.5 flex justify-between items-center text-xs font-semibold text-slate-700">
                  <span>Transacciones</span>
                  <span className="text-slate-900 font-bold">18</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* NAVEGACIÓN INFERIOR FLOTANTE (Identico a la imagen) */}
        <div className="absolute bottom-4 left-0 right-0 px-6 z-20 flex justify-center pointer-events-none">
          <div className="bg-white/90 backdrop-blur-md px-5 py-2.5 rounded-full shadow-lg border border-slate-200/80 flex items-center justify-between gap-6 pointer-events-auto">
            {/* Inicio / POS Grid */}
            <button
              onClick={() => setActiveTab('pos')}
              className={`p-1.5 transition-colors ${
                activeTab === 'pos' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Home className="w-5 h-5 stroke-[2.2]" />
            </button>

            {/* Carrito Flotante (Boton Destacado) */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-100 transition-colors shadow-xs relative"
            >
              <ShoppingCart className="w-5 h-5 stroke-[2.2]" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white">
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* Ofertas / Etiqueta */}
            <button
              onClick={() => setActiveTab('discounts')}
              className={`p-1.5 transition-colors ${
                activeTab === 'discounts' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Tag className="w-5 h-5 stroke-[2.2]" />
            </button>

            {/* Usuario Avatar */}
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-6 h-6 rounded-full overflow-hidden ring-2 transition-all ${
                activeTab === 'profile' ? 'ring-indigo-600' : 'ring-transparent'
              }`}
            >
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                alt="Usuario"
                className="w-full h-full object-cover"
              />
            </button>
          </div>
        </div>

        {/* MODAL DE FILTRAR Y ORDENAR (Exacto al lado derecho de la imagen) */}
        {isFilterOpen && (
          <div className="absolute inset-0 z-40 bg-slate-900/40 backdrop-blur-xs flex flex-col justify-end transition-opacity animate-in fade-in duration-200">
            
            {/* Backdrop click to close */}
            <div className="flex-1" onClick={() => setIsFilterOpen(false)} />

            {/* Contenido del Modal Modal */}
            <div className="bg-slate-50 rounded-t-[32px] p-5 pt-3 shadow-2xl border-t border-white/60 animate-in slide-in-from-bottom duration-300 max-h-[88%] overflow-y-auto no-scrollbar">
              
              {/* Tirador superior del Sheet */}
              <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3" />

              {/* Header Modal */}
              <div className="flex items-center justify-between mb-5">
                <button
                  onClick={clearFilters}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Clear
                </button>
                <h2 className="text-sm font-bold text-slate-900">Filter & sort</h2>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 border border-slate-200/60 shadow-2xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sección Filter By */}
              <div className="mb-5">
                <span className="text-xs font-semibold text-slate-500 block mb-2">Filter by</span>
                <div className="bg-white rounded-2xl p-3.5 flex items-center justify-between border border-slate-200/80 shadow-2xs cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600">
                      <SlidersHorizontal className="w-4 h-4 rotate-90" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Category</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="text-xs font-medium text-slate-500">{tempCategory}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Sección Sort By */}
              <div className="mb-6">
                <span className="text-xs font-semibold text-slate-500 block mb-3">Sort by</span>
                <div className="flex flex-wrap gap-2">
                  {SORT_OPTIONS.map((opt) => {
                    const isSelected = tempSort === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setTempSort(opt.id)}
                        className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all duration-150 border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botón Aplicar */}
              <button
                onClick={applyFilters}
                className="w-full bg-indigo-600 text-white font-semibold py-3.5 rounded-full text-xs shadow-md shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-[0.99] mb-2"
              >
                Apply
              </button>

            </div>
          </div>
        )}

        {/* MODAL / DRAWER DEL CARRITO */}
        {isCartOpen && (
          <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex flex-col justify-end transition-opacity">
            <div className="flex-1" onClick={() => setIsCartOpen(false)} />
            
            <div className="bg-white rounded-t-[32px] p-5 pt-4 shadow-2xl border-t border-slate-100 max-h-[85%] flex flex-col animate-in slide-in-from-bottom duration-300">
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
              
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-indigo-600" />
                  <span>Resumen de Venta</span>
                </h2>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Lista de Items en Carrito */}
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <ShoppingCart className="w-12 h-12 stroke-[1] mx-auto mb-2 text-slate-300" />
                  <p className="text-xs">El carrito está vacío</p>
                </div>
              ) : (
                <div className="overflow-y-auto no-scrollbar space-y-3 pr-1 my-2 flex-1">
                  {cart.map(({ product, quantity }) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-12 h-12 object-contain rounded-xl bg-white p-1"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{product.name}</h4>
                          <span className="text-xs font-extrabold text-indigo-600">${product.price}</span>
                        </div>
                      </div>

                      {/* Control de Cantidad */}
                      <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-slate-200">
                        <button
                          onClick={() => updateQuantity(product.id, -1)}
                          className="text-slate-500 hover:text-rose-600 p-0.5"
                        >
                          {quantity === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                        </button>
                        <span className="text-xs font-bold w-4 text-center text-slate-800">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(product.id, 1)}
                          className="text-slate-500 hover:text-indigo-600 p-0.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Total y Botón de Pago */}
              {cart.length > 0 && (
                <div className="pt-3 border-t border-slate-100 mt-2">
                  <div className="flex justify-between items-center mb-1 text-xs text-slate-500">
                    <span>Subtotal</span>
                    <span>${totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center mb-3 text-sm font-extrabold text-slate-900">
                    <span>Total a cobrar</span>
                    <span className="text-indigo-600">${totalPrice.toLocaleString()}</span>
                  </div>

                  <button
                    onClick={() => {
                      showNotification('¡Cobro realizado con éxito! 🎉');
                      setCart([]);
                      setIsCartOpen(false);
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 active:scale-[0.99] transition-all"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Cobrar ${totalPrice.toLocaleString()}</span>
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}