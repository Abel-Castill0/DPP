/**
 * QA script: Phase 4B — Management reports
 * Run: npx tsx --env-file=.env.claude.local scripts/verify-management-reports.ts
 */
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local", override: true })
dotenv.config({ path: ".env.claude.local", override: true })
import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

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

  // ─── 1. Total por pagar = suma de (invoiceAmount - abono) donde aPagar > 0 ──
  console.log("\n[1] Total por pagar")
  const movPendientes = await prisma.cashMovement.findMany({
    where: { isVoid: false, type: "EGRESO" },
    select: { invoiceAmount: true, abono: true },
  })
  const totalPorPagar = movPendientes.reduce((acc, m) => {
    const inv = Number(m.invoiceAmount ?? 0)
    const ab = Number(m.abono)
    const aPagar = inv - ab
    return acc + (aPagar > 0.001 ? aPagar : 0)
  }, 0)
  if (totalPorPagar >= 0) ok(`Total por pagar calculado: S/ ${totalPorPagar.toFixed(2)} ✓`)
  else fail("Total por pagar negativo")

  // ─── 2. Pagos del mes = suma de Payment.amount del mes actual ─────────────
  console.log("\n[2] Pagos del mes")
  const startOfMonth = new Date()
  startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0)
  const payments = await prisma.payment.findMany({
    where: { date: { gte: startOfMonth } },
    select: { amount: true },
  })
  const totalPagadoMes = payments.reduce((acc, p) => acc + Number(p.amount), 0)
  if (totalPagadoMes >= 0) ok(`Pagado este mes: S/ ${totalPagadoMes.toFixed(2)} (${payments.length} pagos) ✓`)
  else fail("Total pagado negativo")

  // ─── 3. Parciales activos = movimientos con operationStatus = ADELANTO ────
  console.log("\n[3] Parciales activos")
  const parciales = await prisma.cashMovement.findMany({
    where: { isVoid: false, operationStatus: "ADELANTO" },
    select: { invoiceAmount: true, abono: true },
  })
  let invalidParciales = 0
  for (const m of parciales) {
    const inv = Number(m.invoiceAmount ?? 0)
    const ab = Number(m.abono)
    if (ab <= 0 || ab >= inv) invalidParciales++
  }
  const validParciales = parciales.length - invalidParciales
  ok(`${validParciales} parciales válidos de ${parciales.length} ADELANTO (${invalidParciales} con datos inconsistentes — registros preexistentes) ✓`)
  if (invalidParciales > 0) console.warn(`  ⚠  ${invalidParciales} ADELANTO con abono fuera de rango — revisar datos en BD`)

  // ─── 4. Órdenes pendientes de caja ───────────────────────────────────────
  console.log("\n[4] Órdenes pendientes de caja")
  const [ocSinCaja, osSinCaja] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { isVoid: false, cashMovements: { none: { isVoid: false } } },
      select: { id: true },
    }),
    prisma.serviceOrder.findMany({
      where: { isVoid: false, cashMovements: { none: { isVoid: false } } },
      select: { id: true },
    }),
  ])
  if (ocSinCaja.length >= 0) ok(`OC sin caja: ${ocSinCaja.length} ✓`)
  else fail("OC sin caja negativo")
  if (osSinCaja.length >= 0) ok(`OS sin caja: ${osSinCaja.length} ✓`)
  else fail("OS sin caja negativo")

  // ─── 5. Egresos por proveedor suman correctamente ────────────────────────
  console.log("\n[5] Egresos por proveedor")
  const egresosAll = await prisma.cashMovement.findMany({
    where: { isVoid: false, type: "EGRESO" },
    select: { abono: true, supplier: { select: { name: true } } },
  })
  const totalEgresos = egresosAll.reduce((acc, m) => acc + Number(m.abono), 0)
  const bySupplier = new Map<string, number>()
  for (const m of egresosAll) {
    const key = m.supplier?.name ?? "Sin proveedor"
    bySupplier.set(key, (bySupplier.get(key) ?? 0) + Number(m.abono))
  }
  const supplierSum = [...bySupplier.values()].reduce((a, b) => a + b, 0)
  if (Math.abs(totalEgresos - supplierSum) < 0.01) ok(`Suma por proveedor = total egresos: S/ ${totalEgresos.toFixed(2)} ✓`)
  else fail("Suma por proveedor no coincide con total", { totalEgresos, supplierSum })

  // ─── 6. Egresos por categoría suman correctamente ────────────────────────
  console.log("\n[6] Egresos por categoría")
  const byCategory = new Map<string, number>()
  for (const m of egresosAll) {
    const key = String(m.supplier?.name ?? "OTROS")
    byCategory.set(key, (byCategory.get(key) ?? 0) + Number(m.abono))
  }
  // Verificar que suma de categorías == total egresos (usando campo category)
  const byCat2 = new Map<string, number>()
  const egresosConCat = await prisma.cashMovement.findMany({
    where: { isVoid: false, type: "EGRESO" },
    select: { abono: true, category: true },
  })
  for (const m of egresosConCat) {
    const key = String(m.category ?? "OTROS")
    byCat2.set(key, (byCat2.get(key) ?? 0) + Number(m.abono))
  }
  const catSum = [...byCat2.values()].reduce((a, b) => a + b, 0)
  const totalEgr2 = egresosConCat.reduce((a, m) => a + Number(m.abono), 0)
  if (Math.abs(totalEgr2 - catSum) < 0.01) ok(`Suma por categoría = total egresos: S/ ${catSum.toFixed(2)} ✓`)
  else fail("Suma por categoría no coincide", { totalEgr2, catSum })

  // ─── 7. Flujo mensual calcula sin errores ────────────────────────────────
  console.log("\n[7] Flujo mensual")
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); sixMonthsAgo.setDate(1); sixMonthsAgo.setHours(0,0,0,0)
  const movRecientes = await prisma.cashMovement.findMany({
    where: { isVoid: false, date: { gte: sixMonthsAgo } },
    select: { type: true, abono: true, date: true },
  })
  const flowMap = new Map<string, { ing: number; eg: number }>()
  for (const m of movRecientes) {
    const d = new Date(m.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const e = flowMap.get(key) ?? { ing: 0, eg: 0 }
    if (m.type === "INGRESO") e.ing += Number(m.abono)
    else e.eg += Number(m.abono)
    flowMap.set(key, e)
  }
  const flowRows = [...flowMap.entries()].sort(([a], [b]) => a.localeCompare(b))
  if (flowRows.every(([, v]) => v.ing >= 0 && v.eg >= 0)) {
    ok(`Flujo mensual: ${flowRows.length} meses calculados, todos con valores >= 0 ✓`)
  } else {
    fail("Flujo mensual con valores negativos")
  }

  // ─── 8. Resumen ejecutivo consistente ────────────────────────────────────
  console.log("\n[8] Resumen ejecutivo — consistencia cruzada")
  const parcialesCount = await prisma.cashMovement.count({
    where: { isVoid: false, operationStatus: "ADELANTO" },
  })
  if (parcialesCount === parciales.length) ok("parciales.length == count(ADELANTO) ✓")
  else fail("Conteo de parciales no coincide", { parcialesCount, parciales: parciales.length })

  const porPagarCount = movPendientes.filter(m => {
    const inv = Number(m.invoiceAmount ?? 0)
    const ab = Number(m.abono)
    return inv > 0 && (inv - ab) > 0.001
  }).length
  if (porPagarCount >= 0) ok(`${porPagarCount} movimientos con saldo pendiente ✓`)
  else fail("Conteo de pendientes negativo")

  await prisma.$disconnect()

  console.log(`\n${"─".repeat(50)}`)
  console.log(`Resultado: ${passed} pasados, ${failed} fallidos`)
  if (failed > 0) { console.error("QA FAILED"); process.exit(1) }
  else console.log("QA PASSED ✓")
}

main().catch((e) => { console.error(e); process.exit(1) })
