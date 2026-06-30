/**
 * QA script: Phase 8A — OC/OS edit and cancellation
 * Run: npx tsx scripts/verify-order-edit-cancel.ts
 * Requires DATABASE_URL in .env.local
 */
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local", override: true })
dotenv.config({ path: ".env.claude.local", override: true })

async function main() {
  const { PrismaClient } = await import("../lib/generated/prisma/client")
  const { PrismaPg } = await import("@prisma/adapter-pg")
  const { getPurchaseOrderDetail } = await import("../lib/data/purchase-orders")
  const { getServiceOrderDetail } = await import("../lib/data/service-orders")

  if (!process.env.DATABASE_URL) {
    console.error("❌  DATABASE_URL not set. Configure .env.local first.")
    process.exit(1)
  }

  const url = process.env.DATABASE_URL!
  const ssl = url.includes("supabase") ? { rejectUnauthorized: false } : undefined
  const adapter = new PrismaPg({ connectionString: url, ssl })
  const prisma = new PrismaClient({ adapter })

  let passed = 0
  let failed = 0

  function ok(msg: string) { console.log(`  ✓ ${msg}`); passed++ }
  function fail(msg: string, detail?: unknown) {
    console.error(`  ✗ ${msg}`)
    if (detail !== undefined) console.error(`    →`, detail)
    failed++
  }

  const QA_PREFIX = "qa-8a-"

  async function cleanup() {
    await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { orderNumber: { startsWith: QA_PREFIX } } } })
    await prisma.serviceOrderItem.deleteMany({ where: { serviceOrder: { orderNumber: { startsWith: QA_PREFIX } } } })
    await prisma.purchaseOrder.deleteMany({ where: { orderNumber: { startsWith: QA_PREFIX } } })
    await prisma.serviceOrder.deleteMany({ where: { orderNumber: { startsWith: QA_PREFIX } } })
  }

  // ─── Setup ────────────────────────────────────────────────────────────────
  console.log("\n=== Phase 8A QA: Order Edit & Cancel ===\n")
  console.log("[ Setup ]")

  await cleanup()

  const demoUser = await prisma.user.findFirst()
  if (!demoUser) { console.error("No demo user. Run seed first."); process.exit(1) }

  const supplier = await prisma.supplier.findFirst()
  if (!supplier) { console.error("No supplier. Run seed first."); process.exit(1) }

  // Create test OC (no CashMovement)
  const oc = await prisma.purchaseOrder.create({
    data: {
      orderNumber: `${QA_PREFIX}oc-001`,
      supplierId: supplier.id,
      responsibleId: demoUser.id,
      issueDate: new Date("2026-01-10"),
      totalAmount: 500,
      paidAmount: 0,
      pendingAmount: 500,
      items: {
        create: [{ description: "Tela azul", quantity: 10, unit: "M", unitPrice: 50, subtotal: 500 }],
      },
    },
  })
  ok(`OC test created: ${oc.orderNumber}`)

  // Create test OS (no CashMovement)
  const os = await prisma.serviceOrder.create({
    data: {
      orderNumber: `${QA_PREFIX}os-001`,
      supplierId: supplier.id,
      responsibleId: demoUser.id,
      process: "CORTE",
      issueDate: new Date("2026-01-10"),
      totalAmount: 300,
      paidAmount: 0,
      pendingAmount: 300,
      items: {
        create: [{ description: "Corte de tela", quantity: 100, unit: "M", unitPrice: 3, subtotal: 300 }],
      },
    },
  })
  ok(`OS test created: ${os.orderNumber}`)

  // ─── Data layer: getPurchaseOrderDetail ───────────────────────────────────
  console.log("\n[ getPurchaseOrderDetail ]")
  const ocDetail = await getPurchaseOrderDetail(oc.id)
  if (!ocDetail) { fail("getPurchaseOrderDetail returned null"); process.exit(1) }
  ok("Returns non-null detail")
  ocDetail.canEditFinancial ? ok("canEditFinancial=true (no CashMovement)") : fail("Expected canEditFinancial=true")
  ocDetail.canCancel ? ok("canCancel=true (not ANULADA, no payments)") : fail("Expected canCancel=true")
  ocDetail.hasCashMovement === false ? ok("hasCashMovement=false") : fail("Expected hasCashMovement=false")
  ocDetail.items.length > 0 ? ok(`Items loaded: ${ocDetail.items.length}`) : fail("No items loaded")

  // ─── Data layer: getServiceOrderDetail ───────────────────────────────────
  console.log("\n[ getServiceOrderDetail ]")
  const osDetail = await getServiceOrderDetail(os.id)
  if (!osDetail) { fail("getServiceOrderDetail returned null"); process.exit(1) }
  ok("Returns non-null detail")
  osDetail.canEditFinancial ? ok("canEditFinancial=true") : fail("Expected canEditFinancial=true")
  osDetail.process === "CORTE" ? ok("process field correct") : fail(`Expected CORTE, got ${osDetail.process}`)

  // ─── updatePurchaseOrder (no CashMovement) ───────────────────────────────
  console.log("\n[ updatePurchaseOrder — no CashMovement ]")
  const { updatePurchaseOrder } = await import("../app/actions/purchase-orders")

  function isNextServerError(e: unknown): boolean {
    const msg = e instanceof Error ? e.message : String(e)
    return msg.includes("NEXT_REDIRECT") || msg.includes("static generation store missing")
  }

  try {
    await updatePurchaseOrder(oc.id, {
      issueDate: "2026-01-15",
      notes: "Updated via QA",
      lines: [
        { description: "Tela roja", quantity: 5, unit: "M", unitPrice: 80 },
        { description: "Botones", quantity: 200, unit: "UND", unitPrice: 0.5 },
      ],
    })
    fail("Expected redirect (NEXT_REDIRECT), got non-error result")
  } catch (e: unknown) {
    if (isNextServerError(e)) {
      ok("updatePurchaseOrder: DB committed, Next.js APIs threw as expected outside request context")
    } else {
      fail("updatePurchaseOrder threw unexpected error", e instanceof Error ? e.message : e)
    }
  }

  // Verify items were updated
  const ocAfterEdit = await prisma.purchaseOrder.findUnique({
    where: { id: oc.id },
    include: { items: true },
  })
  if (!ocAfterEdit) { fail("OC not found after update"); }
  else {
    ocAfterEdit.items.length === 2 ? ok("Items replaced: 2 new items") : fail(`Expected 2 items, got ${ocAfterEdit.items.length}`)
    const newTotal = 5 * 80 + 200 * 0.5
    Number(ocAfterEdit.totalAmount) === newTotal ? ok(`Total updated to ${newTotal}`) : fail(`Expected total ${newTotal}, got ${ocAfterEdit.totalAmount}`)
    ocAfterEdit.notes === "Updated via QA" ? ok("Notes updated") : fail(`Notes not updated: ${ocAfterEdit.notes}`)
  }

  // ─── updateServiceOrder ───────────────────────────────────────────────────
  console.log("\n[ updateServiceOrder — no CashMovement ]")
  const { updateServiceOrder } = await import("../app/actions/service-orders")

  try {
    await updateServiceOrder(os.id, {
      issueDate: "2026-01-20",
      process: "CONFECCION",
      lines: [{ description: "Confección de pantalón", quantity: 50, unit: "UND", unitPrice: 8 }],
    })
    fail("Expected redirect (NEXT_REDIRECT)")
  } catch (e: unknown) {
    if (isNextServerError(e)) {
      ok("updateServiceOrder: DB committed, Next.js APIs threw as expected outside request context")
    } else {
      fail("updateServiceOrder threw unexpected error", e instanceof Error ? e.message : e)
    }
  }

  const osAfterEdit = await prisma.serviceOrder.findUnique({ where: { id: os.id } })
  if (!osAfterEdit) { fail("OS not found after update") }
  else {
    osAfterEdit.process === "CONFECCION" ? ok("Process updated to CONFECCION") : fail(`Expected CONFECCION, got ${osAfterEdit.process}`)
  }

  // ─── Block update on ANULADA ──────────────────────────────────────────────
  console.log("\n[ Block edit/cancel on ANULADA ]")

  // Create an already-anulada OC to test blocking
  const ocAnulada = await prisma.purchaseOrder.create({
    data: {
      orderNumber: `${QA_PREFIX}oc-anulada`,
      supplierId: supplier.id,
      responsibleId: demoUser.id,
      issueDate: new Date("2026-01-01"),
      totalAmount: 100,
      paidAmount: 0,
      pendingAmount: 100,
      status: "ANULADA",
      items: { create: [{ description: "Test", quantity: 1, unit: "UND", unitPrice: 100, subtotal: 100 }] },
    },
  })

  const editAulada = await updatePurchaseOrder(ocAnulada.id, {
    issueDate: "2026-01-01",
    lines: [{ description: "X", quantity: 1, unit: "UND", unitPrice: 1 }],
  })
  "error" in editAulada ? ok(`Edit ANULADA blocked: ${editAulada.error}`) : fail("Should block editing ANULADA order")

  // ─── cancelPurchaseOrder ──────────────────────────────────────────────────
  console.log("\n[ cancelPurchaseOrder ]")
  const { cancelPurchaseOrder } = await import("../app/actions/purchase-orders")

  // Block without reason
  const noReasonRes = await cancelPurchaseOrder(oc.id, "")
  "error" in noReasonRes ? ok(`Empty reason blocked: ${noReasonRes.error}`) : fail("Should block empty reason")

  // Successful cancel — revalidatePath throws outside request context, but DB commits first
  let cancelOk = false
  try {
    const cancelRes = await cancelPurchaseOrder(oc.id, "QA: orden de prueba")
    cancelOk = "success" in cancelRes
  } catch (e: unknown) {
    cancelOk = isNextServerError(e)
  }
  cancelOk ? ok("cancelPurchaseOrder: DB committed (Next.js APIs threw outside request context)") : fail("cancelPurchaseOrder failed unexpectedly")

  const ocCancelled = await prisma.purchaseOrder.findUnique({ where: { id: oc.id } })
  ocCancelled?.status === "ANULADA" ? ok("OC status = ANULADA") : fail(`Expected ANULADA, got ${ocCancelled?.status}`)
  ocCancelled?.voidReason === "QA: orden de prueba" ? ok("voidReason stored") : fail(`voidReason missing: ${ocCancelled?.voidReason}`)

  // ─── cancelServiceOrder ───────────────────────────────────────────────────
  console.log("\n[ cancelServiceOrder ]")
  const { cancelServiceOrder } = await import("../app/actions/service-orders")

  let cancelOsOk = false
  try {
    const cancelOsRes = await cancelServiceOrder(os.id, "QA: orden de servicio de prueba")
    cancelOsOk = "success" in cancelOsRes
  } catch (e: unknown) {
    cancelOsOk = isNextServerError(e)
  }
  cancelOsOk ? ok("cancelServiceOrder: DB committed") : fail("cancelServiceOrder failed unexpectedly")

  const osCancelled = await prisma.serviceOrder.findUnique({ where: { id: os.id } })
  osCancelled?.status === "ANULADA" ? ok("OS status = ANULADA") : fail(`Expected ANULADA, got ${osCancelled?.status}`)

  // ─── canEditFinancial=false when CashMovement exists ─────────────────────
  console.log("\n[ canEditFinancial blocked by CashMovement ]")

  const ocWithCM = await prisma.purchaseOrder.create({
    data: {
      orderNumber: `${QA_PREFIX}oc-with-cm`,
      supplierId: supplier.id,
      responsibleId: demoUser.id,
      issueDate: new Date("2026-01-05"),
      totalAmount: 200,
      paidAmount: 0,
      pendingAmount: 200,
      items: { create: [{ description: "Insumo", quantity: 2, unit: "KG", unitPrice: 100, subtotal: 200 }] },
      cashMovements: {
        create: [{
          date: new Date("2026-01-05"),
          type: "EGRESO",
          origin: "ORDEN_COMPRA",
          operationStatus: "POR_PAGAR",
          category: "COMPRA",
          supplierId: supplier.id,
          invoiceAmount: 200,
          abono: 0,
          expenseAmount: 0,
          incomeAmount: 0,
          retencion: 0,
          detraccion: 0,
          description: "OC-QA test CashMovement",
          createdById: demoUser.id,
          isVoid: false,
        }],
      },
    },
  })

  const detailWithCM = await getPurchaseOrderDetail(ocWithCM.id)
  if (!detailWithCM) { fail("getPurchaseOrderDetail returned null for OC with CM") }
  else {
    detailWithCM.hasCashMovement ? ok("hasCashMovement=true") : fail("Expected hasCashMovement=true")
    !detailWithCM.canEditFinancial ? ok("canEditFinancial=false (has CashMovement)") : fail("Expected canEditFinancial=false")

    // Try to change supplier — should be blocked
    let supplierChangeBlocked = false
    try {
      const res = await updatePurchaseOrder(ocWithCM.id, {
        supplierId: supplier.id,
        issueDate: "2026-01-05",
        lines: [{ description: "Insumo", quantity: 2, unit: "KG", unitPrice: 100 }],
      })
      supplierChangeBlocked = "error" in res
      if (supplierChangeBlocked) ok(`Supplier change blocked: ${(res as { error: string }).error}`)
      else fail("Expected supplier change to be blocked but got success redirect")
    } catch (e: unknown) {
      // A redirect here means the update went through (not blocked) — that's a test failure
      fail("updatePurchaseOrder threw unexpectedly for CM-locked order", e instanceof Error ? e.message : e)
    }
  }

  // ─── canCancel=false when has payments ───────────────────────────────────
  console.log("\n[ canCancel blocked by payments ]")

  const ocPaid = await prisma.purchaseOrder.create({
    data: {
      orderNumber: `${QA_PREFIX}oc-paid`,
      supplierId: supplier.id,
      responsibleId: demoUser.id,
      issueDate: new Date("2026-01-05"),
      totalAmount: 100,
      paidAmount: 50,
      pendingAmount: 50,
      items: { create: [{ description: "Pago parcial", quantity: 1, unit: "UND", unitPrice: 100, subtotal: 100 }] },
    },
  })

  const detailPaid = await getPurchaseOrderDetail(ocPaid.id)
  if (!detailPaid) { fail("getPurchaseOrderDetail returned null for paid OC") }
  else {
    !detailPaid.canCancel ? ok("canCancel=false (has payments)") : fail("Expected canCancel=false when paidAmount > 0")
  }

  // Cancel should be blocked too — cancelPurchaseOrder returns { error } (no revalidatePath on error path)
  const cancelPaidRes = await cancelPurchaseOrder(ocPaid.id, "Test reason")
  "error" in cancelPaidRes ? ok(`Cancel with payments blocked: ${cancelPaidRes.error}`) : fail("Should block cancel when paidAmount > 0")

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  console.log("\n[ Cleanup ]")
  await cleanup()
  ok("QA data cleaned up")

  await prisma.$disconnect()

  // ─── Result ───────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(50)}`)
  console.log(`Resultado: ${passed} ✓  ${failed} ✗  de ${passed + failed} checks`)
  if (failed === 0) {
    console.log("✅  Fase 8A — OC/OS Edit & Cancel: TODOS LOS CHECKS PASADOS\n")
    process.exit(0)
  } else {
    console.log("❌  Hay checks fallidos. Revisa los errores arriba.\n")
    process.exit(1)
  }
}

main().catch((e) => {
  console.error("Fatal:", e)
  process.exit(1)
})
