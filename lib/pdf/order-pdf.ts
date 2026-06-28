import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib"

// ── Types ──────────────────────────────────────────────────────────────────────

export type OrderItem = {
  description: string
  quantity: number
  unit: string
  unitPrice: number
  subtotal: number
}

export type PurchaseOrderPdfData = {
  orderNumber: string
  issueDate: string
  expectedDate?: string | null
  status: string
  paymentStatus: string
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  notes?: string | null
  supplier: { name: string; ruc?: string | null; address?: string | null }
  responsible: { name: string }
  items: OrderItem[]
}

export type ServiceOrderPdfData = PurchaseOrderPdfData & {
  process: string
  proformaCode?: string | null
  style?: { code: string; name: string } | null
}

// ── Color palette ──────────────────────────────────────────────────────────────

const C = {
  black:    rgb(0.10, 0.10, 0.10),
  gray:     rgb(0.45, 0.45, 0.45),
  lightGray: rgb(0.93, 0.93, 0.93),
  midGray:  rgb(0.70, 0.70, 0.70),
  white:    rgb(1, 1, 1),
  accent:   rgb(0.18, 0.22, 0.42),
  headerSub: rgb(0.75, 0.80, 0.95),
}

const PAGE_W = PageSizes.A4[0]  // 595.28
const PAGE_H = PageSizes.A4[1]  // 841.89
const MARGIN = 40
const CONTENT_W = PAGE_W - MARGIN * 2  // 515.28
const ROW_H = 13
const LINE_H = 14

// ── Label maps ─────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  BORRADOR: "Borrador", EMITIDA: "Emitida", APROBADA: "Aprobada",
  EN_PROCESO: "En proceso", COMPLETADA: "Completada", ANULADA: "Anulada",
}

const PAYMENT_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente", ADELANTO: "Con adelanto", PARCIAL: "Parcial",
  PAGADO: "Pagado", VENCIDO: "Vencido",
}

const PROCESS_LABEL: Record<string, string> = {
  CORTE: "Corte", CONFECCION: "Confección", ESTAMPADO: "Estampado",
  BORDADO: "Bordado", ACABADO: "Acabado", EMPAQUE: "Empaque",
  LAVADO: "Lavado", OTROS: "Otros",
}

// ── Formatting ─────────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  return "S/ " + new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function fmtDate(s: string): string {
  return new Date(s + "T12:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function fmtQty(n: number): string {
  return new Intl.NumberFormat("es-PE", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n)
}

// ── Drawing context ────────────────────────────────────────────────────────────

type EmbeddedFont = Awaited<ReturnType<PDFDocument["embedFont"]>>

type Ctx = {
  doc: PDFDocument
  page: ReturnType<PDFDocument["addPage"]>
  y: number
  regular: EmbeddedFont
  bold: EmbeddedFont
}

function newPage(ctx: Ctx): void {
  ctx.page = ctx.doc.addPage(PageSizes.A4)
  ctx.y = PAGE_H - MARGIN
}

function ensureSpace(ctx: Ctx, needed: number): void {
  if (ctx.y - needed < MARGIN + 40) newPage(ctx)
}

function moveDown(ctx: Ctx, amount: number): void {
  ctx.y -= amount
}

function drawText(
  ctx: Ctx,
  text: string,
  opts: {
    x?: number
    size?: number
    bold?: boolean
    color?: ReturnType<typeof rgb>
    align?: "left" | "right" | "center"
    width?: number
  } = {}
): void {
  const { x = MARGIN, size = 9, bold = false, color = C.black, align = "left", width = CONTENT_W } = opts
  const font = bold ? ctx.bold : ctx.regular
  let tx = x
  if (align === "right")  tx = x + width - font.widthOfTextAtSize(text, size)
  if (align === "center") tx = x + (width - font.widthOfTextAtSize(text, size)) / 2
  ctx.page.drawText(text, { x: tx, y: ctx.y, size, font, color })
}

function drawLine(ctx: Ctx, x1: number, x2: number, thickness = 0.5, color = C.midGray): void {
  ctx.page.drawLine({ start: { x: x1, y: ctx.y }, end: { x: x2, y: ctx.y }, thickness, color })
}

function drawFilledRect(ctx: Ctx, x: number, y: number, w: number, h: number, color: ReturnType<typeof rgb>): void {
  ctx.page.drawRectangle({ x, y, width: w, height: h, color })
}

// ── Two-column meta row ────────────────────────────────────────────────────────

const HALF_W = CONTENT_W / 2
const LABEL_W = 88

function metaRow(ctx: Ctx, left: [string, string], right?: [string, string]): void {
  drawText(ctx, left[0], { size: 7.5, color: C.gray, width: LABEL_W })
  drawText(ctx, left[1], { x: MARGIN + LABEL_W, size: 8, bold: true, width: HALF_W - LABEL_W })
  if (right) {
    drawText(ctx, right[0], { x: MARGIN + HALF_W, size: 7.5, color: C.gray, width: LABEL_W })
    drawText(ctx, right[1], { x: MARGIN + HALF_W + LABEL_W, size: 8, bold: true, width: HALF_W - LABEL_W })
  }
  moveDown(ctx, LINE_H)
}

// ── Items table ────────────────────────────────────────────────────────────────

type ColDef = { label: string; width: number; align?: "left" | "right" }

const ITEM_COLS: ColDef[] = [
  { label: "#",           width: 22 },
  { label: "Descripción", width: 208 },
  { label: "Cant.",       width: 60, align: "right" },
  { label: "Unid.",       width: 40 },
  { label: "P. Unit.",    width: 90, align: "right" },
  { label: "Subtotal",    width: 95, align: "right" },
]

function tableHeader(ctx: Ctx, cols: ColDef[]): void {
  ensureSpace(ctx, ROW_H + 4)
  drawFilledRect(ctx, MARGIN, ctx.y - ROW_H + 2, CONTENT_W, ROW_H, C.lightGray)
  let x = MARGIN + 4
  for (const col of cols) {
    drawText(ctx, col.label, { x, size: 7.5, bold: true, color: C.gray, align: col.align ?? "left", width: col.width - 4 })
    x += col.width
  }
  moveDown(ctx, ROW_H)
  drawLine(ctx, MARGIN, MARGIN + CONTENT_W, 0.5, C.midGray)
}

function tableRow(ctx: Ctx, cols: ColDef[], values: string[], stripe: boolean): void {
  ensureSpace(ctx, ROW_H + 2)
  if (stripe) drawFilledRect(ctx, MARGIN, ctx.y - ROW_H + 2, CONTENT_W, ROW_H, rgb(0.97, 0.97, 0.97))
  let x = MARGIN + 4
  for (let i = 0; i < cols.length; i++) {
    drawText(ctx, values[i] ?? "", { x, size: 8, align: cols[i].align ?? "left", width: cols[i].width - 4 })
    x += cols[i].width
  }
  moveDown(ctx, ROW_H)
  drawLine(ctx, MARGIN, MARGIN + CONTENT_W, 0.3, C.lightGray)
}

// ── Totals box ─────────────────────────────────────────────────────────────────

function totalsBlock(ctx: Ctx, totalAmount: number, paidAmount: number, pendingAmount: number): void {
  ensureSpace(ctx, 70)
  moveDown(ctx, 8)

  const boxX = MARGIN + CONTENT_W - 210
  const boxW = 210

  const metaLines: [string, string][] = [
    ["Total orden:", fmtMoney(totalAmount)],
    ["Pagado:",      fmtMoney(paidAmount)],
  ]
  for (const [label, value] of metaLines) {
    drawText(ctx, label,  { x: boxX,       size: 8.5, color: C.gray, width: 110 })
    drawText(ctx, value,  { x: boxX + 110, size: 8.5, align: "right", width: boxW - 110 })
    moveDown(ctx, LINE_H)
  }

  moveDown(ctx, 3)
  drawLine(ctx, boxX, boxX + boxW, 1, C.accent)
  moveDown(ctx, 4)
  drawFilledRect(ctx, boxX, ctx.y - ROW_H + 2, boxW, ROW_H + 3, C.accent)
  drawText(ctx, "SALDO PENDIENTE:", { x: boxX + 4, size: 8.5, bold: true, color: C.white, width: 110 })
  drawText(ctx, fmtMoney(pendingAmount), { x: boxX + 114, size: 9, bold: true, color: C.white, align: "right", width: boxW - 118 })
  moveDown(ctx, ROW_H + 6)
}

// ── Signature block ────────────────────────────────────────────────────────────

function signatureBlock(ctx: Ctx, responsibleName: string): void {
  ensureSpace(ctx, 60)
  moveDown(ctx, 24)

  const lineLen = 140
  const x1 = MARGIN + 30
  const x2 = MARGIN + CONTENT_W - 30 - lineLen

  drawLine(ctx, x1, x1 + lineLen, 0.8, C.midGray)
  drawLine(ctx, x2, x2 + lineLen, 0.8, C.midGray)
  moveDown(ctx, 8)

  drawText(ctx, responsibleName, { x: x1, size: 8, width: lineLen, align: "center" })
  drawText(ctx, "Proveedor / Taller", { x: x2, size: 8, width: lineLen, align: "center" })
  moveDown(ctx, 10)

  drawText(ctx, "Responsable DPP", { x: x1, size: 7, color: C.gray, width: lineLen, align: "center" })
  drawText(ctx, "Firma / sello de conformidad", { x: x2, size: 7, color: C.gray, width: lineLen, align: "center" })
}

// ── Document header (title bar) ────────────────────────────────────────────────

function docHeader(ctx: Ctx, docType: string, orderNumber: string, issueDate: string): void {
  ctx.page.drawRectangle({ x: 0, y: PAGE_H - 58, width: PAGE_W, height: 58, color: C.accent })

  ctx.page.drawText("DPP CONTROL", { x: MARGIN, y: PAGE_H - 22, size: 15, font: ctx.bold, color: C.white })
  ctx.page.drawText("Diseño Punto y Plano S.A.C.", { x: MARGIN, y: PAGE_H - 38, size: 8, font: ctx.regular, color: C.headerSub })

  const rightX = PAGE_W - MARGIN - 160
  ctx.page.drawText(docType, { x: rightX, y: PAGE_H - 23, size: 11, font: ctx.bold, color: C.white })
  ctx.page.drawText(orderNumber, { x: rightX, y: PAGE_H - 38, size: 9, font: ctx.regular, color: C.headerSub })

  ctx.y = PAGE_H - 66
  moveDown(ctx, 6)
  drawText(ctx, `Lima, ${fmtDate(issueDate)}`, { align: "right", size: 8, color: C.gray })
  moveDown(ctx, LINE_H + 4)
}

// ── Page footers ───────────────────────────────────────────────────────────────

function addFooters(ctx: Ctx, orderNumber: string, docType: string): void {
  const totalPages = ctx.doc.getPageCount()
  const now = new Date().toISOString().slice(0, 10)
  for (let i = 0; i < totalPages; i++) {
    const pg = ctx.doc.getPage(i)
    pg.drawLine({ start: { x: MARGIN, y: 30 }, end: { x: PAGE_W - MARGIN, y: 30 }, thickness: 0.4, color: C.midGray })
    pg.drawText(`DPP Control — ${docType} ${orderNumber} — ${now}`, {
      x: MARGIN, y: 18, size: 7, font: ctx.regular, color: C.gray,
    })
    pg.drawText(`Pág. ${i + 1} de ${totalPages}`, {
      x: PAGE_W - MARGIN - 55, y: 18, size: 7, font: ctx.regular, color: C.gray,
    })
  }
}

// ── Items table section ────────────────────────────────────────────────────────

function itemsSection(ctx: Ctx, items: OrderItem[], sectionTitle: string): void {
  ensureSpace(ctx, 30)
  drawText(ctx, sectionTitle, { size: 8, bold: true, color: C.accent })
  moveDown(ctx, LINE_H)

  if (items.length === 0) {
    drawText(ctx, "Sin ítems registrados.", { size: 8, color: C.gray })
    moveDown(ctx, LINE_H + 4)
    return
  }

  tableHeader(ctx, ITEM_COLS)
  items.forEach((item, i) => {
    tableRow(ctx, ITEM_COLS, [
      String(i + 1),
      item.description,
      fmtQty(item.quantity),
      item.unit,
      fmtMoney(item.unitPrice),
      fmtMoney(item.subtotal),
    ], i % 2 === 1)
  })
}

// ── Public generators ──────────────────────────────────────────────────────────

export async function generatePurchaseOrderPdf(data: PurchaseOrderPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold    = await doc.embedFont(StandardFonts.HelveticaBold)
  const ctx: Ctx = { doc, page: doc.addPage(PageSizes.A4), y: PAGE_H - MARGIN, regular, bold }

  docHeader(ctx, "ORDEN DE COMPRA", data.orderNumber, data.issueDate)

  metaRow(ctx, ["Proveedor:",   data.supplier.name],                   ["Estado:",     STATUS_LABEL[data.status] ?? data.status])
  if (data.supplier.ruc)
    metaRow(ctx, ["RUC:",       data.supplier.ruc],                    ["Pago:",       PAYMENT_LABEL[data.paymentStatus] ?? data.paymentStatus])
  else
    metaRow(ctx, ["",           ""],                                   ["Pago:",       PAYMENT_LABEL[data.paymentStatus] ?? data.paymentStatus])
  if (data.supplier.address)
    metaRow(ctx, ["Dirección:", data.supplier.address])
  metaRow(ctx, ["Responsable:", data.responsible.name],                ["F. Emisión:", fmtDate(data.issueDate)])
  if (data.expectedDate)
    metaRow(ctx, ["",           ""],                                   ["F. Esperada:", fmtDate(data.expectedDate)])

  moveDown(ctx, 4)
  drawLine(ctx, MARGIN, MARGIN + CONTENT_W, 0.8, C.accent)
  moveDown(ctx, 12)

  itemsSection(ctx, data.items, "DETALLE DE ÍTEMS")
  totalsBlock(ctx, data.totalAmount, data.paidAmount, data.pendingAmount)

  if (data.notes) {
    ensureSpace(ctx, 36)
    moveDown(ctx, 4)
    drawText(ctx, "Notas:", { size: 8, bold: true, color: C.gray })
    moveDown(ctx, LINE_H)
    drawText(ctx, data.notes, { size: 8, color: C.gray })
    moveDown(ctx, LINE_H + 4)
  }

  signatureBlock(ctx, data.responsible.name)
  addFooters(ctx, data.orderNumber, "OC")

  return doc.save()
}

export async function generateServiceOrderPdf(data: ServiceOrderPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold    = await doc.embedFont(StandardFonts.HelveticaBold)
  const ctx: Ctx = { doc, page: doc.addPage(PageSizes.A4), y: PAGE_H - MARGIN, regular, bold }

  docHeader(ctx, "ORDEN DE SERVICIO", data.orderNumber, data.issueDate)

  metaRow(ctx, ["Proveedor:",   data.supplier.name],                   ["Estado:",     STATUS_LABEL[data.status] ?? data.status])
  if (data.supplier.ruc)
    metaRow(ctx, ["RUC:",       data.supplier.ruc],                    ["Pago:",       PAYMENT_LABEL[data.paymentStatus] ?? data.paymentStatus])
  else
    metaRow(ctx, ["",           ""],                                   ["Pago:",       PAYMENT_LABEL[data.paymentStatus] ?? data.paymentStatus])
  metaRow(ctx, ["Proceso:",     PROCESS_LABEL[data.process] ?? data.process], ["F. Emisión:", fmtDate(data.issueDate)])
  if (data.proformaCode)
    metaRow(ctx, ["N° Proforma:", data.proformaCode],                  data.expectedDate ? ["F. Esperada:", fmtDate(data.expectedDate)] : undefined)
  else if (data.expectedDate)
    metaRow(ctx, ["",           ""],                                   ["F. Esperada:", fmtDate(data.expectedDate)])
  if (data.style)
    metaRow(ctx, ["Estilo:",    `${data.style.code} — ${data.style.name}`])
  metaRow(ctx, ["Responsable:", data.responsible.name])

  moveDown(ctx, 4)
  drawLine(ctx, MARGIN, MARGIN + CONTENT_W, 0.8, C.accent)
  moveDown(ctx, 12)

  itemsSection(ctx, data.items, "CONCEPTOS DE SERVICIO")
  totalsBlock(ctx, data.totalAmount, data.paidAmount, data.pendingAmount)

  if (data.notes) {
    ensureSpace(ctx, 36)
    moveDown(ctx, 4)
    drawText(ctx, "Notas:", { size: 8, bold: true, color: C.gray })
    moveDown(ctx, LINE_H)
    drawText(ctx, data.notes, { size: 8, color: C.gray })
    moveDown(ctx, LINE_H + 4)
  }

  signatureBlock(ctx, data.responsible.name)
  addFooters(ctx, data.orderNumber, "OS")

  return doc.save()
}
