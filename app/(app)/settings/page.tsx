import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, User, CheckCircle, Lock } from "lucide-react"
import { getSession } from "@/lib/auth"

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  GERENCIA: "Gerencia",
  FINANZAS: "Finanzas",
  PRODUCCION: "Producción",
  COMPRAS: "Compras",
  SOLO_LECTURA: "Solo Lectura",
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-50 text-red-700 border-red-200",
  GERENCIA: "bg-purple-50 text-purple-700 border-purple-200",
  FINANZAS: "bg-blue-50 text-blue-700 border-blue-200",
  PRODUCCION: "bg-green-50 text-green-700 border-green-200",
  COMPRAS: "bg-amber-50 text-amber-700 border-amber-200",
  SOLO_LECTURA: "bg-muted text-muted-foreground border-border",
}

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const session = await getSession()

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Configuración" subtitle="Cuenta, seguridad y preferencias" />

      <main className="flex-1 p-6 space-y-5 max-w-4xl">
        {/* Sesión actual */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              Mi cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {session ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Nombre</p>
                  <p className="text-sm font-medium text-foreground">{session.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Correo</p>
                  <p className="text-sm text-foreground">{session.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Rol</p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold ${ROLE_COLORS[session.role] ?? ""}`}
                  >
                    {ROLE_LABELS[session.role] ?? session.role}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sin sesión activa.</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Cambio de contraseña y gestión de usuarios disponibles en una próxima fase.
            </p>
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
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Autenticación activa — sesión protegida con JWT (8 h)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Rutas internas protegidas por middleware</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Contraseñas cifradas con bcrypt</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lock className="w-4 h-4 shrink-0" />
                <span>Gestión de roles y permisos avanzados — próxima fase</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferencias */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Preferencias del sistema</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Moneda</p>
              <p className="text-sm text-foreground">PEN — Soles peruanos</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Zona horaria</p>
              <p className="text-sm text-foreground">América/Lima (UTC-5)</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
