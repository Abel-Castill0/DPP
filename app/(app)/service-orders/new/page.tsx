"use client"

import { useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { demoSuppliers } from "@/lib/demo-data"
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
import { Plus, Trash2, ArrowLeft, Info } from "lucide-react"

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

const talleres = demoSuppliers.filter(
  (s) => s.supplierType === "TALLER" || s.supplierType === "SERVICIO"
)

export default function NewServiceOrderPage() {
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [process, setProcess] = useState<string | null>(null)
  const [proformaCode, setProformaCode] = useState("")
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [expectedDate, setExpectedDate] = useState("")
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<LineItem[]>([emptyLine()])

  const updateLine = (id: string, field: keyof LineItem, value: string) => {
    setLines((prev) =>
      prev.map((l) => (l.id !== id ? l : { ...l, [field]: value }))
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

  const canSubmit = !!supplierId && !!process && lines.some((l) => l.description)

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Nueva Orden de Servicio"
        subtitle="Ingresa los datos de la orden"
      />

      <main className="flex-1 p-6 space-y-5 max-w-5xl">
        {/* Info */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-800">
            El número de orden (OS-2026-XXX) se generará automáticamente. Los datos se guardarán cuando la base de datos esté conectada.
          </p>
        </div>

        {/* Cabecera */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Datos generales</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 space-y-1.5">
              <Label className="text-xs font-medium">Taller / Proveedor de servicio *</Label>
              <Select onValueChange={(v) => setSupplierId((v as string | null) ?? null)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {talleres.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Proceso *</Label>
              <Select onValueChange={(v) => setProcess((v as string | null) ?? null)}>
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
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Código proforma / estilo</Label>
              <Input
                className="h-9 text-sm font-mono"
                placeholder="PI-2026-XXXX"
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

        {/* Líneas */}
        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Detalle del servicio</CardTitle>
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
                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Descripción / Servicio</th>
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
                        <Input
                          className="h-8 text-xs"
                          placeholder="Descripción del servicio..."
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
                    <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-muted-foreground text-right">
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
              placeholder="Condiciones de entrega, muestra, referencia de estilo..."
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
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled
              title="Disponible con BD conectada"
            >
              Guardar borrador
            </Button>
            <Button
              size="sm"
              disabled={!canSubmit}
              title="Disponible con BD conectada"
            >
              Generar orden
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
