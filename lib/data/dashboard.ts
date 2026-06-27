import { prisma, withDb } from "@/lib/prisma"
import { demoKpis, demoMonthlyChart, demoTopCobrar, demoTopPagar } from "@/lib/demo-data"

export type DashboardKpis = typeof demoKpis
export type MonthlyChartData = typeof demoMonthlyChart
export type TopCobrar = typeof demoTopCobrar
export type TopPagar = typeof demoTopPagar

export type DashboardData = {
  kpis: DashboardKpis
  monthlyChart: MonthlyChartData
  topCobrar: TopCobrar
  topPagar: TopPagar
}

const demoData: DashboardData = {
  kpis: demoKpis,
  monthlyChart: demoMonthlyChart,
  topCobrar: demoTopCobrar,
  topPagar: demoTopPagar,
}

export async function getDashboardData(): Promise<DashboardData> {
  return withDb(async () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [movements, ocPendientes, osPendientes, pendingMovements] = await Promise.all([
      prisma.cashMovement.findMany({
        where: { isVoid: false },
        select: { type: true, abono: true, date: true },
      }),
      prisma.purchaseOrder.count({
        where: { isVoid: false, paymentStatus: { not: "PAGADO" } },
      }),
      prisma.serviceOrder.count({
        where: { isVoid: false, paymentStatus: { not: "PAGADO" } },
      }),
      // Movimientos POR_PAGAR con proveedor y orden para topPagar
      prisma.cashMovement.findMany({
        where: { isVoid: false, operationStatus: "POR_PAGAR", type: "EGRESO" },
        select: {
          invoiceAmount: true,
          date: true,
          supplier: { select: { name: true } },
          purchaseOrder: { select: { orderNumber: true } },
          serviceOrder: { select: { orderNumber: true } },
        },
        orderBy: { invoiceAmount: "desc" },
        take: 5,
      }),
    ])

    const saldoActual = movements.reduce((acc, m) => {
      const amount = Number(m.abono)
      return acc + (m.type === "INGRESO" ? amount : -amount)
    }, 0)

    const thisMes = movements.filter((m) => new Date(m.date) >= startOfMonth)
    const ingresosMes = thisMes.filter((m) => m.type === "INGRESO").reduce((a, m) => a + Number(m.abono), 0)
    const egresosMes = thisMes.filter((m) => m.type === "EGRESO").reduce((a, m) => a + Number(m.abono), 0)

    const porPagar = pendingMovements.reduce((acc, m) => acc + Number(m.invoiceAmount ?? 0), 0)

    const topPagar: TopPagar = pendingMovements.map((m) => ({
      party: m.supplier?.name ?? "—",
      orden: m.purchaseOrder?.orderNumber ?? m.serviceOrder?.orderNumber ?? "—",
      monto: Number(m.invoiceAmount ?? 0),
      dias: Math.floor((now.getTime() - new Date(m.date).getTime()) / 86_400_000),
      _isDemo: false,
    }))

    return {
      kpis: {
        saldoActual,
        ingresosMes,
        egresosMes,
        porCobrar: demoKpis.porCobrar,
        porPagar,
        facturaVencidas: demoKpis.facturaVencidas,
        ocPendientes,
        osPendientes,
        _isDemo: false,
      },
      monthlyChart: demoMonthlyChart,
      topCobrar: demoTopCobrar,
      topPagar: topPagar.length > 0 ? topPagar : demoTopPagar,
    }
  }, demoData)
}
