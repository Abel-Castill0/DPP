"use client"

import { AlertTriangle, CreditCard, FileText, CheckCircle2, Clock, Download, FileSpreadsheet } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts"
import type { ReportsData } from "@/lib/data/reports"

// ──── Helpers ──────────────────────────────────────────────────────────────────

const fmtS = (n: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

const fmtD = (s: string) =>
  new Date(s).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })

const CATEGORY_LABEL: Record<string, string> = {
  CONFECCION: "Confección", CORTE: "Corte", ESTAMPADO: "Estampado",
  ACABADO_EMPAQUE: "Acabado/Empaque", MATERIA_PRIMA: "Mat. Prima",
  PLANILLA: "Planilla", IMPUESTO: "Impuesto", MOVILIDAD: "Movilidad",
  COMISION: "Comisión", CAJA_CHICA: "Caja chica", PRESTAMO: "Préstamo",
  INVERSION: "Inversión", COMPRA: "Compra", VENTA: "Venta", OTROS: "Otros",
}

const ORIGIN_LABEL: Record<string, string> = {
  ORDEN_COMPRA: "OC", ORDEN_SERVICIO: "OS", MANUAL: "Manual", IMPORTADO: "Import.",
}

const STATUS_LABEL: Record<string, string> = {
  BORRADOR: "Borrador", EMITIDA: "Emitida", APROBADA: "Aprobada",
  EN_PROCESO: "En proceso", COMPLETADA: "Completada", ANULADA: "Anulada",
}

const METHOD_LABEL: Record<string, string> = {
  TRANSFERENCIA: "Transferencia", DEPOSITO: "Depósito", EFECTIVO: "Efectivo",
  CHEQUE: "Cheque", TARJETA: "Tarjeta", OTRO: "Otro",
}

const BAR_COLORS = [
  "oklch(0.55 0.18 27)", "oklch(0.55 0.15 155)", "oklch(0.55 0.15 260)",
  "oklch(0.55 0.15 310)", "oklch(0.55 0.18 60)", "oklch(0.55 0.15 200)",
  "oklch(0.55 0.12 90)", "oklch(0.55 0.12 345)", "oklch(0.55 0.12 230)", "oklch(0.55 0.10 130)",
]

// ──── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide truncate">{label}</p>
            <p className="text-lg font-bold tabular-nums text-foreground mt-0.5">{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
          </div>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
      {children}
    </h2>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
      {message}
    </div>
  )
}

// ──── Main component ───────────────────────────────────────────────────────────

export function ReportsClient({ data }: { data: ReportsData }) {
  const { summary, accountsPayable, monthlyPayments, partialPayments,
    expensesBySupplier, expensesByCategory, pendingOrders, monthlyFlow, isDemo } = data

  return (
    <div className="flex-1 p-6 space-y-8 max-w-7xl">

      {/* Demo banner */}
      {isDemo && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">
            <strong>Sin conexión a BD:</strong> Los reportes requieren base de datos activa. Conecta DATABASE_URL para ver datos reales.
          </p>
        </div>
      )}

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Resumen ejecutivo</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total por pagar"
            value={fmtS(summary.totalPorPagar)}
            sub={summary.topProveedorPorPagar ? `Mayor: ${summary.topProveedorPorPagar}` : undefined}
            icon={CreditCard}
            color="bg-red-50 text-red-600"
          />
          <KpiCard
            label="Pagado este mes"
            value={fmtS(summary.pagadoEsteMes)}
            sub={`${monthlyPayments.cantidadPagos} pagos registrados`}
            icon={CheckCircle2}
            color="bg-emerald-50 text-emerald-600"
          />
          <KpiCard
            label="Parciales activos"
            value={`${summary.parcialesActivos}`}
            sub="Pagos en adelanto"
            icon={Clock}
            color="bg-amber-50 text-amber-600"
          />
          <KpiCard
            label="Órdenes sin caja"
            value={`${summary.ocSinCaja + summary.osSinCaja}`}
            sub={`${summary.ocSinCaja} OC · ${summary.osSinCaja} OS`}
            icon={FileText}
            color="bg-blue-50 text-blue-600"
          />
        </div>
      </section>

      {/* ── Flujo mensual ─────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Ingresos vs. egresos — últimos 6 meses</SectionTitle>
        <Card>
          <CardContent className="pt-4 pb-2">
            {monthlyFlow.length === 0 ? (
              <EmptyState message="Sin movimientos en los últimos 6 meses" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyFlow} barSize={20} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `S/${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v, name) => [fmtS(Number(v)), name === "ingresos" ? "Ingresos" : "Egresos"]}
                    contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid var(--border)" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    formatter={(v) => v === "ingresos" ? "Ingresos" : "Egresos"} />
                  <Bar dataKey="ingresos" fill="oklch(0.55 0.15 155)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="egresos" fill="oklch(0.55 0.18 27)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Cuentas por pagar ─────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Cuentas por pagar</SectionTitle>
        <Card>
          <CardContent className="p-0">
            {accountsPayable.length === 0 ? (
              <EmptyState message="No hay cuentas pendientes" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Proveedor</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Movs.</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Importe</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Abonado</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-red-600">Pendiente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {accountsPayable.map((r, i) => (
                      <tr key={i} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-foreground">{r.supplierName}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{r.movCount}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{fmtS(r.invoiceTotal)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700">{fmtS(r.abonoTotal)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-red-600">{fmtS(r.aPagarTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/20">
                      <td className="px-4 py-2.5 font-semibold text-foreground">Total</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{accountsPayable.reduce((a, r) => a + r.movCount, 0)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{fmtS(accountsPayable.reduce((a, r) => a + r.invoiceTotal, 0))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-emerald-700">{fmtS(accountsPayable.reduce((a, r) => a + r.abonoTotal, 0))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-bold text-red-600">{fmtS(summary.totalPorPagar)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Pagos del mes ─────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Pagos del mes</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Métodos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Por método</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyPayments.metodos.length === 0 ? (
                <EmptyState message="Sin pagos este mes" />
              ) : (
                <div className="space-y-2">
                  {monthlyPayments.metodos.map((m, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{METHOD_LABEL[m.method] ?? m.method}</span>
                      <span className="font-semibold tabular-nums">{fmtS(m.total)}</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 flex items-center justify-between text-xs font-bold">
                    <span>Total</span>
                    <span className="text-emerald-700">{fmtS(monthlyPayments.totalPagado)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lista de pagos recientes */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Últimos pagos ({monthlyPayments.cantidadPagos})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {monthlyPayments.pagos.length === 0 ? (
                <EmptyState message="Sin pagos registrados este mes" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Proveedor</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Fecha</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Método</th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {monthlyPayments.pagos.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2 text-foreground">{p.proveedor}</td>
                          <td className="px-4 py-2 text-muted-foreground">{fmtD(p.fecha)}</td>
                          <td className="px-4 py-2 text-muted-foreground">{METHOD_LABEL[p.metodo] ?? p.metodo}</td>
                          <td className="px-4 py-2 text-right tabular-nums font-medium text-emerald-700">{fmtS(p.monto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Parciales activos ─────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Pagos parciales activos ({partialPayments.length})</SectionTitle>
        <Card>
          <CardContent className="p-0">
            {partialPayments.length === 0 ? (
              <EmptyState message="No hay pagos parciales activos" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Proveedor</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Origen</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">N° Orden</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Importe</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Abonado</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Saldo</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {partialPayments.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-foreground">{r.supplierName}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{ORIGIN_LABEL[r.origin] ?? r.origin}</td>
                        <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground">{r.orderNumber ?? "—"}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{fmtS(r.invoiceAmount)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700">{fmtS(r.abono)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-amber-600">{fmtS(r.aPagar)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full"
                                style={{ width: `${r.porcentajePagado}%` }}
                              />
                            </div>
                            <span className="text-muted-foreground tabular-nums">{r.porcentajePagado}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Egresos por proveedor ─────────────────────────────────────────── */}
      <section>
        <SectionTitle>Egresos por proveedor (top 10)</SectionTitle>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4 pb-2">
              {expensesBySupplier.length === 0 ? (
                <EmptyState message="Sin egresos registrados" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={expensesBySupplier.slice(0, 8).map(r => ({ name: r.supplierName.slice(0, 18), pagado: r.abonoTotal }))}
                    layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                      tickFormatter={(v) => `S/${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={90} />
                    <Tooltip
                      formatter={(v) => [fmtS(Number(v)), "Pagado"]}
                      contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid var(--border)" }}
                    />
                    <Bar dataKey="pagado" radius={[0, 3, 3, 0]}>
                      {expensesBySupplier.slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {expensesBySupplier.length === 0 ? (
                <EmptyState message="Sin datos" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Proveedor</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Pagado</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Pendiente</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Movs.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {expensesBySupplier.map((r, i) => (
                        <tr key={i} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-foreground truncate max-w-[140px]">{r.supplierName}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700">{fmtS(r.abonoTotal)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-amber-600">{fmtS(r.pendingTotal)}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{r.movCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Egresos por categoría ──────────────────────────────────────────── */}
      <section>
        <SectionTitle>Egresos por categoría</SectionTitle>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4 pb-2">
              {expensesByCategory.length === 0 ? (
                <EmptyState message="Sin egresos registrados" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={expensesByCategory.map(r => ({
                      name: CATEGORY_LABEL[r.category] ?? r.category,
                      total: r.total,
                    }))}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                    barSize={22}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                      tickFormatter={(v) => `S/${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(v) => [fmtS(Number(v)), "Total"]}
                      contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid var(--border)" }}
                    />
                    <Bar dataKey="total" radius={[3, 3, 0, 0]}>
                      {expensesByCategory.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {expensesByCategory.length === 0 ? (
                <EmptyState message="Sin datos" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Categoría</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Total</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Movs.</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {expensesByCategory.map((r, i) => (
                        <tr key={i} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-foreground">
                            {CATEGORY_LABEL[r.category] ?? r.category}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{fmtS(r.total)}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{r.count}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="inline-flex items-center gap-1">
                              <span className="tabular-nums">{r.porcentaje}%</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Órdenes sin caja ──────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Órdenes pendientes de enviar a caja ({pendingOrders.length})</SectionTitle>
        <Card>
          <CardContent className="p-0">
            {pendingOrders.length === 0 ? (
              <EmptyState message="Todas las órdenes tienen movimiento de caja" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tipo</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">N° Orden</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Proveedor</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Proceso</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Monto</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Estado</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pendingOrders.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            r.type === "OC" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                          }`}>
                            {r.type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground">{r.orderNumber}</td>
                        <td className="px-4 py-2.5 font-medium text-foreground">{r.supplierName}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{r.process ?? "—"}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{fmtS(r.totalAmount)}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{STATUS_LABEL[r.status] ?? r.status}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{fmtD(r.issueDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Exportar (placeholder) ────────────────────────────────────────── */}
      <section>
        <Card className="border-dashed">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-3">
              La exportación de reportes estará disponible en una fase futura.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled className="gap-2 opacity-50">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Exportar Excel
              </Button>
              <Button variant="outline" size="sm" disabled className="gap-2 opacity-50">
                <Download className="w-3.5 h-3.5" />
                Exportar PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

    </div>
  )
}
