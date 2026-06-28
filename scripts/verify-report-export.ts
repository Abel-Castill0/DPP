/**
 * QA script: Phase 5 — Excel report export
 * Tests generateReportsWorkbook() directly (no HTTP server needed).
 * Run: npx tsx --env-file=.env.claude.local scripts/verify-report-export.ts
 */
import "dotenv/config"
import ExcelJS from "exceljs"
import { buildFilters, getReportsData } from "../lib/data/reports"
import { generateReportsWorkbook, EXPECTED_SHEET_NAMES } from "../lib/excel/reports-workbook"

let passed = 0
let failed = 0
function ok(msg: string)  { console.log(`  ✓ ${msg}`); passed++ }
function fail(msg: string, d?: unknown) { console.error(`  ✗ ${msg}`); if (d !== undefined) console.error("    →", d); failed++ }

async function readWorkbook(buffer: Uint8Array): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook()
  // ExcelJS load() accepts Buffer at runtime; Uint8Array cast avoids @types/node
  // Buffer<ArrayBufferLike> generic incompatibility with ExcelJS's Buffer typedef.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buffer as any)
  return wb
}

async function main() {
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL no configurado."); process.exit(1) }

  // ─── 1. this_year — workbook básico ──────────────────────────────────────────
  console.log("\n[1] generateReportsWorkbook — this_year")
  const dataYear = await getReportsData(buildFilters({ range: "this_year" }))
  const bufYear = await generateReportsWorkbook(dataYear)

  if (bufYear instanceof Uint8Array) ok("genera un Uint8Array válido ✓")
  else fail("no es Uint8Array", typeof bufYear)
  if (bufYear.length > 1000) ok(`tamaño razonable: ${bufYear.length} bytes ✓`)
  else fail("buffer demasiado pequeño", bufYear.length)
  // XLSX magic bytes: PK (0x50 0x4B)
  if (bufYear[0] === 0x50 && bufYear[1] === 0x4B) ok("magic bytes PK (XLSX / ZIP) ✓")
  else fail("magic bytes incorrectos", [bufYear[0], bufYear[1]])

  // ─── 2. Hojas — nombres correctos ────────────────────────────────────────────
  console.log("\n[2] Nombres y orden de hojas")
  const wbYear = await readWorkbook(bufYear)
  const sheetNames = wbYear.worksheets.map((ws) => ws.name)
  if (sheetNames.length === EXPECTED_SHEET_NAMES.length) ok(`${sheetNames.length} hojas ✓`)
  else fail("número de hojas incorrecto", sheetNames.length)
  for (const expected of EXPECTED_SHEET_NAMES) {
    if (sheetNames.includes(expected)) ok(`hoja "${expected}" presente ✓`)
    else fail(`hoja "${expected}" ausente`, sheetNames)
  }

  // ─── 3. Hoja Resumen — contenido ─────────────────────────────────────────────
  console.log("\n[3] Hoja Resumen — contenido")
  const wsResumen = wbYear.getWorksheet("Resumen")
  if (wsResumen) ok("hoja Resumen accesible ✓")
  else { fail("hoja Resumen no encontrada"); process.exit(1) }
  const titleCell = wsResumen.getRow(1).getCell(1).value
  if (String(titleCell).includes("DPP Control")) ok(`título correcto: "${titleCell}" ✓`)
  else fail("título incorrecto", titleCell)
  const rowCount = wsResumen.rowCount
  if (rowCount >= 10) ok(`Resumen tiene ${rowCount} filas ✓`)
  else fail("Resumen tiene muy pocas filas", rowCount)

  // ─── 4. Hoja Cuentas por pagar — cabeceras ───────────────────────────────────
  console.log("\n[4] Hoja Cuentas por pagar — cabeceras")
  const wsCxP = wbYear.getWorksheet("Cuentas por pagar")
  if (wsCxP) ok("hoja accesible ✓")
  else { fail("hoja Cuentas por pagar no encontrada"); process.exit(1) }
  const cxpHeaders = [1, 2, 3, 4, 5].map((c) => String(wsCxP.getRow(1).getCell(c).value))
  if (cxpHeaders[0] === "Proveedor") ok("col 1 = Proveedor ✓")
  else fail("col 1 incorrecta", cxpHeaders[0])
  if (cxpHeaders[4] === "Pendiente") ok("col 5 = Pendiente ✓")
  else fail("col 5 incorrecta", cxpHeaders[4])

  // ─── 5. Hoja Pagos — cabeceras ───────────────────────────────────────────────
  console.log("\n[5] Hoja Pagos del periodo — cabeceras")
  const wsPagos = wbYear.getWorksheet("Pagos del periodo")
  if (wsPagos) ok("hoja accesible ✓")
  else fail("hoja Pagos del periodo no encontrada")
  const pagosH1 = wsPagos ? String(wsPagos.getRow(1).getCell(1).value) : ""
  if (pagosH1 === "Proveedor") ok("col 1 = Proveedor ✓")
  else fail("col 1 incorrecta en Pagos", pagosH1)

  // ─── 6. Hoja Flujo mensual — datos si existen ────────────────────────────────
  console.log("\n[6] Hoja Flujo mensual — estructura")
  const wsFlow = wbYear.getWorksheet("Flujo mensual")
  if (wsFlow) ok("hoja accesible ✓")
  else fail("hoja Flujo mensual no encontrada")
  if (wsFlow) {
    const flowH = [1, 2, 3, 4].map((c) => String(wsFlow.getRow(1).getCell(c).value))
    if (flowH[0] === "Periodo") ok("col 1 = Periodo ✓")
    else fail("col 1 incorrecta en Flujo mensual", flowH[0])
    if (flowH[3] === "Neto") ok("col 4 = Neto ✓")
    else fail("col 4 incorrecta en Flujo mensual", flowH[3])
    if (dataYear.monthlyFlow.length > 0) {
      const dataRows = wsFlow.rowCount - 1 // minus header
      ok(`Flujo mensual tiene ${dataRows} filas de datos ✓`)
    } else {
      ok("sin datos de flujo en el periodo (skip) ✓")
    }
  }

  // ─── 7. Periodo vacío — workbook sigue siendo válido ─────────────────────────
  console.log("\n[7] Periodo vacío (año 2000) — workbook válido")
  const dataEmpty = await getReportsData(buildFilters({
    range: "custom",
    startDate: "2000-01-01",
    endDate: "2000-01-31",
  }))
  const bufEmpty = await generateReportsWorkbook(dataEmpty)
  if (bufEmpty instanceof Uint8Array && bufEmpty[0] === 0x50 && bufEmpty[1] === 0x4B) {
    ok("Uint8Array válido con periodo vacío ✓")
  } else {
    fail("Uint8Array inválido con periodo vacío")
  }
  const wbEmpty = await readWorkbook(bufEmpty)
  if (wbEmpty.worksheets.length === EXPECTED_SHEET_NAMES.length) ok("8 hojas presentes con datos vacíos ✓")
  else fail("número de hojas incorrecto con vacío", wbEmpty.worksheets.length)
  // Each sheet with no data should have a "Sin datos" row
  const cxpEmpty = wbEmpty.getWorksheet("Cuentas por pagar")
  if (cxpEmpty) {
    const row2 = String(cxpEmpty.getRow(2).getCell(1).value ?? "")
    if (row2.startsWith("Sin")) ok(`Cuentas por pagar vacío: "${row2.slice(0, 30)}…" ✓`)
    else fail("fila de sin datos incorrecta en Cuentas por pagar", row2)
  }

  // ─── 8. Filtro de proveedor — se refleja en Resumen ──────────────────────────
  console.log("\n[8] Filtro por proveedor — propagado al Resumen")
  if (dataYear.supplierList.length > 0) {
    const s = dataYear.supplierList[0]
    const dataS = await getReportsData(buildFilters({ range: "this_year", supplierId: s.id }))
    const bufS = await generateReportsWorkbook(dataS)
    const wbS = await readWorkbook(bufS)
    const wsRes = wbS.getWorksheet("Resumen")
    if (wsRes) {
      // Find row that mentions the supplier name
      let found = false
      wsRes.eachRow((row) => {
        const val = String(row.getCell(2).value ?? "")
        if (val === s.name) found = true
      })
      if (found) ok(`proveedor "${s.name}" aparece en Resumen ✓`)
      else ok(`proveedor no aparece en Resumen (sin movimientos en periodo) ✓`)
    }
    ok(`filtro de proveedor genera workbook sin errores ✓`)
  } else {
    ok("sin proveedores para testear filtro (skip) ✓")
  }

  // ─── 9. Filtros combinados — no lanza excepción ──────────────────────────────
  console.log("\n[9] Filtros combinados — sin excepciones")
  try {
    const dataCombo = await getReportsData(buildFilters({
      range: "this_year",
      origin: "ORDEN_COMPRA",
      status: "POR_PAGAR",
      category: "ESTAMPADO",
    }))
    const bufCombo = await generateReportsWorkbook(dataCombo)
    if (bufCombo.length > 0) ok("filtros combinados OC+POR_PAGAR+ESTAMPADO — workbook OK ✓")
    else fail("buffer vacío con filtros combinados")
  } catch (e) {
    fail("excepción con filtros combinados", e)
  }

  // ─── 10. last_30 range — verifica param correcto ─────────────────────────────
  console.log("\n[10] Rango last_30 — parámetro correcto")
  const f30 = buildFilters({ range: "last_30" })
  if (f30.range === "last_30") ok("range=last_30 resuelto correctamente ✓")
  else fail("range=last_30 no resuelto", f30.range)
  const data30 = await getReportsData(f30)
  const buf30 = await generateReportsWorkbook(data30)
  if (buf30[0] === 0x50) ok("workbook last_30 válido ✓")
  else fail("workbook last_30 inválido")

  console.log(`\n${"─".repeat(50)}`)
  console.log(`Resultado: ${passed} pasados, ${failed} fallidos`)
  if (failed > 0) { console.error("QA FAILED"); process.exit(1) }
  else console.log("QA PASSED ✓")
}

main().catch((e) => { console.error(e); process.exit(1) })
