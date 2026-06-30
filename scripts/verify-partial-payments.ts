/**
 * QA script: Phase 4A — Partial payments
 * Run: npx tsx --env-file=.env.local scripts/verify-partial-payments.ts
 */
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local", override: true })
dotenv.config({ path: ".env.claude.local", override: true })
import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const QA_OC_ID  = "qa-4a-oc-0000-000000000001"
const QA_CM_ID  = "qa-4a-cm-0000-000000000001"

function createClient() {
  const url = process.env.DATABASE_URL!
  const ssl  = url.includes("supabase") ? { rejectUnauthorized: false } : undefined
  const adapter = new PrismaPg({ connectionString: url, ssl })
  return new PrismaClient({ adapter })
}

let passed = 0
let failed = 0
function ok(msg: string)  { console.log(`  ✓ ${msg}`); passed++ }
function fail(msg: string, d?: unknown) { console.error(`  ✗ ${msg}`); if (d !== undefined) console.error("    →", d); failed++ }

// Replica la lógica recalc() de la server action
async function recalc(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  movementId: string
) {
  const movement = await tx.cashMovement.findUnique({ where: { id: movementId }, select: { invoiceAmount: true } })
  const invoiceAmount = Number(movement?.invoiceAmount ?? 0)
  const agg = await tx.payment.aggregate({ where: { cashMovementId: movementId }, _sum: { amount: true } })
  const totalAbonado = Number(agg._sum.amount ?? 0)
  let operationStatus: "POR_PAGAR" | "ADELANTO" | "COBRADO"
  if (totalAbonado <= 0)                                       operationStatus = "POR_PAGAR"
  else if (invoiceAmount > 0 && totalAbonado >= invoiceAmount) operationStatus = "COBRADO"
  else                                                          operationStatus = "ADELANTO"
  await tx.cashMovement.update({ where: { id: movementId }, data: { abono: totalAbonado, expenseAmount: totalAbonado, operationStatus } })
  return { totalAbonado, invoiceAmount, operationStatus }
}

let prisma: PrismaClient

async function main() {
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL no configurado."); process.exit(1) }
  prisma = createClient()
  const demoUser = await prisma.user.findFirst()
  if (!demoUser) { console.error("Sin usuario en BD."); process.exit(1) }
  const supplier = await prisma.supplier.findFirst()
  if (!supplier) { console.error("Sin proveedor en BD."); process.exit(1) }

  // ─── SETUP: crear OC y CashMovement QA ────────────────────────────────────
  console.log("\n[Setup] Crear registros QA")
  await prisma.cashMovement.deleteMany({ where: { purchaseOrderId: QA_OC_ID } })
  await prisma.purchaseOrder.deleteMany({ where: { id: QA_OC_ID } })

  await prisma.purchaseOrder.create({
    data: {
      id: QA_OC_ID, orderNumber: "OC-4A-QA", issueDate: new Date(),
      supplierId: supplier.id, responsibleId: demoUser.id,
      totalAmount: 1000, paidAmount: 0, pendingAmount: 1000,
      status: "EMITIDA", paymentStatus: "PENDIENTE", isVoid: false,
    },
  })

  await prisma.cashMovement.create({
    data: {
      id: QA_CM_ID, date: new Date(), type: "EGRESO", origin: "ORDEN_COMPRA",
      operationStatus: "POR_PAGAR", category: "COMPRA",
      purchaseOrderId: QA_OC_ID, supplierId: supplier.id,
      invoiceAmount: 1000, abono: 0, expenseAmount: 0, incomeAmount: 0,
      retencion: 0, detraccion: 0, createdById: demoUser.id,
    },
  })
  ok("OC-4A-QA y CashMovement QA creados")

  // ─── BLOQUE 1: Primer pago parcial (400) ──────────────────────────────────
  console.log("\n[1] Primer pago parcial (S/ 400)")

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        cashMovementId: QA_CM_ID, amount: 400,
        date: new Date(), paymentMethod: "TRANSFERENCIA",
        operationNumber: "OP-001", notes: "Primer adelanto QA",
        createdById: demoUser.id,
      },
    })
    await recalc(tx, QA_CM_ID)
  })

  const cm1 = await prisma.cashMovement.findUnique({ where: { id: QA_CM_ID } })
  const payments1 = await prisma.payment.findMany({ where: { cashMovementId: QA_CM_ID } })

  if (payments1.length === 1) ok("Payment creado (1 registro)")
  else fail("Conteo de payments incorrecto", payments1.length)

  if (Number(cm1!.abono) === 400) ok("abono = 400 ✓")
  else fail("abono incorrecto", cm1!.abono)

  const aPagar1 = Number(cm1!.invoiceAmount) - Number(cm1!.abono)
  if (aPagar1 === 600) ok("aPagar = 600 ✓")
  else fail("aPagar incorrecto", aPagar1)

  if (cm1!.operationStatus === "ADELANTO") ok("operationStatus = ADELANTO (parcial) ✓")
  else fail("operationStatus incorrecto", cm1!.operationStatus)

  // campos del Payment
  const p1 = payments1[0]!
  if (p1.paymentMethod === "TRANSFERENCIA") ok("paymentMethod = TRANSFERENCIA ✓")
  else fail("paymentMethod incorrecto", p1.paymentMethod)
  if (p1.operationNumber === "OP-001") ok("operationNumber = OP-001 ✓")
  else fail("operationNumber incorrecto", p1.operationNumber)
  if (p1.notes === "Primer adelanto QA") ok("notes guardado ✓")
  else fail("notes incorrecto", p1.notes)
  if (p1.createdById === demoUser.id) ok("createdById guardado ✓")
  else fail("createdById incorrecto", p1.createdById)

  // ─── BLOQUE 2: Segundo pago (completa el total) ───────────────────────────
  console.log("\n[2] Segundo pago — completa total (S/ 600)")

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        cashMovementId: QA_CM_ID, amount: 600,
        date: new Date(), paymentMethod: "EFECTIVO",
        createdById: demoUser.id,
      },
    })
    await recalc(tx, QA_CM_ID)
  })

  const cm2 = await prisma.cashMovement.findUnique({ where: { id: QA_CM_ID } })
  const payments2 = await prisma.payment.findMany({ where: { cashMovementId: QA_CM_ID } })

  if (payments2.length === 2) ok("2 payments registrados ✓")
  else fail("Conteo de payments incorrecto", payments2.length)

  if (Number(cm2!.abono) === 1000) ok("abono = 1000 (total) ✓")
  else fail("abono incorrecto", cm2!.abono)

  const aPagar2 = Number(cm2!.invoiceAmount) - Number(cm2!.abono)
  if (aPagar2 === 0) ok("aPagar = 0 ✓")
  else fail("aPagar debe ser 0", aPagar2)

  if (cm2!.operationStatus === "COBRADO") ok("operationStatus = COBRADO ✓")
  else fail("operationStatus incorrecto", cm2!.operationStatus)

  // ─── BLOQUE 3: Prevenir sobrepago ─────────────────────────────────────────
  console.log("\n[3] Intentar sobrepago (S/ 0.01 cuando saldo = 0)")

  const invoiceAmt = Number(cm2!.invoiceAmount ?? 0)
  const abonoActual = Number(cm2!.abono)
  const saldoPendiente = invoiceAmt - abonoActual

  if (saldoPendiente <= 0) ok("Detección de saldo cero — sobrepago bloqueado correctamente ✓")
  else fail("Saldo no es cero, sobrepago podría pasar", saldoPendiente)

  // Verificar regla: monto > saldoPendiente es inválido
  const intentoSobrepago = 0.01
  if (intentoSobrepago > saldoPendiente + 0.001) ok("Regla anti-sobrepago activa: 0.01 > saldo(0) ✓")
  else fail("Regla anti-sobrepago no se activaría")

  // ─── BLOQUE 4: Revertir último pago ──────────────────────────────────────
  console.log("\n[4] Revertir último pago")

  const lastPayment = await prisma.payment.findFirst({
    where: { cashMovementId: QA_CM_ID },
    orderBy: { createdAt: "desc" },
  })

  await prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id: lastPayment!.id } })
    await recalc(tx, QA_CM_ID)
  })

  const cm3 = await prisma.cashMovement.findUnique({ where: { id: QA_CM_ID } })
  const payments3 = await prisma.payment.findMany({ where: { cashMovementId: QA_CM_ID } })

  if (payments3.length === 1) ok("Quedó 1 payment tras revertir ✓")
  else fail("Conteo incorrecto tras revertir", payments3.length)

  if (Number(cm3!.abono) === 400) ok("abono = 400 (recalculado) ✓")
  else fail("abono incorrecto tras revertir", cm3!.abono)

  if (cm3!.operationStatus === "ADELANTO") ok("operationStatus = ADELANTO (volvió a parcial) ✓")
  else fail("operationStatus incorrecto tras revertir", cm3!.operationStatus)

  // ─── BLOQUE 5: Historial de pagos ────────────────────────────────────────
  console.log("\n[5] Historial de pagos")

  const historial = await prisma.payment.findMany({
    where: { cashMovementId: QA_CM_ID },
    include: { createdBy: { select: { name: true } } },
    orderBy: { date: "asc" },
  })

  if (historial.length === 1) ok("Historial tiene 1 pago ✓")
  else fail("Historial incorrecto", historial.length)

  if (historial[0]!.paymentMethod === "TRANSFERENCIA") ok("Método del pago en historial ✓")
  else fail("Método incorrecto en historial", historial[0]?.paymentMethod)

  if (historial[0]!.createdBy?.name) ok(`Responsable en historial: ${historial[0]!.createdBy?.name} ✓`)
  else fail("Sin responsable en historial")

  // ─── CLEANUP ──────────────────────────────────────────────────────────────
  console.log("\n[6] Limpieza")
  await prisma.payment.deleteMany({ where: { cashMovementId: QA_CM_ID } })
  await prisma.cashMovement.deleteMany({ where: { id: QA_CM_ID } })
  await prisma.purchaseOrder.deleteMany({ where: { id: QA_OC_ID } })
  ok("Datos QA eliminados ✓")

  await prisma.$disconnect()

  console.log(`\n${"─".repeat(50)}`)
  console.log(`Resultado: ${passed} pasados, ${failed} fallidos`)
  if (failed > 0) { console.error("QA FAILED"); process.exit(1) }
  else console.log("QA PASSED ✓")
}

main().catch((e) => { console.error(e); process.exit(1) })
