"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { createItem } from "@/app/actions/items"
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

const insumoCategories = [
  { value: "TELA", label: "Tela" },
  { value: "HILO", label: "Hilo" },
  { value: "AVIOS", label: "Avíos" },
  { value: "OTROS", label: "Otros insumos" },
]

const servicioCategories = [
  { value: "CORTE", label: "Corte" },
  { value: "CONFECCION", label: "Confección" },
  { value: "ESTAMPADO", label: "Estampado" },
  { value: "ACABADO", label: "Acabado" },
  { value: "EMPAQUE", label: "Empaque" },
  { value: "MOVILIDAD", label: "Movilidad" },
  { value: "OTROS", label: "Otros servicios" },
]

export default function NewItemPage() {
  const [itemType, setItemType] = useState<"INSUMO" | "SERVICIO" | "">("")
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [unit, setUnit] = useState("UND")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const categories = itemType === "INSUMO" ? insumoCategories : itemType === "SERVICIO" ? servicioCategories : []
  const canSubmit = !!name.trim() && !!itemType && !!category

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Nuevo Ítem" subtitle="Agregar insumo o servicio al catálogo" />

      <main className="flex-1 p-6 max-w-2xl space-y-5">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-800">
            El código (I001 para insumos, S001 para servicios) se asignará automáticamente.
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
            <CardTitle className="text-sm font-semibold">Datos del ítem</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tipo *</Label>
              <Select
                onValueChange={(v) => {
                  setItemType((v as "INSUMO" | "SERVICIO" | null) ?? "")
                  setCategory("")
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Insumo o servicio..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INSUMO">Insumo</SelectItem>
                  <SelectItem value="SERVICIO">Servicio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Categoría *</Label>
              <Select
                onValueChange={(v) => setCategory((v as string | null) ?? "")}
                disabled={!itemType}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={itemType ? "Seleccionar..." : "Elige tipo primero"} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Nombre *</Label>
              <Input
                className="h-9 text-sm"
                placeholder="Ej: Tela jersey 30/1 — Pima"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Unidad de medida</Label>
              <Select
                value={unit}
                onValueChange={(v) => setUnit((v as string | null) ?? "UND")}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UND">UND</SelectItem>
                  <SelectItem value="KG">KG</SelectItem>
                  <SelectItem value="MT">MT</SelectItem>
                  <SelectItem value="CONO">CONO</SelectItem>
                  <SelectItem value="ROLLO">ROLLO</SelectItem>
                  <SelectItem value="DOCENA">DOCENA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Descripción adicional</Label>
              <Input
                className="h-9 text-sm"
                placeholder="Composición, especificación técnica..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Link
            href="/items"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al catálogo
          </Link>
          <Button
            size="sm"
            disabled={isPending || !canSubmit}
            onClick={() => {
              setError(null)
              startTransition(async () => {
                const result = await createItem({
                  name,
                  itemType,
                  category,
                  unit,
                  description: description || undefined,
                })
                if ("error" in result) setError(result.error)
              })
            }}
          >
            {isPending ? "Guardando..." : "Guardar ítem"}
          </Button>
        </div>
      </main>
    </div>
  )
}
