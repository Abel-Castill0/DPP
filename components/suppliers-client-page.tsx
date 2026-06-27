"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { DemoBadge } from "@/components/status-badge"
import type { SupplierRow } from "@/lib/data/suppliers"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Plus,
  Search,
  AlertTriangle,
  Building2,
  Wrench,
  Package,
  Truck,
} from "lucide-react"

const supplierTypeLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  TALLER: { label: "Taller", variant: "default" },
  PROVEEDOR_INSUMO: { label: "Proveedor insumo", variant: "secondary" },
  SERVICIO: { label: "Servicio", variant: "outline" },
  TRANSPORTE: { label: "Transporte", variant: "outline" },
  OTRO: { label: "Otro", variant: "outline" },
}

const supplierTypeIcons: Record<string, React.ElementType> = {
  TALLER: Wrench,
  PROVEEDOR_INSUMO: Package,
  SERVICIO: Building2,
  TRANSPORTE: Truck,
  OTRO: Building2,
}

export function SuppliersClientPage({
  suppliers,
  isDemo,
}: {
  suppliers: SupplierRow[]
  isDemo: boolean
}) {
  const [search, setSearch] = useState("")

  const filtered = suppliers.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      (s.code?.toLowerCase().includes(q) ?? false) ||
      (s.ruc?.includes(q) ?? false) ||
      (s.contactName?.toLowerCase().includes(q) ?? false)
    )
  })

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Proveedores" subtitle="Talleres, proveedores de insumos y servicios" />

      <main className="flex-1 p-6 space-y-4">
        {isDemo && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700">
              Datos de demostración. Conecta la base de datos para ver proveedores reales.
            </p>
            <DemoBadge />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar proveedor..."
              className="pl-8 h-8 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button size="sm" className="gap-2 h-8 text-xs" disabled title="Disponible con BD conectada">
            <Plus className="w-3.5 h-3.5" />
            Nuevo proveedor
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                <Users className="w-8 h-8 opacity-30" />
                <p className="text-sm">No se encontraron proveedores</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-border">
                    <tr className="bg-muted/40">
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground w-20">Código</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Nombre / Razón social</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">RUC</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Tipo</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Contacto</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Teléfono</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Banco</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((s) => {
                      const TypeIcon = supplierTypeIcons[s.supplierType] ?? Building2
                      const typeInfo = supplierTypeLabels[s.supplierType] ?? { label: s.supplierType, variant: "outline" as const }
                      return (
                        <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-muted-foreground">{s.code ?? "—"}</td>
                          <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">{s.name}</td>
                          <td className="px-4 py-3 text-muted-foreground font-mono">{s.ruc ?? "—"}</td>
                          <td className="px-4 py-3">
                            <Badge variant={typeInfo.variant} className="gap-1 text-[10px]">
                              <TypeIcon className="w-3 h-3" />
                              {typeInfo.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-foreground">{s.contactName ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.contactPhone ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.bankName ?? "—"}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${s.isActive ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                              {s.isActive ? "Activo" : "Inactivo"}
                            </span>
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

        <p className="text-[11px] text-muted-foreground text-right">
          {filtered.length} proveedor{filtered.length !== 1 ? "es" : ""} mostrado{filtered.length !== 1 ? "s" : ""}
        </p>
      </main>
    </div>
  )
}
