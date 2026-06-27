"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { demoSuppliers, demoItems } from "@/lib/demo-data"
import { createPurchaseOrder } from "@/app/actions/purchase-orders"
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
import { Plus, Trash2, ArrowLeft, Info, AlertCircle } from "lucide-react"

interface LineItem {
  id: string
  itemCode: string
  description: string
  quantity: string
  unit: string
  unitPrice: string
}

const emptyLine = (): LineItem => ({
  id: crypto.randomUUID(),
  itemCode: "",
  description: "",
  quantity: "",
  unit: "UND",
  unitPrice: "",
})

const insumos = demoItems.filter((it) => it.itemType === "INSUMO")

export default function NewPurchaseOrderPage() {
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [expectedDate, setExpectedDate] = useState("")
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<LineItem[]>([emptyLine()])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const updateLine = (id: string, field: keyof LineItem, value: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l
        const updated = { ...l, [field]: value }
        if (field === "itemCode") {
          const found = insumos.find((i) => i.code === value)
          if (found) {
            updated.description = found.name
            updated.unit = found.unit
          }
        }
        return updated
      })
    )
  }

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  const subtotal = (l: LineItem) => {
    const qty = parseFloat(l.quantity) || 0
    const price = parseFloat(l.unitPrice) || 0
    return qty * price
  }

  const total = lines.reduce((acc, l) => acc + subtotal(l), 0)

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2,
    }).format(n)

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Nueva Orden de Compra"
        subtitle="Ingresa los datos de la orden"
      />

      <main className="flex-1 p-6 space-y-5 max-w-5xl">
        {/* Info */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-800">
            El número de orden (OC-2026-XXX) se generará automáticamente al guardar.
          </p>
        </div>

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
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Proveedor *</Label>
              <Select onValueChange={(v) => setSupplierId((v as string | null) ?? null)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Seleccionar proveedor..." />
                </SelectTrigger>
                <SelectContent>
                  {demoSuppliers
                    .filter((s) => s.supplierType === "PROVEEDOR_INSUMO")
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code} — {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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

        {/* Líneas */}
        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Líneas de compra</CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 h-7 text-xs"
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar línea
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-border bg-muted/40">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground w-28">Item</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Descripción</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground w-24">Cantidad</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground w-20">Unidad</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground w-28">P. Unitario</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground w-28">Subtotal</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-2">
                        <select
                          className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                          value={line.itemCode}
                          onChange={(e) => updateLine(line.id, "itemCode", e.target.value)}
                        >
                          <option value="">— Seleccionar —</option>
                          {insumos.map((i) => (
                            <option key={i.id} value={i.code}>
                              {i.code} — {i.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          className="h-8 text-xs"
                          placeholder="Descripción..."
                          value={line.description}
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
                          onChange={(e) => updateLine(line.id, "quantity", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          className="h-8 text-xs"
                          value={line.unit}
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
                          onChange={(e) => updateLine(line.id, "unitPrice", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium text-foreground">
                        {subtotal(line) > 0 ? fmt(subtotal(line)) : "—"}
                      </td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => removeLine(line.id)}
                          disabled={lines.length === 1}
                          className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 disabled:opacity-30 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-border bg-muted/20">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-muted-foreground text-right">
                      Total general
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-foreground text-sm">
                      {fmt(total)}
                    </td>
                    <td />
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
              placeholder="Condiciones de entrega, notas especiales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/purchase-orders"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a la lista
          </Link>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" disabled>
              Guardar borrador
            </Button>
            <Button
              size="sm"
              disabled={isPending || !supplierId || lines.every((l) => !l.description)}
              onClick={() => {
                setError(null)
                startTransition(async () => {
                  const result = await createPurchaseOrder({
                    supplierId: supplierId!,
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
              }}
            >
              {isPending ? "Guardando..." : "Generar orden"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
