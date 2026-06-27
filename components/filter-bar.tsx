"use client"

import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface FilterBarProps {
  onSearch?: (value: string) => void
  onTypeFilter?: (value: string | null) => void
  onStatusFilter?: (value: string | null) => void
  onClear?: () => void
  showType?: boolean
  showStatus?: boolean
}

export function FilterBar({
  onSearch,
  onTypeFilter,
  onStatusFilter,
  onClear,
  showType = true,
  showStatus = true,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          className="pl-8 h-9 w-52 text-sm"
          onChange={(e) => onSearch?.(e.target.value)}
        />
      </div>

      {showType && (
        <Select onValueChange={onTypeFilter}>
          <SelectTrigger className="h-9 w-36 text-sm">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="INGRESO">Ingreso</SelectItem>
            <SelectItem value="EGRESO">Egreso</SelectItem>
          </SelectContent>
        </Select>
      )}

      {showStatus && (
        <Select onValueChange={onStatusFilter}>
          <SelectTrigger className="h-9 w-40 text-sm">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="CANCELADO">Cancelado</SelectItem>
            <SelectItem value="COBRADO">Cobrado</SelectItem>
            <SelectItem value="ADELANTO">Adelanto</SelectItem>
            <SelectItem value="POR_PAGAR">Por pagar</SelectItem>
            <SelectItem value="POR_COBRAR">Por cobrar</SelectItem>
            <SelectItem value="DEVOLUCIONES">Devolución</SelectItem>
          </SelectContent>
        </Select>
      )}

      {onClear && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-muted-foreground"
          onClick={onClear}
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Limpiar
        </Button>
      )}
    </div>
  )
}
