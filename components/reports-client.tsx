"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CreditCard, FileText, CheckCircle2, Clock, Download, FileSpreadsheet, Filter } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts"
import type { ReportsData, ReportFilters } from "@/lib/data/reports"

function buildExportUrl(filters: ReportFilters, endpoint = "/api/reports/export"): string {
  const p = new URLSearchParams()
  if (filters.range !== "this_month") p.set("range", filters.range)
  if (filters.range === "custom" && filters.rawStartDate) p.set("startDate", filters.rawStartDate)
  if (filters.range === "custom" && filters.rawEndDate) p.set("endDate", filters.rawEndDate)
  if (filters.supplierId) p.set("supplierId", filters.supplierId)
  if (filters.origin) p.set("origin", filters.origin)
  if (filters.operationStatus) p.set("status", filters.operationStatus)
  if (filters.category) p.set("category", filters.category)
  const qs = p.toString()
  return endpoint + (qs ? "?" + qs : "")
}

// ──── Helpers ──────────────────────────────────────────────────────────────────

const fmtS = (n: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

const fmtD = (s: string) =>
  new Date(s + "T12:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })

const CATEGORY_LABEL: Record<string, string> = {
  CONFECCION: "Confección", CORTE: "Corte", ESTAMPADO: "Estampado",
  ACABADO_EMPAQUE: "Acabado/Emp.", MATERIA_PRIMA: "Mat. Prima",
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

const SEL = "w-full h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
const LBL = "text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1"

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

// ──── Filter bar ───────────────────────────────────────────────────────────────

function FilterBar({ data }: { data: ReportsData }) {
  const { filters, supplierList } = data
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [range, setRange] = useState(filters.range)
  const [customStart, setCustomStart] = useState(filters.rawStartDate)
  const [customEnd, setCustomEnd] = useState(filters.rawEndDate)
  const [supplierId, setSupplierId] = useState(filters.supplierId ?? "")
  const [origin, setOrigin] = useState(filters.origin ?? "")
  const [status, setStatus] = useState(filters.operationStatus ?? "")
  const [category, setCategory] = useState(filters.category ?? "")

  function apply() {
    const p = new URLSearchParams()
    if (range !== "this_month") p.set("range", range)
    if (range === "custom" && customStart) p.set("startDate", customStart)
    if (range === "custom" && customEnd) p.set("endDate", customEnd)
    if (supplierId) p.set("supplierId", supplierId)
    if (origin) p.set("origin", origin)
    if (status) p.set("status", status)
    if (category) p.set("category", category)
    const qs = p.toString()
    startTransition(() => { router.push("/reports" + (qs ? "?" + qs : "")) })
  }

  function clear() {
    setRange("this_month")
    setCustomStart("")
    setCustomEnd("")
    setSupplierId("")
    setOrigin("")
    setStatus("")
    setCategory("")
    startTransition(() => { router.push("/reports") })
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 mb-3 text-xs font-medium text-muted-foreground">
          <Filter className="w-3 h-3" />
          Filtros
          {filters.activeCount > 0 && (
            <span className="ml-1 inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {filters.activeCount} activo{filters.activeCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          {/* Periodo */}
          <div className="min-w-[140px]">
            <label className={LBL}>Periodo</label>
            <select className={SEL} value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="this_month">Este mes</option>
              <option value="last_month">Mes anterior</option>
              <option value="last_30">Últimos 30 días</option>
              <option value="last_90">Últimos 90 días</option>
              <option value="this_year">Año actual</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {/* Custom date inputs */}
          {range === "custom" && (
            <>
              <div className="min-w-[128px]">
                <label className={LBL}>Desde</label>
                <input
                  type="date"
                  className={SEL}
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div className="min-w-[128px]">
                <label className={LBL}>Hasta</label>
                <input
                  type="date"
                  className={SEL}
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Proveedor */}
          <div className="min-w-[140px]">
            <label className={LBL}>Proveedor</label>
            <select className={SEL} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Todos</option>
              {supplierList.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Origen */}
          <div className="min-w-[140px]">
            <label className={LBL}>Origen</label>
            <select className={SEL} value={origin} onChange={(e) => setOrigin(e.target.value)}>
              <option value="">Todos</option>
              <option value="ORDEN_COMPRA">Orden de compra</option>
              <option value="ORDEN_SERVICIO">Orden de servicio</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>

          {/* Estado */}
          <div className="min-w-[128px]">
            <label className={LBL}>Estado pago</label>
            <select className={SEL} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="POR_PAGAR">Por pagar</option>
              <option value="ADELANTO">Adelanto</option>
              <option value="COBRADO">Cobrado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>

          {/* Categoría */}
          <div className="min-w-[140px]">
            <label className={LBL}>Categoría</label>
            <select className={SEL} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Todas</option>
              <option value="CONFECCION">Confección</option>
              <option value="CORTE">Corte</option>
              <option value="ESTAMPADO">Estampado</option>
              <option value="ACABADO_EMPAQUE">Acabado/Empaque</option>
              <option value="MATERIA_PRIMA">Mat. Prima</option>
              <option value="MOVILIDAD">Movilidad</option>
              <option value="PLANILLA">Planilla</option>
              <option value="IMPUESTO">Impuesto</option>
              <option value="OTROS">Otros</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 items-end">
            <Button
              variant="outline" size="sm"
              onClick={clear}
              disabled={isPending}
              className="h-8 text-xs"
            >
              Limpiar
            </Button>
            <Button
              size="sm"
              onClick={apply}
              disabled={isPending}
              className="h-8 text-xs"
            >
              {isPending ? "Cargando…" : "Aplicar filtros"}
            </Button>
          </div>
        </div>

        {/* Active filter summary */}
        <p className="mt-3 text-[11px] text-muted-foreground">
          <span className="font-medium">Periodo:</span> {filters.rangeLabel}
          {filters.activeCount === 0 && (
            <span className="ml-1 text-muted-foreground/60">· Sin filtros activos</span>
          )}
          {filters.activeCount > 0 && (
            <span className="ml-1">
              · <span className="text-primary font-medium">
                {filters.activeCount} filtro{filters.activeCount !== 1 ? "s" : ""} activo{filters.activeCount !== 1 ? "s" : ""}
              </span>
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  )
}

// ──── Main component ───────────────────────────────────────────────────────────

export function ReportsClient({ data }: { data: ReportsData }) {
  const {
    summary, accountsPayable, monthlyPayments, partialPayments,
    expensesBySupplier, expensesByCategory, pendingOrders, monthlyFlow,
    filters, isDemo,
  } = data

  const noDataMsg = "No se encontraron datos para los filtros seleccionados."

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl">

      {/* ── Filtros ───────────────────────────────────────────────────────── */}
      <FilterBar data={data} />

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
            label="Pagado en el periodo"
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

      {/* ── Flujo por periodo ─────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Ingresos vs. egresos — {filters.rangeLabel}</SectionTitle>
        <Card>
          <CardContent className="pt-4 pb-2">
            {monthlyFlow.length === 0 ? (
              <EmptyState message={noDataMsg} />
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
              <EmptyState message="No hay cuentas pendientes para los filtros seleccionados." />
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

      {/* ── Pagos del periodo ─────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Pagos del periodo</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Por método</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyPayments.metodos.length === 0 ? (
                <EmptyState message="Sin pagos en el periodo" />
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

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Pagos registrados ({monthlyPayments.cantidadPagos})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {monthlyPayments.pagos.length === 0 ? (
                <EmptyState message="Sin pagos registrados en el periodo." />
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
              <EmptyState message="No hay pagos parciales activos para los filtros seleccionados." />
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
                <EmptyState message={noDataMsg} />
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
                <EmptyState message={noDataMsg} />
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
                <EmptyState message={noDataMsg} />
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
                <EmptyState message={noDataMsg} />
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
                          <td className="px-4 py-2.5 text-right tabular-nums">{r.porcentaje}%</td>
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
              <EmptyState message="No hay órdenes pendientes para los filtros seleccionados." />
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

      {/* ── Exportar ─────────────────────────────────────────────────────── */}
      <section>
        <Card className="border-dashed">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-3">
              Exportar datos del periodo <strong>{filters.rangeLabel}</strong>
              {filters.activeCount > 0 && (
                <> con <strong>{filters.activeCount}</strong> filtro{filters.activeCount !== 1 ? "s" : ""} activo{filters.activeCount !== 1 ? "s" : ""}</>
              )}.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => { window.location.href = buildExportUrl(filters) }}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Exportar Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => { window.location.href = buildExportUrl(filters, "/api/reports/export-pdf") }}
              >
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
