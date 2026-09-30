import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Search,
  SlidersHorizontal,
  ShoppingCart,
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
  Clock3,
  History,
  WalletCards,
  AlertTriangle,
  Info,
  Pencil,
  ArrowLeftRight,
} from 'lucide-react';
import { supabase } from './lib/supabase';

type Product = {
  id: string;
  name: string;
  translatedName: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  stockWarehouse: number;
  sales: number;
  dateAdded: string;
  image: string;
  colorBg: string;
};

type CartItem = {
  product: Product;
  quantity: number;
};

type Sale = {
  id: string;
  fecha_hora: string;
  metodo_pago: string;
  cliente_nota: string | null;
  total: number;
  corte_caja_id?: string | null;
  venta_detalles?: Array<{ cantidad: number; subtotal: number; lote_id: string | null; productos: { nombre: string } | { nombre: string }[] | null; lotes: { nombre: string } | { nombre: string }[] | null }>;
};

type Account = {
  id: string;
  titular: string;
  telefono: string | null;
  saldo_actual: number;
  estado: string;
  asignacion_deuda_lotes?: Array<{ monto_pendiente: number; lote_id: string | null; lotes: { nombre: string } | { nombre: string }[] | null }>;
};

type Batch = {
  id: string;
  nombre: string;
  nota: string | null;
  creado_en: string;
  lote_productos?: Array<{ id: string; producto_id: string; cantidad_loteada: number; cantidad_vendida: number; valor_inicial: number; inversion_inicial: number; ganancia_inicial: number; productos: { nombre: string } | { nombre: string }[] | null }>;
};

type CashCut = {
  id: string;
  fecha_apertura: string;
  fecha_cierre: string | null;
  efectivo_inicial: number;
  efectivo_esperado: number;
  efectivo_contado: number;
  diferencia: number;
  total_ventas_efectivo: number;
  total_ventas_tarjeta: number;
  total_ventas_transferencia: number;
  observaciones: string | null;
  estado: string;
};

type LiquidationConfig = {
  id: string;
  nombre: string;
  propietario_nombre: string;
  companero_nombre: string;
  porcentaje_ganancia_propietario: number;
  porcentaje_ganancia_companero: number;
};

type LiquidationConcept = {
  id: string;
  liquidacion_id: string;
  persona: string;
  concepto: string;
  monto_total: number;
  paid: number;
};

type SettlementPayment = {
  id: string;
  concepto_id: string;
  persona: string;
  concepto: string;
  monto: number;
  nota: string | null;
  creado_en: string;
  estado: string;
};

type LiquidationRow = {
  loteId: string;
  loteNombre: string;
  inversion: number;
  ventas: number;
  ganancia: number;
  liquidationId?: string;
  concepts: LiquidationConcept[];
  payments: SettlementPayment[];
};

type NotificationType = 'success' | 'warning' | 'info' | 'error';

type NewProductForm = {
  nombre: string;
  precioVenta: string;
  costoUnitario: string;
  categoria: string;
  stockTienda: string;
  stockAlmacen: string;
  imagenUrl: string;
};

const INITIAL_PRODUCTS: Product[] = [];

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const CATEGORIES = ['All', 'Casual', 'Running', 'Basketball', 'Training'];

const PAYMENT_METHODS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'cuenta_por_cobrar', label: 'Cuenta por Cobrar' },
];

const SORT_OPTIONS = [
  { id: 'most-sold', label: 'Most sold', esLabel: 'Más vendidos' },
  { id: 'name-asc', label: 'Name (A → Z)', esLabel: 'Nombre (A → Z)' },
  { id: 'name-desc', label: 'Name (Z → A)', esLabel: 'Nombre (Z → A)' },
  { id: 'price-low', label: 'Price (Low → High)', esLabel: 'Precio (Bajo → Alto)' },
  { id: 'price-high', label: 'Price (High → Low)', esLabel: 'Precio (Alto → Bajo)' },
  { id: 'date-newest', label: 'Date added (Newest First)', esLabel: 'Fecha agregada (Reciente)' },
  { id: 'date-oldest', label: 'Date added (Oldest first)', esLabel: 'Fecha agregada (Antiguo)' },
  { id: 'most-recent', label: 'Most Recent', esLabel: 'Recientes' },
];

export default function App() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState('most-sold');
  const [tempSort, setTempSort] = useState('most-sold');
  const [tempCategory, setTempCategory] = useState('All');

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pos');
  const contentRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sales, setSales] = useState<Sale[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [salesError, setSalesError] = useState('');
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({ titular: '', telefono: '', nota: '', saldoInicial: '0' });
  const [accountAction, setAccountAction] = useState<{ account: Account; tipo: 'abono' | 'cargo' } | null>(null);
  const [accountAmount, setAccountAmount] = useState('');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [lotedStock, setLotedStock] = useState<Record<string, number>>({});
  const [cashCut, setCashCut] = useState<CashCut | null>(null);
  const [isCashCutModalOpen, setIsCashCutModalOpen] = useState(false);
  const [isSavingCashCut, setIsSavingCashCut] = useState(false);
  const [cashCutError, setCashCutError] = useState('');
  const [cashCutForm, setCashCutForm] = useState({ efectivoInicial: '0', efectivoContado: '', observaciones: '' });
  const [closedCashCut, setClosedCashCut] = useState<CashCut | null>(null);
  const [closedCutSales, setClosedCutSales] = useState<Sale[]>([]);
  const [isCashCutReportOpen, setIsCashCutReportOpen] = useState(false);
  const [liquidationConfig, setLiquidationConfig] = useState<LiquidationConfig | null>(null);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [settlementCut, setSettlementCut] = useState<CashCut | null>(null);
  const [settlementRows, setSettlementRows] = useState<LiquidationRow[]>([]);
  const [selectedSettlementRow, setSelectedSettlementRow] = useState<LiquidationRow | null>(null);
  const [paymentForm, setPaymentForm] = useState({ conceptId: '', amount: '', note: '' });
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);

  const [toast, setToast] = useState<{ message: string; type: NotificationType } | null>(null);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);
  const [stockAdjustment, setStockAdjustment] = useState({ tienda: '0', almacen: '0', nota: '' });
  const [isRestockingProduct, setIsRestockingProduct] = useState(false);
  const [restockForm, setRestockForm] = useState({ tienda: '0', almacen: '0', nota: '' });
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [batchForm, setBatchForm] = useState({ nombre: '', nota: '' });
  const [batchItems, setBatchItems] = useState<Record<string, string>>({});
  const [batchError, setBatchError] = useState('');
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [addProductError, setAddProductError] = useState('');
  const [newProduct, setNewProduct] = useState<NewProductForm>({
    nombre: '',
    precioVenta: '',
    costoUnitario: '0',
    categoria: '',
    stockTienda: '0',
    stockAlmacen: '0',
    imagenUrl: '',
  });
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editingSaleItems, setEditingSaleItems] = useState<CartItem[]>([]);
  const [isSavingSale, setIsSavingSale] = useState(false);
  const [saleError, setSaleError] = useState('');
  const [saleForm, setSaleForm] = useState({
    paymentMethod: 'efectivo',
    customerNote: '',
    accountMode: 'existing' as 'existing' | 'new',
    accountId: '',
    accountHolder: '',
    saleDate: '',
  });

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    void supabase
      .from('liquidacion_configuraciones')
      .select('id, nombre, propietario_nombre, companero_nombre, porcentaje_ganancia_propietario, porcentaje_ganancia_companero')
      .eq('activa', true)
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setLiquidationConfig({ ...data, porcentaje_ganancia_propietario: Number(data.porcentaje_ganancia_propietario), porcentaje_ganancia_companero: Number(data.porcentaje_ganancia_companero) });
      });
  }, []);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  useEffect(() => {
    void supabase
      .from('cortes_caja')
      .select('id, fecha_apertura, fecha_cierre, efectivo_inicial, efectivo_esperado, efectivo_contado, diferencia, total_ventas_efectivo, total_ventas_tarjeta, total_ventas_transferencia, observaciones, estado')
      .eq('estado', 'abierto')
      .order('fecha_apertura', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setCashCut({ ...data, efectivo_inicial: Number(data.efectivo_inicial), efectivo_esperado: Number(data.efectivo_esperado), efectivo_contado: Number(data.efectivo_contado), diferencia: Number(data.diferencia), total_ventas_efectivo: Number(data.total_ventas_efectivo), total_ventas_tarjeta: Number(data.total_ventas_tarjeta), total_ventas_transferencia: Number(data.total_ventas_transferencia) });
      });
  }, []);

  useEffect(() => {
    void supabase
      .from('lote_productos')
      .select('producto_id, cantidad_loteada, cantidad_vendida')
      .then(({ data }) => {
        if (!data) return;
        setLotedStock(data.reduce<Record<string, number>>((stock, row) => {
          stock[row.producto_id] = (stock[row.producto_id] || 0) + Math.max(0, Number(row.cantidad_loteada) - Number(row.cantidad_vendida));
          return stock;
        }, {}));
      });
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      setIsLoadingSales(true);
      setSalesError('');
      void supabase
        .from('ventas')
        .select('id, fecha_hora, metodo_pago, cliente_nota, total, corte_caja_id, venta_detalles(cantidad, subtotal, lote_id, productos(nombre), lotes(nombre))')
        .order('fecha_hora', { ascending: false })
        .limit(50)
        .then(({ data, error }) => {
          if (error) setSalesError(error.message);
          else setSales((data ?? []).map((sale) => ({ ...sale, total: Number(sale.total) })));
          setIsLoadingSales(false);
        });
      void supabase
        .from('cortes_caja')
        .select('id, fecha_apertura, fecha_cierre, efectivo_inicial, efectivo_esperado, efectivo_contado, diferencia, total_ventas_efectivo, total_ventas_tarjeta, total_ventas_transferencia, observaciones, estado')
        .eq('estado', 'abierto')
        .order('fecha_apertura', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setCashCut({ ...data, efectivo_inicial: Number(data.efectivo_inicial), efectivo_esperado: Number(data.efectivo_esperado), efectivo_contado: Number(data.efectivo_contado), diferencia: Number(data.diferencia), total_ventas_efectivo: Number(data.total_ventas_efectivo), total_ventas_tarjeta: Number(data.total_ventas_tarjeta), total_ventas_transferencia: Number(data.total_ventas_transferencia) });
          else setCashCut(null);
        });
    }
    if (activeTab === 'accounts') {
      setIsLoadingAccounts(true);
      void supabase
        .from('cuentas_por_cobrar')
        .select('id, titular, telefono, saldo_actual, estado, asignacion_deuda_lotes(monto_pendiente, lote_id, lotes(nombre))')
        .order('actualizado_en', { ascending: false })
        .then(({ data, error }) => {
          if (!error) setAccounts((data ?? []).map((account) => ({ ...account, saldo_actual: Number(account.saldo_actual) })));
          setIsLoadingAccounts(false);
        });
    }
    if (activeTab === 'batches') {
      setIsLoadingBatches(true);
      void supabase
        .from('lotes')
        .select('id, nombre, nota, creado_en, lote_productos(id, producto_id, cantidad_loteada, cantidad_vendida, valor_inicial, inversion_inicial, ganancia_inicial, productos(nombre))')
        .order('creado_en', { ascending: true })
        .then(({ data, error }) => {
          if (!error) {
            setBatches((data ?? []).map((batch) => ({
              ...batch,
              lote_productos: (batch.lote_productos ?? []).map((item) => {
                const product = products.find((currentProduct) => currentProduct.id === item.producto_id);
                const investment = Number(item.inversion_inicial) || (product?.cost || 0) * Number(item.cantidad_loteada);
                return { ...item, valor_inicial: Number(item.valor_inicial), inversion_inicial: investment, ganancia_inicial: Number(item.ganancia_inicial) || Number(item.valor_inicial) - investment };
              }),
            })));
          }
          setIsLoadingBatches(false);
        });
    }
  }, [activeTab]);

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      const { data, error } = await supabase
        .from('productos')
        .select('id, nombre, precio_venta, costo_unitario, categoria, imagen_url, stock_tienda, stock_almacen, creado_en')
        .order('creado_en', { ascending: false });

      if (!isMounted) return;

      if (error) {
        setProductsError(error.message);
        setIsLoadingProducts(false);
        return;
      }

      setProducts(
        (data ?? []).map((product) => ({
          id: product.id,
          name: product.nombre,
          translatedName: product.nombre,
          category: product.categoria || 'Sin categoría',
          price: Number(product.precio_venta),
          cost: Number(product.costo_unitario) || 0,
          stock: product.stock_tienda,
          stockWarehouse: product.stock_almacen,
          sales: 0,
          dateAdded: product.creado_en,
          image: product.imagen_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80',
          colorBg: 'bg-slate-100',
        })),
      );
      setIsLoadingProducts(false);
    };

    void loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const showNotification = (message: string, type: NotificationType = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  const openSettlement = async (cut: CashCut, cutSales: Sale[]) => {
    const salesByLot = new Map<string, { nombre: string; ventas: number }>();
    cutSales.forEach((sale) => sale.venta_detalles?.forEach((detail) => {
      if (!detail.lote_id) return;
      const name = Array.isArray(detail.lotes) ? detail.lotes[0]?.nombre : detail.lotes?.nombre;
      const current = salesByLot.get(detail.lote_id) || { nombre: name || 'Lote', ventas: 0 };
      salesByLot.set(detail.lote_id, { ...current, ventas: current.ventas + Number(detail.subtotal) });
    }));
    const lotIds = [...salesByLot.keys()];
    if (!lotIds.length) {
      showNotification('Este corte no tiene ventas asociadas a lotes.', 'warning');
      return;
    }
    const existing = await supabase.from('liquidaciones').select('*').eq('corte_caja_id', cut.id).in('lote_id', lotIds);
    if (existing.error) { showNotification(`No se pudieron cargar las liquidaciones: ${existing.error.message}`, 'error'); return; }
    const liquidationIds = (existing.data ?? []).map((item) => item.id);
    const conceptsResult = liquidationIds.length ? await supabase.from('liquidacion_conceptos').select('*').in('liquidacion_id', liquidationIds) : { data: [], error: null };
    const paymentsResult = liquidationIds.length ? await supabase.from('pagos_liquidacion').select('id, liquidacion_id, concepto_id, persona, concepto, monto, nota, creado_en, estado').in('liquidacion_id', liquidationIds) : { data: [], error: null };
    if (conceptsResult.error || paymentsResult.error) { showNotification('No se pudo cargar el historial de liquidación.', 'error'); return; }
    const paidByConcept = new Map<string, number>();
    (paymentsResult.data ?? []).forEach((payment) => { if (payment.estado === 'activo') paidByConcept.set(payment.concepto_id, (paidByConcept.get(payment.concepto_id) || 0) + Number(payment.monto)); });
    const rows = lotIds.map((loteId) => {
      const batch = batches.find((item) => item.id === loteId);
      const inversion = (batch?.lote_productos ?? []).reduce((total, item) => total + Number(item.inversion_inicial), 0);
      const ventas = salesByLot.get(loteId)?.ventas || 0;
      const concepts = (conceptsResult.data ?? []).filter((item) => item.liquidacion_id === (existing.data ?? []).find((liquidation) => liquidation.lote_id === loteId)?.id).map((item) => ({ ...item, monto_total: Number(item.monto_total), paid: paidByConcept.get(item.id) || 0 }));
      return { loteId, loteNombre: batch?.nombre || salesByLot.get(loteId)?.nombre || 'Lote', inversion, ventas, ganancia: ventas - inversion, liquidationId: (existing.data ?? []).find((item) => item.lote_id === loteId)?.id, concepts, payments: (paymentsResult.data ?? []).filter((payment) => payment.liquidacion_id === (existing.data ?? []).find((liquidation) => liquidation.lote_id === loteId)?.id).map((payment) => ({ ...payment, monto: Number(payment.monto) })) };
    });
    setSettlementCut(cut);
    setSettlementRows(rows);
    setSelectedSettlementRow(null);
    setIsSettlementOpen(true);
  };

  const createSettlementForRow = async (row: LiquidationRow) => {
    if (!liquidationConfig || !settlementCut) return;
    if (row.liquidationId) { setSelectedSettlementRow(row); return; }
    const ownerProfit = Math.max(0, row.ganancia) * liquidationConfig.porcentaje_ganancia_propietario / 100;
    const partnerProfit = Math.max(0, row.ganancia) * liquidationConfig.porcentaje_ganancia_companero / 100;
    const created = await supabase.from('liquidaciones').insert({ lote_id: row.loteId, corte_caja_id: settlementCut.id, configuracion_id: liquidationConfig.id, propietario_nombre: liquidationConfig.propietario_nombre, companero_nombre: liquidationConfig.companero_nombre, porcentaje_ganancia_propietario: liquidationConfig.porcentaje_ganancia_propietario, porcentaje_ganancia_companero: liquidationConfig.porcentaje_ganancia_companero, inversion_total: row.inversion, ventas_total: row.ventas, ganancia_total: row.ganancia }).select().single();
    if (created.error) { showNotification(`No se pudo crear la liquidación: ${created.error.message}`, 'error'); return; }
    const concepts = await supabase.from('liquidacion_conceptos').insert([
      { liquidacion_id: created.data.id, persona: liquidationConfig.propietario_nombre, concepto: 'Recuperación de inversión', monto_total: row.inversion },
      { liquidacion_id: created.data.id, persona: liquidationConfig.propietario_nombre, concepto: 'Ganancia', monto_total: ownerProfit },
      { liquidacion_id: created.data.id, persona: liquidationConfig.companero_nombre, concepto: 'Ganancia', monto_total: partnerProfit },
    ]).select();
    if (concepts.error) { showNotification(`No se pudieron crear los conceptos: ${concepts.error.message}`, 'error'); return; }
    const nextRow = { ...row, liquidationId: created.data.id, concepts: (concepts.data ?? []).map((item) => ({ ...item, monto_total: Number(item.monto_total), paid: 0 })), payments: [] };
    setSettlementRows((current) => current.map((item) => item.loteId === row.loteId ? nextRow : item));
    setSelectedSettlementRow(nextRow);
    showNotification('Liquidación creada. Ahora puedes registrar pagos parciales.');
  };

  const saveSettlementPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSettlementRow || !settlementCut || !paymentForm.conceptId) return;
    const concept = selectedSettlementRow.concepts.find((item) => item.id === paymentForm.conceptId);
    if (!concept) return;
    const amount = Number(paymentForm.amount);
    const pending = concept.monto_total - concept.paid;
    if (!amount || amount <= 0 || amount > pending) { showNotification(`El pago no puede superar el pendiente de $${pending.toLocaleString()}.`, 'warning'); return; }
    setIsSavingPayment(true);
    const result = await supabase.from('pagos_liquidacion').insert({ liquidacion_id: selectedSettlementRow.liquidationId, concepto_id: concept.id, corte_caja_id: settlementCut.id, persona: concept.persona, concepto: concept.concepto, monto: amount, nota: paymentForm.note.trim() || null }).select().single();
    setIsSavingPayment(false);
    if (result.error) { showNotification(`No se pudo registrar el pago: ${result.error.message}`, 'error'); return; }
    const updatedRow = { ...selectedSettlementRow, concepts: selectedSettlementRow.concepts.map((item) => item.id === concept.id ? { ...item, paid: item.paid + amount } : item), payments: [...selectedSettlementRow.payments, { ...result.data, monto: Number(result.data.monto) }] };
    const updatedPaid = updatedRow.concepts.reduce((sum, item) => sum + item.paid, 0);
    const updatedTotal = updatedRow.concepts.reduce((sum, item) => sum + item.monto_total, 0);
    await supabase.from('liquidaciones').update({ estado: updatedPaid === 0 ? 'pendiente' : updatedPaid >= updatedTotal ? 'liquidado' : 'parcial', actualizado_en: new Date().toISOString() }).eq('id', updatedRow.liquidationId);
    setSelectedSettlementRow(updatedRow);
    setSettlementRows((current) => current.map((item) => item.loteId === updatedRow.loteId ? updatedRow : item));
    setPaymentForm({ conceptId: '', amount: '', note: '' });
    showNotification('Pago registrado y agregado al historial.');
  };

  const saveLiquidationConfig = async () => {
    if (!liquidationConfig) return;
    const ownerPercent = Number(liquidationConfig.porcentaje_ganancia_propietario);
    const partnerPercent = Number(liquidationConfig.porcentaje_ganancia_companero);
    if (ownerPercent < 0 || partnerPercent < 0 || ownerPercent + partnerPercent > 100) {
      showNotification('Los porcentajes de ganancia no pueden superar el 100%.', 'warning');
      return;
    }
    const { error } = await supabase.from('liquidacion_configuraciones').update({ propietario_nombre: liquidationConfig.propietario_nombre.trim() || 'Yo', companero_nombre: liquidationConfig.companero_nombre.trim() || 'Compañero', porcentaje_ganancia_propietario: ownerPercent, porcentaje_ganancia_companero: partnerPercent, actualizado_en: new Date().toISOString() }).eq('id', liquidationConfig.id);
    if (error) { showNotification(`No se pudo guardar la configuración: ${error.message}`, 'error'); return; }
    setLiquidationConfig({ ...liquidationConfig, porcentaje_ganancia_propietario: ownerPercent, porcentaje_ganancia_companero: partnerPercent });
    showNotification('Configuración guardada para nuevas liquidaciones.');
  };

  const reverseSettlementPayment = async (payment: SettlementPayment) => {
    if (!selectedSettlementRow || !settlementCut || payment.estado !== 'activo') return;
    if (!window.confirm('¿Revertir este pago? El historial original se conservará.')) return;
    const reversal = await supabase.from('pagos_liquidacion').insert({ liquidacion_id: selectedSettlementRow.liquidationId, concepto_id: payment.concepto_id, corte_caja_id: settlementCut.id, persona: payment.persona, concepto: payment.concepto, monto: payment.monto, estado: 'reversion', pago_reversion_id: payment.id, nota: `Reversión del pago ${payment.id}` }).select().single();
    if (reversal.error) { showNotification(`No se pudo crear la reversión: ${reversal.error.message}`, 'error'); return; }
    const original = await supabase.from('pagos_liquidacion').update({ estado: 'revertido' }).eq('id', payment.id);
    if (original.error) { showNotification(`La reversión no pudo completarse: ${original.error.message}`, 'error'); return; }
    const updatedRow = { ...selectedSettlementRow, concepts: selectedSettlementRow.concepts.map((item) => item.id === payment.concepto_id ? { ...item, paid: Math.max(0, item.paid - payment.monto) } : item), payments: [...selectedSettlementRow.payments.map((item) => item.id === payment.id ? { ...item, estado: 'revertido' } : item), { ...reversal.data, monto: Number(reversal.data.monto) }] };
    const updatedPaid = updatedRow.concepts.reduce((sum, item) => sum + item.paid, 0);
    const updatedTotal = updatedRow.concepts.reduce((sum, item) => sum + item.monto_total, 0);
    await supabase.from('liquidaciones').update({ estado: updatedPaid === 0 ? 'pendiente' : updatedPaid >= updatedTotal ? 'liquidado' : 'parcial', actualizado_en: new Date().toISOString() }).eq('id', updatedRow.liquidationId);
    setSelectedSettlementRow(updatedRow);
    setSettlementRows((current) => current.map((item) => item.loteId === updatedRow.loteId ? updatedRow : item));
    showNotification('Pago revertido y conservado en el historial.');
  };

  const openCashCutModal = () => {
    setCashCutError('');
    setCashCutForm({ efectivoInicial: cashCut ? String(cashCut.efectivo_inicial) : '0', efectivoContado: '', observaciones: '' });
    setIsCashCutModalOpen(true);
  };

  const saveCashCut = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCashCutError('');
    setIsSavingCashCut(true);
    const efectivoInicial = Number(cashCutForm.efectivoInicial) || 0;
    const efectivoContado = Number(cashCutForm.efectivoContado) || 0;
    const currentCutSales = cashCut ? sales.filter((sale) => sale.corte_caja_id === cashCut.id || (!sale.corte_caja_id && new Date(sale.fecha_hora).getTime() >= new Date(cashCut.fecha_apertura).getTime())) : [];
    const efectivoEsperado = efectivoInicial + currentCutSales.filter((sale) => sale.metodo_pago === 'efectivo').reduce((total, sale) => total + sale.total, 0);
    const totals = {
      efectivo_inicial: efectivoInicial,
      efectivo_esperado: efectivoEsperado,
      efectivo_contado: efectivoContado,
      diferencia: efectivoContado - efectivoEsperado,
      total_ventas_efectivo: currentCutSales.filter((sale) => sale.metodo_pago === 'efectivo').reduce((total, sale) => total + sale.total, 0),
      total_ventas_tarjeta: currentCutSales.filter((sale) => sale.metodo_pago === 'tarjeta').reduce((total, sale) => total + sale.total, 0),
      total_ventas_transferencia: currentCutSales.filter((sale) => sale.metodo_pago === 'transferencia').reduce((total, sale) => total + sale.total, 0),
      observaciones: cashCutForm.observaciones.trim() || null,
    };
    const result = cashCut
      ? await supabase.from('cortes_caja').update({ ...totals, fecha_cierre: new Date().toISOString(), estado: 'cerrado' }).eq('id', cashCut.id).select().single()
      : await supabase.from('cortes_caja').insert({ efectivo_inicial: efectivoInicial, efectivo_esperado: efectivoInicial, efectivo_contado: 0, diferencia: 0, total_ventas_efectivo: 0, total_ventas_tarjeta: 0, total_ventas_transferencia: 0, observaciones: totals.observaciones, estado: 'abierto' }).select().single();
    if (result.error) {
      setCashCutError(result.error.message);
      setIsSavingCashCut(false);
      return;
    }
    const saved = { ...result.data, efectivo_inicial: Number(result.data.efectivo_inicial), efectivo_esperado: Number(result.data.efectivo_esperado), efectivo_contado: Number(result.data.efectivo_contado), diferencia: Number(result.data.diferencia), total_ventas_efectivo: Number(result.data.total_ventas_efectivo), total_ventas_tarjeta: Number(result.data.total_ventas_tarjeta), total_ventas_transferencia: Number(result.data.total_ventas_transferencia) };
    setCashCut(saved.estado === 'abierto' ? saved : null);
    setIsCashCutModalOpen(false);
    setIsSavingCashCut(false);
    if (cashCut) {
      setClosedCashCut(saved);
      setClosedCutSales(currentCutSales);
      setIsCashCutReportOpen(true);
    }
    showNotification(cashCut ? 'Corte de caja cerrado' : 'Corte de caja abierto');
  };

  const openCheckout = () => {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setSaleError('');
    setEditingSale(null);
    setSaleForm({ paymentMethod: 'efectivo', customerNote: '', accountMode: 'existing', accountId: '', accountHolder: '', saleDate: localDate });
    setIsCheckoutOpen(true);
  };

  useEffect(() => {
    if (!isCheckoutOpen || accounts.length) return;
    void supabase
      .from('cuentas_por_cobrar')
      .select('id, titular, telefono, saldo_actual, estado, asignacion_deuda_lotes(monto_pendiente, lote_id, lotes(nombre))')
      .order('actualizado_en', { ascending: false })
      .then(({ data }) => {
        if (data) setAccounts(data.map((account) => ({ ...account, saldo_actual: Number(account.saldo_actual) })));
      });
  }, [isCheckoutOpen, accounts.length]);

  const saveSale = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaleError('');
    if (!editingSale && saleForm.paymentMethod === 'cuenta_por_cobrar' && saleForm.accountMode === 'existing' && !saleForm.accountId) {
      setSaleError('Selecciona una cuenta por cobrar.');
      return;
    }
    if (!editingSale && saleForm.paymentMethod === 'cuenta_por_cobrar' && saleForm.accountMode === 'new' && !saleForm.accountHolder.trim()) {
      setSaleError('Indica el titular de la nueva cuenta.');
      return;
    }

    if (editingSale) {
      setIsSavingSale(true);
      const { error } = await supabase.from('ventas').update({ fecha_hora: new Date(saleForm.saleDate).toISOString(), metodo_pago: saleForm.paymentMethod, cliente_nota: saleForm.customerNote.trim() || null, total: totalPrice, actualizado_en: new Date().toISOString() }).eq('id', editingSale.id);
      if (error) setSaleError(error.message);
      else {
        await supabase.from('venta_detalles').delete().eq('venta_id', editingSale.id);
        const detailResult = await supabase.from('venta_detalles').insert(cart.map(({ product, quantity }) => ({ venta_id: editingSale.id, producto_id: product.id, lote_id: null, cantidad: quantity, precio_unitario: product.price, subtotal: product.price * quantity })));
        if (detailResult.error) { setSaleError(detailResult.error.message); setIsSavingSale(false); return; }
        const allProductIds = new Set([...editingSaleItems.map(({ product }) => product.id), ...cart.map(({ product }) => product.id)]);
        for (const productId of allProductIds) {
          const before = editingSaleItems.find(({ product }) => product.id === productId)?.quantity || 0;
          const after = cart.find(({ product }) => product.id === productId)?.quantity || 0;
          if (before !== after) await supabase.from('productos').update({ stock_tienda: (products.find((product) => product.id === productId)?.stock || 0) + before - after }).eq('id', productId);
        }
        setSales((current) => current.map((sale) => sale.id === editingSale.id ? { ...sale, fecha_hora: new Date(saleForm.saleDate).toISOString(), metodo_pago: saleForm.paymentMethod, cliente_nota: saleForm.customerNote.trim() || null } : sale));
        setProducts((current) => current.map((product) => {
          const before = editingSaleItems.find(({ product: item }) => item.id === product.id)?.quantity || 0;
          const after = cart.find(({ product: item }) => item.id === product.id)?.quantity || 0;
          return before !== after ? { ...product, stock: product.stock + before - after } : product;
        }));
        setEditingSale(null);
        setEditingSaleItems([]);
        setIsCheckoutOpen(false);
        showNotification('Venta actualizada');
      }
      setIsSavingSale(false);
      return;
    }

    if (!cart.length) return;

    setIsSavingSale(true);
    const activeCut = await supabase
      .from('cortes_caja')
      .select('id, fecha_apertura, fecha_cierre, efectivo_inicial, efectivo_esperado, efectivo_contado, diferencia, total_ventas_efectivo, total_ventas_tarjeta, total_ventas_transferencia, observaciones, estado')
      .eq('estado', 'abierto')
      .order('fecha_apertura', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (activeCut.error) {
      setSaleError(`No se pudo validar el corte abierto: ${activeCut.error.message}`);
      setIsSavingSale(false);
      return;
    }
    if (!activeCut.data) {
      setSaleError('Abre un corte de caja antes de registrar ventas.');
      setIsSavingSale(false);
      return;
    }
    const activeCashCut = { ...activeCut.data, efectivo_inicial: Number(activeCut.data.efectivo_inicial), efectivo_esperado: Number(activeCut.data.efectivo_esperado), efectivo_contado: Number(activeCut.data.efectivo_contado), diferencia: Number(activeCut.data.diferencia), total_ventas_efectivo: Number(activeCut.data.total_ventas_efectivo), total_ventas_tarjeta: Number(activeCut.data.total_ventas_tarjeta), total_ventas_transferencia: Number(activeCut.data.total_ventas_transferencia) };
    setCashCut(activeCashCut);
    let accountId: string | null = null;

    const lotRows = await supabase
      .from('lote_productos')
      .select('lote_id, producto_id, cantidad_loteada, cantidad_vendida, lotes(nombre, creado_en)')
      .in('producto_id', cart.map(({ product }) => product.id))
      .order('creado_en', { ascending: true });
    if (lotRows.error) {
      setSaleError(`No se pudieron consultar los lotes: ${lotRows.error.message}`);
      setIsSavingSale(false);
      return;
    }
    const assignedLots = new Map<string, { lote_id: string; available: number; nombre: string | null }>();
    for (const item of cart) {
      const lot = (lotRows.data ?? []).find((row) => row.producto_id === item.product.id && Number(row.cantidad_loteada) > Number(row.cantidad_vendida));
      if (lot) {
        const lotName = Array.isArray(lot.lotes) ? (lot.lotes[0] as { nombre?: string } | undefined)?.nombre : (lot.lotes as { nombre?: string } | null)?.nombre;
        assignedLots.set(item.product.id, { lote_id: lot.lote_id, available: Number(lot.cantidad_loteada) - Number(lot.cantidad_vendida), nombre: lotName || null });
      }
    }

    if (saleForm.paymentMethod === 'cuenta_por_cobrar') {
      if (saleForm.accountMode === 'existing') {
        accountId = saleForm.accountId;
      } else {
        const created = await supabase
          .from('cuentas_por_cobrar')
          .insert({ titular: saleForm.accountHolder.trim(), saldo_inicial: 0, saldo_actual: 0 })
          .select('id')
          .single();
        if (created.error) {
          setSaleError(created.error.message);
          setIsSavingSale(false);
          return;
        }
        accountId = created.data.id;
      }
    }

    const saleId = createId();
    const saleDate = new Date(saleForm.saleDate);
    if (Number.isNaN(saleDate.getTime())) {
      setSaleError('La fecha de la venta no es válida.');
      setIsSavingSale(false);
      return;
    }
    let sale;
    try {
      sale = await supabase
        .from('ventas')
        .insert({
          id: saleId,
          fecha_hora: saleDate.toISOString(),
          metodo_pago: saleForm.paymentMethod,
          cliente_nota: saleForm.customerNote.trim() || null,
          cuenta_por_cobrar_id: accountId,
          corte_caja_id: activeCashCut.id,
          total: totalPrice,
        });
    } catch (error) {
      setSaleError(`No se pudo conectar con Supabase: ${error instanceof Error ? error.message : 'error desconocido'}`);
      setIsSavingSale(false);
      return;
    }
    if (sale.error) {
      setSaleError(`No se pudo guardar la venta: ${sale.error.message}`);
      showNotification('No se pudo registrar la venta', 'error');
      setIsSavingSale(false);
      return;
    }

    const details = await supabase.from('venta_detalles').insert(
      cart.map(({ product, quantity }) => ({
        venta_id: saleId,
        producto_id: product.id,
        lote_id: assignedLots.get(product.id)?.lote_id || null,
        cantidad: quantity,
        precio_unitario: product.price,
        subtotal: product.price * quantity,
      })),
    );
    if (details.error) {
      await supabase.from('ventas').delete().eq('id', saleId);
      setSaleError(`No se pudieron guardar los productos: ${details.error.message}`);
      showNotification('No se guardaron los productos de la venta', 'error');
      setIsSavingSale(false);
      return;
    }

    setLotedStock((current) => {
      const next = { ...current };
      cart.forEach(({ product, quantity }) => {
        const lot = assignedLots.get(product.id);
        if (lot) next[product.id] = Math.max(0, (next[product.id] || 0) - quantity);
      });
      return next;
    });

    await Promise.all(cart.map(({ product, quantity }) => {
      const lot = assignedLots.get(product.id);
      return lot ? supabase.from('lote_productos').update({ cantidad_vendida: Number(lotRows.data?.find((row) => row.lote_id === lot.lote_id && row.producto_id === product.id)?.cantidad_vendida || 0) + quantity }).eq('lote_id', lot.lote_id).eq('producto_id', product.id) : Promise.resolve({ error: null });
    }));

    const stockResults = await Promise.all(cart.map(({ product, quantity }) =>
      supabase.from('productos').update({ stock_tienda: product.stock - quantity }).eq('id', product.id),
    ));
    const stockError = stockResults.find((result) => result.error)?.error;
    if (stockError) {
      await supabase.from('venta_detalles').delete().eq('venta_id', saleId);
      await supabase.from('ventas').delete().eq('id', saleId);
      setSaleError(`No se pudo actualizar el stock: ${stockError.message}`);
      showNotification('No se pudo actualizar el stock', 'error');
      setIsSavingSale(false);
      return;
    }
    if (accountId) {
      const movement = await supabase.from('movimientos_cuenta').insert({
        cuenta_id: accountId,
        tipo: 'cargo',
        monto: totalPrice,
        nota: saleForm.customerNote.trim() || 'Venta a crédito',
        venta_id: saleId,
      });
      if (movement.error) {
        setSaleError(`Venta guardada, pero no se registró el crédito: ${movement.error.message}`);
        setIsSavingSale(false);
        return;
      }
      const account = await supabase.from('cuentas_por_cobrar').select('saldo_actual').eq('id', accountId).single();
      if (!account.error) {
        await supabase.from('cuentas_por_cobrar').update({ saldo_actual: Number(account.data.saldo_actual) + totalPrice }).eq('id', accountId);
      }
      const lotAssignments = await supabase.from('lote_productos').select('producto_id, lote_id').in('producto_id', cart.map(({ product }) => product.id));
      const assignmentRows = cart.map(({ product, quantity }) => {
        const lot = lotAssignments.data?.find((item) => item.producto_id === product.id);
        return { cuenta_id: accountId, lote_id: lot?.lote_id || null, monto_pendiente: product.price * quantity };
      });
      await supabase.from('asignacion_deuda_lotes').insert(assignmentRows);
    }

    setProducts((currentProducts) => currentProducts.map((product) => {
      const item = cart.find(({ product: cartProduct }) => cartProduct.id === product.id);
      return item ? { ...product, stock: product.stock - item.quantity } : product;
    }));
    if (accountId) {
      setAccounts((currentAccounts) => currentAccounts.map((account) => account.id === accountId ? { ...account, saldo_actual: account.saldo_actual + totalPrice } : account));
    }
    setSales((currentSales) => [{ id: saleId, fecha_hora: saleDate.toISOString(), metodo_pago: saleForm.paymentMethod, cliente_nota: saleForm.customerNote.trim() || null, total: totalPrice, corte_caja_id: activeCashCut.id, venta_detalles: cart.map(({ product, quantity }) => ({ cantidad: quantity, subtotal: product.price * quantity, lote_id: assignedLots.get(product.id)?.lote_id || null, productos: { nombre: product.name }, lotes: assignedLots.get(product.id)?.nombre ? { nombre: assignedLots.get(product.id)!.nombre! } : null })) }, ...currentSales]);
    setCart([]);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    setIsSavingSale(false);
    showNotification('Venta guardada correctamente');
  };

  const handleAddProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingProduct(true);
    setAddProductError('');

    const { data, error } = await supabase
      .from('productos')
      .insert({
        nombre: newProduct.nombre.trim(),
        precio_venta: Number(newProduct.precioVenta),
        costo_unitario: Number(newProduct.costoUnitario) || 0,
        categoria: newProduct.categoria.trim() || null,
        imagen_url: newProduct.imagenUrl.trim() || null,
        stock_tienda: Number(newProduct.stockTienda) || 0,
        stock_almacen: Number(newProduct.stockAlmacen) || 0,
      })
      .select('id, nombre, precio_venta, costo_unitario, categoria, imagen_url, stock_tienda, stock_almacen, creado_en')
      .single();

    if (error) {
      setAddProductError(error.message);
      setIsSavingProduct(false);
      return;
    }

    setProducts((currentProducts) => [
      {
        id: data.id,
        name: data.nombre,
        translatedName: data.nombre,
        category: data.categoria || 'Sin categoría',
        price: Number(data.precio_venta),
        cost: Number(data.costo_unitario) || 0,
        stock: data.stock_tienda,
        stockWarehouse: data.stock_almacen,
        sales: 0,
        dateAdded: data.creado_en,
        image: data.imagen_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80',
        colorBg: 'bg-slate-100',
      },
      ...currentProducts,
    ]);
    setNewProduct({ nombre: '', precioVenta: '', costoUnitario: '0', categoria: '', stockTienda: '0', stockAlmacen: '0', imagenUrl: '' });
    setIsSavingProduct(false);
    setIsAddProductOpen(false);
    showNotification('Producto agregado correctamente');
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({ nombre: product.name, precioVenta: String(product.price), costoUnitario: '0', categoria: product.category, stockTienda: String(product.stock), stockAlmacen: String(product.stockWarehouse), imagenUrl: product.image });
    setAddProductError('');
    setIsAddProductOpen(true);
  };

  const handleUpdateProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingProduct) return handleAddProduct(event);
    setIsSavingProduct(true);
    setAddProductError('');
    const { error } = await supabase
      .from('productos')
      .update({ nombre: newProduct.nombre.trim(), precio_venta: Number(newProduct.precioVenta), costo_unitario: Number(newProduct.costoUnitario) || 0, categoria: newProduct.categoria.trim() || null, imagen_url: newProduct.imagenUrl.trim() || null, stock_tienda: Number(newProduct.stockTienda) || 0, stock_almacen: Number(newProduct.stockAlmacen) || 0, actualizado_en: new Date().toISOString() })
      .eq('id', editingProduct.id);
    if (error) {
      setAddProductError(error.message);
      setIsSavingProduct(false);
      return;
    }
    setProducts((currentProducts) => currentProducts.map((product) => product.id === editingProduct.id ? { ...product, name: newProduct.nombre.trim(), translatedName: newProduct.nombre.trim(), category: newProduct.categoria.trim() || 'Sin categoría', price: Number(newProduct.precioVenta), cost: Number(newProduct.costoUnitario) || 0, stock: Number(newProduct.stockTienda) || 0, stockWarehouse: Number(newProduct.stockAlmacen) || 0, image: newProduct.imagenUrl.trim() || product.image } : product));
    setIsSavingProduct(false);
    setIsAddProductOpen(false);
    setEditingProduct(null);
    showNotification('Producto actualizado');
  };

  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`¿Eliminar ${product.name}?`)) return;
    const { error } = await supabase.from('productos').delete().eq('id', product.id);
    if (error) {
      showNotification(`No se pudo eliminar: ${error.message}`, 'error');
      return;
    }
    setProducts((currentProducts) => currentProducts.filter((item) => item.id !== product.id));
    showNotification('Producto eliminado');
  };

  const saveStockAdjustment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingProduct) return;
    const tienda = Number(stockAdjustment.tienda);
    const almacen = Number(stockAdjustment.almacen);
    if (tienda < 0 || almacen < 0 || tienda + almacen !== editingProduct.stock + editingProduct.stockWarehouse) {
      showNotification('La distribución debe conservar el stock total actual', 'warning');
      return;
    }
    const { data: updatedProduct, error } = await supabase
      .from('productos')
      .update({ stock_tienda: tienda, stock_almacen: almacen, actualizado_en: new Date().toISOString() })
      .eq('id', editingProduct.id)
      .select('id, stock_tienda, stock_almacen')
      .maybeSingle();
    if (error) {
      showNotification(`No se pudo ajustar: ${error.message}`, 'error');
      return;
    }
    if (!updatedProduct) {
      showNotification('No se actualizó ningún producto. Verifica el ID y las políticas RLS de productos.', 'error');
      return;
    }
    const { error: movementError } = await supabase.from('movimientos_inventario').insert({ producto_id: editingProduct.id, tipo: 'ajuste_ubicacion', delta_stock_tienda: tienda - editingProduct.stock, delta_stock_almacen: almacen - editingProduct.stockWarehouse, nota: stockAdjustment.nota.trim() || 'Ajuste de ubicación' });
    if (movementError) {
      showNotification(`Stock actualizado, pero no se registró el movimiento: ${movementError.message}`, 'warning');
    }
    setProducts((currentProducts) => currentProducts.map((product) => product.id === editingProduct.id ? { ...product, stock: tienda, stockWarehouse: almacen } : product));
    setIsAdjustingStock(false);
    showNotification('Ubicación de stock actualizada');
  };

  const saveProductRestock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingProduct) return;
    const tienda = Number(restockForm.tienda) || 0;
    const almacen = Number(restockForm.almacen) || 0;
    if (tienda < 0 || almacen < 0 || tienda + almacen <= 0) {
      showNotification('Agrega al menos una unidad para reabastecer.', 'warning');
      return;
    }

    const nextTienda = editingProduct.stock + tienda;
    const nextAlmacen = editingProduct.stockWarehouse + almacen;
    const { data: updatedProduct, error } = await supabase
      .from('productos')
      .update({ stock_tienda: nextTienda, stock_almacen: nextAlmacen, actualizado_en: new Date().toISOString() })
      .eq('id', editingProduct.id)
      .select('id, stock_tienda, stock_almacen')
      .maybeSingle();
    if (error) {
      showNotification(`No se pudo registrar el reestock: ${error.message}`, 'error');
      return;
    }
    if (!updatedProduct) {
      showNotification('No se actualizó el producto. Verifica el ID y las políticas RLS.', 'error');
      return;
    }

    const { error: movementError } = await supabase.from('movimientos_inventario').insert({
      producto_id: editingProduct.id,
      tipo: 'reabastecimiento',
      delta_stock_tienda: tienda,
      delta_stock_almacen: almacen,
      nota: restockForm.nota.trim() || 'Reabastecimiento de inventario',
    });
    if (movementError) showNotification(`Stock actualizado, pero no se registró el movimiento: ${movementError.message}`, 'warning');
    setProducts((currentProducts) => currentProducts.map((product) => product.id === editingProduct.id ? { ...product, stock: nextTienda, stockWarehouse: nextAlmacen } : product));
    setIsRestockingProduct(false);
    setEditingProduct(null);
    setRestockForm({ tienda: '0', almacen: '0', nota: '' });
    showNotification('Reestock registrado correctamente');
  };

  const saveBatch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedItems = Object.entries(batchItems).filter(([, quantity]) => Number(quantity) > 0);
    if (!batchForm.nombre.trim() || !selectedItems.length) {
      setBatchError('Indica un nombre y al menos un producto con cantidad.');
      return;
    }
    const existingLots = await supabase
      .from('lote_productos')
      .select('producto_id, lote_id, cantidad_loteada, cantidad_vendida, lotes(nombre)')
      .in('producto_id', selectedItems.map(([productId]) => productId));
    if (existingLots.error) {
      setBatchError(`No se pudieron validar los productos loteados: ${existingLots.error.message}`);
      return;
    }
    const duplicateMessages = selectedItems.flatMap(([productId, quantity]) => {
      const product = products.find((item) => item.id === productId);
      const rows = existingLots.data?.filter((row) => row.producto_id === productId) || [];
      const otherRows = rows.filter((row) => row.lote_id !== editingBatch?.id);
      const currentRow = rows.find((row) => row.lote_id === editingBatch?.id);
      const alreadyLoted = otherRows.reduce((total, row) => total + Number(row.cantidad_loteada) - Number(row.cantidad_vendida), 0);
      const requested = Number(quantity);
      const available = (product?.stock || 0) + (product?.stockWarehouse || 0) - alreadyLoted;
      if (editingBatch && currentRow && requested < Number(currentRow.cantidad_vendida)) return `${product?.name || productId}: no puedes bajar la cantidad por debajo de las ${currentRow.cantidad_vendida} unidades vendidas.`;
      if (requested > available) return `${product?.name || productId}: solicitas ${requested}, pero solo hay ${available} unidades disponibles.`;
      return [];
    });
    if (duplicateMessages.length) {
      setBatchError(duplicateMessages.join(' '));
      return;
    }
    if (editingBatch) {
      const updated = await supabase.from('lotes').update({ nombre: batchForm.nombre.trim(), nota: batchForm.nota.trim() || null }).eq('id', editingBatch.id);
      if (updated.error) { setBatchError(updated.error.message); return; }
      const currentItems = editingBatch.lote_productos || [];
      const nextItems = selectedItems.map(([productId, quantity]) => {
        const currentItem = currentItems.find((item) => item.producto_id === productId);
        const product = products.find((item) => item.id === productId)!;
        const amount = Number(quantity);
        const investment = currentItem?.inversion_inicial || product.cost * amount;
        return { id: currentItem?.id, lote_id: editingBatch.id, producto_id: productId, cantidad_loteada: amount, cantidad_vendida: currentItem?.cantidad_vendida || 0, valor_inicial: product.price * amount, inversion_inicial: investment, ganancia_inicial: product.price * amount - investment, productos: { nombre: product.name } };
      });
      for (const item of currentItems.filter((item) => !selectedItems.some(([productId]) => productId === item.producto_id))) {
        if (item.cantidad_vendida > 0) { setBatchError('No puedes quitar un producto que ya tiene ventas.'); return; }
        const removed = await supabase.from('lote_productos').delete().eq('id', item.id);
        if (removed.error) { setBatchError(removed.error.message); return; }
      }
      const insertedIds = new Map<string, string>();
      for (const item of nextItems) {
        const result = item.id
          ? await supabase.from('lote_productos').update({ cantidad_loteada: item.cantidad_loteada, valor_inicial: item.valor_inicial, inversion_inicial: item.inversion_inicial, ganancia_inicial: item.ganancia_inicial }).eq('id', item.id)
          : await supabase.from('lote_productos').insert({ lote_id: item.lote_id, producto_id: item.producto_id, cantidad_loteada: item.cantidad_loteada, cantidad_vendida: 0, valor_inicial: item.valor_inicial, inversion_inicial: item.inversion_inicial, ganancia_inicial: item.ganancia_inicial }).select('id').single();
        if (result.error) { setBatchError(result.error.message); return; }
        if (!item.id && result.data) insertedIds.set(item.producto_id, result.data.id);
      }
      setLotedStock((current) => {
        const next = { ...current };
        currentItems.forEach((item) => { next[item.producto_id] = Math.max(0, (next[item.producto_id] || 0) - (item.cantidad_loteada - item.cantidad_vendida)); });
        nextItems.forEach((item) => { next[item.producto_id] = (next[item.producto_id] || 0) + (item.cantidad_loteada - item.cantidad_vendida); });
        return next;
      });
      setBatches((current) => current.map((batch) => batch.id === editingBatch.id ? { ...batch, nombre: batchForm.nombre.trim(), nota: batchForm.nota.trim() || null, lote_productos: nextItems.map((item) => ({ ...item, id: item.id || insertedIds.get(item.producto_id) || createId() })) } : batch));
      showNotification('Lote actualizado correctamente');
    } else {
      const created = await supabase.from('lotes').insert({ nombre: batchForm.nombre.trim(), nota: batchForm.nota.trim() || null }).select('id, nombre, nota, creado_en').single();
      if (created.error) { setBatchError(created.error.message); return; }
      const items = selectedItems.map(([productId, quantity]) => {
        const product = products.find((item) => item.id === productId)!;
        const amount = Number(quantity);
        const investment = product.cost * amount;
        return { lote_id: created.data.id, producto_id: productId, cantidad_loteada: amount, valor_inicial: product.price * amount, inversion_inicial: investment, ganancia_inicial: product.price * amount - investment };
      });
      const inserted = await supabase.from('lote_productos').insert(items).select('id, producto_id');
      if (inserted.error) {
        await supabase.from('lotes').delete().eq('id', created.data.id);
        setBatchError(inserted.error.message);
        return;
      }
      setLotedStock((current) => selectedItems.reduce((next, [productId, quantity]) => ({ ...next, [productId]: (next[productId] || 0) + Number(quantity) }), { ...current }));
      const insertedIds = new Map((inserted.data || []).map((item) => [item.producto_id, item.id]));
      setBatches((current) => [{ ...created.data, lote_productos: items.map((item) => ({ ...item, id: insertedIds.get(item.producto_id) || createId(), cantidad_vendida: 0, productos: { nombre: products.find((product) => product.id === item.producto_id)?.name || '' } })) }, ...current]);
      showNotification('Lote creado correctamente');
    }
    setBatchForm({ nombre: '', nota: '' });
    setBatchItems({});
    setEditingBatch(null);
    setIsBatchOpen(false);
  };

  const openNewBatch = () => {
    setEditingBatch(null);
    setBatchForm({ nombre: '', nota: '' });
    setBatchItems({});
    setBatchError('');
    setIsBatchOpen(true);
  };

  const openEditBatch = (batch: Batch) => {
    setEditingBatch(batch);
    setBatchForm({ nombre: batch.nombre, nota: batch.nota || '' });
    setBatchItems(Object.fromEntries((batch.lote_productos || []).map((item) => [item.producto_id, String(item.cantidad_loteada)])));
    setBatchError('');
    setIsBatchOpen(true);
  };

  const createBatch = saveBatch;

  const deleteBatch = async (batch: Batch) => {
    if (!window.confirm(`¿Eliminar el lote ${batch.nombre}? Sus productos volverán a estar disponibles.`)) return;
    const { error } = await supabase.from('lotes').delete().eq('id', batch.id);
    if (error) {
      showNotification(`No se pudo eliminar el lote: ${error.message}`, 'error');
      return;
    }
    setLotedStock((current) => {
      const next = { ...current };
      (batch.lote_productos || []).forEach((item) => {
        next[item.producto_id] = Math.max(0, (next[item.producto_id] || 0) - (item.cantidad_loteada - item.cantidad_vendida));
      });
      return next;
    });
    setBatches((current) => current.filter((item) => item.id !== batch.id));
    showNotification('Lote eliminado');
  };

  const createAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const saldo = Number(accountForm.saldoInicial) || 0;
    const { data, error } = await supabase.from('cuentas_por_cobrar').insert({ titular: accountForm.titular.trim(), telefono: accountForm.telefono.trim() || null, nota: accountForm.nota.trim() || null, saldo_inicial: saldo, saldo_actual: saldo, estado: saldo > 0 ? 'activa' : 'liquidada' }).select('id, titular, telefono, saldo_actual, estado').single();
    if (error) { showNotification(error.message, 'error'); return; }
    setAccounts((current) => [{ ...data, saldo_actual: Number(data.saldo_actual) }, ...current]);
    setAccountForm({ titular: '', telefono: '', nota: '', saldoInicial: '0' });
    setIsAccountOpen(false);
    showNotification('Cuenta creada');
  };

  const saveAccountMovement = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accountAction) return;
    const amount = Number(accountAmount);
    if (!amount || amount <= 0) return;
    const nextBalance = Math.max(0, accountAction.account.saldo_actual + (accountAction.tipo === 'cargo' ? amount : -amount));
    const movement = await supabase.from('movimientos_cuenta').insert({ cuenta_id: accountAction.account.id, tipo: accountAction.tipo, monto: amount, nota: `${accountAction.tipo === 'abono' ? 'Abono' : 'Cargo'} manual` });
    const updated = movement.error ? movement : await supabase.from('cuentas_por_cobrar').update({ saldo_actual: nextBalance, estado: nextBalance === 0 ? 'liquidada' : 'activa', actualizado_en: new Date().toISOString() }).eq('id', accountAction.account.id);
    if (updated.error) { showNotification(updated.error.message, 'error'); return; }
    setAccounts((current) => current.map((account) => account.id === accountAction.account.id ? { ...account, saldo_actual: nextBalance, estado: nextBalance === 0 ? 'liquidada' : 'activa' } : account));
    setAccountAction(null);
    setAccountAmount('');
    showNotification('Movimiento registrado');
  };

  const deleteAccount = async (account: Account) => {
    if (account.saldo_actual > 0) {
      showNotification('No puedes eliminar un cliente con saldo pendiente.', 'warning');
      return;
    }
    if (!window.confirm(`¿Eliminar al cliente ${account.titular}? Se conservarán sus ventas.`)) return;
    const { error } = await supabase.from('cuentas_por_cobrar').delete().eq('id', account.id);
    if (error) {
      showNotification(`No se pudo eliminar el cliente: ${error.message}`, 'error');
      return;
    }
    setAccounts((current) => current.filter((item) => item.id !== account.id));
    showNotification('Cliente eliminado');
  };

  const removeSale = async (sale: Sale) => {
    if (!window.confirm('¿Eliminar esta venta y restaurar su stock?')) return;
    const details = await supabase.from('venta_detalles').select('producto_id, cantidad').eq('venta_id', sale.id);
    if (details.error) { showNotification(details.error.message, 'error'); return; }
    for (const detail of details.data ?? []) {
      const product = products.find((item) => item.id === detail.producto_id);
      if (product) await supabase.from('productos').update({ stock_tienda: product.stock + detail.cantidad }).eq('id', product.id);
    }
    const deleted = await supabase.from('ventas').delete().eq('id', sale.id);
    if (deleted.error) { showNotification(deleted.error.message, 'error'); return; }
    setProducts((current) => current.map((product) => { const detail = (details.data ?? []).find((item) => item.producto_id === product.id); return detail ? { ...product, stock: product.stock + detail.cantidad } : product; }));
    setSales((current) => current.filter((item) => item.id !== sale.id));
    showNotification('Venta eliminada y stock restaurado');
  };

  const openEditSale = async (sale: Sale) => {
    const date = new Date(sale.fecha_hora);
    const { data } = await supabase.from('venta_detalles').select('producto_id, cantidad').eq('venta_id', sale.id);
    const items = (data ?? []).map((detail) => { const product = products.find((item) => item.id === detail.producto_id); return product ? { product, quantity: detail.cantidad } : null; }).filter((item): item is CartItem => item !== null);
    setEditingSaleItems(items);
    setCart(items);
    setEditingSale(sale);
    setSaleError('');
    setSaleForm({ paymentMethod: sale.metodo_pago, customerNote: sale.cliente_nota || '', accountMode: 'existing', accountId: '', accountHolder: '', saleDate: new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) });
    setIsCheckoutOpen(true);
  };

  const exportSalesCsv = () => {
    const header = 'ID,Fecha,Método,Nota,Total';
    const rows = sales.map((sale) => [sale.id, sale.fecha_hora, sale.metodo_pago, sale.cliente_nota || '', sale.total].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([`\uFEFF${[header, ...rows].join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ventas-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const addToCart = (product: Product) => {
    if (product.stock === 0) {
      showNotification(`¡Agotado! ${product.name} no tiene stock disponible.`, 'warning');
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          showNotification(`Has alcanzado el límite de stock de ${product.name}`, 'warning');
          return prevCart;
        }
        return prevCart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });

    showNotification(`Añadido: ${product.name}`);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.stock) {
              showNotification('Límite de stock disponible alcanzado.', 'warning');
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null),
    );
  };

  const totalCartCount = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity, 0),
    [cart],
  );

  const totalPrice = useMemo(
    () => cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0),
    [cart],
  );

  const getFreeStock = (product: Product) => Math.max(0, product.stock + product.stockWarehouse - (lotedStock[product.id] || 0));

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
        const matchesSearch =
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
            return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
          case 'date-oldest':
            return new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
          default:
            return 0;
        }
      });
  }, [products, selectedCategory, searchQuery, selectedSort]);

  const availableCategories = useMemo(
    () => [...new Set([...CATEGORIES, ...products.map((product) => product.category)])],
    [products],
  );

  const todaySales = useMemo(() => sales.filter((sale) => new Date(sale.fecha_hora).toDateString() === new Date().toDateString()), [sales]);
  const todayTotal = todaySales.reduce((total, sale) => total + sale.total, 0);
  const todayCredit = todaySales.filter((sale) => sale.metodo_pago === 'cuenta_por_cobrar').reduce((total, sale) => total + sale.total, 0);
  const cutSales = useMemo(() => cashCut ? sales.filter((sale) => sale.corte_caja_id === cashCut.id || (!sale.corte_caja_id && new Date(sale.fecha_hora).getTime() >= new Date(cashCut.fecha_apertura).getTime())) : todaySales, [cashCut, sales, todaySales]);
  const cutTotal = cutSales.reduce((total, sale) => total + sale.total, 0);
  const cutCredit = cutSales.filter((sale) => sale.metodo_pago === 'cuenta_por_cobrar').reduce((total, sale) => total + sale.total, 0);
  const cutCash = cutSales.filter((sale) => sale.metodo_pago === 'efectivo').reduce((total, sale) => total + sale.total, 0);
  const cutCard = cutSales.filter((sale) => sale.metodo_pago === 'tarjeta').reduce((total, sale) => total + sale.total, 0);
  const cutLotSummary = useMemo(() => {
    const summary = new Map<string, { pieces: number; total: number }>();
    cutSales.forEach((sale) => sale.venta_detalles?.forEach((detail) => {
      const lotName = Array.isArray(detail.lotes) ? detail.lotes[0]?.nombre : detail.lotes?.nombre;
      const key = lotName || 'Sin lote';
      const current = summary.get(key) || { pieces: 0, total: 0 };
      summary.set(key, { pieces: current.pieces + Number(detail.cantidad), total: current.total + Number(detail.subtotal) });
    }));
    return [...summary.entries()];
  }, [cutSales]);
  const closedLotSummary = useMemo(() => {
    const summary = new Map<string, { pieces: number; total: number }>();
    closedCutSales.forEach((sale) => sale.venta_detalles?.forEach((detail) => {
      const lotName = Array.isArray(detail.lotes) ? detail.lotes[0]?.nombre : detail.lotes?.nombre;
      const key = lotName || 'Sin lote';
      const current = summary.get(key) || { pieces: 0, total: 0 };
      summary.set(key, { pieces: current.pieces + Number(detail.cantidad), total: current.total + Number(detail.subtotal) });
    }));
    return [...summary.entries()];
  }, [closedCutSales]);

  const openFilterModal = () => {
    setTempSort(selectedSort);
    setTempCategory(selectedCategory);
    setIsFilterOpen(true);
  };

  const applyFilters = () => {
    setSelectedSort(tempSort);
    setSelectedCategory(tempCategory);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setTempSort('most-sold');
    setTempCategory('All');
  };

  return (
    <>
      <div className="h-screen w-full overflow-hidden bg-slate-200 text-slate-800 font-sans select-none">
      <div className="relative h-full bg-slate-50 overflow-hidden w-full">
        {toast && (
          <div className={`absolute top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 text-xs px-4 py-2.5 rounded-full shadow-lg backdrop-blur-sm animate-bounce text-center max-w-[85%] border ${toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-400' : toast.type === 'warning' ? 'bg-amber-500 text-white border-amber-300' : toast.type === 'error' ? 'bg-rose-600 text-white border-rose-400' : 'bg-sky-600 text-white border-sky-400'}`}>
            {toast.type === 'success' ? <Check className="w-4 h-4" /> : toast.type === 'warning' || toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
            <span>{toast.message}</span>
            <button type="button" onClick={() => setToast(null)} aria-label="Cerrar notificación" className="ml-1 opacity-80 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        <div ref={contentRef} className="h-full overflow-y-auto px-5 pt-5 pb-24 no-scrollbar">
          <div className="flex items-center justify-between mt-1 mb-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><Clock3 className="w-3.5 h-3.5" />{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span>{currentTime.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short' })}</span>
          </div>

          {(activeTab === 'pos' || activeTab === 'catalog') && (
            <>
              <div className="flex justify-between items-center my-3">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{activeTab === 'pos' ? 'Registro' : 'Catálogo'}</h1>

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

                <button
                  onClick={openFilterModal}
                  className="p-2.5 bg-white border border-slate-200/80 rounded-2xl text-slate-700 hover:bg-slate-100 transition-all shadow-xs flex items-center justify-center shrink-0 active:scale-95"
                >
                  <SlidersHorizontal className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-5 py-1 -mx-5 px-5">
                {availableCategories.map((category) => {
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

              {isLoadingProducts ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                  <Package className="w-12 h-12 stroke-[1.5] mb-2 text-slate-300 animate-pulse" />
                  <p className="text-sm font-medium">Cargando productos...</p>
                </div>
              ) : productsError ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-rose-400">
                  <Package className="w-12 h-12 stroke-[1.5] mb-2 text-rose-300" />
                  <p className="text-sm font-medium">No se pudo cargar el inventario</p>
                  <p className="mt-1 max-w-xs text-xs text-slate-400">{productsError}</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                  <Package className="w-12 h-12 stroke-[1.5] mb-2 text-slate-300" />
                  <p className="text-sm font-medium">No se encontraron productos</p>
                  <button
                    onClick={() => {
                      setSelectedCategory('All');
                      setSearchQuery('');
                    }}
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
                      <div className={`w-full h-32 rounded-xl mb-3 flex items-center justify-center overflow-hidden relative ${product.colorBg}`}>
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80';
                          }}
                        />
                        <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-indigo-600 p-1.5 rounded-full shadow-sm transition-opacity transform translate-y-2 group-hover:translate-y-0">
                            <Plus className="w-4 h-4 stroke-[3]" />
                          </span>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-900 text-xs line-clamp-1 group-hover:text-indigo-600 transition-colors">
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1 text-xs">
                          <span className="font-extrabold text-slate-900">${product.price.toLocaleString()}</span>
                          <span className="text-slate-300">•</span>
                          <span
                            className={`font-semibold text-[11px] ${
                              product.stock === 0 ? 'text-rose-500' : 'text-slate-400'
                            }`}
                          >
                            {getFreeStock(product)} libres
                          </span>
                          <span className="text-[10px] text-slate-400">• almacén {product.stockWarehouse}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'discounts' && (
            <div className="py-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Inventario</p>
                  <h2 className="text-xl font-bold text-slate-800">Stock e inventario</h2>
                </div>
                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setAddProductError('');
                    setIsAddProductOpen(true);
                  }}
                  className="bg-indigo-600 text-white p-2 rounded-xl shadow-sm hover:bg-indigo-700 transition-colors"
                  aria-label="Agregar producto"
                >
                  <Package className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs">
                  <p className="text-[10px] uppercase text-slate-400">Productos</p>
                  <p className="text-lg font-bold text-slate-800 mt-1">{products.length}</p>
                </div>
                <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs">
                  <p className="text-[10px] uppercase text-slate-400">Stock</p>
                  <p className="text-lg font-bold text-slate-800 mt-1">
                    {products.reduce((sum, product) => sum + getFreeStock(product), 0)}
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs">
                  <p className="text-[10px] uppercase text-slate-400">Bajo</p>
                  <p className="text-lg font-bold text-slate-800 mt-1">
                    {products.filter((product) => product.stock <= 5).length}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <h3 className="text-sm font-bold text-slate-800">Resumen del inventario</h3>
                  <p className="text-[11px] text-slate-500">Tienda + almacén. Loteado, vendido y desfasaje se registran en movimientos.</p>
                </div>

                <div className="divide-y divide-slate-100">
                  {products.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">No hay productos registrados</p>
                    </div>
                  ) : (
                    products.map((product) => (
                      <div key={product.id} className="px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{product.name}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">{product.category} · ${product.price.toLocaleString()}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${getFreeStock(product) === 0 ? 'bg-rose-50 text-rose-600' : getFreeStock(product) <= 5 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{getFreeStock(product)} libres</span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[10px] uppercase tracking-wide text-slate-400">Tienda</p><p className="text-base font-bold text-slate-800">{product.stock}</p></div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[10px] uppercase tracking-wide text-slate-400">Almacén</p><p className="text-base font-bold text-slate-800">{product.stockWarehouse}</p></div>
                        </div>
                        <p className="mt-2 text-[10px] text-slate-400">Loteado {lotedStock[product.id] || 0} · Disponible {getFreeStock(product)} · Vendido 0 · Desfasaje 0</p>
                        <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                          <button onClick={() => { setEditingProduct(product); setRestockForm({ tienda: '0', almacen: '0', nota: '' }); setIsRestockingProduct(true); }} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-700" title="Agregar existencias"><Plus className="h-3.5 w-3.5" />Reestock</button>
                          <button onClick={() => { setEditingProduct(product); setStockAdjustment({ tienda: String(product.stock), almacen: String(product.stockWarehouse), nota: '' }); setIsAdjustingStock(true); }} className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-700" title="Mover stock entre ubicaciones"><ArrowLeftRight className="h-3.5 w-3.5" />Ajustar</button>
                          <button onClick={() => openEditProduct(product)} className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[10px] font-semibold text-indigo-700" title="Editar producto"><Pencil className="h-3.5 w-3.5" />Editar</button>
                          <button onClick={() => void deleteProduct(product)} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[10px] font-semibold text-rose-700" title="Eliminar producto"><Trash2 className="h-3.5 w-3.5" />Eliminar</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="py-6">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Actividad</p>
              <div className="flex items-center justify-between mb-5"><div><h2 className="text-xl font-bold text-slate-800">Historial de ventas</h2><p className="text-[11px] text-slate-500">Corte de caja</p></div><div className="flex items-center gap-2"><button onClick={openCashCutModal} className={`rounded-lg px-2.5 py-2 text-[10px] font-bold ${cashCut ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{cashCut ? 'Cerrar corte' : 'Abrir corte'}</button>{closedCashCut && !cashCut && <button onClick={() => setIsCashCutReportOpen(true)} className="rounded-lg bg-slate-100 px-2.5 py-2 text-[10px] font-bold text-slate-700">Último corte</button>}<button onClick={exportSalesCsv} className="rounded-lg bg-indigo-50 px-2.5 py-2 text-[10px] font-bold text-indigo-700">Exportar CSV</button></div></div>
              {cashCut && <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-wide text-emerald-700">Corte abierto</p><p className="mt-1 text-xs font-semibold text-slate-700">Desde {new Date(cashCut.fecha_apertura).toLocaleString()}</p></div><button onClick={openCashCutModal} className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white">Ver cierre</button></div><div className="mt-3 grid grid-cols-3 gap-2 text-[10px]"><div><p className="text-slate-500">Efectivo</p><strong>${cutCash.toLocaleString()}</strong></div><div><p className="text-slate-500">Tarjeta</p><strong>${cutCard.toLocaleString()}</strong></div><div><p className="text-slate-500">Total</p><strong>${cutTotal.toLocaleString()}</strong></div></div></div>}
              <div className="grid grid-cols-3 gap-2 mb-5"><div className="bg-white rounded-xl border border-slate-200 p-3"><p className="text-[10px] text-slate-500">Total corte</p><p className="text-sm font-bold">${cutTotal.toLocaleString()}</p></div><div className="bg-white rounded-xl border border-slate-200 p-3"><p className="text-[10px] text-slate-500">Ventas</p><p className="text-sm font-bold">{cutSales.length}</p></div><div className="bg-white rounded-xl border border-slate-200 p-3"><p className="text-[10px] text-slate-500">Por cobrar</p><p className="text-sm font-bold text-rose-600">${cutCredit.toLocaleString()}</p></div></div>
              {cutLotSummary.length > 0 && <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between mb-3"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">Ventas por lote</h3><span className="text-[10px] text-slate-400">{cutLotSummary.reduce((total, [, item]) => total + item.pieces, 0)} piezas</span></div><div className="space-y-2">{cutLotSummary.map(([lotName, item]) => <div key={lotName} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><div><p className="text-xs font-semibold text-slate-700">{lotName}</p><p className="text-[10px] text-slate-400">{item.pieces} piezas</p></div><strong className="text-xs text-indigo-600">${item.total.toLocaleString()}</strong></div>)}</div></div>}
              {isLoadingSales ? <p className="py-10 text-center text-sm text-slate-400">Cargando ventas...</p> : salesError ? (
                <div className="py-10 text-center text-sm text-rose-500">No se pudo cargar el historial: {salesError}</div>
              ) : sales.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">No hay ventas registradas</div>
              ) : <div className="space-y-3">{sales.map((sale) => (
                <div key={sale.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800">${sale.total.toLocaleString()}</span>
                    <span className="text-[11px] text-slate-500">{new Date(sale.fecha_hora).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-xs text-indigo-600 font-semibold">{PAYMENT_METHODS.find((method) => method.id === sale.metodo_pago)?.label || sale.metodo_pago}</p>
                  {sale.cliente_nota && <p className="mt-2 text-xs text-slate-500">{sale.cliente_nota}</p>}
                  <div className="mt-3 border-t border-slate-100 pt-2">{sale.venta_detalles?.map((detail, index) => <p key={`${sale.id}-${index}`} className="text-[11px] text-slate-500">{detail.cantidad} × {(Array.isArray(detail.productos) ? detail.productos[0]?.nombre : detail.productos?.nombre) || 'Producto'} · {Array.isArray(detail.lotes) ? detail.lotes[0]?.nombre : detail.lotes?.nombre || 'Sin lote'} · ${Number(detail.subtotal).toLocaleString()}</p>)}</div>
                  <div className="mt-3 flex gap-4"><button onClick={() => openEditSale(sale)} className="text-[10px] font-semibold text-indigo-600">Editar venta</button><button onClick={() => void removeSale(sale)} className="text-[10px] font-semibold text-rose-600">Eliminar y restaurar stock</button></div>
                </div>
              ))}</div>}
            </div>
          )}

          {activeTab === 'accounts' && (
            <div className="py-6">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Crédito</p>
              <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold text-slate-800">Cartera / Cuentas por Cobrar</h2><button onClick={() => setIsAccountOpen(true)} className="rounded-xl bg-indigo-600 p-2 text-white" aria-label="Crear cuenta"><Plus className="w-5 h-5" /></button></div>
              {isLoadingAccounts ? <p className="py-10 text-center text-sm text-slate-400">Cargando cuentas...</p> : accounts.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">No hay cuentas activas</div>
              ) : <div className="space-y-3">{accounts.map((account) => (
                <div key={account.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between gap-3">
                  <div><p className="text-sm font-bold text-slate-800">{account.titular}</p><p className="text-xs text-slate-500">{account.telefono || 'Sin teléfono'} · {account.estado}</p><p className="mt-1 text-[10px] text-slate-400">{account.asignacion_deuda_lotes?.length ? account.asignacion_deuda_lotes.map((assignment) => `${Array.isArray(assignment.lotes) ? assignment.lotes[0]?.nombre : assignment.lotes?.nombre || 'Sin lote'}: $${Number(assignment.monto_pendiente).toLocaleString()}`).join(' · ') : 'Deuda: sin lote'}</p><button onClick={() => void deleteAccount(account)} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700" title="Eliminar cliente"><Trash2 className="h-3 w-3" />Eliminar</button></div>
                  <div className="text-right"><p className="text-xs text-slate-500">Saldo</p><p className="text-sm font-extrabold text-rose-600">${account.saldo_actual.toLocaleString()}</p><div className="mt-1 flex gap-1"><button onClick={() => setAccountAction({ account, tipo: 'abono' })} className="rounded-md bg-emerald-50 px-1.5 py-1 text-[10px] font-bold text-emerald-700">Abono</button><button onClick={() => setAccountAction({ account, tipo: 'cargo' })} className="rounded-md bg-rose-50 px-1.5 py-1 text-[10px] font-bold text-rose-700">Cargo</button></div></div>
                </div>
              ))}</div>}
            </div>
          )}

          {activeTab === 'batches' && (
            <div className="py-6">
              <div className="flex items-center justify-between mb-5"><div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Origen</p><h2 className="text-xl font-bold text-slate-800">Lotes / Batches</h2></div><button onClick={openNewBatch} className="rounded-xl bg-indigo-600 p-2 text-white" aria-label="Crear lote"><Plus className="w-5 h-5" /></button></div>
              {isLoadingBatches ? <p className="py-10 text-center text-sm text-slate-400">Cargando lotes...</p> : batches.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">No hay lotes creados</p> : <div className="space-y-3">{batches.map((batch) => { const items = batch.lote_productos || []; const initial = items.reduce((sum, item) => sum + Number(item.valor_inicial), 0); const investment = items.reduce((sum, item) => sum + Number(item.inversion_inicial), 0); const profit = items.reduce((sum, item) => sum + Number(item.ganancia_inicial), 0); const units = items.reduce((sum, item) => sum + item.cantidad_loteada, 0); const sold = items.reduce((sum, item) => sum + item.cantidad_vendida, 0); return <div key={batch.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs"><div className="flex justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-800">{batch.nombre}</h3><p className="text-[11px] text-slate-500">{batch.nota || 'Sin nota'} · {new Date(batch.creado_en).toLocaleDateString()}</p></div><div className="flex items-start gap-2"><span className="text-xs font-bold text-indigo-600">{units - sold} disponibles</span><button onClick={() => openEditBatch(batch)} className="rounded-lg bg-indigo-50 p-1.5 text-indigo-700" aria-label={`Editar lote ${batch.nombre}`}><Pencil className="h-3.5 w-3.5" /></button><button onClick={() => void deleteBatch(batch)} className="rounded-lg bg-rose-50 p-1.5 text-rose-700" aria-label={`Eliminar lote ${batch.nombre}`}><Trash2 className="h-3.5 w-3.5" /></button></div></div><div className="mt-3 grid grid-cols-3 gap-2 text-[10px]"><div><p className="text-slate-400">Valor inicial</p><strong>${initial.toLocaleString()}</strong></div><div><p className="text-slate-400">Inversión</p><strong>${investment.toLocaleString()}</strong></div><div><p className="text-slate-400">Ganancia</p><strong className="text-emerald-600">${profit.toLocaleString()}</strong></div></div><p className="mt-3 text-[11px] text-slate-500">{items.map((item) => `${(Array.isArray(item.productos) ? item.productos[0]?.nombre : item.productos?.nombre) || 'Producto'} (${item.cantidad_loteada - item.cantidad_vendida})`).join(' · ')}</p></div>; })}</div>}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="py-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg border-2 border-indigo-200">JD</div>
                <div><p className="text-xs uppercase tracking-[0.16em] text-emerald-600">Control financiero</p><h2 className="text-xl font-extrabold text-slate-900">Distribución y liquidación</h2><p className="text-[11px] text-slate-500">Pagos, inversión y saldos pendientes por lote.</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-[10px] uppercase text-slate-400">Ventas del día</p><p className="mt-1 text-lg font-bold text-slate-800">${todayTotal.toLocaleString()}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-[10px] uppercase text-slate-400">Corte disponible</p><p className="mt-1 text-sm font-bold text-slate-800">{closedCashCut ? 'Cerrado' : 'Sin corte'}</p></div>
              </div>
              {closedCashCut ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-bold text-emerald-800">Último corte cerrado</p><p className="mt-1 text-[11px] text-slate-600">{new Date(closedCashCut.fecha_apertura).toLocaleDateString()} · {closedCutSales.length} ventas · ${closedCutSales.reduce((total, sale) => total + sale.total, 0).toLocaleString()}</p><button type="button" onClick={() => void openSettlement(closedCashCut, closedCutSales)} className="mt-4 w-full rounded-full bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700">Abrir liquidación del corte</button></div> : <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center"><p className="text-sm font-semibold text-slate-700">Cierra un corte para comenzar una liquidación.</p><button type="button" onClick={() => setActiveTab('history')} className="mt-3 rounded-full bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white">Ir a cortes de caja</button></div>}
            </div>
          )}
        </div>

        <div className="fixed bottom-4 left-0 right-0 px-4 sm:px-6 z-20 flex justify-center pointer-events-none">
          <div className="bg-white/90 backdrop-blur-md px-5 py-2.5 rounded-full shadow-lg border border-slate-200/80 flex items-center justify-between gap-6 pointer-events-auto">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`p-1.5 transition-colors ${activeTab === 'catalog' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              aria-label="Catálogo"
            >
              <Package className="w-5 h-5 stroke-[2.2]" />
            </button>

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

            <button
              onClick={() => setActiveTab('history')}
              className={`p-1.5 transition-colors ${
                activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
              aria-label="Historial"
            >
              <History className="w-5 h-5 stroke-[2.2]" />
            </button>

            <button
              onClick={() => setActiveTab('accounts')}
              className={`p-1.5 transition-colors ${activeTab === 'accounts' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              aria-label="Cuentas por cobrar"
            >
              <WalletCards className="w-5 h-5 stroke-[2.2]" />
            </button>

            <button
              onClick={() => setActiveTab('discounts')}
              className={`p-1.5 transition-colors ${activeTab === 'discounts' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              aria-label="Inventario"
            >
              <Tag className="w-5 h-5 stroke-[2.2]" />
            </button>

            <button
              onClick={() => setActiveTab('batches')}
              className={`p-1.5 transition-colors ${activeTab === 'batches' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              aria-label="Lotes"
            >
              <WalletCards className="w-5 h-5 stroke-[2.2]" />
            </button>

            <button
              onClick={() => { setActiveTab('profile'); if (closedCashCut) void openSettlement(closedCashCut, closedCutSales); }}
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

        {isFilterOpen && (
          <div className="absolute inset-0 z-40 bg-slate-900/40 backdrop-blur-xs flex flex-col justify-end transition-opacity animate-in fade-in duration-200">
            <div className="flex-1" onClick={() => setIsFilterOpen(false)} />

            <div className="bg-slate-50 rounded-t-[32px] p-5 pt-3 shadow-2xl border-t border-white/60 animate-in slide-in-from-bottom duration-300 max-h-[88%] overflow-y-auto no-scrollbar">
              <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3" />

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

              <button
                onClick={applyFilters}
                className="w-full bg-indigo-600 text-white font-semibold py-3.5 rounded-full text-xs shadow-md shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-[0.99] mb-2"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {isAddProductOpen && (
          <div className="absolute inset-0 z-40 bg-slate-900/40 backdrop-blur-xs flex flex-col justify-end">
            <div className="flex-1" onClick={() => !isSavingProduct && setIsAddProductOpen(false)} />
            <form onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct} className="bg-slate-50 rounded-t-[32px] p-5 shadow-2xl border-t border-white/60 max-h-[90%] overflow-y-auto">
              <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-slate-900">{editingProduct ? 'Editar producto' : 'Agregar producto'}</h2>
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-500 border border-slate-200"
                  aria-label="Cerrar formulario"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="col-span-2 text-xs font-semibold text-slate-600">
                  Nombre *
                  <input
                    required
                    value={newProduct.nombre}
                    onChange={(event) => setNewProduct({ ...newProduct, nombre: event.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-indigo-500"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Precio de venta *
                  <input
                    required
                    min="0"
                    step="0.01"
                    type="number"
                    value={newProduct.precioVenta}
                    onChange={(event) => setNewProduct({ ...newProduct, precioVenta: event.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-indigo-500"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Costo unitario
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={newProduct.costoUnitario}
                    onChange={(event) => setNewProduct({ ...newProduct, costoUnitario: event.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-indigo-500"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Categoría
                  <input
                    value={newProduct.categoria}
                    onChange={(event) => setNewProduct({ ...newProduct, categoria: event.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-indigo-500"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Stock en tienda
                  <input
                    min="0"
                    step="1"
                    type="number"
                    value={newProduct.stockTienda}
                    onChange={(event) => setNewProduct({ ...newProduct, stockTienda: event.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-indigo-500"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Stock en almacén
                  <input
                    min="0"
                    step="1"
                    type="number"
                    value={newProduct.stockAlmacen}
                    onChange={(event) => setNewProduct({ ...newProduct, stockAlmacen: event.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-indigo-500"
                  />
                </label>
                <label className="col-span-2 text-xs font-semibold text-slate-600">
                  URL de imagen
                  <input
                    type="url"
                    value={newProduct.imagenUrl}
                    onChange={(event) => setNewProduct({ ...newProduct, imagenUrl: event.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-indigo-500"
                  />
                  <input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setNewProduct((current) => ({ ...current, imagenUrl: String(reader.result) })); reader.readAsDataURL(file); }} className="mt-2 w-full text-xs text-slate-500" />
                </label>
              </div>

              {addProductError && <p className="mt-3 text-xs text-rose-500">{addProductError}</p>}
              <button
                type="submit"
                disabled={isSavingProduct}
                className="mt-5 w-full rounded-full bg-indigo-600 py-3.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingProduct ? 'Guardando...' : editingProduct ? 'Actualizar producto' : 'Guardar producto'}
              </button>
            </form>
          </div>
        )}

        {isAdjustingStock && editingProduct && (
          <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex flex-col justify-end">
            <div className="flex-1" onClick={() => setIsAdjustingStock(false)} />
            <form onSubmit={saveStockAdjustment} className="bg-slate-50 rounded-t-[32px] p-5 shadow-2xl border-t border-white/60">
              <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4"><div><p className="text-xs text-slate-500">Ajuste operativo</p><h2 className="text-base font-bold text-slate-900">{editingProduct.name}</h2></div><button type="button" onClick={() => setIsAdjustingStock(false)} className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-500 border border-slate-200" aria-label="Cerrar ajuste"><X className="w-4 h-4" /></button></div>
              <p className="mb-3 text-xs text-slate-500">Total disponible: <strong>{editingProduct.stock + editingProduct.stockWarehouse}</strong>. La nueva distribución debe conservarlo.</p>
              <div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-slate-600">Tienda<input required min="0" type="number" value={stockAdjustment.tienda} onChange={(event) => setStockAdjustment({ ...stockAdjustment, tienda: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-indigo-500" /></label><label className="text-xs font-semibold text-slate-600">Almacén<input required min="0" type="number" value={stockAdjustment.almacen} onChange={(event) => setStockAdjustment({ ...stockAdjustment, almacen: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-indigo-500" /></label></div>
              <label className="mt-3 block text-xs font-semibold text-slate-600">Nota<textarea rows={2} value={stockAdjustment.nota} onChange={(event) => setStockAdjustment({ ...stockAdjustment, nota: event.target.value })} className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-indigo-500" /></label>
              <button type="submit" className="mt-4 w-full rounded-full bg-indigo-600 py-3.5 text-xs font-bold text-white hover:bg-indigo-700">Guardar distribución</button>
            </form>
          </div>
        )}

        {isRestockingProduct && editingProduct && (
          <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex flex-col justify-end">
            <div className="flex-1" onClick={() => setIsRestockingProduct(false)} />
            <form onSubmit={saveProductRestock} className="bg-slate-50 rounded-t-[32px] p-5 shadow-2xl border-t border-white/60">
              <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <div><p className="text-xs text-emerald-600">Entrada de inventario</p><h2 className="text-base font-bold text-slate-900">Reestock: {editingProduct.name}</h2></div>
                <button type="button" onClick={() => setIsRestockingProduct(false)} className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-500 border border-slate-200" aria-label="Cerrar reestock"><X className="w-4 h-4" /></button>
              </div>
              <p className="mb-3 text-xs text-slate-500">Existencias actuales: tienda {editingProduct.stock} · almacén {editingProduct.stockWarehouse}. Las cantidades se sumarán.</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-slate-600">Agregar a tienda<input required min="0" type="number" value={restockForm.tienda} onChange={(event) => setRestockForm({ ...restockForm, tienda: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-emerald-500" /></label>
                <label className="text-xs font-semibold text-slate-600">Agregar a almacén<input required min="0" type="number" value={restockForm.almacen} onChange={(event) => setRestockForm({ ...restockForm, almacen: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-emerald-500" /></label>
              </div>
              <label className="mt-3 block text-xs font-semibold text-slate-600">Nota<textarea rows={2} value={restockForm.nota} onChange={(event) => setRestockForm({ ...restockForm, nota: event.target.value })} placeholder="Proveedor, factura o motivo (opcional)" className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-emerald-500" /></label>
              <button type="submit" className="mt-4 w-full rounded-full bg-emerald-600 py-3.5 text-xs font-bold text-white hover:bg-emerald-700">Registrar reestock</button>
            </form>
          </div>
        )}

        {isBatchOpen && (
          <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex flex-col justify-end"><div className="flex-1" onClick={() => setIsBatchOpen(false)} /><form onSubmit={createBatch} className="bg-slate-50 rounded-t-[32px] p-5 shadow-2xl max-h-[90%] overflow-y-auto"><div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-4" /><div className="flex justify-between items-center mb-4"><h2 className="text-base font-bold text-slate-900">Crear lote</h2><button type="button" onClick={() => setIsBatchOpen(false)} className="text-slate-500"><X className="w-5 h-5" /></button></div><input required placeholder="Nombre del lote" value={batchForm.nombre} onChange={(event) => setBatchForm({ ...batchForm, nombre: event.target.value })} className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none" /><textarea placeholder="Nota / origen" value={batchForm.nota} onChange={(event) => setBatchForm({ ...batchForm, nota: event.target.value })} rows={2} className="mb-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none" /><p className="mb-2 text-xs font-semibold text-slate-600">Productos y cantidades</p><div className="space-y-2">{products.map((product) => <label key={product.id} className="flex items-center justify-between gap-3 rounded-xl bg-white border border-slate-200 p-3"><span className="min-w-0 flex-1 text-xs font-semibold text-slate-700 truncate">{product.name} <span className="font-normal text-slate-400">({getFreeStock(product)} libres)</span></span><input min="0" max={getFreeStock(product)} type="number" value={batchItems[product.id] || ''} onChange={(event) => setBatchItems({ ...batchItems, [product.id]: event.target.value })} className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" /></label>)}</div>{batchError && <p className="mt-3 text-xs text-rose-500">{batchError}</p>}<button type="submit" className="mt-4 w-full rounded-full bg-indigo-600 py-3.5 text-xs font-bold text-white">Guardar lote</button></form></div>
        )}

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

              {cart.length > 0 && (
                <div className="pt-3 border-t border-slate-100 mt-2">
                  <button
                    onClick={() => setCart([])}
                    className="mb-3 text-xs font-semibold text-rose-500 hover:text-rose-700"
                  >
                    Vaciar carrito
                  </button>
                  <div className="flex justify-between items-center mb-1 text-xs text-slate-500">
                    <span>Subtotal</span>
                    <span>${totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center mb-3 text-sm font-extrabold text-slate-900">
                    <span>Total a cobrar</span>
                    <span className="text-indigo-600">${totalPrice.toLocaleString()}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      openCheckout();
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

        {isAccountOpen && (
          <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex flex-col justify-end"><div className="flex-1" onClick={() => setIsAccountOpen(false)} /><form onSubmit={createAccount} className="bg-slate-50 rounded-t-[32px] p-5 shadow-2xl"><div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-4" /><div className="flex justify-between items-center mb-4"><h2 className="text-base font-bold text-slate-900">Nueva cuenta</h2><button type="button" onClick={() => setIsAccountOpen(false)} className="text-slate-500"><X className="w-5 h-5" /></button></div><input required placeholder="Titular" value={accountForm.titular} onChange={(event) => setAccountForm({ ...accountForm, titular: event.target.value })} className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /><input placeholder="Teléfono" value={accountForm.telefono} onChange={(event) => setAccountForm({ ...accountForm, telefono: event.target.value })} className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /><textarea placeholder="Nota" rows={2} value={accountForm.nota} onChange={(event) => setAccountForm({ ...accountForm, nota: event.target.value })} className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /><input required min="0" type="number" placeholder="Saldo inicial" value={accountForm.saldoInicial} onChange={(event) => setAccountForm({ ...accountForm, saldoInicial: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /><button type="submit" className="mt-4 w-full rounded-full bg-indigo-600 py-3.5 text-xs font-bold text-white">Crear cuenta</button></form></div>
        )}

        {accountAction && (
          <div className="absolute inset-0 z-[55] bg-slate-900/40 backdrop-blur-xs flex flex-col justify-end"><div className="flex-1" onClick={() => setAccountAction(null)} /><form onSubmit={saveAccountMovement} className="bg-slate-50 rounded-t-[32px] p-5 shadow-2xl"><div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-4" /><h2 className="text-base font-bold text-slate-900 mb-1">{accountAction!.tipo === 'abono' ? 'Registrar abono' : 'Registrar cargo'}</h2><p className="text-xs text-slate-500 mb-4">{accountAction!.account.titular} · saldo ${accountAction!.account.saldo_actual.toLocaleString()}</p><input required min="0.01" step="0.01" type="number" placeholder="Monto" value={accountAmount} onChange={(event) => setAccountAmount(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /><button type="submit" className="mt-4 w-full rounded-full bg-indigo-600 py-3.5 text-xs font-bold text-white">Guardar movimiento</button></form></div>
        )}

        {isCheckoutOpen && (
          <div className="absolute inset-0 z-[60] bg-slate-900/40 backdrop-blur-xs flex flex-col justify-end">
            <div className="flex-1" onClick={() => !isSavingSale && setIsCheckoutOpen(false)} />
            <form onSubmit={saveSale} className="bg-slate-50 rounded-t-[32px] p-5 shadow-2xl border-t border-white/60 max-h-[90%] overflow-y-auto">
              <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-5">
                <div><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Total</p><h2 className="text-xl font-extrabold text-slate-900">${totalPrice.toLocaleString()}</h2></div>
                <button type="button" onClick={() => setIsCheckoutOpen(false)} className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-500 border border-slate-200" aria-label="Cerrar cobro"><X className="w-4 h-4" /></button>
              </div>
              <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
                <p className="mb-2 text-xs font-semibold text-slate-600">Productos de la venta</p>
                {cart.map(({ product, quantity }) => <div key={product.id} className="flex items-center justify-between py-1.5 text-xs"><span className="truncate pr-2">{product.name}</span><div className="flex items-center gap-2"><button type="button" onClick={() => updateQuantity(product.id, -1)} className="rounded-md bg-slate-100 px-2 py-1">-</button><span>{quantity}</span><button type="button" onClick={() => updateQuantity(product.id, 1)} className="rounded-md bg-slate-100 px-2 py-1">+</button></div></div>)}
                <select value="" onChange={(event) => { const product = products.find((item) => item.id === event.target.value); if (product) addToCart(product); }} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-600"><option value="">Agregar producto...</option>{products.filter((product) => !cart.some((item) => item.product.id === product.id)).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
              </div>
              <label className="text-xs font-semibold text-slate-600">Fecha y hora de la venta
                <input required type="datetime-local" value={saleForm.saleDate} onChange={(event) => setSaleForm({ ...saleForm, saleDate: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-indigo-500" />
              </label>
              <div className="flex gap-2 mt-2 mb-4">
                {[['0', 'Ahora'], ['15', '-15 min'], ['30', '-30 min'], ['60', '-1 h']].map(([minutes, label]) => (
                  <button key={minutes} type="button" onClick={() => { const date = new Date(Date.now() - Number(minutes) * 60000); setSaleForm({ ...saleForm, saleDate: new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }); }} className="flex-1 rounded-lg bg-white border border-slate-200 py-2 text-[10px] font-semibold text-slate-600 hover:border-indigo-400">{label}</button>
                ))}
              </div>
              <fieldset className="mb-4"><legend className="text-xs font-semibold text-slate-600 mb-2">Método de pago</legend><div className="grid grid-cols-3 gap-2">{PAYMENT_METHODS.map((method) => <button key={method.id} type="button" onClick={() => { setSaleForm({ ...saleForm, paymentMethod: method.id }); setSaleError(''); }} className={`rounded-xl border px-2 py-3 text-[11px] font-semibold ${saleForm.paymentMethod === method.id ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{method.label}</button>)}</div></fieldset>
              {saleForm.paymentMethod === 'cuenta_por_cobrar' && <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
                <p className="mb-2 text-xs font-semibold text-slate-600">Cuenta por cobrar</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button type="button" onClick={() => setSaleForm({ ...saleForm, accountMode: 'existing', accountHolder: '' })} className={`rounded-lg border px-2 py-2.5 text-[11px] font-semibold ${saleForm.accountMode === 'existing' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>Cuenta existente</button>
                  <button type="button" onClick={() => setSaleForm({ ...saleForm, accountMode: 'new', accountId: '' })} className={`rounded-lg border px-2 py-2.5 text-[11px] font-semibold ${saleForm.accountMode === 'new' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>Crear cuenta nueva</button>
                </div>
                {saleForm.accountMode === 'existing' ? <select value={saleForm.accountId} onChange={(event) => { setSaleForm({ ...saleForm, accountId: event.target.value }); setSaleError(''); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-indigo-500"><option value="">Selecciona una cuenta...</option>{accounts.filter((account) => account.estado === 'activa').map((account) => <option key={account.id} value={account.id}>{account.titular} · saldo ${account.saldo_actual.toLocaleString()}</option>)}</select> : <label className="block text-xs font-semibold text-slate-600">Titular de la nueva cuenta *<input value={saleForm.accountHolder} onChange={(event) => { setSaleForm({ ...saleForm, accountHolder: event.target.value }); setSaleError(''); }} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-indigo-500" /></label>}
              </div>}
              <label className="block text-xs font-semibold text-slate-600">Cliente / nota interna<textarea value={saleForm.customerNote} onChange={(event) => setSaleForm({ ...saleForm, customerNote: event.target.value })} rows={3} className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-indigo-500" placeholder="Nota opcional" /></label>
              {saleError && <p className="mt-3 text-xs text-rose-500">{saleError}</p>}
              <button type="submit" disabled={isSavingSale} className="mt-5 w-full rounded-full bg-indigo-600 py-3.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700 disabled:opacity-60">{isSavingSale ? 'Guardando venta...' : 'Confirmar venta'}</button>
            </form>
          </div>
        )}

        {isCashCutModalOpen && (
          <div className="absolute inset-0 z-[65] bg-slate-900/40 backdrop-blur-xs flex flex-col justify-end">
            <div className="flex-1" onClick={() => !isSavingCashCut && setIsCashCutModalOpen(false)} />
            <form onSubmit={saveCashCut} className="bg-slate-50 rounded-t-[32px] p-5 shadow-2xl border-t border-white/60">
              <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-5"><div><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Caja</p><h2 className="text-xl font-extrabold text-slate-900">{cashCut ? 'Cerrar corte de caja' : 'Abrir corte de caja'}</h2></div><button type="button" onClick={() => setIsCashCutModalOpen(false)} className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-500 border border-slate-200" aria-label="Cerrar corte"><X className="w-4 h-4" /></button></div>
              {!cashCut && <label className="block text-xs font-semibold text-slate-600">Efectivo inicial<input required min="0" step="0.01" type="number" value={cashCutForm.efectivoInicial} onChange={(event) => setCashCutForm({ ...cashCutForm, efectivoInicial: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-indigo-500" /></label>}
              {cashCut && <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-slate-600">Ventas del turno: <strong>${(cashCut.total_ventas_efectivo + cashCut.total_ventas_tarjeta).toLocaleString()}</strong>. Efectivo esperado: <strong>${(cashCut.efectivo_inicial + cashCut.total_ventas_efectivo).toLocaleString()}</strong>.</div>}
              {cashCut && <label className="block text-xs font-semibold text-slate-600">Efectivo contado<input required min="0" step="0.01" type="number" value={cashCutForm.efectivoContado} onChange={(event) => setCashCutForm({ ...cashCutForm, efectivoContado: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-indigo-500" /></label>}
              <label className="mt-3 block text-xs font-semibold text-slate-600">Observaciones<textarea rows={2} value={cashCutForm.observaciones} onChange={(event) => setCashCutForm({ ...cashCutForm, observaciones: event.target.value })} className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-indigo-500" /></label>
              {cashCutError && <p className="mt-3 text-xs text-rose-500">{cashCutError}</p>}
              <button type="submit" disabled={isSavingCashCut} className="mt-5 w-full rounded-full bg-indigo-600 py-3.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 disabled:opacity-60">{isSavingCashCut ? 'Guardando...' : cashCut ? 'Cerrar corte' : 'Abrir corte'}</button>
            </form>
          </div>
        )}

        {isCashCutReportOpen && closedCashCut && (
          <div className="absolute inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end">
            <div className="flex-1" onClick={() => setIsCashCutReportOpen(false)} />
            <div className="bg-slate-50 rounded-t-[32px] p-5 shadow-2xl border-t border-white/60 max-h-[88%] overflow-y-auto">
              <div className="flex items-center justify-between mb-4"><div><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Corte cerrado</p><h2 className="text-xl font-extrabold text-slate-900">Resumen de caja</h2></div><button type="button" onClick={() => setIsCashCutReportOpen(false)} className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-500 border border-slate-200" aria-label="Cerrar resumen"><X className="w-4 h-4" /></button></div>
              <p className="mb-4 text-xs text-slate-500">{new Date(closedCashCut.fecha_apertura).toLocaleString()} - {closedCashCut.fecha_cierre ? new Date(closedCashCut.fecha_cierre).toLocaleString() : ''}</p>
              <div className="grid grid-cols-3 gap-2 mb-3"><div className="rounded-xl bg-white border border-slate-200 p-3"><p className="text-[10px] text-slate-500">Ventas</p><p className="text-lg font-bold">{closedCutSales.length}</p></div><div className="rounded-xl bg-white border border-slate-200 p-3"><p className="text-[10px] text-slate-500">Piezas</p><p className="text-lg font-bold">{closedLotSummary.reduce((total, [, item]) => total + item.pieces, 0)}</p></div><div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3"><p className="text-[10px] text-emerald-700">Total</p><p className="text-lg font-bold text-emerald-700">${closedCutSales.reduce((total, sale) => total + sale.total, 0).toLocaleString()}</p></div></div>
              <div className="grid grid-cols-3 gap-2 mb-4 text-xs"><div className="rounded-xl bg-white border border-slate-200 p-3"><p className="text-slate-500">Efectivo</p><strong>${closedCashCut.total_ventas_efectivo.toLocaleString()}</strong></div><div className="rounded-xl bg-white border border-slate-200 p-3"><p className="text-slate-500">Tarjeta</p><strong>${closedCashCut.total_ventas_tarjeta.toLocaleString()}</strong></div><div className="rounded-xl bg-white border border-slate-200 p-3"><p className="text-slate-500">Crédito</p><strong>${closedCutSales.filter((sale) => sale.metodo_pago === 'cuenta_por_cobrar').reduce((total, sale) => total + sale.total, 0).toLocaleString()}</strong></div></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-600">Ingresos por lote</h3><div className="space-y-2">{closedLotSummary.length ? closedLotSummary.map(([lotName, item]) => <div key={lotName} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><div><p className="text-xs font-semibold text-slate-700">{lotName}</p><p className="text-[10px] text-slate-400">{item.pieces} piezas</p></div><strong className="text-xs text-indigo-600">${item.total.toLocaleString()}</strong></div>) : <p className="text-xs text-slate-400">No hay detalles de lote asociados.</p>}</div></div>
              <button type="button" onClick={() => void openSettlement(closedCashCut, closedCutSales)} className="mt-4 w-full rounded-full bg-emerald-600 py-3.5 text-xs font-bold text-white hover:bg-emerald-700">Liquidar corte</button>
              <button type="button" onClick={() => setIsCashCutReportOpen(false)} className="mt-5 w-full rounded-full bg-slate-800 py-3.5 text-xs font-bold text-white">Cerrar resumen</button>
            </div>
          </div>
        )}

        {isSettlementOpen && settlementCut && (
          <div className="absolute inset-0 z-[80] bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end">
            <div className="flex-1" onClick={() => setIsSettlementOpen(false)} />
            <div className="bg-slate-50 rounded-t-[32px] p-5 shadow-2xl border-t border-white/60 max-h-[92%] overflow-y-auto">
              <div className="flex items-center justify-between mb-4"><div><p className="text-xs uppercase tracking-[0.16em] text-emerald-600">Distribución y liquidación</p><h2 className="text-xl font-extrabold text-slate-900">Liquidar corte</h2></div><button type="button" onClick={() => setIsSettlementOpen(false)} className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-500 border border-slate-200" aria-label="Cerrar liquidación"><X className="w-4 h-4" /></button></div>
              {liquidationConfig && <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between mb-3"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">Configuración para nuevas liquidaciones</h3><button type="button" onClick={() => void saveLiquidationConfig()} className="text-[10px] font-bold text-indigo-600">Guardar</button></div><div className="grid grid-cols-2 gap-2"><label className="text-[10px] font-semibold text-slate-500">Mi nombre<input value={liquidationConfig.propietario_nombre} onChange={(event) => setLiquidationConfig({ ...liquidationConfig, propietario_nombre: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-800" /></label><label className="text-[10px] font-semibold text-slate-500">Compañero<input value={liquidationConfig.companero_nombre} onChange={(event) => setLiquidationConfig({ ...liquidationConfig, companero_nombre: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-800" /></label><label className="text-[10px] font-semibold text-slate-500">Mi % de ganancia<input min="0" max="100" type="number" value={liquidationConfig.porcentaje_ganancia_propietario} onChange={(event) => setLiquidationConfig({ ...liquidationConfig, porcentaje_ganancia_propietario: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-800" /></label><label className="text-[10px] font-semibold text-slate-500">Compañero %<input min="0" max="100" type="number" value={liquidationConfig.porcentaje_ganancia_companero} onChange={(event) => setLiquidationConfig({ ...liquidationConfig, porcentaje_ganancia_companero: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-800" /></label></div><p className="mt-2 text-[10px] text-slate-400">La recuperación de inversión corresponde al financiador y los porcentajes se congelan al crear cada liquidación.</p></div>}
              <div className="space-y-3">{settlementRows.map((row) => { const total = row.concepts.reduce((sum, item) => sum + item.monto_total, 0); const paid = row.concepts.reduce((sum, item) => sum + item.paid, 0); const pending = Math.max(0, total - paid); const progress = total ? Math.min(100, paid / total * 100) : 0; return <div key={row.loteId} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-800">{row.loteNombre}</h3><p className="text-[10px] text-slate-500">Inversión ${row.inversion.toLocaleString()} · Ventas ${row.ventas.toLocaleString()} · Ganancia ${row.ganancia.toLocaleString()}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${pending === 0 && total > 0 ? 'bg-emerald-50 text-emerald-700' : paid > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{pending === 0 && total > 0 ? 'Liquidado' : paid > 0 ? 'Parcial' : 'Pendiente'}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} /></div><div className="mt-3 grid grid-cols-3 gap-2 text-[10px]"><div><p className="text-slate-400">Obligaciones</p><strong>${total.toLocaleString()}</strong></div><div><p className="text-slate-400">Distribuido</p><strong>${paid.toLocaleString()}</strong></div><div><p className="text-slate-400">Pendiente</p><strong className="text-rose-600">${pending.toLocaleString()}</strong></div></div>{row.concepts.length ? <div className="mt-3 space-y-1">{row.concepts.map((concept) => <div key={concept.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-2 text-[10px]"><span>{concept.persona} · {concept.concepto}</span><span>${concept.paid.toLocaleString()} / ${concept.monto_total.toLocaleString()}</span></div>)}</div> : <p className="mt-3 text-[10px] text-slate-400">Aún no se ha creado la distribución de este lote.</p>}<button type="button" onClick={() => void createSettlementForRow(row)} className="mt-3 w-full rounded-full bg-indigo-600 py-2.5 text-[10px] font-bold text-white">{row.liquidationId ? 'Registrar pago' : 'Crear distribución'}</button>{selectedSettlementRow?.loteId === row.loteId && row.concepts.length > 0 && <><form onSubmit={saveSettlementPayment} className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Registrar pago parcial</p><select required value={paymentForm.conceptId} onChange={(event) => setPaymentForm({ ...paymentForm, conceptId: event.target.value })} className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"><option value="">Concepto pendiente...</option>{row.concepts.filter((concept) => concept.monto_total > concept.paid).map((concept) => <option key={concept.id} value={concept.id}>{concept.persona} · {concept.concepto} · pendiente ${ (concept.monto_total - concept.paid).toLocaleString()}</option>)}</select><input required min="0.01" step="0.01" type="number" placeholder="Monto" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs" /><input placeholder="Nota opcional" value={paymentForm.note} onChange={(event) => setPaymentForm({ ...paymentForm, note: event.target.value })} className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs" /><button disabled={isSavingPayment} type="submit" className="w-full rounded-full bg-emerald-600 py-2.5 text-[10px] font-bold text-white disabled:opacity-60">{isSavingPayment ? 'Guardando...' : 'Registrar pago'}</button></form>{row.payments.length > 0 && <div className="mt-3 border-t border-slate-100 pt-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Historial de pagos</p>{row.payments.map((payment) => <div key={payment.id} className="flex items-center justify-between border-b border-slate-100 py-2 text-[10px]"><span>{new Date(payment.creado_en).toLocaleDateString()} · {payment.persona} · {payment.concepto}</span><strong>-${payment.monto.toLocaleString()}</strong></div>)}</div>}</>}</div>; })}</div>
              {selectedSettlementRow && selectedSettlementRow.payments.some((payment) => payment.estado === 'activo') && <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-rose-700">Corrección de pagos</p>{selectedSettlementRow.payments.filter((payment) => payment.estado === 'activo').map((payment) => <div key={`reverse-${payment.id}`} className="flex items-center justify-between border-b border-rose-100 py-2 text-[10px]"><span>{payment.persona} · {payment.concepto} · ${payment.monto.toLocaleString()}</span><button type="button" onClick={() => void reverseSettlementPayment(payment)} className="font-bold text-rose-700">Revertir</button></div>)}</div>}
              <p className="mt-4 text-[10px] text-slate-400">Las ventas representan ingresos del negocio. Los pagos representan dinero efectivamente distribuido y se registran por separado.</p>
            </div>
          </div>
        )}
    </>
  );
}
