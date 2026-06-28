import { prisma, withDb } from "@/lib/prisma"

// ──── Filter types ─────────────────────────────────────────────────────────────

export type ReportFilters = {
  startDate: Date
  endDate: Date
  supplierId?: string
  origin?: string
  operationStatus?: string
  category?: string
  rangeLabel: string
  activeCount: number
  range: string
  rawStartDate: string
  rawEndDate: string
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function buildFilters(
  sp: Record<string, string | string[] | undefined>,
): ReportFilters {
  const str = (v: string | string[] | undefined): string =>
    Array.isArray(v) ? (v[0] ?? "") : (v ?? "")

  const range = str(sp.range) || "this_month"
  const now = new Date()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  let startDate: Date
  let endDate: Date = todayEnd
  let rawStartDate = ""
  let rawEndDate = ""

  switch (range) {
    case "last_month":
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      break
    case "last_30":
      startDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)
      startDate.setHours(0, 0, 0, 0)
      break
    case "last_90":
      startDate = new Date(now.getTime() - 89 * 24 * 60 * 60 * 1000)
      startDate.setHours(0, 0, 0, 0)
      break
    case "this_year":
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case "custom": {
      const sd = str(sp.startDate)
      const ed = str(sp.endDate)
      startDate = sd ? new Date(sd + "T00:00:00") : new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = ed ? new Date(ed + "T23:59:59") : todayEnd
      rawStartDate = sd || toDateStr(startDate)
      rawEndDate = ed || toDateStr(endDate)
      break
    }
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  }

  if (!rawStartDate) rawStartDate = toDateStr(startDate)
  if (!rawEndDate) rawEndDate = toDateStr(endDate)

  const supplierId = str(sp.supplierId) || undefined
  const origin = str(sp.origin) || undefined
  const operationStatus = str(sp.status) || undefined
  const category = str(sp.category) || undefined

  let activeCount = 0
  if (range !== "this_month") activeCount++
  if (supplierId) activeCount++
  if (origin) activeCount++
  if (operationStatus) activeCount++
  if (category) activeCount++

  const fmt = (d: Date) =>
    d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "2-digit" })
  const rangeLabel = `${fmt(startDate)} – ${fmt(endDate)}`

  return {
    startDate, endDate,
    supplierId, origin, operationStatus, category,
    rangeLabel, activeCount, range,
    rawStartDate, rawEndDate,
  }
}

// ──── Data types ───────────────────────────────────────────────────────────────

export type ExecutiveSummary = {
  totalPorPagar: number
  pagadoEsteMes: number
  parcialesActivos: number
  ocSinCaja: number
  osSinCaja: number
  topProveedorPorPagar: string | null
  mayorCategoriaGasto: string | null
}

export type AccountsPayableRow = {
  supplierName: string
  movCount: number
  invoiceTotal: number
  abonoTotal: number
  aPagarTotal: number
}

export type MonthlyPaymentsSummary = {
  totalPagado: number
  cantidadPagos: number
  metodos: { method: string; total: number }[]
  pagos: {
    id: string
    monto: number
    fecha: string
    metodo: string
    opNumber: string | null
    proveedor: string
  }[]
}

export type PartialPaymentRow = {
  id: string
  date: string
  supplierName: string
  origin: string
  orderNumber: string | null
  invoiceAmount: number
  abono: number
  aPagar: number
  porcentajePagado: number
}

export type ExpenseBySupplierRow = {
  supplierName: string
  invoiceTotal: number
  abonoTotal: number
  pendingTotal: number
  movCount: number
}

export type ExpenseByCategoryRow = {
  category: string
  total: number
  count: number
  porcentaje: number
}

export type PendingOrderRow = {
  id: string
  type: "OC" | "OS"
  orderNumber: string
  supplierName: string
  totalAmount: number
  status: string
  issueDate: string
  process?: string
}

export type MonthlyFlowRow = {
  mes: string
  ingresos: number
  egresos: number
  neto: number
}

export type SupplierOption = { id: string; name: string }

export type ReportsData = {
  summary: ExecutiveSummary
  accountsPayable: AccountsPayableRow[]
  monthlyPayments: MonthlyPaymentsSummary
  partialPayments: PartialPaymentRow[]
  expensesBySupplier: ExpenseBySupplierRow[]
  expensesByCategory: ExpenseByCategoryRow[]
  pendingOrders: PendingOrderRow[]
  monthlyFlow: MonthlyFlowRow[]
  filters: ReportFilters
  supplierList: SupplierOption[]
  isDemo: boolean
}

// ──── Demo fallback ────────────────────────────────────────────────────────────

function makeDemoReports(filters: ReportFilters): ReportsData {
  return {
    summary: {
      totalPorPagar: 0, pagadoEsteMes: 0, parcialesActivos: 0,
      ocSinCaja: 0, osSinCaja: 0,
      topProveedorPorPagar: null, mayorCategoriaGasto: null,
    },
    accountsPayable: [],
    monthlyPayments: { totalPagado: 0, cantidadPagos: 0, metodos: [], pagos: [] },
    partialPayments: [],
    expensesBySupplier: [],
    expensesByCategory: [],
    pendingOrders: [],
    monthlyFlow: [],
    filters,
    supplierList: [],
    isDemo: true,
  }
}

// ──── Main query ───────────────────────────────────────────────────────────────

export async function getReportsData(filters?: ReportFilters): Promise<ReportsData> {
  const f = filters ?? buildFilters({})

  return withDb(async () => {
    // ── Build Prisma WHERE clauses ────────────────────────────────────────────
    const movWhere = {
      isVoid: false,
      date: { gte: f.startDate, lte: f.endDate },
      ...(f.supplierId && { supplierId: f.supplierId }),
      ...(f.origin && { origin: f.origin as never }),
      ...(f.operationStatus && { operationStatus: f.operationStatus as never }),
      ...(f.category && { category: f.category as never }),
    }

    const payWhere = {
      date: { gte: f.startDate, lte: f.endDate },
      ...(f.supplierId && { cashMovement: { supplierId: f.supplierId } }),
    }

    const orderBase = {
      isVoid: false,
      cashMovements: { none: { isVoid: false } },
      issueDate: { gte: f.startDate, lte: f.endDate },
      ...(f.supplierId && { supplierId: f.supplierId }),
    }

    const [movements, payments, ocOrders, osOrders, supplierList] = await Promise.all([
      prisma.cashMovement.findMany({
        where: movWhere,
        select: {
          id: true, date: true, type: true, origin: true,
          operationStatus: true, category: true,
          invoiceAmount: true, abono: true,
          supplier: { select: { name: true } },
          purchaseOrder: { select: { orderNumber: true } },
          serviceOrder: { select: { orderNumber: true } },
        },
        orderBy: { date: "desc" },
      }),
      prisma.payment.findMany({
        where: payWhere,
        select: {
          id: true, amount: true, date: true,
          paymentMethod: true, operationNumber: true,
          cashMovement: { select: { supplier: { select: { name: true } } } },
        },
        orderBy: { date: "desc" },
      }),
      prisma.purchaseOrder.findMany({
        where: orderBase,
        select: {
          id: true, orderNumber: true, totalAmount: true, status: true,
          issueDate: true, supplier: { select: { name: true } },
        },
        orderBy: { issueDate: "desc" },
      }),
      prisma.serviceOrder.findMany({
        where: orderBase,
        select: {
          id: true, orderNumber: true, totalAmount: true, status: true,
          issueDate: true, process: true, supplier: { select: { name: true } },
        },
        orderBy: { issueDate: "desc" },
      }),
      prisma.supplier.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ])

    // Apply origin filter to pending orders at JS level
    let filtOc = ocOrders
    let filtOs = osOrders
    if (f.origin === "ORDEN_SERVICIO") filtOc = []
    if (f.origin === "ORDEN_COMPRA") filtOs = []
    if (f.origin === "MANUAL" || f.origin === "IMPORTADO") { filtOc = []; filtOs = [] }

    const egresosAll = movements.filter((m) => m.type === "EGRESO")

    // ── A: Cuentas por pagar ──────────────────────────────────────────────────
    const pendientes = egresosAll
      .map((m) => ({ ...m, inv: Number(m.invoiceAmount ?? 0), ab: Number(m.abono) }))
      .filter((m) => m.inv > 0 && m.inv - m.ab > 0.001)

    const apMap = new Map<string, { items: typeof pendientes }>()
    for (const m of pendientes) {
      const key = m.supplier?.name ?? "Sin proveedor"
      if (!apMap.has(key)) apMap.set(key, { items: [] })
      apMap.get(key)!.items.push(m)
    }
    const accountsPayable: AccountsPayableRow[] = [...apMap.entries()]
      .map(([name, { items }]) => ({
        supplierName: name,
        movCount: items.length,
        invoiceTotal: items.reduce((a, m) => a + m.inv, 0),
        abonoTotal: items.reduce((a, m) => a + m.ab, 0),
        aPagarTotal: items.reduce((a, m) => a + (m.inv - m.ab), 0),
      }))
      .sort((a, b) => b.aPagarTotal - a.aPagarTotal)

    // ── B: Pagos del periodo ──────────────────────────────────────────────────
    const methodMap = new Map<string, number>()
    for (const p of payments) {
      const m = p.paymentMethod
      methodMap.set(m, (methodMap.get(m) ?? 0) + Number(p.amount))
    }
    const monthlyPayments: MonthlyPaymentsSummary = {
      totalPagado: payments.reduce((acc, p) => acc + Number(p.amount), 0),
      cantidadPagos: payments.length,
      metodos: [...methodMap.entries()]
        .map(([method, total]) => ({ method, total }))
        .sort((a, b) => b.total - a.total),
      pagos: payments.map((p) => ({
        id: p.id,
        monto: Number(p.amount),
        fecha: p.date.toISOString().slice(0, 10),
        metodo: p.paymentMethod,
        opNumber: p.operationNumber,
        proveedor: p.cashMovement.supplier?.name ?? "—",
      })),
    }

    // ── C: Parciales activos ──────────────────────────────────────────────────
    // When operationStatus filter is set, movements already filtered by it —
    // so ADELANTO check may return empty if filter excludes ADELANTO (correct).
    const parcialesSource = f.operationStatus
      ? movements.filter((m) => m.operationStatus === "ADELANTO")
      : movements.filter((m) => m.operationStatus === "ADELANTO")

    const partialPayments: PartialPaymentRow[] = parcialesSource.map((m) => {
      const inv = Number(m.invoiceAmount ?? 0)
      const ab = Number(m.abono)
      return {
        id: m.id,
        date: m.date.toISOString().slice(0, 10),
        supplierName: m.supplier?.name ?? "—",
        origin: m.origin,
        orderNumber: m.purchaseOrder?.orderNumber ?? m.serviceOrder?.orderNumber ?? null,
        invoiceAmount: inv,
        abono: ab,
        aPagar: inv - ab,
        porcentajePagado: inv > 0 ? Math.round((ab / inv) * 100) : 0,
      }
    })

    // ── D: Egresos por proveedor (top 10) ────────────────────────────────────
    const supplierMap = new Map<string, { inv: number; ab: number; count: number }>()
    for (const m of egresosAll) {
      const key = m.supplier?.name ?? "Sin proveedor"
      const e = supplierMap.get(key) ?? { inv: 0, ab: 0, count: 0 }
      supplierMap.set(key, {
        inv: e.inv + Number(m.invoiceAmount ?? 0),
        ab: e.ab + Number(m.abono),
        count: e.count + 1,
      })
    }
    const expensesBySupplier: ExpenseBySupplierRow[] = [...supplierMap.entries()]
      .map(([name, v]) => ({
        supplierName: name,
        invoiceTotal: v.inv,
        abonoTotal: v.ab,
        pendingTotal: Math.max(0, v.inv - v.ab),
        movCount: v.count,
      }))
      .sort((a, b) => b.abonoTotal - a.abonoTotal)
      .slice(0, 10)

    // ── E: Egresos por categoría ──────────────────────────────────────────────
    const totalEgresos = egresosAll.reduce((acc, m) => acc + Number(m.abono), 0)
    const categoryMap = new Map<string, { total: number; count: number }>()
    for (const m of egresosAll) {
      const key = String(m.category ?? "OTROS")
      const e = categoryMap.get(key) ?? { total: 0, count: 0 }
      categoryMap.set(key, { total: e.total + Number(m.abono), count: e.count + 1 })
    }
    const expensesByCategory: ExpenseByCategoryRow[] = [...categoryMap.entries()]
      .map(([category, v]) => ({
        category,
        total: v.total,
        count: v.count,
        porcentaje: totalEgresos > 0 ? Math.round((v.total / totalEgresos) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)

    // ── F: Órdenes pendientes de caja ─────────────────────────────────────────
    const pendingOrders: PendingOrderRow[] = [
      ...filtOc.map((o) => ({
        id: o.id,
        type: "OC" as const,
        orderNumber: o.orderNumber,
        supplierName: o.supplier.name,
        totalAmount: Number(o.totalAmount),
        status: o.status,
        issueDate: o.issueDate.toISOString().slice(0, 10),
      })),
      ...filtOs.map((o) => ({
        id: o.id,
        type: "OS" as const,
        orderNumber: o.orderNumber,
        supplierName: o.supplier.name,
        totalAmount: Number(o.totalAmount),
        status: o.status,
        issueDate: o.issueDate.toISOString().slice(0, 10),
        process: o.process,
      })),
    ].sort((a, b) => a.issueDate.localeCompare(b.issueDate))

    // ── G: Flujo por periodo (agrupado por mes) ───────────────────────────────
    const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
    const flowMap = new Map<string, { year: number; month: number; ing: number; eg: number }>()
    for (const m of movements) {
      const d = new Date(m.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const e = flowMap.get(key) ?? { year: d.getFullYear(), month: d.getMonth() + 1, ing: 0, eg: 0 }
      if (m.type === "INGRESO") e.ing += Number(m.abono)
      else e.eg += Number(m.abono)
      flowMap.set(key, e)
    }
    const monthlyFlow: MonthlyFlowRow[] = [...flowMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        mes: `${MONTHS[v.month - 1]} ${v.year}`,
        ingresos: v.ing,
        egresos: v.eg,
        neto: v.ing - v.eg,
      }))

    // ── H: Resumen ejecutivo ──────────────────────────────────────────────────
    const summary: ExecutiveSummary = {
      totalPorPagar: accountsPayable.reduce((acc, r) => acc + r.aPagarTotal, 0),
      pagadoEsteMes: monthlyPayments.totalPagado,
      parcialesActivos: partialPayments.length,
      ocSinCaja: filtOc.length,
      osSinCaja: filtOs.length,
      topProveedorPorPagar: accountsPayable[0]?.supplierName ?? null,
      mayorCategoriaGasto: expensesByCategory[0]?.category ?? null,
    }

    return {
      summary, accountsPayable, monthlyPayments, partialPayments,
      expensesBySupplier, expensesByCategory, pendingOrders, monthlyFlow,
      filters: f, supplierList, isDemo: false,
    }
  }, makeDemoReports(f))
}
