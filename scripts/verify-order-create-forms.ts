/**
 * QA: verifica que la creación de OC/OS funcione con proveedores reales de la BD.
 * Crea órdenes de prueba y las elimina al final.
 * No imprime secretos ni datos sensibles.
 */
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local", override: true })
dotenv.config({ path: ".env" })

let passed = 0, failed = 0
function ok(label: string, detail = "") { console.log(`  ✓  ${label}${detail ? " — " + detail : ""}`); passed++ }
function fail(label: string, detail = "") { console.log(`  ✗  ${label}${detail ? " — " + detail : ""}`); failed++ }

async function main() {
  const { prisma } = await import("../lib/prisma")

  console.log("\n═══ verify-order-create-forms ═══\n")

  // ── Prerequisitos ───────────────────────────────────────────────────────
  const supplier = await prisma.supplier.findFirst()
  if (!supplier) { fail("supplier en BD", "no hay proveedores — ejecuta el seed"); process.exit(1) }
  ok("supplier encontrado", `id=${supplier.id.slice(0, 8)}...`)

  const user = await prisma.user.findFirst()
  if (!user) { fail("user en BD", "no hay usuarios — ejecuta el seed"); process.exit(1) }
  ok("user encontrado")

  const today = new Date().toISOString().slice(0, 10)

  // ── Test 1: Crear OC con supplierId VÁLIDO ───────────────────────────────
  console.log("\n── 1. OC con proveedor válido ─────────────────────────")
  let ocId: string | null = null
  try {
    const year = new Date().getFullYear()
    const orderNumber = `OC-${year}-QA-${Date.now()}`
    const oc = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: supplier.id,
        responsibleId: user.id,
        issueDate: new Date(today),
        totalAmount: 100,
        paidAmount: 0,
        pendingAmount: 100,
        items: { create: [{ description: "QA item", quantity: 1, unit: "UND", unitPrice: 100, subtotal: 100 }] },
      },
    })
    ocId = oc.id
    ok("OC creada con proveedor válido", `orderNumber=${orderNumber}`)
  } catch (e) {
    fail("OC con proveedor válido", e instanceof Error ? e.message : String(e))
  }

  // ── Test 2: Crear OS con supplierId VÁLIDO ───────────────────────────────
  console.log("\n── 2. OS con proveedor válido ─────────────────────────")
  let osId: string | null = null
  try {
    const year = new Date().getFullYear()
    const orderNumber = `OS-${year}-QA-${Date.now()}`
    const os = await prisma.serviceOrder.create({
      data: {
        orderNumber,
        supplierId: supplier.id,
        responsibleId: user.id,
        process: "CORTE",
        issueDate: new Date(today),
        totalAmount: 200,
        paidAmount: 0,
        pendingAmount: 200,
        items: { create: [{ description: "QA servicio", quantity: 1, unit: "UND", unitPrice: 200, subtotal: 200 }] },
      },
    })
    osId = os.id
    ok("OS creada con proveedor válido", `orderNumber=${orderNumber}`)
  } catch (e) {
    fail("OS con proveedor válido", e instanceof Error ? e.message : String(e))
  }

  // ── Test 3: supplierId inválido (demo ID) → FK violation esperado ────────
  console.log("\n── 3. supplierId inválido → FK violation ──────────────")
  try {
    await prisma.purchaseOrder.create({
      data: {
        orderNumber: `OC-QA-INVALID-${Date.now()}`,
        supplierId: "sup-1",
        responsibleId: user.id,
        issueDate: new Date(today),
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
      },
    })
    fail("OC con ID inválido debería haber fallado con FK error")
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes("Foreign key") || msg.includes("foreign key") || msg.includes("constraint")) {
      ok("FK violation detectada correctamente con ID falso")
    } else {
      fail("Error distinto al esperado", msg.slice(0, 80))
    }
  }

  // ── Test 4: supplierId vacío → rechazado por acción antes de llegar a Prisma
  console.log("\n── 4. Validación server action — supplierId vacío ─────")
  const { createPurchaseOrder } = await import("../app/actions/purchase-orders")
  const r1 = await createPurchaseOrder({
    supplierId: "",
    issueDate: today,
    lines: [{ description: "test", quantity: 1, unit: "UND", unitPrice: 10 }],
  })
  if ("error" in r1) {
    ok("supplierId vacío rechazado antes de Prisma", r1.error)
  } else {
    fail("supplierId vacío no fue rechazado")
  }

  // ── Test 5: supplierId inválido → rechazado por validación en server action
  console.log("\n── 5. Validación server action — supplierId no existe ─")
  const r2 = await createPurchaseOrder({
    supplierId: "sup-1",
    issueDate: today,
    lines: [{ description: "test", quantity: 1, unit: "UND", unitPrice: 10 }],
  })
  if ("error" in r2 && r2.error.includes("no existe")) {
    ok("supplierId inválido rechazado por server action", r2.error)
  } else if ("error" in r2) {
    fail("Error distinto al esperado en server action", r2.error)
  } else {
    fail("ID inválido no fue rechazado por server action")
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────
  console.log("\n── Cleanup ────────────────────────────────────────────")
  if (ocId) {
    await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: ocId } })
    await prisma.purchaseOrder.delete({ where: { id: ocId } })
    ok("OC de prueba eliminada")
  }
  if (osId) {
    await prisma.serviceOrderItem.deleteMany({ where: { serviceOrderId: osId } })
    await prisma.serviceOrder.delete({ where: { id: osId } })
    ok("OS de prueba eliminada")
  }

  console.log(`\n═══ RESULTADO: ${passed} ✓  ${failed} ✗ ═══\n`)
  if (failed > 0) process.exit(1)
}

main().catch(e => { console.error("ERROR:", e.message); process.exit(1) })
