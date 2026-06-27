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

    const [movements, ocPendientes, osPendientes] = await Promise.all([
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
    ])

    const saldoActual = movements.reduce((acc, m) => {
      const amount = Number(m.abono)
      return acc + (m.type === "INGRESO" ? amount : -amount)
    }, 0)

    const thisMes = movements.filter((m) => new Date(m.date) >= startOfMonth)
    const ingresosMes = thisMes.filter((m) => m.type === "INGRESO").reduce((a, m) => a + Number(m.abono), 0)
    const egresosMes = thisMes.filter((m) => m.type === "EGRESO").reduce((a, m) => a + Number(m.abono), 0)

    return {
      kpis: {
        saldoActual,
        ingresosMes,
        egresosMes,
        porCobrar: demoKpis.porCobrar,
        porPagar: demoKpis.porPagar,
        facturaVencidas: demoKpis.facturaVencidas,
        ocPendientes,
        osPendientes,
        _isDemo: false,
      },
      monthlyChart: demoMonthlyChart,
      topCobrar: demoTopCobrar,
      topPagar: demoTopPagar,
    }
  }, demoData)
}
