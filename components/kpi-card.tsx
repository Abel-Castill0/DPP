import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { LucideIcon } from "lucide-react"

type Trend = "up" | "down" | "neutral"

interface KpiCardProps {
  label: string
  value: string
  subValue?: string
  icon: LucideIcon
  trend?: Trend
  trendLabel?: string
  variant?: "default" | "income" | "expense" | "warning"
  isDemo?: boolean
}

const variantStyles = {
  default: "border-border",
  income: "border-l-4 border-l-[var(--chart-1)]",
  expense: "border-l-4 border-l-[var(--chart-2)]",
  warning: "border-l-4 border-l-[var(--chart-3)]",
}

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
}

const trendColors = {
  up: "text-emerald-600",
  down: "text-red-500",
  neutral: "text-muted-foreground",
}

export function KpiCard({
  label,
  value,
  subValue,
  icon: Icon,
  trend,
  trendLabel,
  variant = "default",
  isDemo,
}: KpiCardProps) {
  const TrendIcon = trend ? trendIcons[trend] : null

  return (
    <Card className={cn("relative overflow-hidden", variantStyles[variant])}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">
              {value}
            </p>
            {subValue && (
              <p className="mt-0.5 text-xs text-muted-foreground">{subValue}</p>
            )}
            {trend && trendLabel && TrendIcon && (
              <div className={cn("mt-2 flex items-center gap-1 text-xs", trendColors[trend])}>
                <TrendIcon className="w-3 h-3" />
                <span>{trendLabel}</span>
              </div>
            )}
          </div>
          <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>
        {isDemo && (
          <div className="absolute top-2 right-2 text-[8px] font-bold text-muted-foreground/40 tracking-widest">
            DEMO
          </div>
        )}
      </CardContent>
    </Card>
  )
}
