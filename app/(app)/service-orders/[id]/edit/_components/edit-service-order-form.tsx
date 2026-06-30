"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { updateServiceOrder } from "@/app/actions/service-orders"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, ArrowLeft, AlertCircle, Lock, Info } from "lucide-react"
import type { ServiceOrderDetail } from "@/lib/data/service-orders"
import type { SupplierRow } from "@/lib/data/suppliers"
import type { ItemRow } from "@/lib/data/items"

const processOptions = [
  { value: "CORTE",      label: "Corte" },
  { value: "CONFECCION", label: "Confección" },
  { value: "ESTAMPADO",  label: "Estampado" },
  { value: "BORDADO",    label: "Bordado" },
  { value: "ACABADO",    label: "Acabado" },
  { value: "EMPAQUE",    label: "Empaque" },
  { value: "LAVADO",     label: "Lavado" },
  { value: "OTROS",      label: "Otros" },
]

const PROCESS_LABELS: Record<string, string> = Object.fromEntries(
  processOptions.map((p) => [p.value, p.label])
)

interface LineItem {
  id: string
  description: string
  quantity: string
  unit: string
  unitPrice: string
}

const emptyLine = (): LineItem => ({
  id: crypto.randomUUID(),
  description: "",
  quantity: "",
  unit: "UND",
  unitPrice: "",
})

interface Props {
  order: ServiceOrderDetail
  suppliers: SupplierRow[]
  items: ItemRow[]
  today: string
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 }).format(n)

export function EditServiceOrderForm({ order, suppliers }: Props) {
  const talleres = suppliers.filter(
    (s) => s.supplierType === "TALLER" || s.supplierType === "SERVICIO"
  )

  const [supplierId, setSupplierId] = useState<string>(order.supplierId)
  const [process, setProcess] = useState<string>(order.process)
  const [proformaCode, setProformaCode] = useState(order.proformaCode ?? "")
  const [issueDate, setIssueDate] = useState(order.issueDate)
  const [expectedDate, setExpectedDate] = useState(order.expectedDate ?? "")
  const [notes, setNotes] = useState(order.notes ?? "")
  const [lines, setLines] = useState<LineItem[]>(
    order.items.length > 0
      ? order.items.map((it) => ({
          id: it.id,
          description: it.description,
          quantity: String(it.quantity),
          unit: it.unit,
          unitPrice: String(it.unitPrice),
        }))
      : [emptyLine()]
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canEditFinancial = order.canEditFinancial

  const updateLine = (id: string, field: keyof LineItem, value: string) => {
    setLines((prev) => prev.map((l) => (l.id !== id ? l : { ...l, [field]: value })))
  }

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  const subtotal = (l: LineItem) => (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0)
  const total = lines.reduce((acc, l) => acc + subtotal(l), 0)

  const handleSubmit = () => {
    setError(null)
    startTransition(async () => {
      const result = await updateServiceOrder(order.id, {
        supplierId: canEditFinancial ? supplierId : undefined,
        process: canEditFinancial ? process : undefined,
        proformaCode: proformaCode || undefined,
        issueDate,
        expectedDate: expectedDate || undefined,
        notes: notes || undefined,
        lines: lines
          .filter((l) => l.description)
          .map((l) => ({
            description: l.description,
            quantity: parseFloat(l.quantity) || 0,
            unit: l.unit,
            unitPrice: parseFloat(l.unitPrice) || 0,
          })),
      })
      if ("error" in result) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title={`Editar ${order.orderNumber}`}
        subtitle="Modifica los datos de la orden de servicio"
      />

      <main className="flex-1 p-6 space-y-5 max-w-5xl">
        {!canEditFinancial && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              Esta orden ya fue enviada a caja. Solo se pueden editar fechas, proforma y observaciones.
              El taller, proceso, servicios y total están bloqueados para mantener la consistencia financiera.
            </p>
          </div>
        )}

        {canEditFinancial && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-800">
              La orden aún no fue enviada a caja. Puedes editar todos los campos.
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <p className="text-xs text-red-800">{error}</p>
          </div>
        )}

        {/* Cabecera */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Datos generales</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 space-y-1.5">
              <Label className="text-xs font-medium">Taller / Proveedor *</Label>
              {canEditFinancial ? (
                <Select value={supplierId} onValueChange={(v) => { if (v) setSupplierId(v) }}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleccionar taller..." />
                  </SelectTrigger>
                  <SelectContent>
                    {talleres.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code ? `${s.code} — ` : ""}{s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-9 flex items-center px-3 rounded-md border border-input bg-muted/50 text-sm text-muted-foreground">
                  <Lock className="w-3 h-3 mr-2 shrink-0" />
                  {order.supplierName}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Proceso *</Label>
              {canEditFinancial ? (
                <Select value={process} onValueChange={(v) => { if (v) setProcess(v) }}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleccionar proceso..." />
                  </SelectTrigger>
                  <SelectContent>
                    {processOptions.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-9 flex items-center px-3 rounded-md border border-input bg-muted/50 text-sm text-muted-foreground">
                  <Lock className="w-3 h-3 mr-2 shrink-0" />
                  {PROCESS_LABELS[order.process] ?? order.process}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Código de proforma</Label>
              <Input
                className="h-9 text-sm"
                placeholder="PRO-2026-001"
                value={proformaCode}
                onChange={(e) => setProformaCode(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Fecha de emisión *</Label>
              <Input
                type="date"
                className="h-9 text-sm"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Fecha esperada de entrega</Label>
              <Input
                type="date"
                className="h-9 text-sm"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Líneas de servicio */}
        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              Servicios
              {!canEditFinancial && <span className="ml-2 text-[10px] font-normal text-amber-600">(bloqueado — en caja)</span>}
            </CardTitle>
            {canEditFinancial && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2 h-7 text-xs"
                onClick={() => setLines((prev) => [...prev, emptyLine()])}
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar servicio
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-border bg-muted/40">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Descripción</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground w-24">Cantidad</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground w-20">Unidad</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground w-28">P. Unitario</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground w-28">Subtotal</th>
                    {canEditFinancial && <th className="w-10" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-2">
                        <Input
                          className="h-8 text-xs"
                          placeholder="Descripción del servicio..."
                          value={line.description}
                          disabled={!canEditFinancial}
                          onChange={(e) => updateLine(line.id, "description", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          className="h-8 text-xs text-right"
                          value={line.quantity}
                          disabled={!canEditFinancial}
                          onChange={(e) => updateLine(line.id, "quantity", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          className="h-8 text-xs"
                          value={line.unit}
                          disabled={!canEditFinancial}
                          onChange={(e) => updateLine(line.id, "unit", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="h-8 text-xs text-right"
                          placeholder="0.00"
                          value={line.unitPrice}
                          disabled={!canEditFinancial}
                          onChange={(e) => updateLine(line.id, "unitPrice", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium text-foreground">
                        {subtotal(line) > 0 ? fmt(subtotal(line)) : "—"}
                      </td>
                      {canEditFinancial && (
                        <td className="px-2 py-2">
                          <button
                            onClick={() => removeLine(line.id)}
                            disabled={lines.length === 1}
                            className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 disabled:opacity-30 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-border bg-muted/20">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-muted-foreground text-right">
                      Total general
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-foreground text-sm">
                      {canEditFinancial ? fmt(total) : fmt(order.totalAmount)}
                    </td>
                    {canEditFinancial && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Notas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Notas / Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              placeholder="Condiciones, instrucciones especiales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/service-orders"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a la lista
          </Link>
          <Button
            size="sm"
            disabled={isPending || lines.every((l) => !l.description)}
            onClick={handleSubmit}
          >
            {isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </main>
    </div>
  )
}
