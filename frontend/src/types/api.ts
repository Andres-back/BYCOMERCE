export interface ApiEnvelope<T> {
  data: T;
  meta: {
    requestId?: string;
    timestamp: string;
  };
}

export type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MIXTO' | 'CONTRA_ENTREGA';

export interface BusinessSettings {
  colorPrimario?: string | null;
  colorSecundario?: string | null;
  colorAcento?: string | null;
  fuente?: string | null;
  modoTema?: 'CLARO' | 'OSCURO' | 'AUTO' | null;
  radioTarjeta?: 'NINGUNO' | 'PEQUENO' | 'MEDIO' | 'GRANDE' | 'COMPLETO' | null;
  mostrarPrecios?: boolean;
  mostrarStock?: boolean;
  eslogan?: string | null;
  textoBienvenida?: string | null;
  whatsapp?: string | null;
  logo?: string | null;
  banner?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  sitioWeb?: string | null;
}

export interface BusinessImage {
  id: string;
  tenantId?: string;
  url: string;
  titulo?: string | null;
  descripcion?: string | null;
  orden: number;
  createdAt?: string;
}

export interface DeliveryConfig {
  activo: boolean;
  costoBase: number;
  radioKm: number;
  horarioInicio?: string | null;
  horarioFin?: string | null;
}

export interface Business {
  id: string;
  nombre: string;
  slug: string;
  tipoNegocio: string;
  eslogan?: string | null;
  descripcion?: string | null;
  direccion?: string | null;
  barrio?: string | null;
  ciudad: string;
  latitud?: number | null;
  longitud?: number | null;
  logo?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  businessSettings?: BusinessSettings | null;
  businessImages?: BusinessImage[];
  deliveryConfig?: DeliveryConfig | null;
  _count?: {
    products?: number;
    orders?: number;
    sales?: number;
  };
}

export interface Category {
  id: string;
  tenantId?: string;
  nombre: string;
  descripcion?: string | null;
  estado?: string;
}

export interface ProductVariant {
  id: string;
  productId?: string;
  nombre: string;
  valor: string;
  precio?: number | null;
  stock?: number | null;
  sku?: string | null;
}

export interface Product {
  id: string;
  tenantId?: string;
  nombre: string;
  descripcion?: string | null;
  marca?: string | null;
  sku?: string | null;
  barcode?: string | null;
  costo: number;
  precio: number;
  stock: number;
  stockMinimo: number;
  imagenPrincipal?: string | null;
  estado?: string;
  destacado: boolean;
  variants?: ProductVariant[];
  category?: Category | null;
  tenant?: Business | null;
}

export type InventoryMovementType = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'DEVOLUCION' | 'PERDIDA';

export interface InventoryMovement {
  id: string;
  tenantId: string;
  productId: string;
  tipo: InventoryMovementType;
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  observacion?: string | null;
  usuarioId?: string | null;
  fecha: string;
}

export interface Supplier {
  id: string;
  tenantId: string;
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  observaciones?: string | null;
  estado?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  cantidad: number;
  costoUnitario: number;
  subtotal: number;
  product?: Pick<Product, 'id' | 'nombre' | 'sku' | 'stock' | 'costo'>;
}

export interface Purchase {
  id: string;
  tenantId: string;
  supplierId?: string | null;
  numeroFactura?: string | null;
  total: number;
  fechaCompra: string;
  observaciones?: string | null;
  estado: string;
  createdAt: string;
  supplier?: Supplier | null;
  items: PurchaseItem[];
}

export interface Customer {
  id: string;
  nombre: string;
  telefono: string;
  email?: string | null;
  direccion?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  observaciones?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type CustomerSegment = 'NUEVO' | 'FRECUENTE' | 'VIP' | 'INACTIVO';

export interface CustomerStats {
  totalSpent: number;
  salesTotal: number;
  ordersTotal: number;
  purchases: number;
  salesCount: number;
  deliveredOrdersCount: number;
  ordersCount: number;
  averageTicket: number;
  lastPurchaseAt?: string | null;
  segment: CustomerSegment;
}

export interface CustomerWithStats extends Customer {
  stats: CustomerStats;
}

export interface CustomerProfile extends CustomerWithStats {
  sales: Sale[];
  orders: Order[];
}

export interface UserSummary {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

export interface CustomerListResponse {
  data: CustomerWithStats[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface OrderItem {
  id: string;
  productId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  product?: Pick<Product, 'id' | 'nombre' | 'sku' | 'precio' | 'imagenPrincipal'>;
}

export interface StockReservation {
  id: string;
  productId: string;
  cantidad: number;
  estado: string;
  fechaExpiracion: string;
}

export interface Order {
  id: string;
  tenantId: string;
  customerId?: string | null;
  deliveryUserId?: string | null;
  subtotal: number;
  costoDomicilio: number;
  total: number;
  metodoPago?: PaymentMethod;
  estado: string;
  direccion: string;
  latitud?: number | null;
  longitud?: number | null;
  observaciones?: string | null;
  deliveryAssignedAt?: string | null;
  deliveredAt?: string | null;
  fecha: string;
  customer?: Customer | null;
  deliveryUser?: UserSummary | null;
  items: OrderItem[];
  stockReservations?: StockReservation[];
}

export interface SalePayment {
  id: string;
  metodo: PaymentMethod;
  monto: number;
  referenciaExterna?: string | null;
  fecha: string;
}

export interface SaleRefundItem {
  id: string;
  refundId: string;
  saleItemId: string;
  productId: string;
  cantidad: number;
  monto: number;
  product?: Pick<Product, 'id' | 'nombre' | 'sku'>;
}

export interface SaleRefund {
  id: string;
  tenantId: string;
  saleId: string;
  usuarioId: string;
  total: number;
  motivo?: string | null;
  fecha: string;
  items: SaleRefundItem[];
}

export interface SaleItem {
  id: string;
  productId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  product?: Pick<Product, 'id' | 'nombre' | 'sku' | 'precio' | 'imagenPrincipal'>;
}

export interface Sale {
  id: string;
  tenantId: string;
  customerId?: string | null;
  usuarioId: string;
  subtotal: number;
  descuento: number;
  impuestos: number;
  total: number;
  metodoPago: PaymentMethod;
  estado?: string;
  fecha: string;
  cambio?: number;
  customer?: Customer | null;
  items: SaleItem[];
  payments?: SalePayment[];
  refunds?: SaleRefund[];
}

export interface ReportRange {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
}

export interface ReportProductSummary {
  productId: string;
  product: Pick<Product, 'id' | 'nombre' | 'sku' | 'precio' | 'costo' | 'stock'> | null;
  quantity: number;
  total: number;
  lines: number;
}

export interface DashboardReport {
  range: ReportRange;
  kpis: {
    salesToday: number;
    salesMonth: number;
    salesRange: number;
    previousSalesRange: number;
    salesGrowthPercent: number;
    transactions: number;
    averageTicket: number;
    estimatedCost: number;
    expenses: number;
    expensesToday: number;
    estimatedProfit: number;
    activeOrders: number;
    pendingOrders: number;
    lowStock: number;
    outOfStock: number;
    customersNew: number;
    customersTotal: number;
    cashBalance: number;
  };
  topProducts: ReportProductSummary[];
  recentOrders: Array<{
    id: string;
    estado: string;
    total: number;
    fecha: string;
    customerName?: string | null;
  }>;
}

export interface SalesReport {
  range: ReportRange;
  summary: {
    total: number;
    descuento: number;
    count: number;
    averageTicket: number;
  };
  paymentMethods: Array<{
    metodo: PaymentMethod;
    total: number;
    descuento: number;
    count: number;
  }>;
  daily: Array<{
    date: string;
    total: number;
    descuento: number;
    count: number;
  }>;
}

export interface ProductsReport {
  range: ReportRange;
  topProducts: ReportProductSummary[];
  withoutMovement: Array<Pick<Product, 'id' | 'nombre' | 'sku' | 'stock' | 'precio' | 'costo'>>;
}

export interface InventoryReport {
  totalProducts: number;
  totalUnits: number;
  stockValue: number;
  lowStock: Array<Pick<Product, 'id' | 'nombre' | 'sku' | 'stock' | 'stockMinimo'>>;
  outOfStock: Array<Pick<Product, 'id' | 'nombre' | 'sku' | 'stock' | 'stockMinimo'>>;
  recentMovements: Array<{
    id: string;
    tipo: string;
    cantidad: number;
    stockAnterior: number;
    stockNuevo: number;
    observacion?: string | null;
    fecha: string;
    product?: Pick<Product, 'id' | 'nombre' | 'sku'>;
  }>;
}

export interface CustomersReport {
  range: ReportRange;
  total: number;
  newCustomers: number;
  topCustomers: Array<{
    customerId?: string | null;
    customer: Customer | null;
    total: number;
    purchases: number;
  }>;
  recentCustomers: Customer[];
}

export type CashRegisterStatus = 'ABIERTA' | 'CERRADA';
export type CashMovementType = 'VENTA' | 'GASTO' | 'INGRESO_MANUAL' | 'AJUSTE' | 'RETIRO' | 'DEVOLUCION' | 'APERTURA' | 'CIERRE';

export interface CashMovement {
  id: string;
  tenantId: string;
  cashRegisterId: string;
  tipo: CashMovementType;
  monto: number;
  descripcion?: string | null;
  referenciaId?: string | null;
  referenciaTipo?: string | null;
  usuarioId?: string | null;
  fecha: string;
}

export interface CashRegister {
  id: string;
  tenantId: string;
  usuarioId: string;
  fechaApertura: string;
  fechaCierre?: string | null;
  saldoInicial: number;
  saldoFinal?: number | null;
  estado: CashRegisterStatus;
  movements?: CashMovement[];
  saldoEsperado?: number;
  ingresos?: number;
  egresos?: number;
  diferencia?: number;
}

export interface Expense {
  id: string;
  tenantId: string;
  usuarioId: string;
  categoria: string;
  descripcion: string;
  valor: number;
  comprobanteUrl?: string | null;
  fecha: string;
}
