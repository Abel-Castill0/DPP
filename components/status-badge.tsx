import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type MovementType = "INGRESO" | "EGRESO"
type OperationStatus =
  | "CANCELADO"
  | "COBRADO"
  | "ADELANTO"
  | "POR_PAGAR"
  | "POR_COBRAR"
  | "DEVOLUCIONES"
  | "OTROS"

const typeStyles: Record<MovementType, string> = {
  INGRESO: "bg-emerald-50 text-emerald-700 border-emerald-200",
  EGRESO: "bg-red-50 text-red-700 border-red-200",
}

const typeLabels: Record<MovementType, string> = {
  INGRESO: "Ingreso",
  EGRESO: "Egreso",
}

const statusStyles: Record<OperationStatus, string> = {
  CANCELADO: "bg-emerald-50 text-emerald-700 border-emerald-200",
  COBRADO: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ADELANTO: "bg-blue-50 text-blue-700 border-blue-200",
  POR_PAGAR: "bg-amber-50 text-amber-700 border-amber-200",
  POR_COBRAR: "bg-amber-50 text-amber-700 border-amber-200",
  DEVOLUCIONES: "bg-purple-50 text-purple-700 border-purple-200",
  OTROS: "bg-muted text-muted-foreground border-border",
}

const statusLabels: Record<OperationStatus, string> = {
  CANCELADO: "Cancelado",
  COBRADO: "Cobrado",
  ADELANTO: "Adelanto",
  POR_PAGAR: "Por pagar",
  POR_COBRAR: "Por cobrar",
  DEVOLUCIONES: "Devolución",
  OTROS: "Otros",
}

export function TypeBadge({ type }: { type: MovementType }) {
  return (
    <Badge
      variant="outline"
      className={cn("text-[11px] font-semibold", typeStyles[type])}
    >
      {typeLabels[type]}
    </Badge>
  )
}

export function StatusBadge({ status }: { status: OperationStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("text-[11px] font-medium", statusStyles[status])}
    >
      {statusLabels[status]}
    </Badge>
  )
}

export function DemoBadge() {
  return (
    <Badge
      variant="outline"
      className="text-[10px] font-semibold text-amber-700 border-amber-300 bg-amber-50"
    >
      DEMO
    </Badge>
  )
}
