import "dotenv/config"
import { generatePurchaseOrderPdf, generateServiceOrderPdf } from "../lib/pdf/order-pdf"

const PROD_URL = "https://dpp-pink.vercel.app"

// ── Local PDF generation tests (no DB) ────────────────────────────────────────

async function testLocalGeneration() {
  console.log("\n── Local PDF generation ─────────────────────────────────")

  const baseOc = {
    orderNumber:   "OC-VERIFY-001",
    issueDate:     "2026-06-28",
    expectedDate:  "2026-07-05",
    status:        "EMITIDA",
    paymentStatus: "PENDIENTE",
    totalAmount:   1250.00,
    paidAmount:    0,
    pendingAmount: 1250.00,
    notes:         null,
    supplier:      { name: "Textiles Lima SAC", ruc: "20123456789", address: "Jr. Gamarra 123, Lima" },
    responsible:   { name: "Admin DPP" },
  }

  // OC con ítems
  const ocPdf = await generatePurchaseOrderPdf({
    ...baseOc,
    items: [
      { description: "Tela jersey blanca 30/1", quantity: 100, unit: "MTS", unitPrice: 12.50, subtotal: 1250.00 },
    ],
  })
  const ocMagic = Buffer.from(ocPdf.slice(0, 5)).toString()
  if (!ocMagic.startsWith("%PDF")) throw new Error(`OC: magic incorrecto — "${ocMagic}"`)
  console.log(`  [OC con ítems]     ✓  ${ocPdf.length} bytes  magic: ${ocMagic}`)

  // OC sin ítems — no debe lanzar error
  const ocEmptyPdf = await generatePurchaseOrderPdf({ ...baseOc, items: [], totalAmount: 0, pendingAmount: 0 })
  if (!Buffer.from(ocEmptyPdf.slice(0, 5)).toString().startsWith("%PDF")) throw new Error("OC vacío: magic incorrecto")
  console.log(`  [OC sin ítems]     ✓  ${ocEmptyPdf.length} bytes`)

  // OC con notas
  const ocNotesPdf = await generatePurchaseOrderPdf({
    ...baseOc,
    notes: "Entrega en almacén. Coordinar con logística.",
    items: [{ description: "Hilo ne 30/1 blanco", quantity: 50, unit: "CJA", unitPrice: 25.00, subtotal: 1250.00 }],
  })
  console.log(`  [OC con notas]     ✓  ${ocNotesPdf.length} bytes`)

  // OS
  const osPdf = await generateServiceOrderPdf({
    ...baseOc,
    orderNumber:   "OS-VERIFY-001",
    process:       "CONFECCION",
    proformaCode:  "PRF-2026-001",
    style:         { code: "ST-001", name: "Polo Básico Manga Corta" },
    items: [
      { description: "Confección polo básico", quantity: 500, unit: "UND", unitPrice: 3.50, subtotal: 1750.00 },
      { description: "Acabado y empaque",       quantity: 500, unit: "UND", unitPrice: 0.50, subtotal:  250.00 },
    ],
    totalAmount:   2000.00,
    pendingAmount: 2000.00,
  })
  if (!Buffer.from(osPdf.slice(0, 5)).toString().startsWith("%PDF")) throw new Error("OS: magic incorrecto")
  console.log(`  [OS con estilo]    ✓  ${osPdf.length} bytes`)

  // OS sin estilo ni proforma
  const osMinPdf = await generateServiceOrderPdf({
    ...baseOc,
    orderNumber:  "OS-VERIFY-002",
    process:      "CORTE",
    proformaCode: null,
    style:        null,
    items:        [],
    totalAmount:  0,
    pendingAmount: 0,
  })
  console.log(`  [OS mínimo]        ✓  ${osMinPdf.length} bytes`)
}

// ── HTTP endpoint tests (against production) ───────────────────────────────────

async function testEndpoints() {
  console.log("\n── HTTP endpoint tests (producción) ────────────────────")

  // 401 without session — purchase orders
  const r1 = await fetch(`${PROD_URL}/api/purchase-orders/fake-id/pdf`, { redirect: "manual" })
  if (r1.status !== 401) throw new Error(`/api/purchase-orders/fake-id/pdf sin auth: esperado 401, obtenido ${r1.status}`)
  console.log(`  [OC /pdf sin auth] ✓  401 No autorizado`)

  // 401 without session — service orders
  const r2 = await fetch(`${PROD_URL}/api/service-orders/fake-id/pdf`, { redirect: "manual" })
  if (r2.status !== 401) throw new Error(`/api/service-orders/fake-id/pdf sin auth: esperado 401, obtenido ${r2.status}`)
  console.log(`  [OS /pdf sin auth] ✓  401 No autorizado`)

  console.log("\n  Nota: Para QA autenticado proporciona una cookie de sesión válida")
  console.log("  y ejecuta: ADMIN_COOKIE=<valor> npx tsx scripts/verify-order-pdfs.ts --with-auth")
}

async function testAuthenticatedEndpoints(cookie: string) {
  console.log("\n── HTTP endpoint tests autenticados ────────────────────")

  const headers = { Cookie: `dpp-session=${cookie}` }

  // 404 for non-existent order
  const r404 = await fetch(`${PROD_URL}/api/purchase-orders/00000000-0000-0000-0000-000000000000/pdf`, { headers, redirect: "manual" })
  if (r404.status !== 404) throw new Error(`Esperado 404 para ID inexistente, obtenido ${r404.status}`)
  console.log(`  [OC 404]           ✓  404 para UUID inexistente`)

  // 404 for non-existent service order
  const r404s = await fetch(`${PROD_URL}/api/service-orders/00000000-0000-0000-0000-000000000000/pdf`, { headers, redirect: "manual" })
  if (r404s.status !== 404) throw new Error(`Esperado 404 para OS ID inexistente, obtenido ${r404s.status}`)
  console.log(`  [OS 404]           ✓  404 para UUID inexistente`)

  console.log("\n  Para testear PDF real: proporciona un ID de OC/OS válido en BD")
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════")
  console.log("  verify-order-pdfs — DPP Control")
  console.log("═══════════════════════════════════════════")

  await testLocalGeneration()
  await testEndpoints()

  const withAuth = process.argv.includes("--with-auth")
  const cookie = process.env.ADMIN_COOKIE
  if (withAuth && cookie) {
    await testAuthenticatedEndpoints(cookie)
  }

  console.log("\n✓ Todos los tests pasaron.\n")
}

main().catch((err) => {
  console.error("\n✗ FAIL:", err.message ?? err)
  process.exit(1)
})
