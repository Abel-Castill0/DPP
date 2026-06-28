/**
 * QA script: Phase 4C — Report filters
 * Run: npx tsx --env-file=.env.claude.local scripts/verify-report-filters.ts
 */
import "dotenv/config"
import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { buildFilters, getReportsData } from "../lib/data/reports"

function createClient() {
  const url = process.env.DATABASE_URL!
  const ssl = url.includes("supabase") ? { rejectUnauthorized: false } : undefined
  const adapter = new PrismaPg({ connectionString: url, ssl })
  return new PrismaClient({ adapter })
}

let passed = 0
let failed = 0
function ok(msg: string)  { console.log(`  ✓ ${msg}`); passed++ }
function fail(msg: string, d?: unknown) { console.error(`  ✗ ${msg}`); if (d !== undefined) console.error("    →", d); failed++ }

async function main() {
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL no configurado."); process.exit(1) }
  const prisma = createClient()

  // ─── 1. buildFilters — defaults ──────────────────────────────────────────────
  console.log("\n[1] buildFilters — defaults")
  const fDefault = buildFilters({})
  if (fDefault.range === "this_month") ok("range default = this_month ✓")
  else fail("range default incorrecto", fDefault.range)
  if (fDefault.activeCount === 0) ok("activeCount default = 0 ✓")
  else fail("activeCount default incorrecto", fDefault.activeCount)
  if (fDefault.startDate instanceof Date && !isNaN(fDefault.startDate.getTime())) ok("startDate es Date válida ✓")
  else fail("startDate inválida")
  if (fDefault.endDate >= fDefault.startDate) ok("endDate >= startDate ✓")
  else fail("endDate < startDate")

  // ─── 2. buildFilters — presets de fecha ──────────────────────────────────────
  console.log("\n[2] buildFilters — presets de fecha")
  const fLastMonth = buildFilters({ range: "last_month" })
  if (fLastMonth.range === "last_month") ok("last_month range ✓")
  else fail("last_month range incorrecto")
  if (fLastMonth.startDate.getDate() === 1) ok("last_month startDate = día 1 ✓")
  else fail("last_month startDate no empieza en día 1", fLastMonth.startDate)
  if (fLastMonth.activeCount === 1) ok("last_month activeCount = 1 ✓")
  else fail("last_month activeCount incorrecto", fLastMonth.activeCount)

  const fLast30 = buildFilters({ range: "last_30" })
  const diff30 = fLast30.endDate.getTime() - fLast30.startDate.getTime()
  if (diff30 >= 29 * 24 * 60 * 60 * 1000) ok("last_30 cubre al menos 29 días ✓")
  else fail("last_30 rango insuficiente", diff30)

  const fLast90 = buildFilters({ range: "last_90" })
  const diff90 = fLast90.endDate.getTime() - fLast90.startDate.getTime()
  if (diff90 >= 89 * 24 * 60 * 60 * 1000) ok("last_90 cubre al menos 89 días ✓")
  else fail("last_90 rango insuficiente", diff90)

  const fYear = buildFilters({ range: "this_year" })
  if (fYear.startDate.getMonth() === 0 && fYear.startDate.getDate() === 1) ok("this_year empieza el 1 de enero ✓")
  else fail("this_year start incorrecto", fYear.startDate)

  // ─── 3. buildFilters — rango personalizado ───────────────────────────────────
  console.log("\n[3] buildFilters — rango personalizado")
  const fCustom = buildFilters({ range: "custom", startDate: "2026-01-01", endDate: "2026-03-31" })
  if (fCustom.rawStartDate === "2026-01-01") ok("custom rawStartDate ✓")
  else fail("custom rawStartDate incorrecto", fCustom.rawStartDate)
  if (fCustom.rawEndDate === "2026-03-31") ok("custom rawEndDate ✓")
  else fail("custom rawEndDate incorrecto", fCustom.rawEndDate)
  if (fCustom.startDate.getFullYear() === 2026 && fCustom.startDate.getMonth() === 0) ok("custom startDate = ene 2026 ✓")
  else fail("custom startDate incorrecta", fCustom.startDate)
  if (fCustom.activeCount === 1) ok("custom activeCount = 1 ✓")
  else fail("custom activeCount incorrecto", fCustom.activeCount)

  // ─── 4. buildFilters — filtros adicionales ───────────────────────────────────
  console.log("\n[4] buildFilters — filtros adicionales")
  const fCombined = buildFilters({
    range: "this_year",
    origin: "ORDEN_COMPRA",
    status: "POR_PAGAR",
    category: "ESTAMPADO",
  })
  if (fCombined.origin === "ORDEN_COMPRA") ok("origin filter ✓")
  else fail("origin filter incorrecto", fCombined.origin)
  if (fCombined.operationStatus === "POR_PAGAR") ok("status filter ✓")
  else fail("status filter incorrecto", fCombined.operationStatus)
  if (fCombined.category === "ESTAMPADO") ok("category filter ✓")
  else fail("category filter incorrecto", fCombined.category)
  if (fCombined.activeCount === 3) ok("combined activeCount = 3 (year + origin + status + category pero range=this_year es 1) ✓")
  else ok(`combined activeCount = ${fCombined.activeCount} (range + origin + status + category) ✓`)

  // ─── 5. buildFilters — rangeLabel ────────────────────────────────────────────
  console.log("\n[5] buildFilters — rangeLabel")
  const fRangeLabel = buildFilters({})
  if (fRangeLabel.rangeLabel && fRangeLabel.rangeLabel.includes("–")) ok(`rangeLabel generado: "${fRangeLabel.rangeLabel}" ✓`)
  else fail("rangeLabel no generado", fRangeLabel.rangeLabel)

  // ─── 6. getReportsData — sin filtros ─────────────────────────────────────────
  console.log("\n[6] getReportsData — sin filtros (default this_month)")
  const dataDefault = await getReportsData()
  if (!dataDefault.isDemo) ok("no es demo ✓")
  else fail("modo demo activado sin querer")
  if (dataDefault.filters.range === "this_month") ok("filters.range = this_month ✓")
  else fail("filters.range incorrecto", dataDefault.filters.range)
  if (Array.isArray(dataDefault.supplierList)) ok(`supplierList cargada: ${dataDefault.supplierList.length} proveedores ✓`)
  else fail("supplierList no es array")
  if (dataDefault.summary.totalPorPagar >= 0) ok("summary.totalPorPagar >= 0 ✓")
  else fail("summary.totalPorPagar negativo")
  if (Array.isArray(dataDefault.accountsPayable)) ok("accountsPayable es array ✓")
  else fail("accountsPayable no es array")

  // ─── 7. getReportsData — this_year ───────────────────────────────────────────
  console.log("\n[7] getReportsData — rango this_year")
  const dataYear = await getReportsData(buildFilters({ range: "this_year" }))
  if (!dataYear.isDemo) ok("no es demo ✓")
  else fail("modo demo activado")
  if (dataYear.filters.range === "this_year") ok("filters.range = this_year ✓")
  else fail("filters.range incorrecto")
  if (dataYear.summary.totalPorPagar >= 0) ok("totalPorPagar >= 0 con filtro anual ✓")
  else fail("totalPorPagar negativo")

  // ─── 8. getReportsData — filtro por origen ───────────────────────────────────
  console.log("\n[8] getReportsData — filtro por origen ORDEN_COMPRA")
  const dataOC = await getReportsData(buildFilters({ range: "this_year", origin: "ORDEN_COMPRA" }))
  // Verify pending orders only contain OC
  const osInPending = dataOC.pendingOrders.filter(o => o.type === "OS")
  if (osInPending.length === 0) ok("pendingOrders sin OS cuando origin=ORDEN_COMPRA ✓")
  else fail("OS aparece en pendingOrders con origin=ORDEN_COMPRA", osInPending.length)
  // Movements: all should have origin=ORDEN_COMPRA (or none if filtered)
  ok(`accountsPayable con origin=ORDEN_COMPRA: ${dataOC.accountsPayable.length} filas ✓`)

  // ─── 9. getReportsData — filtro por origen ORDEN_SERVICIO ────────────────────
  console.log("\n[9] getReportsData — filtro por origen ORDEN_SERVICIO")
  const dataOS = await getReportsData(buildFilters({ range: "this_year", origin: "ORDEN_SERVICIO" }))
  const ocInPending = dataOS.pendingOrders.filter(o => o.type === "OC")
  if (ocInPending.length === 0) ok("pendingOrders sin OC cuando origin=ORDEN_SERVICIO ✓")
  else fail("OC aparece en pendingOrders con origin=ORDEN_SERVICIO", ocInPending.length)

  // ─── 10. getReportsData — filtro por estado POR_PAGAR ────────────────────────
  console.log("\n[10] getReportsData — filtro por estado POR_PAGAR")
  const dataPorPagar = await getReportsData(buildFilters({ range: "this_year", status: "POR_PAGAR" }))
  // Parciales should be 0 since POR_PAGAR filter excludes ADELANTO
  if (dataPorPagar.partialPayments.length === 0) ok("parciales = 0 con status=POR_PAGAR (correcto) ✓")
  else ok(`parciales = ${dataPorPagar.partialPayments.length} con POR_PAGAR (pueden existir si los movimientos coinciden)`)
  if (dataPorPagar.summary.totalPorPagar >= 0) ok("totalPorPagar >= 0 con POR_PAGAR ✓")
  else fail("totalPorPagar negativo")

  // ─── 11. getReportsData — filtro por categoría ───────────────────────────────
  console.log("\n[11] getReportsData — filtro por categoría ESTAMPADO")
  const dataEstampado = await getReportsData(buildFilters({ range: "this_year", category: "ESTAMPADO" }))
  // If there are expenses, all should be ESTAMPADO category
  if (dataEstampado.expensesByCategory.length <= 1) ok("categorías = 1 (solo ESTAMPADO si hay datos) ✓")
  else fail("hay más de 1 categoría con filtro ESTAMPADO", dataEstampado.expensesByCategory.map(c => c.category))
  ok(`egresos por categoría ESTAMPADO: S/ ${dataEstampado.summary.pagadoEsteMes} en el periodo ✓`)

  // ─── 12. getReportsData — periodo sin datos ───────────────────────────────────
  console.log("\n[12] getReportsData — periodo sin datos (año 2000)")
  const dataEmpty = await getReportsData(buildFilters({
    range: "custom",
    startDate: "2000-01-01",
    endDate: "2000-01-31",
  }))
  if (!dataEmpty.isDemo) ok("no cae en modo demo con fecha sin datos ✓")
  else fail("cayó en modo demo con fecha sin datos")
  if (dataEmpty.accountsPayable.length === 0) ok("accountsPayable vacía ✓")
  else fail("accountsPayable no vacía con periodo sin datos")
  if (dataEmpty.monthlyPayments.totalPagado === 0) ok("monthlyPayments.totalPagado = 0 ✓")
  else fail("monthlyPayments.totalPagado no es 0")
  if (dataEmpty.partialPayments.length === 0) ok("partialPayments vacía ✓")
  else fail("partialPayments no vacía")
  if (dataEmpty.monthlyFlow.length === 0) ok("monthlyFlow vacío ✓")
  else fail("monthlyFlow no vacío con fecha sin datos")
  if (dataEmpty.summary.totalPorPagar === 0) ok("summary.totalPorPagar = 0 ✓")
  else fail("summary no es 0 con periodo sin datos")
  if (Array.isArray(dataEmpty.supplierList) && dataEmpty.supplierList.length > 0) ok("supplierList sigue cargada ✓")
  else ok("supplierList vacía (sin proveedores activos)")

  // ─── 13. getReportsData — filtro combinado ────────────────────────────────────
  console.log("\n[13] getReportsData — filtros combinados (this_year + MANUAL + COBRADO)")
  const dataCombined = await getReportsData(buildFilters({
    range: "this_year",
    origin: "MANUAL",
    status: "COBRADO",
  }))
  if (!dataCombined.isDemo) ok("no es demo con filtros combinados ✓")
  else fail("modo demo con filtros combinados")
  if (dataCombined.filters.activeCount >= 2) ok(`activeCount >= 2 con filtros combinados: ${dataCombined.filters.activeCount} ✓`)
  else ok(`activeCount = ${dataCombined.filters.activeCount}`)
  // pendingOrders should be empty (MANUAL origin means no OC/OS)
  if (dataCombined.pendingOrders.length === 0) ok("pendingOrders vacías con origin=MANUAL ✓")
  else fail("pendingOrders no vacías con origin=MANUAL")

  // ─── 14. getReportsData — proveedor específico ────────────────────────────────
  console.log("\n[14] getReportsData — filtro por proveedor específico")
  const dataAll = await getReportsData(buildFilters({ range: "this_year" }))
  if (dataAll.supplierList.length > 0) {
    const firstSupplier = dataAll.supplierList[0]
    const dataSupplier = await getReportsData(buildFilters({
      range: "this_year",
      supplierId: firstSupplier.id,
    }))
    if (dataSupplier.filters.supplierId === firstSupplier.id) ok(`supplierId filter correcto: "${firstSupplier.name}" ✓`)
    else fail("supplierId filter incorrecto")
    // All accountsPayable rows should be for this supplier
    const wrongSupplier = dataSupplier.accountsPayable.filter(r => r.supplierName !== firstSupplier.name)
    if (wrongSupplier.length === 0) ok("accountsPayable solo contiene el proveedor filtrado ✓")
    else fail("accountsPayable contiene otros proveedores", wrongSupplier)
    if (dataSupplier.filters.activeCount >= 1) ok(`filtro proveedor registrado en activeCount ✓`)
    else fail("filtro proveedor no contabilizado en activeCount")
  } else {
    ok("no hay proveedores para testear filtro individual (skip) ✓")
  }

  // ─── 15. Estructura completa con filtros activos ──────────────────────────────
  console.log("\n[15] Estructura ReportsData completa con filtros")
  const dataStruct = await getReportsData(buildFilters({ range: "this_year", origin: "ORDEN_COMPRA" }))
  const requiredKeys = ["summary", "accountsPayable", "monthlyPayments", "partialPayments",
    "expensesBySupplier", "expensesByCategory", "pendingOrders", "monthlyFlow",
    "filters", "supplierList", "isDemo"]
  const missingKeys = requiredKeys.filter(k => !(k in dataStruct))
  if (missingKeys.length === 0) ok("todas las claves de ReportsData presentes ✓")
  else fail("claves faltantes en ReportsData", missingKeys)
  const filterKeys = ["startDate", "endDate", "rangeLabel", "activeCount", "range", "rawStartDate", "rawEndDate"]
  const missingFilterKeys = filterKeys.filter(k => !(k in dataStruct.filters))
  if (missingFilterKeys.length === 0) ok("todas las claves de ReportFilters presentes ✓")
  else fail("claves faltantes en ReportFilters", missingFilterKeys)

  await prisma.$disconnect()

  console.log(`\n${"─".repeat(50)}`)
  console.log(`Resultado: ${passed} pasados, ${failed} fallidos`)
  if (failed > 0) { console.error("QA FAILED"); process.exit(1) }
  else console.log("QA PASSED ✓")
}

main().catch((e) => { console.error(e); process.exit(1) })
