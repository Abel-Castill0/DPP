"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { createCashMovement } from "@/app/actions/cash-movements"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Calculator, AlertCircle, User } from "lucide-react"
import type { SupplierRow } from "@/lib/data/suppliers"

const fmt = (n: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(n)

interface Props {
  suppliers: SupplierRow[]
  currentUserName: string
}

export function NewMovementForm({ suppliers, currentUserName }: Props) {
  const [type, setType] = useState<"INGRESO" | "EGRESO">("EGRESO")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [operationStatus, setOperationStatus] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<string>("")
  const [operationNumber, setOperationNumber] = useState("")
  const [supplierId, setSupplierId] = useState<string>("")
  const [category, setCategory] = useState<string>("")
  const [description, setDescription] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [abono, setAbono] = useState(0)
  const [invoiceAmount, setInvoiceAmount] = useState(0)
  const [retencion, setRetencion] = useState(0)
  const [detraccion, setDetraccion] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const income = type === "INGRESO" ? abono : 0
  const expense = type === "EGRESO" ? abono : 0
  const aPagar = Math.max(0, invoiceAmount - abono)
  const canSubmit = !!date && abono > 0 && !!operationStatus && !!category

  const activeSuppliers = suppliers.filter((s) => s.isActive)

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Nuevo Movimiento" subtitle="Registrar ingreso o egreso" />

      <main className="flex-1 p-6 max-w-3xl">
        <Link
          href="/cash-flow"
          className="inline-flex items-center gap-2 mb-4 -ml-2 px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver al flujo de caja
        </Link>

        <div className="space-y-5">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-xs text-red-800">{error}</p>
            </div>
          )}

          {/* Sección: General */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">General</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Fecha *</Label>
                <Input
                  type="date"
                  className="h-9 text-sm"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tipo de movimiento *</Label>
                <Select
                  value={type}
                  onValueChange={(v: string | null) => {
                    if (v) setType(v as "INGRESO" | "EGRESO")
                    setSupplierId("")
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INGRESO">Ingreso</SelectItem>
                    <SelectItem value="EGRESO">Egreso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tipo de operación *</Label>
                <Select onValueChange={(v: string | null) => setOperationStatus(v ?? "")}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CANCELADO">Cancelado</SelectItem>
                    <SelectItem value="ADELANTO">Adelanto</SelectItem>
                    <SelectItem value="COBRADO">Cobrado</SelectItem>
                    <SelectItem value="POR_PAGAR">Por pagar</SelectItem>
                    <SelectItem value="POR_COBRAR">Por cobrar</SelectItem>
                    <SelectItem value="DEVOLUCIONES">Devolución</SelectItem>
                    <SelectItem value="OTROS">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Método de pago</Label>
                <Select onValueChange={(v: string | null) => setPaymentMethod(v ?? "")}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                    <SelectItem value="DEPOSITO">Depósito</SelectItem>
                    <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="TARJETA">Tarjeta</SelectItem>
                    <SelectItem value="OTRO">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">N° de operación</Label>
                <Input
                  placeholder="Ej: 6071757"
                  className="h-9 text-sm"
                  value={operationNumber}
                  onChange={(e) => setOperationNumber(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Registrado por</Label>
                <div className="h-9 px-3 flex items-center gap-2 rounded-md border border-border bg-muted/40 text-sm text-muted-foreground">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{currentUserName}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sección: Partes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Partes involucradas</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {type === "EGRESO" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Proveedor</Label>
                  {activeSuppliers.length === 0 ? (
                    <div className="h-9 px-3 flex items-center rounded-md border border-border bg-muted/40 text-xs text-muted-foreground">
                      Sin proveedores registrados
                    </div>
                  ) : (
                    <Select value={supplierId} onValueChange={(v: string | null) => setSupplierId(v ?? "")}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Seleccionar proveedor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {activeSuppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Categoría *</Label>
                <Select onValueChange={(v: string | null) => setCategory(v ?? "")}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONFECCION">Confección</SelectItem>
                    <SelectItem value="CORTE">Corte</SelectItem>
                    <SelectItem value="ESTAMPADO">Estampado</SelectItem>
                    <SelectItem value="ACABADO_EMPAQUE">Acabado y empaque</SelectItem>
                    <SelectItem value="MATERIA_PRIMA">Materia prima</SelectItem>
                    <SelectItem value="PLANILLA">Planilla</SelectItem>
                    <SelectItem value="IMPUESTO">Impuesto</SelectItem>
                    <SelectItem value="MOVILIDAD">Movilidad</SelectItem>
                    <SelectItem value="COMISION">Comisión</SelectItem>
                    <SelectItem value="CAJA_CHICA">Caja chica</SelectItem>
                    <SelectItem value="PRESTAMO">Préstamo</SelectItem>
                    <SelectItem value="INVERSION">Inversión</SelectItem>
                    <SelectItem value="COMPRA">Compra</SelectItem>
                    <SelectItem value="VENTA">Venta</SelectItem>
                    <SelectItem value="OTROS">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-medium">Detalle / descripción</Label>
                <Input
                  placeholder="Descripción del movimiento..."
                  className="h-9 text-sm"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sección: Factura */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Factura</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">N° de factura</Label>
                <Input
                  placeholder="Ej: F001-0089"
                  className="h-9 text-sm"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Monto de factura (S/)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="h-9 text-sm"
                  onChange={(e) => setInvoiceAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sección: Montos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Montos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Abono (S/) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="h-9 text-sm font-medium"
                    onChange={(e) => setAbono(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Retención (S/)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="h-9 text-sm"
                    onChange={(e) => setRetencion(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Detracción (S/)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="h-9 text-sm"
                    onChange={(e) => setDetraccion(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <Separator />

              <div className="rounded-lg bg-muted/40 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Ingreso</p>
                  <p className="font-semibold tabular-nums text-emerald-700">{fmt(income)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Egreso</p>
                  <p className="font-semibold tabular-nums text-red-600">{fmt(expense)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Total pagado</p>
                  <p className="font-semibold tabular-nums text-foreground">{fmt(abono)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">A pagar</p>
                  <p className={`font-semibold tabular-nums ${aPagar > 0 ? "text-amber-700" : "text-muted-foreground"}`}>
                    {fmt(aPagar)}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                * Los campos marcados son obligatorios. El saldo se calcula automáticamente al guardar.
              </p>
            </CardContent>
          </Card>

          {/* Acciones */}
          <div className="flex justify-end gap-3">
            <Link
              href="/cash-flow"
              className="inline-flex items-center justify-center h-8 px-2.5 text-sm font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            >
              Cancelar
            </Link>
            <Button
              disabled={isPending || !canSubmit}
              onClick={() => {
                setError(null)
                startTransition(async () => {
                  const result = await createCashMovement({
                    date,
                    type,
                    operationStatus,
                    category,
                    description: description || undefined,
                    supplierId: supplierId || undefined,
                    invoiceNumber: invoiceNumber || undefined,
                    invoiceAmount: invoiceAmount > 0 ? invoiceAmount : undefined,
                    abono,
                    retencion: retencion > 0 ? retencion : undefined,
                    detraccion: detraccion > 0 ? detraccion : undefined,
                    paymentMethod: paymentMethod || undefined,
                    operationNumber: operationNumber || undefined,
                  })
                  if ("error" in result) setError(result.error)
                })
              }}
            >
              {isPending ? "Guardando..." : "Guardar movimiento"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
