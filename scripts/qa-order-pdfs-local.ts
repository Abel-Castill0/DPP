/**
 * QA autenticado completo para endpoints PDF de OC y OS.
 * Crea un JWT de sesión directamente (sin contraseña) y testea contra localhost.
 * No imprime secretos. No commitear PDFs generados.
 * Uso: BASE_URL=http://localhost:3001 npx tsx scripts/qa-order-pdfs-local.ts
 */
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.claude.local", override: true })
dotenv.config({ path: ".env.local",        override: true })
dotenv.config({ path: ".env" })

// Dynamic imports AFTER dotenv so DATABASE_URL and AUTH_SECRET are available
import { createSessionToken } from "../lib/auth"

const BASE = process.env.BASE_URL ?? "http://localhost:3001"
let passed = 0
let failed = 0

function ok(label: string, detail = "") {
  console.log(`  ✓  ${label}${detail ? " — " + detail : ""}`)
  passed++
}

function fail(label: string, detail = "") {
  console.log(`  ✗  ${label}${detail ? " — " + detail : ""}`)
  failed++
}

async function checkHttp(
  label: string,
  url: string,
  opts: { headers?: Record<string, string>; expectedStatus: number; expectPdf?: boolean }
) {
  const res = await fetch(url, { headers: opts.headers ?? {}, redirect: "manual" })
  const status = res.status

  if (status !== opts.expectedStatus) {
    fail(label, `status ${status} (esperado ${opts.expectedStatus})`)
    return null
  }

  if (opts.expectPdf) {
    const ct = res.headers.get("content-type") ?? ""
    const cd = res.headers.get("content-disposition") ?? ""
    const buf = Buffer.from(await res.arrayBuffer())
    const magic = buf.slice(0, 5).toString("ascii")

    if (!ct.includes("application/pdf")) {
      fail(label, `Content-Type "${ct}" (esperado application/pdf)`)
      return null
    }
    if (!magic.startsWith("%PDF")) {
      fail(label, `magic bytes "${magic}" (esperado %PDF-)`)
      return null
    }
    ok(label, `${status} ${buf.length} bytes  magic: ${magic}  CD: ${cd.slice(0, 50)}`)
    return buf
  }

  ok(label, `status ${status}`)
  return null
}

// ── Extract text check from PDF buffer ────────────────────────────────────────

function containsText(buf: Buffer, ...terms: string[]): boolean {
  const raw = buf.toString("latin1")
  return terms.every((t) => raw.includes(t))
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════")
  console.log("  qa-order-pdfs-local — DPP Control")
  console.log(`  Base URL: ${BASE}`)
  console.log("═══════════════════════════════════════════════")

  // ── 1. Get real order IDs from DB ──────────────────────────────────────────

  console.log("\n── 1. Obtener IDs reales de BD ─────────────────────")
  let ocId: string | null = null
  let osId: string | null = null
  let ocNum = "—"
  let osNum = "—"

  if (!process.env.DATABASE_URL) {
    console.log("  ⚠  Sin DATABASE_URL — tests de BD omitidos")
  } else {
    // Import prisma AFTER dotenv so DATABASE_URL is set
    const { prisma } = await import("../lib/prisma")
    const oc = await prisma.purchaseOrder.findFirst({
      where: { isVoid: false },
      select: { id: true, orderNumber: true },
      orderBy: { issueDate: "desc" },
    })
    const os = await prisma.serviceOrder.findFirst({
      where: { isVoid: false },
      select: { id: true, orderNumber: true },
      orderBy: { issueDate: "desc" },
    })
    if (oc) { ocId = oc.id; ocNum = oc.orderNumber; console.log(`  OC: ${ocNum} (id: ${ocId.slice(0, 8)}...)`) }
    else console.log("  ⚠  No hay OC en BD")
    if (os) { osId = os.id; osNum = os.orderNumber; console.log(`  OS: ${osNum} (id: ${osId.slice(0, 8)}...)`) }
    else console.log("  ⚠  No hay OS en BD")
  }

  // ── 2. Crear token de sesión de prueba (sin contraseña) ────────────────────

  console.log("\n── 2. Crear token de sesión de prueba ──────────────")
  const token = await createSessionToken({ sub: "qa-test-user", email: "qa@dpp.local", role: "ADMIN" })
  const authHeaders = { Cookie: `dpp-session=${token}` }
  console.log("  Token creado (primeros 20 chars): " + token.slice(0, 20) + "...")

  // ── 3. QA sin sesión ───────────────────────────────────────────────────────

  console.log("\n── 3. QA sin sesión — debe devolver 401 ─────────────")
  await checkHttp("OC PDF sin sesión → 401", `${BASE}/api/purchase-orders/fake-id/pdf`, { expectedStatus: 401 })
  await checkHttp("OS PDF sin sesión → 401", `${BASE}/api/service-orders/fake-id/pdf`,  { expectedStatus: 401 })

  // ── 4. QA autenticado — páginas ────────────────────────────────────────────

  console.log("\n── 4. QA autenticado — páginas HTML ────────────────")
  await checkHttp("/purchase-orders → 200", `${BASE}/purchase-orders`, { headers: authHeaders, expectedStatus: 200 })
  await checkHttp("/service-orders → 200",  `${BASE}/service-orders`,  { headers: authHeaders, expectedStatus: 200 })

  // ── 5. QA PDF autenticado ──────────────────────────────────────────────────

  console.log("\n── 5. QA PDF autenticado ────────────────────────────")

  let ocBuf: Buffer | null = null
  let osBuf: Buffer | null = null

  if (ocId) {
    ocBuf = await checkHttp(
      `GET /api/purchase-orders/${ocNum}/pdf → 200+PDF`,
      `${BASE}/api/purchase-orders/${ocId}/pdf`,
      { headers: authHeaders, expectedStatus: 200, expectPdf: true }
    ) as Buffer | null
  } else {
    console.log("  ⚠  Sin OC en BD — test omitido")
  }

  if (osId) {
    osBuf = await checkHttp(
      `GET /api/service-orders/${osNum}/pdf → 200+PDF`,
      `${BASE}/api/service-orders/${osId}/pdf`,
      { headers: authHeaders, expectedStatus: 200, expectPdf: true }
    ) as Buffer | null
  } else {
    console.log("  ⚠  Sin OS en BD — test omitido")
  }

  // ── 6. Verificación textual mínima del PDF ─────────────────────────────────

  console.log("\n── 6. Verificación textual del PDF ─────────────────")

  if (ocBuf) {
    const hasTitle   = containsText(ocBuf, "ORDEN DE COMPRA")
    const hasNum     = containsText(ocBuf, ocNum)
    const hasDPP     = containsText(ocBuf, "DPP CONTROL")
    const hasFooter  = containsText(ocBuf, "OC")
    const hasSaldo   = containsText(ocBuf, "SALDO PENDIENTE")
    const hasFirma   = containsText(ocBuf, "Responsable DPP")
    ;[
      ["Título 'ORDEN DE COMPRA'", hasTitle],
      [`N° orden '${ocNum}'`,      hasNum  ],
      ["Header 'DPP CONTROL'",     hasDPP  ],
      ["Footer 'OC'",              hasFooter],
      ["'SALDO PENDIENTE'",        hasSaldo ],
      ["Bloque de firmas",         hasFirma ],
    ].forEach(([label, ok_]) => ok_ ? ok(`OC PDF: ${label}`) : fail(`OC PDF: ${label}`))
  }

  if (osBuf) {
    const hasTitle   = containsText(osBuf, "ORDEN DE SERVICIO")
    const hasNum     = containsText(osBuf, osNum)
    const hasDPP     = containsText(osBuf, "DPP CONTROL")
    const hasSaldo   = containsText(osBuf, "SALDO PENDIENTE")
    ;[
      ["Título 'ORDEN DE SERVICIO'", hasTitle],
      [`N° orden '${osNum}'`,        hasNum  ],
      ["Header 'DPP CONTROL'",       hasDPP  ],
      ["'SALDO PENDIENTE'",          hasSaldo ],
    ].forEach(([label, ok_]) => ok_ ? ok(`OS PDF: ${label}`) : fail(`OS PDF: ${label}`))
  }

  // ── 7. Verificar 404 para ID inexistente ───────────────────────────────────

  console.log("\n── 7. 404 para UUID inexistente ─────────────────────")
  const fakeUuid = "00000000-0000-0000-0000-000000000000"
  await checkHttp(`OC ID inexistente → 404`, `${BASE}/api/purchase-orders/${fakeUuid}/pdf`, { headers: authHeaders, expectedStatus: 404 })
  await checkHttp(`OS ID inexistente → 404`, `${BASE}/api/service-orders/${fakeUuid}/pdf`,  { headers: authHeaders, expectedStatus: 404 })

  // ── Resumen ────────────────────────────────────────────────────────────────

  console.log("\n═══════════════════════════════════════════════")
  console.log(`  RESULTADO: ${passed} ✓  ${failed} ✗`)
  console.log("═══════════════════════════════════════════════\n")

  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error("\n✗ ERROR:", err.message ?? err)
  process.exit(1)
})
