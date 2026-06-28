"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { FilterBar } from "@/components/filter-bar"
import { TypeBadge, DemoBadge } from "@/components/status-badge"
import { EmptyState } from "@/components/empty-state"
import { PaymentModal } from "@/components/payment-modal"
import type { CashMovementRow } from "@/lib/data/cash-movements"
import { markMovementPending } from "@/app/actions/orders-to-cash"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Upload, Download, ArrowLeftRight, AlertTriangle, CreditCard, History, RotateCcw } from "lucide-react"

const fmt = (n: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 }).format(n)

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })

const statusLabel: Record<string, { label: string; className: string }> = {
  POR_PAGAR:  { label: "Pendiente", className: "bg-amber-50  text-amber-700  border border-amber-200"  },
  ADELANTO:   { label: "Parcial",   className: "bg-blue-50   text-blue-700   border border-blue-200"   },
  COBRADO:    { label: "Pagado",    className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  CANCELADO:  { label: "Cancelado", className: "bg-gray-100  text-gray-500   border border-gray-200"   },
  POR_COBRAR: { label: "Por cobrar",className: "bg-purple-50 text-purple-700  border border-purple-200"},
  OTROS:      { label: "Otros",     className: "bg-muted      text-muted-foreground border border-border" },
}

type ModalState = {
  movementId: string
  invoiceAmount: number | null
  abono: number
  aPagar: number
  party: string
  orderNumber: string | null
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
  const [modal, setModal] = useState<ModalState | null>(null)

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
  const totalEgresos  = filtered.filter((m) => m.type === "EGRESO").reduce((a, m) => a + m.abono, 0)
  const totalPorPagar = filtered
    .filter((m) => m.operationStatus === "POR_PAGAR" && m.type === "EGRESO")
    .reduce((a, m) => a + (m.invoiceAmount ?? m.aPagar), 0)
  const totalParciales = filtered
    .filter((m) => m.operationStatus === "ADELANTO" && m.type === "EGRESO")
    .reduce((a, m) => a + m.aPagar, 0)

  const openModal = (m: CashMovementRow) => {
    setModal({
      movementId: m.id,
      invoiceAmount: m.invoiceAmount,
      abono: m.abono,
      aPagar: m.aPagar,
      party: m.party,
      orderNumber: m.orderNumber,
    })
  }

  const handleRevertToPending = (movementId: string) => {
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

      {modal && (
        <PaymentModal
          {...modal}
          onClose={() => setModal(null)}
          onSuccess={() => router.refresh()}
        />
      )}

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
            <p className="text-xs text-blue-700">Actualizando...</p>
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

        {!isDemo && (totalPorPagar > 0 || totalParciales > 0) && (
          <div className="flex flex-wrap items-center gap-4 px-1 text-xs">
            {totalPorPagar > 0 && (
              <span className="text-amber-700 font-medium">
                Pendiente: {fmt(totalPorPagar)}
                <span className="ml-1 text-muted-foreground font-normal">
                  ({filtered.filter((m) => m.operationStatus === "POR_PAGAR" && m.type === "EGRESO").length} mov.)
                </span>
              </span>
            )}
            {totalParciales > 0 && (
              <span className="text-blue-700 font-medium">
                Parcial: {fmt(totalParciales)}
                <span className="ml-1 text-muted-foreground font-normal">
                  ({filtered.filter((m) => m.operationStatus === "ADELANTO" && m.type === "EGRESO").length} mov.)
                </span>
              </span>
            )}
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
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Estado pago</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Categoría</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Proveedor / Parte</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Descripción</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Importe</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Abonado</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Saldo</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Balance</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((m) => {
                      const st = statusLabel[m.operationStatus] ?? statusLabel.OTROS
                      const canPay = !isDemo && m.type === "EGRESO" && m.invoiceAmount != null && m.aPagar > 0
                      const canRevert = !isDemo && m.operationStatus === "COBRADO" && (m.purchaseOrderId != null || m.serviceOrderId != null) && m.paymentCount === 0
                      const hasPayments = m.paymentCount > 0
                      return (
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
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${st.className}`}>{st.label}</span>
                            {hasPayments && (
                              <span className="ml-1 text-[10px] text-muted-foreground">{m.paymentCount}p</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-foreground">{m.category.replace(/_/g, " ")}</td>
                          <td className="px-4 py-3 text-foreground max-w-[130px] truncate">{m.party}</td>
                          <td className="px-4 py-3 text-muted-foreground max-w-[150px] truncate">{m.description ?? "—"}</td>
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
                            <div className="flex items-center gap-1">
                              {canPay && (
                                <button
                                  onClick={() => openModal(m)}
                                  title={hasPayments ? `Ver pagos (${m.paymentCount})` : "Registrar pago"}
                                  className="inline-flex items-center gap-1 h-6 px-2 text-[10px] font-medium rounded border border-primary/30 text-primary hover:bg-primary/5 transition-colors whitespace-nowrap"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  {hasPayments ? `Pagos (${m.paymentCount})` : "Pagar"}
                                </button>
                              )}
                              {hasPayments && !canPay && (
                                <button
                                  onClick={() => openModal(m)}
                                  title="Ver historial de pagos"
                                  className="inline-flex items-center gap-1 h-6 px-2 text-[10px] font-medium rounded border border-border text-muted-foreground hover:bg-muted transition-colors whitespace-nowrap"
                                >
                                  <History className="w-3 h-3" />
                                  {m.paymentCount}p
                                </button>
                              )}
                              {canRevert && (
                                <button
                                  onClick={() => handleRevertToPending(m.id)}
                                  title="Revertir a pendiente"
                                  className="inline-flex items-center gap-1 h-6 px-2 text-[10px] font-medium rounded border border-border text-muted-foreground hover:bg-muted transition-colors whitespace-nowrap"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Revertir
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
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
