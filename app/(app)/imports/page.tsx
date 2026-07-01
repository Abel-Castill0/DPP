"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileSpreadsheet, Info, Users, ShoppingCart, Wrench, ArrowLeftRight, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export default function ImportsPage() {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) setFile(selected)
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Importar datos"
        subtitle="Carga el historial desde Excel o CSV"
      />

      <main className="flex-1 p-6 space-y-5 max-w-3xl">
        {/* Info */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-800 space-y-1">
            <p className="font-semibold">Módulo en desarrollo</p>
            <p>
              La importación de historial desde Excel está pendiente de activación. Cuando esté disponible, el sistema
              mapeará columnas, normalizará datos y mostrará una previsualización antes de confirmar.
            </p>
          </div>
        </div>

        {/* Import type selector */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            ¿Qué deseas importar?
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: ArrowLeftRight, label: "Flujo de caja",       desc: "Historial de movimientos" },
              { icon: Users,          label: "Proveedores",          desc: "Lista de proveedores" },
              { icon: ShoppingCart,   label: "Órdenes de Compra",    desc: "Historial OC" },
              { icon: Wrench,         label: "Órdenes de Servicio",  desc: "Historial OS" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-muted/20 text-center opacity-60 cursor-not-allowed"
              >
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">{item.label}</span>
                <span className="text-[10px] text-muted-foreground">{item.desc}</span>
                <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                  Próximamente
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Drop zone */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Paso 1 — Seleccionar archivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-lg p-10 flex flex-col items-center gap-3 transition-colors cursor-pointer",
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/30"
              )}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Upload className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {file ? file.name : "Arrastra o haz clic para seleccionar"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Formatos admitidos: .xlsx, .xls, .csv
                </p>
              </div>
              {file && (
                <div className="flex items-center gap-2 text-xs text-emerald-600">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Archivo cargado: {(file.size / 1024).toFixed(1)} KB
                </div>
              )}
            </div>
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileInput}
            />
          </CardContent>
        </Card>

        {/* Column mapping — pending */}
        <Card className="opacity-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              Paso 2 — Mapeo de columnas
              <span className="text-[10px] font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                Disponible tras cargar archivo
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["Excel: FECHA", "Campo: fecha"],
                ["Excel: TIPO", "Campo: type"],
                ["Excel: TIPO DE OPERACIÓN", "Campo: operationStatus"],
                ["Excel: ABONO", "Campo: abono"],
                ["Excel: PROVEEDOR/CLIENTE", "Campo: party"],
                ["Excel: FACTURA", "Campo: invoiceNumber"],
              ].map(([from, to], i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-muted/40">
                  <FileSpreadsheet className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{from}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-foreground font-medium">{to}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Paso 3 — pendiente */}
        <Card className="opacity-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              Paso 3 — Previsualización y validación
              <span className="text-[10px] font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                Pendiente de activación
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              La vista previa estará disponible una vez que el parser de Excel esté activo.
            </p>
          </CardContent>
        </Card>

        {/* Action */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setFile(null)}>
            Limpiar
          </Button>
          <Button disabled title="Importación pendiente de activación">
            Importación próximamente
          </Button>
        </div>
      </main>
    </div>
  )
}
