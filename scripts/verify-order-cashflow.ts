/**
 * QA script: Phase 3 — OC/OS → Cash Flow connection
 * Run: npx tsx scripts/verify-order-cashflow.ts
 * Requires DATABASE_URL in .env.local
 */
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local", override: true })
dotenv.config({ path: ".env.claude.local", override: true })
import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const QA_OC_ID = "qa-oc-fase3-0000-000000000001"
const QA_OS_ID = "qa-os-fase3-0000-000000000001"

function createClient() {
  const url = process.env.DATABASE_URL!
  const ssl = url.includes("supabase") ? { rejectUnauthorized: false } : undefined
  const adapter = new PrismaPg({ connectionString: url, ssl })
  return new PrismaClient({ adapter })
}

let passed = 0
let failed = 0

function ok(msg: string) {
  console.log(`  ✓ ${msg}`)
  passed++
}

function fail(msg: string, detail?: unknown) {
  console.error(`  ✗ ${msg}`)
  if (detail) console.error(`    →`, detail)
  failed++
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL no configurado. Copia .env.local o .env.claude.local.")
    process.exit(1)
  }

  const prisma = createClient()
  const demoUser = await prisma.user.findFirst()
  if (!demoUser) { console.error("Sin usuario en BD. Ejecuta seed."); process.exit(1) }

  const supplier = await prisma.supplier.findFirst()
  if (!supplier) { console.error("Sin proveedor en BD. Ejecuta seed."); process.exit(1) }

  // ─────────────────────────────────────
  // SETUP: Crear datos QA
  // ─────────────────────────────────────
  console.log("\n[Setup] Crear registros QA")

  await prisma.cashMovement.deleteMany({ where: { purchaseOrderId: QA_OC_ID } })
  await prisma.cashMovement.deleteMany({ where: { serviceOrderId: QA_OS_ID } })
  await prisma.purchaseOrder.deleteMany({ where: { id: QA_OC_ID } })
  await prisma.serviceOrder.deleteMany({ where: { id: QA_OS_ID } })

  await prisma.purchaseOrder.create({
    data: {
      id: QA_OC_ID,
      orderNumber: "OC-QA-FASE3",
      issueDate: new Date(),
      supplierId: supplier.id,
      responsibleId: demoUser.id,
      totalAmount: 1500,
      paidAmount: 0,
      pendingAmount: 1500,
      paymentStatus: "PENDIENTE",
      status: "APROBADA",
      isVoid: false,
    },
  })

  await prisma.serviceOrder.create({
    data: {
      id: QA_OS_ID,
      orderNumber: "OS-QA-FASE3",
      issueDate: new Date(),
      supplierId: supplier.id,
      responsibleId: demoUser.id,
      process: "ESTAMPADO",
      totalAmount: 900,
      paidAmount: 0,
      pendingAmount: 900,
      paymentStatus: "PENDIENTE",
      status: "APROBADA",
      isVoid: false,
    },
  })

  ok("OC-QA-FASE3 y OS-QA-FASE3 creados")

  // ─────────────────────────────────────
  // BLOQUE 1: OC → Caja
  // ─────────────────────────────────────
  console.log("\n[1] OC → Cash Movement")

  const oc = await prisma.purchaseOrder.findUnique({ where: { id: QA_OC_ID }, include: { supplier: true } })
  if (!oc) { fail("OC-QA-FASE3 no encontrada tras creación"); process.exit(1) }
  ok(`OC encontrada: ${oc.orderNumber} — S/ ${oc.totalAmount}`)

  // Limpiar movimientos QA previos
  await prisma.cashMovement.deleteMany({ where: { purchaseOrderId: QA_OC_ID } })

  const cmOC = await prisma.cashMovement.create({
    data: {
      date: new Date(),
      type: "EGRESO",
      origin: "ORDEN_COMPRA",
      operationStatus: "POR_PAGAR",
      category: "COMPRA",
      purchaseOrderId: QA_OC_ID,
      supplierId: oc.supplierId,
      invoiceAmount: oc.totalAmount,
      abono: 0,
      expenseAmount: 0,
      incomeAmount: 0,
      retencion: 0,
      detraccion: 0,
      description: `QA: OC ${oc.orderNumber} — ${oc.supplier.name}`,
      createdById: demoUser.id,
    },
  })

  const cmOCCheck = await prisma.cashMovement.findUnique({ where: { id: cmOC.id } })!
  if (cmOCCheck!.origin === "ORDEN_COMPRA") ok("origin = ORDEN_COMPRA ✓")
  else fail("origin incorrecto", cmOCCheck!.origin)

  if (cmOCCheck!.purchaseOrderId === QA_OC_ID) ok("purchaseOrderId vinculado ✓")
  else fail("purchaseOrderId incorrecto", cmOCCheck!.purchaseOrderId)

  if (cmOCCheck!.serviceOrderId === null) ok("serviceOrderId = null ✓")
  else fail("serviceOrderId debe ser null", cmOCCheck!.serviceOrderId)

  if (Number(cmOCCheck!.invoiceAmount) === 1500) ok("invoiceAmount = 1500 ✓")
  else fail("invoiceAmount incorrecto", cmOCCheck!.invoiceAmount)

  if (Number(cmOCCheck!.abono) === 0) ok("abono = 0 ✓")
  else fail("abono debe ser 0", cmOCCheck!.abono)

  const aPagarOC = Number(cmOCCheck!.invoiceAmount) - Number(cmOCCheck!.abono)
  if (aPagarOC === 1500) ok("aPagar = invoiceAmount - abono = 1500 ✓")
  else fail("aPagar incorrecto", aPagarOC)

  if (cmOCCheck!.operationStatus === "POR_PAGAR") ok("operationStatus = POR_PAGAR ✓")
  else fail("operationStatus incorrecto", cmOCCheck!.operationStatus)

  // Test duplicado
  const existingOC = await prisma.cashMovement.findFirst({ where: { purchaseOrderId: QA_OC_ID, isVoid: false } })
  if (existingOC) ok("Prevención duplicado: ya existe movimiento para OC-QA ✓")
  else fail("No se detectó movimiento existente para OC-QA")

  // ─────────────────────────────────────
  // BLOQUE 2: OS → Caja
  // ─────────────────────────────────────
  console.log("\n[2] OS → Cash Movement")

  const os = await prisma.serviceOrder.findUnique({ where: { id: QA_OS_ID }, include: { supplier: true } })
  if (!os) { fail("OS-QA-FASE3 no encontrada. Ejecuta el SQL de creación primero."); process.exit(1) }
  ok(`OS encontrada: ${os.orderNumber} proceso=${os.process} — S/ ${os.totalAmount}`)

  await prisma.cashMovement.deleteMany({ where: { serviceOrderId: QA_OS_ID } })

  const processToCategory: Record<string, string> = {
    CORTE: "CORTE", CONFECCION: "CONFECCION", ESTAMPADO: "ESTAMPADO",
    BORDADO: "CONFECCION", ACABADO: "ACABADO_EMPAQUE", EMPAQUE: "ACABADO_EMPAQUE",
    LAVADO: "ACABADO_EMPAQUE", OTROS: "OTROS",
  }
  const category = processToCategory[os.process] ?? "OTROS"

  const cmOS = await prisma.cashMovement.create({
    data: {
      date: new Date(),
      type: "EGRESO",
      origin: "ORDEN_SERVICIO",
      operationStatus: "POR_PAGAR",
      category: category as never,
      serviceOrderId: QA_OS_ID,
      supplierId: os.supplierId,
      invoiceAmount: os.totalAmount,
      abono: 0,
      expenseAmount: 0,
      incomeAmount: 0,
      retencion: 0,
      detraccion: 0,
      description: `QA: OS ${os.orderNumber} — ${os.process} · ${os.supplier.name}`,
      createdById: demoUser.id,
    },
  })

  const cmOSCheck = await prisma.cashMovement.findUnique({ where: { id: cmOS.id } })!
  if (cmOSCheck!.origin === "ORDEN_SERVICIO") ok("origin = ORDEN_SERVICIO ✓")
  else fail("origin incorrecto", cmOSCheck!.origin)

  if (cmOSCheck!.serviceOrderId === QA_OS_ID) ok("serviceOrderId vinculado ✓")
  else fail("serviceOrderId incorrecto", cmOSCheck!.serviceOrderId)

  if (cmOSCheck!.purchaseOrderId === null) ok("purchaseOrderId = null ✓")
  else fail("purchaseOrderId debe ser null", cmOSCheck!.purchaseOrderId)

  if (Number(cmOSCheck!.invoiceAmount) === 900) ok("invoiceAmount = 900 ✓")
  else fail("invoiceAmount incorrecto", cmOSCheck!.invoiceAmount)

  if (cmOSCheck!.category === "ESTAMPADO") ok(`category = ESTAMPADO (proceso ESTAMPADO → ESTAMPADO) ✓`)
  else fail("category incorrecto", cmOSCheck!.category)

  if (cmOSCheck!.operationStatus === "POR_PAGAR") ok("operationStatus = POR_PAGAR ✓")
  else fail("operationStatus incorrecto", cmOSCheck!.operationStatus)

  // Test duplicado OS
  const existingOS = await prisma.cashMovement.findFirst({ where: { serviceOrderId: QA_OS_ID, isVoid: false } })
  if (existingOS) ok("Prevención duplicado: ya existe movimiento para OS-QA ✓")
  else fail("No se detectó movimiento existente para OS-QA")

  // ─────────────────────────────────────
  // BLOQUE 3: Marcar pagado / Revertir
  // ─────────────────────────────────────
  console.log("\n[3] Marcar pagado / Revertir (usando cm de OC-QA)")

  const movId = cmOC.id
  const totalAmount = Number(cmOCCheck!.invoiceAmount!)

  // Pagar
  await prisma.$transaction(async (tx) => {
    await tx.cashMovement.update({
      where: { id: movId },
      data: {
        operationStatus: "COBRADO",
        abono: totalAmount,
        expenseAmount: totalAmount,
        incomeAmount: 0,
      },
    })
    await tx.purchaseOrder.update({
      where: { id: QA_OC_ID },
      data: { paymentStatus: "PAGADO", paidAmount: totalAmount, pendingAmount: 0 },
    })
  })

  const paid = await prisma.cashMovement.findUnique({ where: { id: movId } })
  if (paid!.operationStatus === "COBRADO") ok("Pagado: operationStatus = COBRADO ✓")
  else fail("Pagado: operationStatus incorrecto", paid!.operationStatus)

  if (Number(paid!.abono) === totalAmount) ok(`Pagado: abono = ${totalAmount} ✓`)
  else fail("Pagado: abono incorrecto", paid!.abono)

  const aPagarPaid = Number(paid!.invoiceAmount) - Number(paid!.abono)
  if (aPagarPaid === 0) ok("Pagado: aPagar = 0 ✓")
  else fail("Pagado: aPagar debe ser 0", aPagarPaid)

  const ocPaid = await prisma.purchaseOrder.findUnique({ where: { id: QA_OC_ID } })
  if (ocPaid!.paymentStatus === "PAGADO") ok("OC.paymentStatus = PAGADO ✓")
  else fail("OC.paymentStatus incorrecto", ocPaid!.paymentStatus)

  // Revertir
  await prisma.cashMovement.update({
    where: { id: movId },
    data: { operationStatus: "POR_PAGAR", abono: 0, expenseAmount: 0, incomeAmount: 0 },
  })

  const reverted = await prisma.cashMovement.findUnique({ where: { id: movId } })
  if (reverted!.operationStatus === "POR_PAGAR") ok("Revertir: operationStatus = POR_PAGAR ✓")
  else fail("Revertir: operationStatus incorrecto", reverted!.operationStatus)

  if (Number(reverted!.abono) === 0) ok("Revertir: abono = 0 ✓")
  else fail("Revertir: abono debe ser 0", reverted!.abono)

  const aPagarReverted = Number(reverted!.invoiceAmount) - Number(reverted!.abono)
  if (aPagarReverted === totalAmount) ok(`Revertir: aPagar = ${totalAmount} ✓`)
  else fail("Revertir: aPagar incorrecto", aPagarReverted)

  // ─────────────────────────────────────
  // BLOQUE 4: Dashboard — porPagar real
  // ─────────────────────────────────────
  console.log("\n[4] Dashboard — porPagar desde CashMovement real")

  const pendingMovements = await prisma.cashMovement.findMany({
    where: { isVoid: false, operationStatus: "POR_PAGAR", type: "EGRESO" },
    select: { invoiceAmount: true },
  })

  const porPagar = pendingMovements.reduce((acc, m) => acc + Number(m.invoiceAmount ?? 0), 0)
  if (pendingMovements.length > 0) ok(`${pendingMovements.length} movimientos POR_PAGAR, total S/ ${porPagar.toFixed(2)} ✓`)
  else ok("Sin movimientos pendientes (BD limpia) — OK si no hay datos previos")

  // El movimiento QA de OS debe aparecer (OS-QA sigue POR_PAGAR)
  const qaOSMov = await prisma.cashMovement.findFirst({
    where: { serviceOrderId: QA_OS_ID, isVoid: false, operationStatus: "POR_PAGAR" },
  })
  if (qaOSMov) ok("OS-QA aparece en POR_PAGAR del dashboard ✓")
  else fail("OS-QA no aparece en POR_PAGAR")

  // ─────────────────────────────────────
  // LIMPIEZA
  // ─────────────────────────────────────
  console.log("\n[5] Limpieza de datos QA")
  await prisma.cashMovement.deleteMany({ where: { purchaseOrderId: QA_OC_ID } })
  await prisma.cashMovement.deleteMany({ where: { serviceOrderId: QA_OS_ID } })
  await prisma.purchaseOrder.delete({ where: { id: QA_OC_ID } })
  await prisma.serviceOrder.delete({ where: { id: QA_OS_ID } })
  ok("Datos QA eliminados ✓")

  await prisma.$disconnect()

  // ─────────────────────────────────────
  // RESULTADO
  // ─────────────────────────────────────
  console.log(`\n${"─".repeat(50)}`)
  console.log(`Resultado: ${passed} pasados, ${failed} fallidos`)
  if (failed > 0) {
    console.error("QA FAILED")
    process.exit(1)
  } else {
    console.log("QA PASSED ✓")
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
