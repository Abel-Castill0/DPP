"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ArrowLeftRight,
  Upload,
  BarChart2,
  Settings,
  Package,
  ChevronRight,
  Users,
  Boxes,
  ShoppingCart,
  Wrench,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navGroups = [
  {
    label: "Inicio",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    label: "Operaciones",
    items: [
      { href: "/suppliers", icon: Users, label: "Proveedores" },
      { href: "/items", icon: Boxes, label: "Insumos / Servicios" },
      { href: "/purchase-orders", icon: ShoppingCart, label: "Órdenes de Compra" },
      { href: "/service-orders", icon: Wrench, label: "Órdenes de Servicio" },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { href: "/cash-flow", icon: ArrowLeftRight, label: "Flujo de Caja" },
      { href: "/reports", icon: BarChart2, label: "Reportes" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/imports", icon: Upload, label: "Importar" },
      { href: "/settings", icon: Settings, label: "Configuración" },
    ],
  },
]

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  GERENCIA: "Gerencia",
  FINANZAS: "Finanzas",
  PRODUCCION: "Producción",
  COMPRAS: "Compras",
  SOLO_LECTURA: "Solo Lectura",
}

export function Sidebar({ user }: { user?: { name: string; role: string } | null }) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(href))

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-60 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shrink-0">
          <Package className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="overflow-hidden">
          <p className="text-sm font-semibold text-sidebar-foreground leading-tight truncate">
            DPP Control
          </p>
          <p className="text-[10px] text-sidebar-foreground/50 leading-tight truncate">
            Diseño Punto y Plano
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-2 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-1">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {active && <ChevronRight className="w-3 h-3 opacity-50 shrink-0" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-sidebar-accent/40">
          <div className="w-7 h-7 rounded-full bg-primary/30 flex items-center justify-center text-[11px] font-bold text-sidebar-foreground shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : "?"}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-medium text-sidebar-foreground truncate">
              {user?.name ?? "—"}
            </p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate">
              {user?.role ? (ROLE_LABELS[user.role] ?? user.role) : "—"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
