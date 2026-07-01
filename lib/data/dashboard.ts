import { prisma, withDb } from "@/lib/prisma"
import { demoKpis, demoMonthlyChart, demoTopPagar } from "@/lib/demo-data"

export type DashboardKpis = {
  saldoActual: number
  ingresosMes: number
  egresosMes: number
  porPagar: number
  ocPendientes: number
  osPendientes: number
}

export type MonthlyChartData = { mes: string; ingresos: number; egresos: number }[]
export type TopPagar = { party: string; orden: string; monto: number; dias: number }[]

export type DashboardData = {
  kpis: DashboardKpis
  monthlyChart: MonthlyChartData
  topPagar: TopPagar
}

const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

const demoData: DashboardData = {
  kpis: {
    saldoActual: demoKpis.saldoActual,
    ingresosMes: demoKpis.ingresosMes,
    egresosMes: demoKpis.egresosMes,
    porPagar: demoKpis.porPagar,
    ocPendientes: demoKpis.ocPendientes,
    osPendientes: demoKpis.osPendientes,
  },
  monthlyChart: demoMonthlyChart,
  topPagar: demoTopPagar.map(({ party, orden, monto, dias }) => ({ party, orden, monto, dias })),
}

export async function getDashboardData(): Promise<DashboardData> {
  return withDb(async () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    const [allMovements, chartMovements, ocPendientes, osPendientes, pendingMovements] =
      await Promise.all([
        prisma.cashMovement.findMany({
          where: { isVoid: false },
          select: { type: true, abono: true, date: true },
        }),
        prisma.cashMovement.findMany({
          where: { isVoid: false, date: { gte: sixMonthsAgo } },
          select: { type: true, abono: true, date: true },
        }),
        prisma.purchaseOrder.count({
          where: { isVoid: false, paymentStatus: { not: "PAGADO" } },
        }),
        prisma.serviceOrder.count({
          where: { isVoid: false, paymentStatus: { not: "PAGADO" } },
        }),
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

    const saldoActual = allMovements.reduce((acc, m) => {
      const amount = Number(m.abono)
      return acc + (m.type === "INGRESO" ? amount : -amount)
    }, 0)

    const thisMes = allMovements.filter((m) => new Date(m.date) >= startOfMonth)
    const ingresosMes = thisMes
      .filter((m) => m.type === "INGRESO")
      .reduce((a, m) => a + Number(m.abono), 0)
    const egresosMes = thisMes
      .filter((m) => m.type === "EGRESO")
      .reduce((a, m) => a + Number(m.abono), 0)

    const porPagar = pendingMovements.reduce(
      (acc, m) => acc + Number(m.invoiceAmount ?? 0),
      0,
    )

    const topPagar: TopPagar = pendingMovements.map((m) => ({
      party: m.supplier?.name ?? "—",
      orden: m.purchaseOrder?.orderNumber ?? m.serviceOrder?.orderNumber ?? "—",
      monto: Number(m.invoiceAmount ?? 0),
      dias: Math.floor((now.getTime() - new Date(m.date).getTime()) / 86_400_000),
    }))

    // Build ordered monthly buckets (last 6 months)
    const buckets: Record<string, { mes: string; ingresos: number; egresos: number }> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`
      buckets[key] = { mes: MONTHS_ES[d.getMonth()], ingresos: 0, egresos: 0 }
    }
    for (const m of chartMovements) {
      const d = new Date(m.date)
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`
      if (key in buckets) {
        const amount = Number(m.abono)
        if (m.type === "INGRESO") buckets[key].ingresos += amount
        else buckets[key].egresos += amount
      }
    }
    const monthlyChart: MonthlyChartData = Object.values(buckets).map(
      ({ mes, ingresos, egresos }) => ({ mes, ingresos, egresos }),
    )

    return {
      kpis: { saldoActual, ingresosMes, egresosMes, porPagar, ocPendientes, osPendientes },
      monthlyChart,
      topPagar: topPagar.length > 0 ? topPagar : [],
    }
  }, demoData)
}
