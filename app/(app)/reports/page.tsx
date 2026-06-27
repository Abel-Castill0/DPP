import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, FileSpreadsheet, FileText, BarChart2 } from "lucide-react"

const reportTypes = [
  {
    id: "flujo-mensual",
    title: "Flujo de caja mensual",
    description: "Ingresos, egresos y saldo acumulado mes a mes. Detalle por categoría y responsable.",
    icon: BarChart2,
    group: "Finanzas",
  },
  {
    id: "flujo-semanal",
    title: "Flujo de caja semanal",
    description: "Movimientos de la semana agrupados por día. Útil para seguimiento operativo.",
    icon: BarChart2,
    group: "Finanzas",
  },
  {
    id: "pagos-pendientes",
    title: "Pagos pendientes",
    description: "OC y OS con saldo pendiente, fecha de emisión y proveedor. Ordenado por antigüedad.",
    icon: FileText,
    group: "Finanzas",
  },
  {
    id: "cuentas-cobrar",
    title: "Cuentas por cobrar",
    description: "Facturas pendientes de clientes con saldo, días de vencimiento y estado.",
    icon: FileSpreadsheet,
    group: "Finanzas",
  },
  {
    id: "egresos-proveedor",
    title: "Egresos por proveedor",
    description: "Total pagado a cada proveedor en el período. Identifica los proveedores con mayor volumen.",
    icon: FileSpreadsheet,
    group: "Operaciones",
  },
  {
    id: "egresos-proceso",
    title: "Egresos por proceso",
    description: "Costos agrupados por proceso (corte, confección, estampado, acabado). Análisis de estructura de costos.",
    icon: BarChart2,
    group: "Operaciones",
  },
  {
    id: "ordenes-pendientes",
    title: "Órdenes pendientes",
    description: "OC y OS activas con estado de pago, monto pendiente y responsable.",
    icon: FileText,
    group: "Operaciones",
  },
  {
    id: "compras-insumo",
    title: "Compras por insumo",
    description: "Consumo de insumos (tela, hilo, avíos) en el período. Útil para planificación de stock.",
    icon: FileSpreadsheet,
    group: "Operaciones",
  },
]

export default function ReportsPage() {
  return (
    <div className="flex flex-col min-h-full">
      <Header title="Reportes" subtitle="Genera y exporta reportes gerenciales" />

      <main className="flex-1 p-6 space-y-5 max-w-4xl">
        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Parámetros</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tipo de reporte</Label>
              <Select>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flujo-mensual">Flujo mensual</SelectItem>
                  <SelectItem value="flujo-semanal">Flujo semanal</SelectItem>
                  <SelectItem value="pagos-pendientes">Pagos pendientes</SelectItem>
                  <SelectItem value="cuentas-cobrar">Cuentas por cobrar</SelectItem>
                  <SelectItem value="egresos-proveedor">Egresos por proveedor</SelectItem>
                  <SelectItem value="egresos-proceso">Egresos por proceso</SelectItem>
                  <SelectItem value="ordenes-pendientes">Órdenes pendientes</SelectItem>
                  <SelectItem value="compras-insumo">Compras por insumo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Desde</Label>
              <Input type="date" className="h-9 text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Hasta</Label>
              <Input type="date" className="h-9 text-sm" />
            </div>
          </CardContent>
        </Card>

        {/* Available reports */}
        {(["Finanzas", "Operaciones"] as const).map((group) => (
          <section key={group}>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {group}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {reportTypes.filter((r) => r.group === group).map((r) => (
                <Card
                  key={r.id}
                  className="hover:shadow-sm transition-shadow cursor-pointer"
                >
                  <CardContent className="p-5">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <r.icon className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">
                      {r.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {r.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}

        {/* Export actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Exportar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
              La exportación de reportes estará disponible en la Fase 6 del
              proyecto, una vez conectada la base de datos.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled
                className="gap-2"
                title="Disponible en Fase 6"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Exportar Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled
                className="gap-2"
                title="Disponible en Fase 6"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview placeholder */}
        <Card className="opacity-60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Vista previa del reporte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-border h-40 flex items-center justify-center">
              <p className="text-xs text-muted-foreground">
                Selecciona un tipo de reporte y un período para generar la
                vista previa
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
