"use client"

import { useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { DemoBadge } from "@/components/status-badge"
import { demoPurchaseOrders } from "@/lib/demo-data"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ShoppingCart, Plus, Search, AlertTriangle } from "lucide-react"

const fmt = (n: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(n)

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

const statusConfig: Record<string, { label: string; className: string }> = {
  BORRADOR:    { label: "Borrador",    className: "bg-gray-100 text-gray-600" },
  EMITIDA:     { label: "Emitida",     className: "bg-blue-100 text-blue-700" },
  APROBADA:    { label: "Aprobada",    className: "bg-indigo-100 text-indigo-700" },
  EN_PROCESO:  { label: "En proceso",  className: "bg-amber-100 text-amber-700" },
  COMPLETADA:  { label: "Completada",  className: "bg-emerald-100 text-emerald-700" },
  ANULADA:     { label: "Anulada",     className: "bg-red-100 text-red-600" },
}

const paymentConfig: Record<string, { label: string; className: string }> = {
  PENDIENTE: { label: "Pendiente", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  ADELANTO:  { label: "Adelanto",  className: "bg-blue-50 text-blue-700 border border-blue-200" },
  PARCIAL:   { label: "Parcial",   className: "bg-orange-50 text-orange-700 border border-orange-200" },
  PAGADO:    { label: "Pagado",    className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  VENCIDO:   { label: "Vencido",   className: "bg-red-50 text-red-700 border border-red-200" },
}

export default function PurchaseOrdersPage() {
  const [search, setSearch] = useState("")

  const filtered = demoPurchaseOrders.filter((oc) => {
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

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Órdenes de Compra" subtitle="Compras de insumos y materiales" />

      <main className="flex-1 p-6 space-y-4">
        {/* Demo notice */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">
            Datos de demostración. Conecta la base de datos para ver órdenes reales.
          </p>
          <DemoBadge />
        </div>

        {/* Toolbar */}
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

        {/* Summary strip */}
        {filtered.length > 0 && (
          <div className="flex gap-4 text-xs text-muted-foreground px-1">
            <span>{filtered.length} órdenes</span>
            <span className="text-amber-700 font-medium">
              Por pagar: {fmt(totalPendiente)}
            </span>
          </div>
        )}

        {/* Table */}
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
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Responsable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((oc) => {
                      const st = statusConfig[oc.status] ?? { label: oc.status, className: "bg-muted text-muted-foreground" }
                      const pt = paymentConfig[oc.paymentStatus] ?? { label: oc.paymentStatus, className: "bg-muted text-muted-foreground border border-border" }
                      return (
                        <tr key={oc.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono font-medium text-primary">{oc.orderNumber}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(oc.issueDate)}</td>
                          <td className="px-4 py-3 text-foreground max-w-[160px] truncate">{oc.supplier}</td>
                          <td className="px-4 py-3 text-muted-foreground max-w-[140px] truncate">{oc.mainItem}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">{fmt(oc.totalAmount)}</td>
                          <td className={`px-4 py-3 text-right tabular-nums font-medium ${oc.pendingAmount > 0 ? "text-amber-700" : "text-muted-foreground"}`}>
                            {oc.pendingAmount > 0 ? fmt(oc.pendingAmount) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${st.className}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${pt.className}`}>
                              {pt.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{oc.responsible}</td>
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
    </div>
  )
}
