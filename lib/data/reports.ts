import { prisma, withDb } from "@/lib/prisma"

// ──── Types ────────────────────────────────────────────────────────────────────

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

export type ReportsData = {
  summary: ExecutiveSummary
  accountsPayable: AccountsPayableRow[]
  monthlyPayments: MonthlyPaymentsSummary
  partialPayments: PartialPaymentRow[]
  expensesBySupplier: ExpenseBySupplierRow[]
  expensesByCategory: ExpenseByCategoryRow[]
  pendingOrders: PendingOrderRow[]
  monthlyFlow: MonthlyFlowRow[]
  isDemo: boolean
}

// ──── Demo fallback ────────────────────────────────────────────────────────────

const demoReports: ReportsData = {
  summary: {
    totalPorPagar: 0,
    pagadoEsteMes: 0,
    parcialesActivos: 0,
    ocSinCaja: 0,
    osSinCaja: 0,
    topProveedorPorPagar: null,
    mayorCategoriaGasto: null,
  },
  accountsPayable: [],
  monthlyPayments: { totalPagado: 0, cantidadPagos: 0, metodos: [], pagos: [] },
  partialPayments: [],
  expensesBySupplier: [],
  expensesByCategory: [],
  pendingOrders: [],
  monthlyFlow: [],
  isDemo: true,
}

// ──── Main query ───────────────────────────────────────────────────────────────

export async function getReportsData(): Promise<ReportsData> {
  return withDb(async () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    const [movements, payments, ocOrders, osOrders] = await Promise.all([
      prisma.cashMovement.findMany({
        where: { isVoid: false },
        select: {
          id: true,
          date: true,
          type: true,
          origin: true,
          operationStatus: true,
          category: true,
          invoiceAmount: true,
          abono: true,
          supplier: { select: { name: true } },
          purchaseOrder: { select: { orderNumber: true } },
          serviceOrder: { select: { orderNumber: true } },
        },
        orderBy: { date: "desc" },
      }),
      prisma.payment.findMany({
        where: { date: { gte: startOfMonth } },
        select: {
          id: true,
          amount: true,
          date: true,
          paymentMethod: true,
          operationNumber: true,
          cashMovement: { select: { supplier: { select: { name: true } } } },
        },
        orderBy: { date: "desc" },
      }),
      // OC sin movimiento de caja activo
      prisma.purchaseOrder.findMany({
        where: { isVoid: false, cashMovements: { none: { isVoid: false } } },
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          status: true,
          issueDate: true,
          supplier: { select: { name: true } },
        },
        orderBy: { issueDate: "desc" },
      }),
      // OS sin movimiento de caja activo
      prisma.serviceOrder.findMany({
        where: { isVoid: false, cashMovements: { none: { isVoid: false } } },
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          status: true,
          issueDate: true,
          process: true,
          supplier: { select: { name: true } },
        },
        orderBy: { issueDate: "desc" },
      }),
    ])

    const egresosAll = movements.filter((m) => m.type === "EGRESO")

    // ── A: Cuentas por pagar (POR_PAGAR + ADELANTO) ───────────────────────────
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

    // ── B: Pagos del mes ──────────────────────────────────────────────────────
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
      pagos: payments.slice(0, 20).map((p) => ({
        id: p.id,
        monto: Number(p.amount),
        fecha: p.date.toISOString().slice(0, 10),
        metodo: p.paymentMethod,
        opNumber: p.operationNumber,
        proveedor: p.cashMovement.supplier?.name ?? "—",
      })),
    }

    // ── C: Parciales activos ──────────────────────────────────────────────────
    const partialPayments: PartialPaymentRow[] = movements
      .filter((m) => m.operationStatus === "ADELANTO")
      .map((m) => {
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
      ...ocOrders.map((o) => ({
        id: o.id,
        type: "OC" as const,
        orderNumber: o.orderNumber,
        supplierName: o.supplier.name,
        totalAmount: Number(o.totalAmount),
        status: o.status,
        issueDate: o.issueDate.toISOString().slice(0, 10),
      })),
      ...osOrders.map((o) => ({
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

    // ── G: Flujo mensual (últimos 6 meses) ───────────────────────────────────
    const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
    const flowMap = new Map<string, { year: number; month: number; ing: number; eg: number }>()
    for (const m of movements) {
      const d = new Date(m.date)
      if (d < sixMonthsAgo) continue
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
      ocSinCaja: ocOrders.length,
      osSinCaja: osOrders.length,
      topProveedorPorPagar: accountsPayable[0]?.supplierName ?? null,
      mayorCategoriaGasto: expensesByCategory[0]?.category ?? null,
    }

    return {
      summary,
      accountsPayable,
      monthlyPayments,
      partialPayments,
      expensesBySupplier,
      expensesByCategory,
      pendingOrders,
      monthlyFlow,
      isDemo: false,
    }
  }, demoReports)
}
