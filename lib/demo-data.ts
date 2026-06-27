// ⚠️ DEMO DATA — Solo para visualización. No son datos reales de la empresa.
// Reemplazar con datos de la BD una vez conectada.

export const DEMO_LABEL = "DEMO" as const

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export const demoKpis = {
  saldoActual: 45200.0,
  ingresosMes: 38500.0,
  egresosMes: 29300.0,
  porCobrar: 22150.0,
  porPagar: 18900.0,
  facturaVencidas: 3,
  ocPendientes: 5,
  osPendientes: 8,
  _isDemo: true,
}

// ─── Gráfico mensual ─────────────────────────────────────────────────────────

export const demoMonthlyChart = [
  { mes: "Ene", ingresos: 32000, egresos: 28500 },
  { mes: "Feb", ingresos: 35000, egresos: 31000 },
  { mes: "Mar", ingresos: 28000, egresos: 26000 },
  { mes: "Abr", ingresos: 42000, egresos: 35000 },
  { mes: "May", ingresos: 38500, egresos: 29300 },
]

// ─── Proveedores ─────────────────────────────────────────────────────────────

export const demoSuppliers = [
  {
    id: "sup-1",
    code: "P001",
    name: "Taller Demo Confección A",
    ruc: "20100000001",
    supplierType: "TALLER",
    contactName: "Juan Pérez",
    contactPhone: "987654321",
    bankName: "BCP",
    isActive: true,
    _isDemo: true,
  },
  {
    id: "sup-2",
    code: "P002",
    name: "Textil Demo B S.A.C.",
    ruc: "20100000002",
    supplierType: "PROVEEDOR_INSUMO",
    contactName: "María García",
    contactPhone: "912345678",
    bankName: "Scotiabank",
    isActive: true,
    _isDemo: true,
  },
  {
    id: "sup-3",
    code: "P003",
    name: "Estampadora Demo C",
    ruc: "20100000003",
    supplierType: "SERVICIO",
    contactName: "Carlos López",
    contactPhone: "999888777",
    bankName: "BBVA",
    isActive: true,
    _isDemo: true,
  },
  {
    id: "sup-4",
    code: "P004",
    name: "Avíos Demo D E.I.R.L.",
    ruc: "20100000004",
    supplierType: "PROVEEDOR_INSUMO",
    contactName: "Ana Torres",
    contactPhone: "966554433",
    bankName: "Interbank",
    isActive: true,
    _isDemo: true,
  },
]

// ─── Insumos / Servicios ──────────────────────────────────────────────────────

export const demoItems = [
  { id: "itm-1", code: "I001", name: "Tela Jersey 30/1", itemType: "INSUMO", category: "TELA", unit: "KG", isActive: true, _isDemo: true },
  { id: "itm-2", code: "I002", name: "Hilo poliéster 40/2", itemType: "INSUMO", category: "HILO", unit: "CONO", isActive: true, _isDemo: true },
  { id: "itm-3", code: "I003", name: "Elástico 3cm", itemType: "INSUMO", category: "AVIOS", unit: "MT", isActive: true, _isDemo: true },
  { id: "itm-4", code: "I004", name: "Etiqueta tejida", itemType: "INSUMO", category: "AVIOS", unit: "UND", isActive: true, _isDemo: true },
  { id: "itm-5", code: "S001", name: "Corte de tela", itemType: "SERVICIO", category: "CORTE", unit: "UND", isActive: true, _isDemo: true },
  { id: "itm-6", code: "S002", name: "Confección polo", itemType: "SERVICIO", category: "CONFECCION", unit: "UND", isActive: true, _isDemo: true },
  { id: "itm-7", code: "S003", name: "Estampado digital", itemType: "SERVICIO", category: "ESTAMPADO", unit: "UND", isActive: true, _isDemo: true },
  { id: "itm-8", code: "S004", name: "Acabado y doblado", itemType: "SERVICIO", category: "ACABADO", unit: "UND", isActive: true, _isDemo: true },
]

// ─── Órdenes de compra ────────────────────────────────────────────────────────

export const demoPurchaseOrders = [
  {
    id: "oc-1",
    orderNumber: "OC-2026-001",
    issueDate: "2026-05-02",
    supplier: "Textil Demo B S.A.C.",
    mainItem: "Tela Jersey 30/1",
    totalAmount: 8500.0,
    paidAmount: 0,
    pendingAmount: 8500.0,
    status: "EMITIDA",
    paymentStatus: "PENDIENTE",
    responsible: "Carlos Alva",
    _isDemo: true,
  },
  {
    id: "oc-2",
    orderNumber: "OC-2026-002",
    issueDate: "2026-05-05",
    supplier: "Avíos Demo D E.I.R.L.",
    mainItem: "Hilo poliéster 40/2",
    totalAmount: 2100.0,
    paidAmount: 2100.0,
    pendingAmount: 0,
    status: "COMPLETADA",
    paymentStatus: "PAGADO",
    responsible: "Paola Yarasca",
    _isDemo: true,
  },
  {
    id: "oc-3",
    orderNumber: "OC-2026-003",
    issueDate: "2026-05-10",
    supplier: "Textil Demo B S.A.C.",
    mainItem: "Tela Jersey 30/1",
    totalAmount: 12000.0,
    paidAmount: 6000.0,
    pendingAmount: 6000.0,
    status: "EN_PROCESO",
    paymentStatus: "ADELANTO",
    responsible: "Allison Aburto",
    _isDemo: true,
  },
  {
    id: "oc-4",
    orderNumber: "OC-2026-004",
    issueDate: "2026-05-15",
    supplier: "Avíos Demo D E.I.R.L.",
    mainItem: "Elástico 3cm",
    totalAmount: 850.0,
    paidAmount: 0,
    pendingAmount: 850.0,
    status: "BORRADOR",
    paymentStatus: "PENDIENTE",
    responsible: "Carlos Alva",
    _isDemo: true,
  },
]

// ─── Órdenes de servicio ──────────────────────────────────────────────────────

export const demoServiceOrders = [
  {
    id: "os-1",
    orderNumber: "OS-2026-001",
    issueDate: "2026-05-03",
    supplier: "Taller Demo Confección A",
    process: "CONFECCION",
    proformaCode: "PI-2026-0017",
    totalAmount: 4200.0,
    paidAmount: 4200.0,
    pendingAmount: 0,
    status: "COMPLETADA",
    paymentStatus: "PAGADO",
    responsible: "Carlos Alva",
    _isDemo: true,
  },
  {
    id: "os-2",
    orderNumber: "OS-2026-002",
    issueDate: "2026-05-07",
    supplier: "Estampadora Demo C",
    process: "ESTAMPADO",
    proformaCode: "PI-2026-0017",
    totalAmount: 3100.0,
    paidAmount: 0,
    pendingAmount: 3100.0,
    status: "EN_PROCESO",
    paymentStatus: "PENDIENTE",
    responsible: "Paola Yarasca",
    _isDemo: true,
  },
  {
    id: "os-3",
    orderNumber: "OS-2026-003",
    issueDate: "2026-05-12",
    supplier: "Taller Demo Confección A",
    process: "CORTE",
    proformaCode: "PI-2026-0020",
    totalAmount: 1800.0,
    paidAmount: 900.0,
    pendingAmount: 900.0,
    status: "EN_PROCESO",
    paymentStatus: "ADELANTO",
    responsible: "Allison Aburto",
    _isDemo: true,
  },
  {
    id: "os-4",
    orderNumber: "OS-2026-004",
    issueDate: "2026-05-16",
    supplier: "Estampadora Demo C",
    process: "ACABADO",
    proformaCode: "PI-2026-0020",
    totalAmount: 2500.0,
    paidAmount: 0,
    pendingAmount: 2500.0,
    status: "EMITIDA",
    paymentStatus: "PENDIENTE",
    responsible: "Carlos Alva",
    _isDemo: true,
  },
]

// ─── Flujo de caja (conectado a OC/OS) ───────────────────────────────────────

export const demoCashMovements = [
  {
    id: "mv-1",
    date: "2026-05-02",
    type: "EGRESO",
    origin: "ORDEN_COMPRA",
    orderNumber: "OC-2026-001",
    operationStatus: "ADELANTO",
    category: "MATERIA_PRIMA",
    description: "Adelanto tela jersey",
    party: "Textil Demo B S.A.C.",
    invoiceNumber: "F001-0089",
    abono: 4250.0,
    invoiceAmount: 8500.0,
    aPagar: 4250.0,
    saldo: 40950.0,
    _isDemo: true,
  },
  {
    id: "mv-2",
    date: "2026-05-03",
    type: "EGRESO",
    origin: "ORDEN_SERVICIO",
    orderNumber: "OS-2026-001",
    operationStatus: "CANCELADO",
    category: "CONFECCION",
    description: "Pago confección completa",
    party: "Taller Demo Confección A",
    invoiceNumber: "E001-0124",
    abono: 4200.0,
    invoiceAmount: 4200.0,
    aPagar: 0,
    saldo: 36750.0,
    _isDemo: true,
  },
  {
    id: "mv-3",
    date: "2026-05-05",
    type: "INGRESO",
    origin: "MANUAL",
    orderNumber: null,
    operationStatus: "COBRADO",
    category: "VENTA",
    description: "Cobranza exportación cliente",
    party: "Cliente Demo Internacional",
    invoiceNumber: "F002-0045",
    abono: 18500.0,
    invoiceAmount: 18500.0,
    aPagar: 0,
    saldo: 55250.0,
    _isDemo: true,
  },
  {
    id: "mv-4",
    date: "2026-05-07",
    type: "EGRESO",
    origin: "ORDEN_SERVICIO",
    orderNumber: "OS-2026-002",
    operationStatus: "POR_PAGAR",
    category: "ESTAMPADO",
    description: "Servicio estampado pendiente",
    party: "Estampadora Demo C",
    invoiceNumber: "E003-0210",
    abono: 3100.0,
    invoiceAmount: 3100.0,
    aPagar: 3100.0,
    saldo: 52150.0,
    _isDemo: true,
  },
  {
    id: "mv-5",
    date: "2026-05-08",
    type: "EGRESO",
    origin: "MANUAL",
    orderNumber: null,
    operationStatus: "CANCELADO",
    category: "PLANILLA",
    description: "Planilla quincenal",
    party: "Planilla interna",
    invoiceNumber: null,
    abono: 12000.0,
    invoiceAmount: 12000.0,
    aPagar: 0,
    saldo: 40150.0,
    _isDemo: true,
  },
]

// ─── Top cuentas ──────────────────────────────────────────────────────────────

export const demoTopCobrar = [
  { party: "Cliente Demo Internacional", monto: 12500, dias: 8, _isDemo: true },
  { party: "Cliente Demo Nacional A", monto: 6300, dias: 15, _isDemo: true },
  { party: "Cliente Demo Nacional B", monto: 3350, dias: 22, _isDemo: true },
]

export const demoTopPagar = [
  { party: "Textil Demo B S.A.C.", monto: 8500, dias: 5, orden: "OC-2026-001", _isDemo: true },
  { party: "Estampadora Demo C", monto: 3100, dias: 8, orden: "OS-2026-002", _isDemo: true },
  { party: "Taller Demo Confección A", monto: 900, dias: 12, orden: "OS-2026-003", _isDemo: true },
]
