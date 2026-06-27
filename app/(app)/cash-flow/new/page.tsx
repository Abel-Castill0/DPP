"use client"

import { useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
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
import { ArrowLeft, Calculator } from "lucide-react"

const fmt = (n: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(n)

export default function NewMovementPage() {
  const [type, setType] = useState<"INGRESO" | "EGRESO">("EGRESO")
  const [abono, setAbono] = useState(0)
  const [invoiceAmount, setInvoiceAmount] = useState(0)

  const income = type === "INGRESO" ? abono : 0
  const expense = type === "EGRESO" ? abono : 0
  const aPagar = Math.max(0, invoiceAmount - abono)

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
          {/* Sección: General */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">General</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Fecha *</Label>
                <Input type="date" className="h-9 text-sm" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tipo de movimiento *</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as "INGRESO" | "EGRESO")}
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
                <Select>
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
                <Select>
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
                <Input placeholder="Ej: 6071757" className="h-9 text-sm" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Responsable</Label>
                <Select>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Se poblará desde la BD */}
                    <SelectItem value="demo-1">Paola Yarasca</SelectItem>
                    <SelectItem value="demo-2">Carlos Alva</SelectItem>
                    <SelectItem value="demo-3">Allison Aburto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Sección: Partes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Partes involucradas
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {type === "INGRESO" ? "Cliente" : "Proveedor"} *
                </Label>
                <Select>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue
                      placeholder={
                        type === "INGRESO"
                          ? "Seleccionar cliente..."
                          : "Seleccionar proveedor..."
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Se poblará desde la BD */}
                    <SelectItem value="demo">Parte demo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Centro de costo</Label>
                <Select>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANCO">Banco</SelectItem>
                    <SelectItem value="INVERSION">Inversión</SelectItem>
                    <SelectItem value="OTROS">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Categoría *</Label>
                <Select>
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

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">OC/OS Proforma</Label>
                <Input placeholder="Ej: PI-2026-0017" className="h-9 text-sm" />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-medium">Detalle / descripción</Label>
                <Input
                  placeholder="Descripción del movimiento..."
                  className="h-9 text-sm"
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
                <Input placeholder="Ej: F001-0089" className="h-9 text-sm" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Fecha de emisión</Label>
                <Input type="date" className="h-9 text-sm" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Estilo / pedido</Label>
                <Input placeholder="Ej: PI-2026-0017" className="h-9 text-sm" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Monto de factura (S/)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="h-9 text-sm"
                  onChange={(e) =>
                    setInvoiceAmount(parseFloat(e.target.value) || 0)
                  }
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
                    onChange={(e) =>
                      setAbono(parseFloat(e.target.value) || 0)
                    }
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
                    onChange={() => {/* TODO Fase 3: retención */}}
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
                    onChange={() => {/* TODO Fase 3: detracción */}}
                  />
                </div>
              </div>

              <Separator />

              {/* Cálculo en vivo */}
              <div className="rounded-lg bg-muted/40 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Ingreso</p>
                  <p className="font-semibold tabular-nums text-emerald-700">
                    {fmt(income)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Egreso</p>
                  <p className="font-semibold tabular-nums text-red-600">
                    {fmt(expense)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Total pagado</p>
                  <p className="font-semibold tabular-nums text-foreground">
                    {fmt(abono)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">A pagar</p>
                  <p
                    className={`font-semibold tabular-nums ${
                      aPagar > 0 ? "text-amber-700" : "text-muted-foreground"
                    }`}
                  >
                    {fmt(aPagar)}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                * Los campos marcados son obligatorios. El saldo se calcula
                automáticamente al guardar.
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
              onClick={() => {
                // TODO: implementar POST a /api/cash-movements en Fase 3
                alert("Guardar: implementar API en Fase 3")
              }}
            >
              Guardar movimiento
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
