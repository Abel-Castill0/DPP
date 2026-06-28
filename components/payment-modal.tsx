"use client"

import { useState, useTransition, useEffect } from "react"
import { registerPayment, revertLastPayment, getPaymentHistory } from "@/app/actions/payments"
import type { PaymentHistoryItem } from "@/app/actions/payments"
import { X, CreditCard, History, AlertTriangle, CheckCircle2, RotateCcw, Loader2 } from "lucide-react"

const fmt = (n: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 }).format(n)

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })

const PAYMENT_METHODS = [
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "DEPOSITO",      label: "Depósito" },
  { value: "EFECTIVO",      label: "Efectivo" },
  { value: "CHEQUE",        label: "Cheque" },
  { value: "TARJETA",       label: "Tarjeta" },
  { value: "OTRO",          label: "Otro" },
]

type Props = {
  movementId: string
  invoiceAmount: number | null
  abono: number
  aPagar: number
  party: string
  orderNumber: string | null
  onClose: () => void
  onSuccess: () => void
}

export function PaymentModal({ movementId, invoiceAmount, abono, aPagar, party, orderNumber, onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<"pay" | "history">("pay")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [method, setMethod] = useState("TRANSFERENCIA")
  const [opNumber, setOpNumber] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<PaymentHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (tab === "history") loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  async function loadHistory() {
    setHistoryLoading(true)
    const result = await getPaymentHistory(movementId)
    setHistoryLoading(false)
    if ("success" in result) setHistory(result.success)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) { setError("Ingresa un monto válido mayor a cero."); return }
    if (amt > aPagar + 0.001) { setError(`El monto no puede superar el saldo pendiente (${fmt(aPagar)}).`); return }

    startTransition(async () => {
      const result = await registerPayment({
        cashMovementId: movementId,
        amount: amt,
        date,
        paymentMethod: method,
        operationNumber: opNumber || undefined,
        notes: notes || undefined,
      })
      if ("error" in result) { setError(result.error) }
      else { onSuccess(); onClose() }
    })
  }

  function handleRevert() {
    setError(null)
    startTransition(async () => {
      const result = await revertLastPayment(movementId)
      if ("error" in result) { setError(result.error) }
      else { onSuccess(); setTab("pay"); loadHistory() }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 rounded-xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Pagos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {party}{orderNumber ? ` · ${orderNumber}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Resumen financiero */}
        <div className="px-5 pt-4 pb-2 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/40 px-3 py-2">
            <p className="text-[10px] text-muted-foreground">Importe</p>
            <p className="text-xs font-semibold tabular-nums">{invoiceAmount != null ? fmt(invoiceAmount) : "—"}</p>
          </div>
          <div className="rounded-lg bg-emerald-50 px-3 py-2">
            <p className="text-[10px] text-muted-foreground">Abonado</p>
            <p className="text-xs font-semibold tabular-nums text-emerald-700">{fmt(abono)}</p>
          </div>
          <div className="rounded-lg bg-amber-50 px-3 py-2">
            <p className="text-[10px] text-muted-foreground">Saldo</p>
            <p className="text-xs font-semibold tabular-nums text-amber-700">{fmt(aPagar)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mx-5">
          <button
            onClick={() => setTab("pay")}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${tab === "pay" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <CreditCard className="w-3 h-3 inline mr-1" />
            Registrar pago
          </button>
          <button
            onClick={() => setTab("history")}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${tab === "history" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <History className="w-3 h-3 inline mr-1" />
            Historial
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0" />
            <p className="text-[11px] text-red-800">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Tab: Registrar pago */}
        {tab === "pay" && (
          <form onSubmit={handleSubmit} className="p-5 space-y-3">
            {aPagar <= 0 ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-xs text-emerald-800 font-medium">Este movimiento está completamente pagado.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">Monto *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={aPagar}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={`Máx. ${fmt(aPagar)}`}
                      className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">Fecha *</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-foreground mb-1">Método de pago *</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-foreground mb-1">N° Operación</label>
                  <input
                    type="text"
                    value={opNumber}
                    onChange={(e) => setOpNumber(e.target.value)}
                    placeholder="Opcional"
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-foreground mb-1">Observación</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Opcional"
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setAmount(aPagar.toFixed(2))}
                    className="h-8 px-3 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors"
                  >
                    Pago total ({fmt(aPagar)})
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 h-8 px-3 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/80 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Registrar pago
                  </button>
                </div>
              </>
            )}
          </form>
        )}

        {/* Tab: Historial */}
        {tab === "history" && (
          <div className="p-5 space-y-3 max-h-72 overflow-y-auto">
            {historyLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Cargando historial...</span>
              </div>
            ) : history.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">Sin pagos registrados.</p>
            ) : (
              <>
                {history.map((p, i) => (
                  <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center mt-0.5">
                      <span className="text-[10px] font-bold text-emerald-700">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold tabular-nums text-foreground">{fmt(p.amount)}</span>
                        <span className="text-[10px] text-muted-foreground">{fmtDate(p.date)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{p.paymentMethod.replace(/_/g, " ")}</span>
                        {p.operationNumber && (
                          <span className="text-[10px] font-mono text-muted-foreground">#{p.operationNumber}</span>
                        )}
                      </div>
                      {p.notes && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{p.notes}</p>}
                      {p.createdByName && (
                        <p className="text-[10px] text-muted-foreground">por {p.createdByName}</p>
                      )}
                    </div>
                  </div>
                ))}
                {history.length > 0 && aPagar > 0 && (
                  <button
                    onClick={handleRevert}
                    disabled={isPending}
                    className="w-full h-8 text-xs font-medium rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    Revertir último pago
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
