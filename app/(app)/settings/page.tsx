import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Shield } from "lucide-react"

const demoUsers = [
  { name: "Paola Yarasca", email: "paola@dpp.pe", role: "FINANZAS", active: true },
  { name: "Carlos Alva", email: "carlos@dpp.pe", role: "FINANZAS", active: true },
  { name: "Allison Aburto", email: "allison@dpp.pe", role: "COMPRAS", active: true },
  { name: "Usuario Gerencia", email: "gerencia@dpp.pe", role: "GERENCIA", active: true },
]

const roleColors: Record<string, string> = {
  ADMIN: "bg-red-50 text-red-700 border-red-200",
  GERENCIA: "bg-purple-50 text-purple-700 border-purple-200",
  FINANZAS: "bg-blue-50 text-blue-700 border-blue-200",
  COMPRAS: "bg-amber-50 text-amber-700 border-amber-200",
  PRODUCCION: "bg-green-50 text-green-700 border-green-200",
  SOLO_LECTURA: "bg-muted text-muted-foreground border-border",
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col min-h-full">
      <Header title="Configuración" subtitle="Usuarios, catálogos y preferencias" />

      <main className="flex-1 p-6 space-y-5 max-w-4xl">
        {/* Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Usuarios</CardTitle>
            <Button
              size="sm"
              className="gap-2 h-8"
              disabled
              title="Implementar en Fase 7"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo usuario
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead className="border-b border-border">
                <tr className="bg-muted/40">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Nombre</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Correo</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Rol</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {demoUsers.map((u, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold ${roleColors[u.role] ?? ""}`}
                      >
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                        Activo
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" disabled>
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 py-2 text-[11px] text-muted-foreground border-t border-border">
              * Gestión de usuarios disponible en Fase 7 — datos de demostración.
            </p>
          </CardContent>
        </Card>

        {/* Catálogos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Catálogos</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: "Centros de costo", count: "3 registros" },
              { title: "Clientes", count: "0 registros" },
              { title: "Proveedores", count: "0 registros" },
            ].map((cat) => (
              <div
                key={cat.title}
                className="p-4 rounded-lg border border-border bg-muted/20"
              >
                <p className="text-sm font-medium text-foreground">{cat.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{cat.count}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 h-7 text-xs"
                  disabled
                >
                  Administrar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Preferencias */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Preferencias del sistema</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Saldo inicial (S/)</Label>
              <Input
                type="number"
                defaultValue={15875}
                className="h-9 text-sm"
                disabled
              />
              <p className="text-[11px] text-muted-foreground">
                Valor tomado del Excel actual. Confirmable con la empresa.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Moneda predeterminada</Label>
              <Input
                value="PEN — Soles peruanos"
                className="h-9 text-sm"
                disabled
              />
            </div>
          </CardContent>
        </Card>

        {/* Seguridad */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Seguridad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              La autenticación real (NextAuth / Supabase Auth) y la gestión de
              permisos por rol se implementan en la Fase 7 del proyecto.
            </p>
            <Button size="sm" variant="outline" disabled className="h-8 text-xs">
              Configurar autenticación
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
