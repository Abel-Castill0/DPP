/**
 * Pure workbook generator — no DB calls, fully testable.
 * Receives already-computed ReportsData and returns a Buffer of the .xlsx file.
 */
import ExcelJS from "exceljs"
import type {
  ReportsData,
  AccountsPayableRow,
  MonthlyPaymentsSummary,
  PartialPaymentRow,
  ExpenseBySupplierRow,
  ExpenseByCategoryRow,
  PendingOrderRow,
  MonthlyFlowRow,
} from "../data/reports"

// ──── Formatting constants ─────────────────────────────────────────────────────

const CUR = '"S/ "#,##0.00'
const DATE_FMT = "DD/MM/YYYY"

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE2E8F0" },
}

// ──── Label maps (mirrors reports-client.tsx but server-side) ─────────────────

const CATEGORY_LABEL: Record<string, string> = {
  CONFECCION: "Confección",
  CORTE: "Corte",
  ESTAMPADO: "Estampado",
  ACABADO_EMPAQUE: "Acabado/Empaque",
  MATERIA_PRIMA: "Mat. Prima",
  PLANILLA: "Planilla",
  IMPUESTO: "Impuesto",
  MOVILIDAD: "Movilidad",
  COMISION: "Comisión",
  CAJA_CHICA: "Caja chica",
  PRESTAMO: "Préstamo",
  INVERSION: "Inversión",
  COMPRA: "Compra",
  VENTA: "Venta",
  OTROS: "Otros",
}

const METHOD_LABEL: Record<string, string> = {
  TRANSFERENCIA: "Transferencia",
  DEPOSITO: "Depósito",
  EFECTIVO: "Efectivo",
  CHEQUE: "Cheque",
  TARJETA: "Tarjeta",
  OTRO: "Otro",
}

const ORIGIN_LABEL: Record<string, string> = {
  ORDEN_COMPRA: "OC",
  ORDEN_SERVICIO: "OS",
  MANUAL: "Manual",
  IMPORTADO: "Import.",
}

const STATUS_LABEL: Record<string, string> = {
  BORRADOR: "Borrador",
  EMITIDA: "Emitida",
  APROBADA: "Aprobada",
  EN_PROCESO: "En proceso",
  COMPLETADA: "Completada",
  ANULADA: "Anulada",
}

// ──── Helpers ─────────────────────────────────────────────────────────────────

function styleHeader(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1)
  row.font = { bold: true, size: 10 }
  row.fill = HEADER_FILL
  row.alignment = { vertical: "middle" }
  row.commit()
}

function freezeAndFilter(ws: ExcelJS.Worksheet, colCount: number) {
  ws.views = [{ state: "frozen", ySplit: 1 }]
  const lastCol = String.fromCharCode(64 + colCount)
  ws.autoFilter = `A1:${lastCol}1`
}

// Parse date strings to Date objects placed at noon to avoid UTC timezone shifts
function parseDate(s: string): Date {
  return new Date(s + "T12:00:00")
}

// ──── Sheet 1: Resumen ────────────────────────────────────────────────────────

function addResumenSheet(wb: ExcelJS.Workbook, data: ReportsData) {
  const ws = wb.addWorksheet("Resumen")
  ws.getColumn(1).width = 32
  ws.getColumn(2).width = 36

  const today = new Date().toLocaleDateString("es-PE", {
    day: "2-digit", month: "long", year: "numeric",
  })

  // Title
  const titleRow = ws.addRow(["DPP Control — Reportes Gerenciales", ""])
  titleRow.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } }
  titleRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
  titleRow.height = 22

  ws.addRow([])

  // Metadata block
  const meta: [string, string | number][] = [
    ["Fecha de exportación:", today],
    ["Periodo:", data.filters.rangeLabel],
    ["Filtros activos:", data.filters.activeCount],
  ]
  if (data.filters.supplierId) {
    const name = data.supplierList.find((s) => s.id === data.filters.supplierId)?.name
    meta.push(["  Proveedor:", name ?? data.filters.supplierId])
  }
  if (data.filters.origin)
    meta.push(["  Origen:", ORIGIN_LABEL[data.filters.origin] ?? data.filters.origin])
  if (data.filters.operationStatus)
    meta.push(["  Estado:", data.filters.operationStatus])
  if (data.filters.category)
    meta.push(["  Categoría:", CATEGORY_LABEL[data.filters.category] ?? data.filters.category])

  for (const [key, val] of meta) {
    const row = ws.addRow([key, val])
    row.getCell(1).font = { bold: true, size: 10 }
    row.getCell(2).font = { size: 10 }
  }

  ws.addRow([])

  // KPIs section header
  const kpiHeader = ws.addRow(["Indicadores del periodo", ""])
  kpiHeader.font = { bold: true, size: 11 }
  kpiHeader.fill = HEADER_FILL
  kpiHeader.height = 18

  const { summary, monthlyPayments } = data
  const kpis: [string, number | string, string?][] = [
    ["Total por pagar:", summary.totalPorPagar, CUR],
    ["Pagado en el periodo:", summary.pagadoEsteMes, CUR],
    ["Cantidad de pagos:", monthlyPayments.cantidadPagos],
    ["Parciales activos:", summary.parcialesActivos],
    ["Órdenes sin caja (total):", summary.ocSinCaja + summary.osSinCaja],
    ["  OC sin caja:", summary.ocSinCaja],
    ["  OS sin caja:", summary.osSinCaja],
    ["Top proveedor (por pagar):", summary.topProveedorPorPagar ?? "—"],
    [
      "Principal categoría de gasto:",
      summary.mayorCategoriaGasto
        ? (CATEGORY_LABEL[summary.mayorCategoriaGasto] ?? summary.mayorCategoriaGasto)
        : "—",
    ],
  ]

  for (const [key, val, fmt] of kpis) {
    const row = ws.addRow([key, val])
    row.getCell(1).font = { size: 10 }
    const cell = row.getCell(2)
    cell.font = { size: 10, bold: true }
    if (fmt && typeof val === "number") cell.numFmt = fmt
  }
}

// ──── Sheet 2: Cuentas por pagar ──────────────────────────────────────────────

function addCuentasPorPagarSheet(wb: ExcelJS.Workbook, rows: AccountsPayableRow[]) {
  const ws = wb.addWorksheet("Cuentas por pagar")
  ws.columns = [
    { header: "Proveedor", key: "s", width: 32 },
    { header: "# Movimientos", key: "mc", width: 14 },
    { header: "Importe Total", key: "inv", width: 16, style: { numFmt: CUR } },
    { header: "Abonado", key: "ab", width: 16, style: { numFmt: CUR } },
    { header: "Pendiente", key: "ap", width: 16, style: { numFmt: CUR } },
  ]
  styleHeader(ws)

  if (rows.length === 0) {
    ws.addRow(["Sin datos para los filtros seleccionados."])
    return
  }
  for (const r of rows) {
    ws.addRow([r.supplierName, r.movCount, r.invoiceTotal, r.abonoTotal, r.aPagarTotal])
  }
  const tot = ws.addRow([
    "TOTAL",
    rows.reduce((a, r) => a + r.movCount, 0),
    rows.reduce((a, r) => a + r.invoiceTotal, 0),
    rows.reduce((a, r) => a + r.abonoTotal, 0),
    rows.reduce((a, r) => a + r.aPagarTotal, 0),
  ])
  tot.font = { bold: true }
  freezeAndFilter(ws, 5)
}

// ──── Sheet 3: Pagos del periodo ──────────────────────────────────────────────

function addPagosSheet(wb: ExcelJS.Workbook, mp: MonthlyPaymentsSummary) {
  const ws = wb.addWorksheet("Pagos del periodo")
  ws.columns = [
    { header: "Proveedor", key: "prov", width: 28 },
    { header: "Fecha", key: "fecha", width: 14, style: { numFmt: DATE_FMT } },
    { header: "Método", key: "met", width: 16 },
    { header: "N° Operación", key: "op", width: 18 },
    { header: "Monto", key: "monto", width: 16, style: { numFmt: CUR } },
  ]
  styleHeader(ws)

  if (mp.pagos.length === 0) {
    ws.addRow(["Sin pagos registrados en el periodo."])
    return
  }
  for (const p of mp.pagos) {
    ws.addRow([
      p.proveedor,
      parseDate(p.fecha),
      METHOD_LABEL[p.metodo] ?? p.metodo,
      p.opNumber ?? "—",
      p.monto,
    ])
  }
  const tot = ws.addRow(["TOTAL", "", "", "", mp.totalPagado])
  tot.font = { bold: true }
  freezeAndFilter(ws, 5)
}

// ──── Sheet 4: Parciales activos ──────────────────────────────────────────────

function addParcialesSheet(wb: ExcelJS.Workbook, rows: PartialPaymentRow[]) {
  const ws = wb.addWorksheet("Parciales activos")
  ws.columns = [
    { header: "Proveedor", key: "s", width: 28 },
    { header: "Origen", key: "ori", width: 10 },
    { header: "N° Orden", key: "ord", width: 18 },
    { header: "Fecha", key: "fecha", width: 14, style: { numFmt: DATE_FMT } },
    { header: "Importe", key: "inv", width: 16, style: { numFmt: CUR } },
    { header: "Abonado", key: "ab", width: 16, style: { numFmt: CUR } },
    { header: "Saldo", key: "sal", width: 16, style: { numFmt: CUR } },
    { header: "% Pagado", key: "pct", width: 11 },
  ]
  styleHeader(ws)

  if (rows.length === 0) {
    ws.addRow(["Sin parciales activos para los filtros seleccionados."])
    return
  }
  for (const r of rows) {
    const row = ws.addRow([
      r.supplierName,
      ORIGIN_LABEL[r.origin] ?? r.origin,
      r.orderNumber ?? "—",
      parseDate(r.date),
      r.invoiceAmount,
      r.abono,
      r.aPagar,
      r.porcentajePagado / 100,
    ])
    row.getCell(8).numFmt = "0.0%"
  }
  freezeAndFilter(ws, 8)
}

// ──── Sheet 5: Egresos por proveedor ──────────────────────────────────────────

function addEgresosPorProveedorSheet(wb: ExcelJS.Workbook, rows: ExpenseBySupplierRow[]) {
  const ws = wb.addWorksheet("Egresos por proveedor")
  ws.columns = [
    { header: "Proveedor", key: "s", width: 32 },
    { header: "Pagado", key: "pag", width: 16, style: { numFmt: CUR } },
    { header: "Pendiente", key: "pen", width: 16, style: { numFmt: CUR } },
    { header: "Importe Total", key: "inv", width: 16, style: { numFmt: CUR } },
    { header: "# Movimientos", key: "mc", width: 14 },
  ]
  styleHeader(ws)

  if (rows.length === 0) {
    ws.addRow(["Sin egresos para los filtros seleccionados."])
    return
  }
  for (const r of rows) {
    ws.addRow([r.supplierName, r.abonoTotal, r.pendingTotal, r.invoiceTotal, r.movCount])
  }
  const tot = ws.addRow([
    "TOTAL",
    rows.reduce((a, r) => a + r.abonoTotal, 0),
    rows.reduce((a, r) => a + r.pendingTotal, 0),
    rows.reduce((a, r) => a + r.invoiceTotal, 0),
    rows.reduce((a, r) => a + r.movCount, 0),
  ])
  tot.font = { bold: true }
  freezeAndFilter(ws, 5)
}

// ──── Sheet 6: Egresos por categoría ──────────────────────────────────────────

function addEgresosPorCategoriaSheet(wb: ExcelJS.Workbook, rows: ExpenseByCategoryRow[]) {
  const ws = wb.addWorksheet("Egresos por categoría")
  ws.columns = [
    { header: "Categoría", key: "cat", width: 22 },
    { header: "Total Pagado", key: "tot", width: 16, style: { numFmt: CUR } },
    { header: "# Movimientos", key: "mc", width: 14 },
    { header: "% del Total", key: "pct", width: 12 },
  ]
  styleHeader(ws)

  if (rows.length === 0) {
    ws.addRow(["Sin egresos para los filtros seleccionados."])
    return
  }
  for (const r of rows) {
    const row = ws.addRow([
      CATEGORY_LABEL[r.category] ?? r.category,
      r.total,
      r.count,
      r.porcentaje / 100,
    ])
    row.getCell(4).numFmt = "0.0%"
  }
  const tot = ws.addRow([
    "TOTAL",
    rows.reduce((a, r) => a + r.total, 0),
    rows.reduce((a, r) => a + r.count, 0),
    "",
  ])
  tot.font = { bold: true }
  freezeAndFilter(ws, 4)
}

// ──── Sheet 7: Órdenes sin caja ───────────────────────────────────────────────

function addOrdenesSinCajaSheet(wb: ExcelJS.Workbook, rows: PendingOrderRow[]) {
  const ws = wb.addWorksheet("Órdenes sin caja")
  ws.columns = [
    { header: "Tipo", key: "tipo", width: 7 },
    { header: "N° Orden", key: "ord", width: 18 },
    { header: "Proveedor", key: "s", width: 28 },
    { header: "Proceso", key: "proc", width: 16 },
    { header: "Monto", key: "monto", width: 16, style: { numFmt: CUR } },
    { header: "Estado", key: "est", width: 14 },
    { header: "Fecha emisión", key: "fecha", width: 14, style: { numFmt: DATE_FMT } },
  ]
  styleHeader(ws)

  if (rows.length === 0) {
    ws.addRow(["Sin órdenes pendientes para los filtros seleccionados."])
    return
  }
  for (const r of rows) {
    ws.addRow([
      r.type,
      r.orderNumber,
      r.supplierName,
      r.process ?? "—",
      r.totalAmount,
      STATUS_LABEL[r.status] ?? r.status,
      parseDate(r.issueDate),
    ])
  }
  freezeAndFilter(ws, 7)
}

// ──── Sheet 8: Flujo mensual ──────────────────────────────────────────────────

function addFlujoMensualSheet(wb: ExcelJS.Workbook, rows: MonthlyFlowRow[]) {
  const ws = wb.addWorksheet("Flujo mensual")
  ws.columns = [
    { header: "Periodo", key: "mes", width: 14 },
    { header: "Ingresos", key: "ing", width: 16, style: { numFmt: CUR } },
    { header: "Egresos", key: "eg", width: 16, style: { numFmt: CUR } },
    { header: "Neto", key: "neto", width: 16, style: { numFmt: CUR } },
  ]
  styleHeader(ws)

  if (rows.length === 0) {
    ws.addRow(["Sin movimientos en el flujo para los filtros seleccionados."])
    return
  }
  for (const r of rows) {
    ws.addRow([r.mes, r.ingresos, r.egresos, r.neto])
  }
  const tot = ws.addRow([
    "TOTAL",
    rows.reduce((a, r) => a + r.ingresos, 0),
    rows.reduce((a, r) => a + r.egresos, 0),
    rows.reduce((a, r) => a + r.neto, 0),
  ])
  tot.font = { bold: true }
  freezeAndFilter(ws, 4)
}

// ──── Main export ─────────────────────────────────────────────────────────────

export async function generateReportsWorkbook(data: ReportsData): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "DPP Control"
  wb.created = new Date()
  wb.modified = new Date()

  addResumenSheet(wb, data)
  addCuentasPorPagarSheet(wb, data.accountsPayable)
  addPagosSheet(wb, data.monthlyPayments)
  addParcialesSheet(wb, data.partialPayments)
  addEgresosPorProveedorSheet(wb, data.expensesBySupplier)
  addEgresosPorCategoriaSheet(wb, data.expensesByCategory)
  addOrdenesSinCajaSheet(wb, data.pendingOrders)
  addFlujoMensualSheet(wb, data.monthlyFlow)

  // writeBuffer() returns Buffer at runtime; cast to Uint8Array to avoid
  // @types/node Buffer<T> generic incompatibility with ExcelJS's Buffer typedef.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Uint8Array(await wb.xlsx.writeBuffer() as any)
}

export const EXPECTED_SHEET_NAMES = [
  "Resumen",
  "Cuentas por pagar",
  "Pagos del periodo",
  "Parciales activos",
  "Egresos por proveedor",
  "Egresos por categoría",
  "Órdenes sin caja",
  "Flujo mensual",
]
