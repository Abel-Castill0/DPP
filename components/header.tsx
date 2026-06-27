"use client"

import { Bell } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
      <div>
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Demo banner */}
        <Badge
          variant="outline"
          className="text-[10px] font-semibold text-amber-700 border-amber-300 bg-amber-50"
        >
          MODO DEMO
        </Badge>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </Button>
      </div>
    </header>
  )
}
