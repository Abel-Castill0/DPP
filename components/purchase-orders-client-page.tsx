"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { DemoBadge } from "@/components/status-badge"
import type { PurchaseOrderRow } from "@/lib/data/purchase-orders"
import { generateFromPurchaseOrder } from "@/app/actions/orders-to-cash"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ShoppingCart, Plus, Search, AlertTriangle, SendHorizontal, CheckCircle2, Clock, FileDown, Pencil, Ban, X } from "lucide-react"
import { cancelPurchaseOrder } from "@/app/actions/purchase-orders"

const fmt = (n: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 }).format(n)

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })

const statusConfig: Record<string, { label: string; className: string }> = {
  BORRADOR:   { label: "Borrador",    className: "bg-gray-100 text-gray-600" },
  EMITIDA:    { label: "Emitida",     className: "bg-blue-100 text-blue-700" },
  APROBADA:   { label: "Aprobada",    className: "bg-indigo-100 text-indigo-700" },
  EN_PROCESO: { label: "En proceso",  className: "bg-amber-100 text-amber-700" },
  COMPLETADA: { label: "Completada",  className: "bg-emerald-100 text-emerald-700" },
  ANULADA:    { label: "Anulada",     className: "bg-red-100 text-red-600" },
}

const paymentConfig: Record<string, { label: string; className: string }> = {
  PENDIENTE: { label: "Pendiente", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  ADELANTO:  { label: "Adelanto",  className: "bg-blue-50 text-blue-700 border border-blue-200" },
  PARCIAL:   { label: "Parcial",   className: "bg-orange-50 text-orange-700 border border-orange-200" },
  PAGADO:    { label: "Pagado",    className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  VENCIDO:   { label: "Vencido",   className: "bg-red-50 text-red-700 border border-red-200" },
}

const cajaStatusConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  POR_PAGAR: { label: "En caja / Pendiente", icon: <Clock className="w-3 h-3 text-amber-500" /> },
  COBRADO:   { label: "Pagado",              icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" /> },
  ADELANTO:  { label: "Con adelanto",        icon: <Clock className="w-3 h-3 text-blue-500" /> },
  CANCELADO: { label: "Cancelado",           icon: <CheckCircle2 className="w-3 h-3 text-gray-400" /> },
}

function CajaCell({ row, isDemo, onSend }: { row: PurchaseOrderRow; isDemo: boolean; onSend: (id: string) => void }) {
  if (isDemo) return <span className="text-muted-foreground text-[10px]">—</span>

  if (row.hasCashMovement && row.cashMovementStatus) {
    const cfg = cajaStatusConfig[row.cashMovementStatus]
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground">
        {cfg?.icon}
        {cfg?.label ?? row.cashMovementStatus}
      </span>
    )
  }

  return (
    <button
      onClick={() => onSend(row.id)}
      className="inline-flex items-center gap-1.5 h-6 px-2 text-[10px] font-medium rounded border border-primary/30 text-primary hover:bg-primary/5 transition-colors whitespace-nowrap"
    >
      <SendHorizontal className="w-3 h-3" />
      Enviar a caja
    </button>
  )
}

export function PurchaseOrdersClientPage({
  orders,
  isDemo,
}: {
  orders: PurchaseOrderRow[]
  isDemo: boolean
}) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<{ id: string; orderNumber: string } | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [isCancelling, startCancelTransition] = useTransition()

  const filtered = orders.filter((oc) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      oc.orderNumber.toLowerCase().includes(q) ||
      oc.supplier.toLowerCase().includes(q) ||
      oc.mainItem.toLowerCase().includes(q) ||
      oc.responsible.toLowerCase().includes(q)
    )
  })

  const totalPendiente = filtered
    .filter((oc) => oc.paymentStatus !== "PAGADO")
    .reduce((acc, oc) => acc + oc.pendingAmount, 0)

  const handleCancelConfirm = () => {
    if (!cancelTarget) return
    setCancelError(null)
    startCancelTransition(async () => {
      const result = await cancelPurchaseOrder(cancelTarget.id, cancelReason)
      if ("error" in result) {
        setCancelError(result.error)
      } else {
        setCancelTarget(null)
        setCancelReason("")
        router.refresh()
      }
    })
  }

  const handleSendToCash = (orderId: string) => {
    setActionError(null)
    setPendingId(orderId)
    startTransition(async () => {
      const result = await generateFromPurchaseOrder(orderId)
      setPendingId(null)
      if ("error" in result) {
        setActionError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Órdenes de Compra" subtitle="Compras de insumos y materiales" />

      <main className="flex-1 p-6 space-y-4">
        {isDemo && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700">
              Datos de demostración. Conecta la base de datos para ver órdenes reales.
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
            <p className="text-xs text-blue-700">Generando movimiento de caja...</p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar OC, proveedor, insumo..."
              className="pl-8 h-8 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Link
            href="/purchase-orders/new"
            className="inline-flex items-center gap-2 h-8 px-3 text-xs font-medium rounded-[min(var(--radius-md),12px)] bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva OC
          </Link>
        </div>

        {filtered.length > 0 && (
          <div className="flex gap-4 text-xs text-muted-foreground px-1">
            <span>{filtered.length} órdenes</span>
            <span className="text-amber-700 font-medium">Por pagar: {fmt(totalPendiente)}</span>
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                <ShoppingCart className="w-8 h-8 opacity-30" />
                <p className="text-sm">No se encontraron órdenes de compra</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-border">
                    <tr className="bg-muted/40">
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">N° OC</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Fecha</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Proveedor</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Insumo principal</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Total</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Pendiente</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Estado</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Pago</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Caja</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Responsable</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">PDF</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((oc) => {
                      const st = statusConfig[oc.status] ?? { label: oc.status, className: "bg-muted text-muted-foreground" }
                      const pt = paymentConfig[oc.paymentStatus] ?? { label: oc.paymentStatus, className: "bg-muted text-muted-foreground border border-border" }
                      const isSending = isPending && pendingId === oc.id
                      return (
                        <tr key={oc.id} className={`hover:bg-muted/30 transition-colors ${isSending ? "opacity-60" : ""}`}>
                          <td className="px-4 py-3 font-mono font-medium text-primary">{oc.orderNumber}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(oc.issueDate)}</td>
                          <td className="px-4 py-3 text-foreground max-w-[160px] truncate">{oc.supplier}</td>
                          <td className="px-4 py-3 text-muted-foreground max-w-[140px] truncate">{oc.mainItem}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">{fmt(oc.totalAmount)}</td>
                          <td className={`px-4 py-3 text-right tabular-nums font-medium ${oc.pendingAmount > 0 ? "text-amber-700" : "text-muted-foreground"}`}>
                            {oc.pendingAmount > 0 ? fmt(oc.pendingAmount) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${st.className}`}>{st.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${pt.className}`}>{pt.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <CajaCell row={oc} isDemo={isDemo} onSend={handleSendToCash} />
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{oc.responsible}</td>
                          <td className="px-4 py-3">
                            {!isDemo && (
                              <a
                                href={`/api/purchase-orders/${oc.id}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 h-6 px-2 text-[10px] font-medium rounded border border-muted-foreground/30 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors whitespace-nowrap"
                              >
                                <FileDown className="w-3 h-3" />
                                PDF
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {!isDemo && oc.status !== "ANULADA" && (
                              <div className="flex items-center gap-1.5">
                                <Link
                                  href={`/purchase-orders/${oc.id}/edit`}
                                  className="inline-flex items-center gap-1 h-6 px-2 text-[10px] font-medium rounded border border-muted-foreground/30 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
                                >
                                  <Pencil className="w-3 h-3" />
                                  Editar
                                </Link>
                                {oc.paidAmount === 0 && (
                                  <button
                                    onClick={() => { setCancelTarget({ id: oc.id, orderNumber: oc.orderNumber }); setCancelReason(""); setCancelError(null) }}
                                    className="inline-flex items-center gap-1 h-6 px-2 text-[10px] font-medium rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    <Ban className="w-3 h-3" />
                                    Anular
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Cancel dialog */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Anular Orden de Compra</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{cancelTarget.orderNumber}</p>
              </div>
              <button onClick={() => setCancelTarget(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Esta acción anulará la orden y sus movimientos de caja asociados.
              No se puede revertir. Solo es posible si no tiene pagos registrados.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Motivo de anulación *</label>
              <textarea
                className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                placeholder="Describe el motivo de la anulación..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>

            {cancelError && (
              <div className="flex items-start gap-2 p-2 rounded-md bg-red-50 border border-red-200">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0" />
                <p className="text-[11px] text-red-800">{cancelError}</p>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setCancelTarget(null)}
                className="h-8 px-3 text-xs rounded-md border border-input hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={!cancelReason.trim() || isCancelling}
                onClick={handleCancelConfirm}
                className="h-8 px-3 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isCancelling ? "Anulando..." : "Confirmar anulación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
