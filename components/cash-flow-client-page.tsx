"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { FilterBar } from "@/components/filter-bar"
import { TypeBadge, StatusBadge, DemoBadge } from "@/components/status-badge"
import { EmptyState } from "@/components/empty-state"
import type { CashMovementRow } from "@/lib/data/cash-movements"
import { markMovementPaid, markMovementPending } from "@/app/actions/orders-to-cash"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Upload, Download, ArrowLeftRight, AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react"

const fmt = (n: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 }).format(n)

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })

function PaidAction({
  movement,
  isDemo,
  onPaid,
  onPending,
}: {
  movement: CashMovementRow
  isDemo: boolean
  onPaid: (id: string) => void
  onPending: (id: string) => void
}) {
  if (isDemo) return null

  if (movement.operationStatus === "POR_PAGAR" && movement.type === "EGRESO") {
    return (
      <button
        onClick={() => onPaid(movement.id)}
        title="Marcar como pagado"
        className="inline-flex items-center gap-1 h-6 px-2 text-[10px] font-medium rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors whitespace-nowrap"
      >
        <CheckCircle2 className="w-3 h-3" />
        Pagar
      </button>
    )
  }

  if (movement.operationStatus === "COBRADO" && (movement.purchaseOrderId ?? movement.serviceOrderId)) {
    return (
      <button
        onClick={() => onPending(movement.id)}
        title="Revertir a pendiente"
        className="inline-flex items-center gap-1 h-6 px-2 text-[10px] font-medium rounded border border-border text-muted-foreground hover:bg-muted transition-colors whitespace-nowrap"
      >
        <RotateCcw className="w-3 h-3" />
        Revertir
      </button>
    )
  }

  return null
}

export function CashFlowClientPage({
  movements,
  isDemo,
}: {
  movements: CashMovementRow[]
  isDemo: boolean
}) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  const filtered = movements.filter((m) => {
    const matchSearch =
      !search ||
      m.description?.toLowerCase().includes(search.toLowerCase()) ||
      m.party.toLowerCase().includes(search.toLowerCase()) ||
      m.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      m.orderNumber?.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === "all" || m.type === typeFilter
    const matchStatus = statusFilter === "all" || m.operationStatus === statusFilter
    return matchSearch && matchType && matchStatus
  })

  const totalIngresos = filtered.filter((m) => m.type === "INGRESO").reduce((a, m) => a + m.abono, 0)
  const totalEgresos = filtered.filter((m) => m.type === "EGRESO").reduce((a, m) => a + m.abono, 0)
  const totalPorPagar = filtered
    .filter((m) => m.operationStatus === "POR_PAGAR" && m.type === "EGRESO")
    .reduce((a, m) => a + (m.invoiceAmount ?? m.aPagar), 0)

  const handlePaid = (movementId: string) => {
    setActionError(null)
    startTransition(async () => {
      const result = await markMovementPaid(movementId)
      if ("error" in result) setActionError(result.error)
      else router.refresh()
    })
  }

  const handlePending = (movementId: string) => {
    setActionError(null)
    startTransition(async () => {
      const result = await markMovementPending(movementId)
      if ("error" in result) setActionError(result.error)
      else router.refresh()
    })
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Flujo de Caja" subtitle="Movimientos de ingresos y egresos" />

      <main className="flex-1 p-6 space-y-4">
        {isDemo && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700">
              Datos de demostración. Conecta la base de datos para ver movimientos reales.
            </p>
            <DemoBadge />
          </div>
        )}

        {actionError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <p className="text-xs text-red-800">{actionError}</p>
            <button onClick={() => setActionError(null)} className="ml-auto text-xs text-red-500 hover:text-red-700">✕</button>
          </div>
        )}

        {isPending && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <p className="text-xs text-blue-700">Actualizando movimiento...</p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterBar
            onSearch={setSearch}
            onTypeFilter={(v) => setTypeFilter(v ?? "all")}
            onStatusFilter={(v) => setStatusFilter(v ?? "all")}
            onClear={() => { setSearch(""); setTypeFilter("all"); setStatusFilter("all") }}
          />
          <div className="flex gap-2">
            <Link
              href="/imports"
              className="inline-flex items-center gap-2 h-7 px-2.5 text-[0.8rem] font-medium rounded-[min(var(--radius-md),12px)] border border-border bg-background hover:bg-muted transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Importar
            </Link>
            <Button variant="outline" size="sm" className="gap-2" disabled title="Disponible en Fase 6">
              <Download className="w-3.5 h-3.5" />
              Exportar
            </Button>
            <Link
              href="/cash-flow/new"
              className="inline-flex items-center gap-2 h-7 px-2.5 text-[0.8rem] font-medium rounded-[min(var(--radius-md),12px)] bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo movimiento
            </Link>
          </div>
        </div>

        {!isDemo && totalPorPagar > 0 && (
          <div className="flex items-center gap-2 px-1 text-xs text-amber-700">
            <span className="font-medium">Por pagar: {fmt(totalPorPagar)}</span>
            <span className="text-muted-foreground">({filtered.filter((m) => m.operationStatus === "POR_PAGAR" && m.type === "EGRESO").length} movimientos pendientes)</span>
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <EmptyState
                icon={ArrowLeftRight}
                title="No se encontraron movimientos"
                description="Ajusta los filtros o importa el historial del Excel."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-border">
                    <tr className="bg-muted/40">
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Fecha</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Tipo</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Origen</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">N° Orden</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Estado</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Categoría</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Proveedor / Parte</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Descripción</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Importe</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Abono</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Por pagar</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Saldo</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((m) => (
                      <tr key={m.id} className={`hover:bg-muted/30 transition-colors ${isPending ? "opacity-60" : ""}`}>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(m.date)}</td>
                        <td className="px-4 py-3"><TypeBadge type={m.type as "INGRESO" | "EGRESO"} /></td>
                        <td className="px-4 py-3">
                          {m.origin === "ORDEN_COMPRA"   && <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">OC</span>}
                          {m.origin === "ORDEN_SERVICIO" && <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700">OS</span>}
                          {m.origin === "MANUAL"         && <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">Manual</span>}
                          {m.origin === "IMPORTADO"      && <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">Import.</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{m.orderNumber ?? "—"}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={m.operationStatus as "CANCELADO" | "COBRADO" | "ADELANTO" | "POR_PAGAR" | "POR_COBRAR" | "DEVOLUCIONES" | "OTROS"} />
                        </td>
                        <td className="px-4 py-3 text-foreground">{m.category.replace(/_/g, " ")}</td>
                        <td className="px-4 py-3 text-foreground max-w-[140px] truncate">{m.party}</td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[160px] truncate">{m.description ?? "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-foreground font-medium">
                          {m.invoiceAmount != null ? fmt(m.invoiceAmount) : "—"}
                        </td>
                        <td className={`px-4 py-3 text-right tabular-nums font-medium ${m.type === "INGRESO" ? "text-emerald-700" : "text-red-600"}`}>
                          {m.abono > 0 ? fmt(m.abono) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-amber-700">
                          {m.aPagar > 0 ? fmt(m.aPagar) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground">
                          {fmt(m.saldo)}
                        </td>
                        <td className="px-4 py-3">
                          <PaidAction
                            movement={m}
                            isDemo={isDemo}
                            onPaid={handlePaid}
                            onPending={handlePending}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-border bg-muted/20">
                    <tr>
                      <td colSpan={9} className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Totales ({filtered.length} movimientos)
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-xs">
                        <span className="text-emerald-700 font-semibold">+{fmt(totalIngresos)}</span>
                        {" / "}
                        <span className="text-red-600 font-semibold">-{fmt(totalEgresos)}</span>
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
