import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib"
import type { ReportsData } from "@/lib/data/reports"

// ── Color palette ──────────────────────────────────────────────────────────────

const C = {
  black:    rgb(0.10, 0.10, 0.10),
  gray:     rgb(0.45, 0.45, 0.45),
  lightGray: rgb(0.93, 0.93, 0.93),
  midGray:  rgb(0.70, 0.70, 0.70),
  white:    rgb(1, 1, 1),
  red:      rgb(0.78, 0.15, 0.15),
  green:    rgb(0.13, 0.55, 0.33),
  amber:    rgb(0.75, 0.45, 0.05),
  blue:     rgb(0.15, 0.35, 0.75),
  accent:   rgb(0.18, 0.22, 0.42),
}

// ── Formatting helpers ─────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  return "S/ " + new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}

function fmtDate(s: string): string {
  return new Date(s + "T12:00:00").toLocaleDateString("es-PE", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })
}

const CATEGORY_LABEL: Record<string, string> = {
  CONFECCION: "Confección", CORTE: "Corte", ESTAMPADO: "Estampado",
  ACABADO_EMPAQUE: "Acabado/Emp.", MATERIA_PRIMA: "Mat. Prima",
  PLANILLA: "Planilla", IMPUESTO: "Impuesto", MOVILIDAD: "Movilidad",
  COMISION: "Comisión", CAJA_CHICA: "Caja chica", PRESTAMO: "Préstamo",
  INVERSION: "Inversión", COMPRA: "Compra", VENTA: "Venta", OTROS: "Otros",
}

const ORIGIN_LABEL: Record<string, string> = {
  ORDEN_COMPRA: "OC", ORDEN_SERVICIO: "OS", MANUAL: "Manual", IMPORTADO: "Import.",
}

const STATUS_LABEL: Record<string, string> = {
  BORRADOR: "Borrador", EMITIDA: "Emitida", APROBADA: "Aprobada",
  EN_PROCESO: "En proceso", COMPLETADA: "Completada", ANULADA: "Anulada",
}

const METHOD_LABEL: Record<string, string> = {
  TRANSFERENCIA: "Transferencia", DEPOSITO: "Depósito", EFECTIVO: "Efectivo",
  CHEQUE: "Cheque", TARJETA: "Tarjeta", OTRO: "Otro",
}

// ── Page layout constants ──────────────────────────────────────────────────────

const PAGE_W = PageSizes.A4[0]   // 595.28
const PAGE_H = PageSizes.A4[1]   // 841.89
const MARGIN = 40
const CONTENT_W = PAGE_W - MARGIN * 2
const LINE_H = 14
const SECTION_GAP = 18
const ROW_H = 13

// ── Drawing context that tracks cursor y and handles page breaks ───────────────

type DrawCtx = {
  doc: PDFDocument
  pages: ReturnType<PDFDocument["addPage"]>[]
  page: ReturnType<PDFDocument["addPage"]>
  y: number
  regular: Awaited<ReturnType<PDFDocument["embedFont"]>>
  bold:    Awaited<ReturnType<PDFDocument["embedFont"]>>
}

function newPage(ctx: DrawCtx): void {
  ctx.page = ctx.doc.addPage(PageSizes.A4)
  ctx.pages.push(ctx.page)
  ctx.y = PAGE_H - MARGIN
}

function ensureSpace(ctx: DrawCtx, needed: number): void {
  if (ctx.y - needed < MARGIN + 20) newPage(ctx)
}

function drawText(
  ctx: DrawCtx, text: string,
  opts: { x?: number; size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; align?: "left" | "right" | "center"; width?: number }
): void {
  const { x = MARGIN, size = 9, bold = false, color = C.black, align = "left", width = CONTENT_W } = opts
  const font = bold ? ctx.bold : ctx.regular
  const tw = font.widthOfTextAtSize(text, size)
  let tx = x
  if (align === "right")  tx = x + width - tw
  if (align === "center") tx = x + (width - tw) / 2
  ctx.page.drawText(text, { x: tx, y: ctx.y, size, font, color })
}

function drawLine(ctx: DrawCtx, x1: number, x2: number, thickness = 0.5, color = C.midGray): void {
  ctx.page.drawLine({ start: { x: x1, y: ctx.y }, end: { x: x2, y: ctx.y }, thickness, color })
}

function drawRect(ctx: DrawCtx, x: number, w: number, h: number, color: ReturnType<typeof rgb>): void {
  ctx.page.drawRectangle({ x, y: ctx.y - h + 2, width: w, height: h, color })
}

function moveDown(ctx: DrawCtx, amount: number): void {
  ctx.y -= amount
}

// ── Section heading ────────────────────────────────────────────────────────────

function sectionHeader(ctx: DrawCtx, title: string): void {
  ensureSpace(ctx, 28)
  moveDown(ctx, SECTION_GAP)
  drawRect(ctx, MARGIN, CONTENT_W, 16, C.accent)
  drawText(ctx, title.toUpperCase(), { size: 7.5, bold: true, color: C.white })
  moveDown(ctx, 16)
}

// ── Table helpers ──────────────────────────────────────────────────────────────

type ColDef = { label: string; width: number; align?: "left" | "right" }

function tableHeader(ctx: DrawCtx, cols: ColDef[]): void {
  ensureSpace(ctx, ROW_H + 4)
  drawRect(ctx, MARGIN, CONTENT_W, ROW_H, C.lightGray)
  let x = MARGIN + 4
  for (const col of cols) {
    drawText(ctx, col.label, { x, size: 7.5, bold: true, color: C.gray, align: col.align ?? "left", width: col.width - 4 })
    x += col.width
  }
  moveDown(ctx, ROW_H)
  drawLine(ctx, MARGIN, MARGIN + CONTENT_W, 0.5, C.midGray)
}

function tableRow(
  ctx: DrawCtx, cols: ColDef[], values: string[],
  opts: { stripe?: boolean; bold?: boolean; color?: ReturnType<typeof rgb> } = {}
): void {
  ensureSpace(ctx, ROW_H + 2)
  if (opts.stripe) drawRect(ctx, MARGIN, CONTENT_W, ROW_H, rgb(0.97, 0.97, 0.97))
  let x = MARGIN + 4
  const color = opts.color ?? C.black
  for (let i = 0; i < cols.length; i++) {
    const val = values[i] ?? ""
    drawText(ctx, val, { x, size: 8, bold: opts.bold ?? false, color, align: cols[i].align ?? "left", width: cols[i].width - 4 })
    x += cols[i].width
  }
  moveDown(ctx, ROW_H)
}

function tableDivider(ctx: DrawCtx): void {
  drawLine(ctx, MARGIN, MARGIN + CONTENT_W, 0.3, C.lightGray)
}

function tableTotalRow(ctx: DrawCtx, cols: ColDef[], values: string[]): void {
  ensureSpace(ctx, ROW_H + 4)
  moveDown(ctx, 2)
  drawLine(ctx, MARGIN, MARGIN + CONTENT_W, 0.8, C.midGray)
  moveDown(ctx, 2)
  drawRect(ctx, MARGIN, CONTENT_W, ROW_H, rgb(0.92, 0.92, 0.92))
  let x = MARGIN + 4
  for (let i = 0; i < cols.length; i++) {
    drawText(ctx, values[i] ?? "", { x, size: 8, bold: true, color: C.black, align: cols[i].align ?? "left", width: cols[i].width - 4 })
    x += cols[i].width
  }
  moveDown(ctx, ROW_H)
}

function emptyRow(ctx: DrawCtx, message: string): void {
  moveDown(ctx, 4)
  drawText(ctx, message, { size: 8, color: C.gray })
  moveDown(ctx, LINE_H)
}

// ── KPI card row ──────────────────────────────────────────────────────────────

function kpiRow(ctx: DrawCtx, items: { label: string; value: string; color?: ReturnType<typeof rgb> }[]): void {
  ensureSpace(ctx, 36)
  const cardW = CONTENT_W / items.length
  for (let i = 0; i < items.length; i++) {
    const x = MARGIN + i * cardW
    ctx.page.drawRectangle({ x, y: ctx.y - 28, width: cardW - 4, height: 32, color: C.lightGray, borderColor: rgb(0.85, 0.85, 0.85), borderWidth: 0.5 })
    ctx.page.drawText(items[i].label, { x: x + 6, y: ctx.y - 8, size: 7, font: ctx.regular, color: C.gray })
    ctx.page.drawText(items[i].value, { x: x + 6, y: ctx.y - 21, size: 9.5, font: ctx.bold, color: items[i].color ?? C.accent })
  }
  moveDown(ctx, 36)
}

// ── Main generator ─────────────────────────────────────────────────────────────

export async function generateReportsPdf(data: ReportsData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold    = await doc.embedFont(StandardFonts.HelveticaBold)

  const firstPage = doc.addPage(PageSizes.A4)
  const ctx: DrawCtx = { doc, pages: [firstPage], page: firstPage, y: PAGE_H - MARGIN, regular, bold }

  const { summary, accountsPayable, monthlyPayments, partialPayments,
          expensesBySupplier, expensesByCategory, pendingOrders, filters } = data
  const now = new Date().toISOString().slice(0, 10)

  // ── Header ──────────────────────────────────────────────────────────────────

  // Title bar
  ctx.page.drawRectangle({ x: 0, y: PAGE_H - 52, width: PAGE_W, height: 52, color: C.accent })
  ctx.page.drawText("DPP CONTROL", { x: MARGIN, y: PAGE_H - 22, size: 16, font: bold, color: C.white })
  ctx.page.drawText("Reporte Gerencial", { x: MARGIN, y: PAGE_H - 38, size: 10, font: regular, color: rgb(0.75, 0.80, 0.95) })
  ctx.page.drawText(`Generado: ${now}`, { x: PAGE_W - MARGIN - 90, y: PAGE_H - 30, size: 8, font: regular, color: rgb(0.80, 0.85, 1.0) })
  ctx.y = PAGE_H - 60

  // Period / filter summary
  moveDown(ctx, 10)
  drawText(ctx, `Periodo: ${filters.rangeLabel}`, { size: 9, bold: true })
  moveDown(ctx, 12)

  if (filters.activeCount > 0) {
    const parts: string[] = []
    if (filters.origin)          parts.push(`Origen: ${ORIGIN_LABEL[filters.origin] ?? filters.origin}`)
    if (filters.operationStatus) parts.push(`Estado: ${filters.operationStatus}`)
    if (filters.category)        parts.push(`Categoría: ${CATEGORY_LABEL[filters.category] ?? filters.category}`)
    drawText(ctx, `Filtros activos (${filters.activeCount}): ${parts.join(" · ")}`, { size: 8, color: C.gray })
    moveDown(ctx, LINE_H)
  }

  drawLine(ctx, MARGIN, PAGE_W - MARGIN, 0.8, C.accent)
  moveDown(ctx, 6)

  // ── 1. KPI Summary ──────────────────────────────────────────────────────────

  sectionHeader(ctx, "1. Resumen ejecutivo")
  moveDown(ctx, 4)

  kpiRow(ctx, [
    { label: "Total por pagar",     value: fmtMoney(summary.totalPorPagar),  color: C.red   },
    { label: "Pagado en el periodo",value: fmtMoney(summary.pagadoEsteMes),  color: C.green },
    { label: "Parciales activos",   value: String(summary.parcialesActivos), color: C.amber },
    { label: "Órdenes sin caja",    value: String(summary.ocSinCaja + summary.osSinCaja), color: C.blue },
  ])
  moveDown(ctx, 2)

  if (summary.topProveedorPorPagar) {
    drawText(ctx, `Mayor deuda: ${summary.topProveedorPorPagar}`, { size: 8, color: C.gray })
    moveDown(ctx, LINE_H)
  }
  if (summary.mayorCategoriaGasto) {
    drawText(ctx, `Mayor categoría de gasto: ${CATEGORY_LABEL[summary.mayorCategoriaGasto] ?? summary.mayorCategoriaGasto}`, { size: 8, color: C.gray })
    moveDown(ctx, LINE_H)
  }

  // ── 2. Cuentas por pagar ────────────────────────────────────────────────────

  sectionHeader(ctx, "2. Cuentas por pagar")

  if (accountsPayable.length === 0) {
    emptyRow(ctx, "No hay cuentas pendientes para los filtros seleccionados.")
  } else {
    const cols: ColDef[] = [
      { label: "Proveedor",  width: 160 },
      { label: "Movs.",      width: 50,  align: "right" },
      { label: "Importe",    width: 100, align: "right" },
      { label: "Abonado",    width: 100, align: "right" },
      { label: "Pendiente",  width: 105, align: "right" },
    ]
    tableHeader(ctx, cols)
    accountsPayable.forEach((r, i) => {
      tableRow(ctx, cols, [
        r.supplierName,
        String(r.movCount),
        fmtMoney(r.invoiceTotal),
        fmtMoney(r.abonoTotal),
        fmtMoney(r.aPagarTotal),
      ], { stripe: i % 2 === 1, color: r.aPagarTotal > 0 ? C.red : C.black })
      tableDivider(ctx)
    })
    tableTotalRow(ctx, cols, [
      "TOTAL",
      String(accountsPayable.reduce((a, r) => a + r.movCount, 0)),
      fmtMoney(accountsPayable.reduce((a, r) => a + r.invoiceTotal, 0)),
      fmtMoney(accountsPayable.reduce((a, r) => a + r.abonoTotal, 0)),
      fmtMoney(summary.totalPorPagar),
    ])
  }

  // ── 3. Pagos del periodo ────────────────────────────────────────────────────

  sectionHeader(ctx, "3. Pagos del periodo")

  if (monthlyPayments.pagos.length === 0) {
    emptyRow(ctx, "No hay pagos registrados en el periodo.")
  } else {
    const cols: ColDef[] = [
      { label: "Proveedor", width: 155 },
      { label: "Fecha",     width: 75  },
      { label: "Método",    width: 95  },
      { label: "Monto",     width: 100, align: "right" },
    ]
    tableHeader(ctx, cols)
    monthlyPayments.pagos.slice(0, 50).forEach((p, i) => {
      tableRow(ctx, cols, [
        p.proveedor,
        fmtDate(p.fecha),
        METHOD_LABEL[p.metodo] ?? p.metodo,
        fmtMoney(p.monto),
      ], { stripe: i % 2 === 1 })
      tableDivider(ctx)
    })
    if (monthlyPayments.pagos.length > 50) {
      moveDown(ctx, 4)
      drawText(ctx, `… y ${monthlyPayments.pagos.length - 50} pagos más (ver exportación Excel para lista completa)`, { size: 7.5, color: C.gray })
      moveDown(ctx, LINE_H)
    }
    tableTotalRow(ctx, cols, [
      `Total (${monthlyPayments.cantidadPagos} pagos)`,
      "", "",
      fmtMoney(monthlyPayments.totalPagado),
    ])
  }

  // ── 4. Parciales activos ────────────────────────────────────────────────────

  sectionHeader(ctx, "4. Pagos parciales activos")

  if (partialPayments.length === 0) {
    emptyRow(ctx, "No hay pagos parciales activos.")
  } else {
    const cols: ColDef[] = [
      { label: "Proveedor", width: 130 },
      { label: "Origen",    width: 50  },
      { label: "N° Orden",  width: 80  },
      { label: "Importe",   width: 80, align: "right" },
      { label: "Abonado",   width: 80, align: "right" },
      { label: "Saldo",     width: 80, align: "right" },
      { label: "%",         width: 35, align: "right" },
    ]
    tableHeader(ctx, cols)
    partialPayments.forEach((r, i) => {
      tableRow(ctx, cols, [
        r.supplierName,
        ORIGIN_LABEL[r.origin] ?? r.origin,
        r.orderNumber ?? "—",
        fmtMoney(r.invoiceAmount),
        fmtMoney(r.abono),
        fmtMoney(r.aPagar),
        r.porcentajePagado + "%",
      ], { stripe: i % 2 === 1, color: C.amber })
      tableDivider(ctx)
    })
    tableTotalRow(ctx, cols, [
      `Total (${partialPayments.length})`,
      "", "",
      fmtMoney(partialPayments.reduce((a, r) => a + r.invoiceAmount, 0)),
      fmtMoney(partialPayments.reduce((a, r) => a + r.abono, 0)),
      fmtMoney(partialPayments.reduce((a, r) => a + r.aPagar, 0)),
      "",
    ])
  }

  // ── 5. Egresos por proveedor ────────────────────────────────────────────────

  sectionHeader(ctx, "5. Egresos por proveedor (top 10)")

  if (expensesBySupplier.length === 0) {
    emptyRow(ctx, "No hay egresos registrados en el periodo.")
  } else {
    const cols: ColDef[] = [
      { label: "Proveedor",  width: 165 },
      { label: "Pagado",     width: 105, align: "right" },
      { label: "Pendiente",  width: 105, align: "right" },
      { label: "Movs.",      width: 50,  align: "right" },
      { label: "% Pagado",   width: 90,  align: "right" },
    ]
    const totalPagado = expensesBySupplier.reduce((a, r) => a + r.abonoTotal, 0)
    tableHeader(ctx, cols)
    expensesBySupplier.forEach((r, i) => {
      const pct = totalPagado > 0 ? Math.round((r.abonoTotal / totalPagado) * 100) : 0
      tableRow(ctx, cols, [
        r.supplierName,
        fmtMoney(r.abonoTotal),
        fmtMoney(r.pendingTotal),
        String(r.movCount),
        pct + "%",
      ], { stripe: i % 2 === 1 })
      tableDivider(ctx)
    })
    tableTotalRow(ctx, cols, [
      `Total (${expensesBySupplier.length} proveedores)`,
      fmtMoney(expensesBySupplier.reduce((a, r) => a + r.abonoTotal, 0)),
      fmtMoney(expensesBySupplier.reduce((a, r) => a + r.pendingTotal, 0)),
      String(expensesBySupplier.reduce((a, r) => a + r.movCount, 0)),
      "100%",
    ])
  }

  // ── 6. Egresos por categoría ────────────────────────────────────────────────

  sectionHeader(ctx, "6. Egresos por categoría")

  if (expensesByCategory.length === 0) {
    emptyRow(ctx, "No hay egresos registrados en el periodo.")
  } else {
    const cols: ColDef[] = [
      { label: "Categoría", width: 165 },
      { label: "Total",     width: 120, align: "right" },
      { label: "Movs.",     width: 60,  align: "right" },
      { label: "% del total", width: 90, align: "right" },
    ]
    tableHeader(ctx, cols)
    expensesByCategory.forEach((r, i) => {
      tableRow(ctx, cols, [
        CATEGORY_LABEL[r.category] ?? r.category,
        fmtMoney(r.total),
        String(r.count),
        r.porcentaje + "%",
      ], { stripe: i % 2 === 1 })
      tableDivider(ctx)
    })
    tableTotalRow(ctx, cols, [
      "Total",
      fmtMoney(expensesByCategory.reduce((a, r) => a + r.total, 0)),
      String(expensesByCategory.reduce((a, r) => a + r.count, 0)),
      "100%",
    ])
  }

  // ── 7. Órdenes sin caja ─────────────────────────────────────────────────────

  sectionHeader(ctx, "7. Órdenes sin movimiento de caja")

  if (pendingOrders.length === 0) {
    emptyRow(ctx, "No hay órdenes pendientes de enviar a caja.")
  } else {
    const cols: ColDef[] = [
      { label: "Tipo",      width: 40  },
      { label: "N° Orden",  width: 90  },
      { label: "Proveedor", width: 135 },
      { label: "Proceso",   width: 90  },
      { label: "Monto",     width: 90, align: "right" },
      { label: "Estado",    width: 75  },
    ]
    tableHeader(ctx, cols)
    pendingOrders.forEach((r, i) => {
      tableRow(ctx, cols, [
        r.type,
        r.orderNumber,
        r.supplierName,
        r.process ?? "—",
        fmtMoney(r.totalAmount),
        STATUS_LABEL[r.status] ?? r.status,
      ], { stripe: i % 2 === 1 })
      tableDivider(ctx)
    })
    tableTotalRow(ctx, cols, [
      `Total (${pendingOrders.length})`, "", "", "",
      fmtMoney(pendingOrders.reduce((a, r) => a + r.totalAmount, 0)),
      "",
    ])
  }

  // ── Footer on all pages ─────────────────────────────────────────────────────

  const totalPages = ctx.doc.getPageCount()
  for (let i = 0; i < totalPages; i++) {
    const pg = ctx.doc.getPage(i)
    pg.drawText(`DPP Control — Reporte Gerencial — ${filters.rangeLabel}`, {
      x: MARGIN, y: 20, size: 7, font: regular, color: C.gray,
    })
    pg.drawText(`Pág. ${i + 1} de ${totalPages}`, {
      x: PAGE_W - MARGIN - 50, y: 20, size: 7, font: regular, color: C.gray,
    })
  }

  return doc.save()
}
