"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { DemoBadge } from "@/components/status-badge"
import { demoItems } from "@/lib/demo-data"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Boxes, Plus, Search, AlertTriangle } from "lucide-react"

const categoryLabels: Record<string, string> = {
  TELA: "Tela",
  HILO: "Hilo",
  AVIOS: "Avíos",
  CORTE: "Corte",
  CONFECCION: "Confección",
  ESTAMPADO: "Estampado",
  ACABADO: "Acabado",
  EMPAQUE: "Empaque",
  MOVILIDAD: "Movilidad",
  OTROS: "Otros",
}

export default function ItemsPage() {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | "INSUMO" | "SERVICIO">("all")

  const filtered = demoItems.filter((it) => {
    const matchType = typeFilter === "all" || it.itemType === typeFilter
    if (!matchType) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      it.name.toLowerCase().includes(q) ||
      it.code.toLowerCase().includes(q) ||
      it.category.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Insumos / Servicios" subtitle="Catálogo de materiales y servicios" />

      <main className="flex-1 p-6 space-y-4">
        {/* Demo notice */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">
            Datos de demostración. Conecta la base de datos para ver el catálogo real.
          </p>
          <DemoBadge />
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar insumo o servicio..."
                className="pl-8 h-8 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1">
              {(["all", "INSUMO", "SERVICIO"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setTypeFilter(v)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    typeFilter === v
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {v === "all" ? "Todos" : v === "INSUMO" ? "Insumos" : "Servicios"}
                </button>
              ))}
            </div>
          </div>
          <Button size="sm" className="gap-2 h-8 text-xs" disabled title="Disponible con BD conectada">
            <Plus className="w-3.5 h-3.5" />
            Nuevo item
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                <Boxes className="w-8 h-8 opacity-30" />
                <p className="text-sm">No se encontraron items</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-border">
                    <tr className="bg-muted/40">
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground w-20">Código</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Nombre</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Tipo</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Categoría</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Unidad</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((it) => (
                      <tr key={it.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-muted-foreground">{it.code}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{it.name}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={it.itemType === "INSUMO" ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {it.itemType === "INSUMO" ? "Insumo" : "Servicio"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {categoryLabels[it.category] ?? it.category}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono">{it.unit}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${it.isActive ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                            {it.isActive ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-[11px] text-muted-foreground text-right">
          {filtered.length} item{filtered.length !== 1 ? "s" : ""} mostrado{filtered.length !== 1 ? "s" : ""}
        </p>
      </main>
    </div>
  )
}
