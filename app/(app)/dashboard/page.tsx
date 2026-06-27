"use client"

import { Header } from "@/components/header"
import { KpiCard } from "@/components/kpi-card"
import { DemoBadge } from "@/components/status-badge"
import {
  demoKpis,
  demoMonthlyChart,
  demoTopCobrar,
  demoTopPagar,
} from "@/lib/demo-data"
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  CreditCard,
  AlertTriangle,
  ShoppingCart,
  Wrench,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

const fmt = (n: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Dashboard Gerencial"
        subtitle="Resumen financiero en tiempo real"
      />

      <main className="flex-1 p-6 space-y-6">
        {/* Demo notice */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">
            <strong>Modo demo:</strong> Los datos mostrados son de ejemplo y no
            corresponden a información real de la empresa.
          </p>
          <DemoBadge />
        </div>

        {/* KPI grid */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Indicadores clave
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <KpiCard
              label="Saldo Actual"
              value={fmt(demoKpis.saldoActual)}
              icon={Wallet}
              variant="default"
              trend="up"
              trendLabel="vs. mes anterior"
              isDemo
            />
            <KpiCard
              label="Ingresos del Mes"
              value={fmt(demoKpis.ingresosMes)}
              icon={TrendingUp}
              variant="income"
              trend="up"
              trendLabel="+8% vs. mes anterior"
              isDemo
            />
            <KpiCard
              label="Egresos del Mes"
              value={fmt(demoKpis.egresosMes)}
              icon={TrendingDown}
              variant="expense"
              trend="down"
              trendLabel="-3% vs. mes anterior"
              isDemo
            />
            <KpiCard
              label="Cuentas por Cobrar"
              value={fmt(demoKpis.porCobrar)}
              icon={ClipboardList}
              variant="warning"
              subValue="Pendiente de clientes"
              isDemo
            />
            <KpiCard
              label="Cuentas por Pagar"
              value={fmt(demoKpis.porPagar)}
              icon={CreditCard}
              variant="warning"
              subValue="Pendiente a proveedores"
              isDemo
            />
            <KpiCard
              label="Facturas Vencidas"
              value={`${demoKpis.facturaVencidas} facturas`}
              icon={AlertTriangle}
              variant="expense"
              subValue="Requieren atención"
              isDemo
            />
          </div>
        </section>

        {/* OC / OS KPIs */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Operaciones pendientes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KpiCard
              label="OC Pendientes"
              value={`${demoKpis.ocPendientes} órdenes`}
              icon={ShoppingCart}
              variant="warning"
              subValue="Órdenes de compra por liquidar"
              isDemo
            />
            <KpiCard
              label="OS Pendientes"
              value={`${demoKpis.osPendientes} órdenes`}
              icon={Wrench}
              variant="warning"
              subValue="Órdenes de servicio en curso"
              isDemo
            />
          </div>
        </section>

        {/* Charts + tables */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* Monthly chart */}
          <Card className="xl:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                Ingresos vs. Egresos
                <DemoBadge />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={demoMonthlyChart}
                  barSize={18}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `S/${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value) => [fmt(Number(value))]}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    formatter={(v) =>
                      v === "ingresos" ? "Ingresos" : "Egresos"
                    }
                  />
                  <Bar
                    dataKey="ingresos"
                    fill="oklch(0.55 0.15 155)"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="egresos"
                    fill="oklch(0.55 0.18 27)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top tables */}
          <div className="xl:col-span-2 space-y-4">
            {/* Por cobrar */}
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Top por Cobrar
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-1.5 font-medium text-muted-foreground">
                        Cliente
                      </th>
                      <th className="text-right pb-1.5 font-medium text-muted-foreground">
                        Monto
                      </th>
                      <th className="text-right pb-1.5 font-medium text-muted-foreground">
                        Días
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {demoTopCobrar.map((row, i) => (
                      <tr key={i}>
                        <td className="py-2 truncate max-w-[100px] text-foreground">
                          {row.party}
                        </td>
                        <td className="py-2 text-right tabular-nums text-foreground">
                          {fmt(row.monto)}
                        </td>
                        <td className="py-2 text-right tabular-nums text-amber-600 font-medium">
                          {row.dias}d
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Por pagar */}
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Top por Pagar
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-1.5 font-medium text-muted-foreground">
                        Proveedor
                      </th>
                      <th className="text-left pb-1.5 font-medium text-muted-foreground">
                        Orden
                      </th>
                      <th className="text-right pb-1.5 font-medium text-muted-foreground">
                        Monto
                      </th>
                      <th className="text-right pb-1.5 font-medium text-muted-foreground">
                        Días
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {demoTopPagar.map((row, i) => (
                      <tr key={i}>
                        <td className="py-2 truncate max-w-[80px] text-foreground">
                          {row.party}
                        </td>
                        <td className="py-2 font-mono text-[10px] text-muted-foreground">
                          {row.orden}
                        </td>
                        <td className="py-2 text-right tabular-nums text-foreground">
                          {fmt(row.monto)}
                        </td>
                        <td className="py-2 text-right tabular-nums text-red-500 font-medium">
                          {row.dias}d
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
