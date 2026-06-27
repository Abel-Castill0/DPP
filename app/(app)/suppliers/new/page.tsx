"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { createSupplier } from "@/app/actions/suppliers"
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
import { ArrowLeft, AlertCircle, Info } from "lucide-react"

export default function NewSupplierPage() {
  const [name, setName] = useState("")
  const [ruc, setRuc] = useState("")
  const [supplierType, setSupplierType] = useState<string>("")
  const [contactName, setContactName] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [bankName, setBankName] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canSubmit = !!name.trim() && !!supplierType

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Nuevo Proveedor" subtitle="Registrar taller, proveedor de insumos o servicio" />

      <main className="flex-1 p-6 max-w-2xl space-y-5">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-800">
            El código de proveedor (P001, P002...) se asignará automáticamente al guardar.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <p className="text-xs text-red-800">{error}</p>
          </div>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Datos generales</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Razón social / Nombre *</Label>
              <Input
                className="h-9 text-sm"
                placeholder="Ej: Taller de Confección Demo S.A.C."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tipo de proveedor *</Label>
              <Select onValueChange={(v) => setSupplierType((v as string | null) ?? "")}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TALLER">Taller</SelectItem>
                  <SelectItem value="PROVEEDOR_INSUMO">Proveedor de insumos</SelectItem>
                  <SelectItem value="SERVICIO">Servicio</SelectItem>
                  <SelectItem value="TRANSPORTE">Transporte</SelectItem>
                  <SelectItem value="OTRO">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">RUC</Label>
              <Input
                className="h-9 text-sm font-mono"
                placeholder="20XXXXXXXXX"
                maxLength={11}
                value={ruc}
                onChange={(e) => setRuc(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Contacto</Label>
              <Input
                className="h-9 text-sm"
                placeholder="Nombre del contacto"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Teléfono</Label>
              <Input
                className="h-9 text-sm"
                placeholder="9XXXXXXXX"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Banco</Label>
              <Select onValueChange={(v) => setBankName((v as string | null) ?? "")}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BCP">BCP</SelectItem>
                  <SelectItem value="Interbank">Interbank</SelectItem>
                  <SelectItem value="BBVA">BBVA</SelectItem>
                  <SelectItem value="Scotiabank">Scotiabank</SelectItem>
                  <SelectItem value="BanBif">BanBif</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Notas</Label>
              <textarea
                className="w-full h-16 rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                placeholder="Condiciones de trabajo, notas adicionales..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Link
            href="/suppliers"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a proveedores
          </Link>
          <Button
            size="sm"
            disabled={isPending || !canSubmit}
            onClick={() => {
              setError(null)
              startTransition(async () => {
                const result = await createSupplier({
                  name,
                  ruc: ruc || undefined,
                  supplierType,
                  contactName: contactName || undefined,
                  contactPhone: contactPhone || undefined,
                  bankName: bankName || undefined,
                  notes: notes || undefined,
                })
                if ("error" in result) setError(result.error)
              })
            }}
          >
            {isPending ? "Guardando..." : "Guardar proveedor"}
          </Button>
        </div>
      </main>
    </div>
  )
}
