"use client"

import { useRouter } from "next/navigation"
import { Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Package className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground">DPP Control</h1>
            <p className="text-sm text-muted-foreground">
              Diseño Punto y Plano S.A.C.
            </p>
          </div>
        </div>

        {/* Form */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-5 px-6">
            <h2 className="text-sm font-semibold text-foreground">
              Acceso al sistema
            </h2>
            <p className="text-xs text-muted-foreground">
              Ingresa tus credenciales para continuar
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@dpp.pe"
                autoComplete="email"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="h-9 text-sm"
              />
            </div>

            {/* Auth no implementada aún — placeholder visual */}
            <Button
              className="w-full h-9 text-sm font-medium"
              type="button"
              onClick={() => {
                // TODO: implementar autenticación real (NextAuth / Supabase Auth)
                router.push("/dashboard")
              }}
            >
              Ingresar
            </Button>

            <p className="text-center text-[11px] text-muted-foreground">
              ¿Olvidaste tu contraseña?{" "}
              <span className="text-primary cursor-pointer hover:underline">
                Solicitar restablecimiento
              </span>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground">
          Acceso restringido. Solo personal autorizado de Diseño Punto y Plano
          S.A.C.
        </p>
      </div>
    </div>
  )
}
