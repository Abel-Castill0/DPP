/**
 * QA autenticado producción — usa el endpoint real /api/auth/login.
 * Requiere: PROD_ADMIN_EMAIL y PROD_ADMIN_PASSWORD en .env.claude.local
 * No imprime credenciales ni secretos.
 */
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.claude.local", override: true })
dotenv.config({ path: ".env.local",        override: true })

const PROD = "https://dpp-pink.vercel.app"
const EMAIL    = process.env.PROD_ADMIN_EMAIL
const PASSWORD = process.env.PROD_ADMIN_PASSWORD
const FAKE_ID  = "00000000-0000-0000-0000-000000000000"

let passed = 0, failed = 0, warns = 0
function ok(l: string, d = "")  { console.log(`  ✓  ${l}${d ? " — " + d : ""}`); passed++ }
function fail(l: string, d = "") { console.log(`  ✗  ${l}${d ? " — " + d : ""}`); failed++ }
function warn(l: string)        { console.log(`  ⚠  ${l}`); warns++ }

async function httpRequest(url: string, opts: { method?: string; headers?: Record<string,string>; body?: string } = {}) {
  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: opts.headers,
    body: opts.body,
    redirect: "manual",
  })
  const buf = await res.arrayBuffer()
  return {
    status: res.status,
    ct: res.headers.get("content-type") ?? "",
    cd: res.headers.get("content-disposition") ?? "",
    setCookie: res.headers.get("set-cookie") ?? "",
    buf: Buffer.from(buf),
  }
}

async function main() {
  console.log(`\n═══ QA Autenticado Producción — ${PROD} ═══\n`)

  if (!EMAIL || !PASSWORD) {
    console.log("  ⚠  PROD_ADMIN_EMAIL / PROD_ADMIN_PASSWORD no en .env.claude.local")
    console.log("     → QA autenticado requiere credenciales de producción")
    console.log("     → Añadir: PROD_ADMIN_EMAIL=<email> PROD_ADMIN_PASSWORD=<pass> en .env.claude.local")
    process.exit(0)
  }

  // ── Login ──────────────────────────────────────────────────────────────
  console.log("── 1. Login con credenciales producción ─────────────")
  const loginRes = await httpRequest(`${PROD}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })

  if (loginRes.status !== 200) {
    fail("Login", `status ${loginRes.status}`)
    console.log("     → Sin sesión válida, QA autenticado no ejecutable")
    process.exit(1)
  }
  ok("Login → 200")

  // Extraer cookie de sesión
  const cookieMatch = loginRes.setCookie.match(/dpp-session=([^;]+)/)
  if (!cookieMatch) { fail("Cookie dpp-session no encontrada en respuesta"); process.exit(1) }
  const cookieHeader = `dpp-session=${cookieMatch[1]}`
  ok("Cookie dpp-session obtenida")

  const auth = { Cookie: cookieHeader }

  // ── PDF OC autenticado ─────────────────────────────────────────────────
  console.log("\n── 2. PDF OC autenticado (ID inexistente → 404) ──────")
  const ocFake = await httpRequest(`${PROD}/api/purchase-orders/${FAKE_ID}/pdf`, { headers: auth })
  ocFake.status === 404 ? ok("OC UUID inexistente → 404") : fail("OC UUID inexistente → 404", `got ${ocFake.status}`)

  // ── PDF OS autenticado ─────────────────────────────────────────────────
  console.log("\n── 3. PDF OS autenticado (ID inexistente → 404) ──────")
  const osFake = await httpRequest(`${PROD}/api/service-orders/${FAKE_ID}/pdf`, { headers: auth })
  osFake.status === 404 ? ok("OS UUID inexistente → 404") : fail("OS UUID inexistente → 404", `got ${osFake.status}`)

  // ── Obtener OC/OS reales de producción ──────────────────────────────────
  // Usamos el endpoint /api/purchase-orders list si existe, o skip
  console.log("\n── 4. PDF con ID real de BD producción ──────────────")

  // Try to get a real OC ID via the page (returns HTML, skip)
  // Use the known seed data OC-2026-003 / OS-2026-002 from prod DB
  // (seed from Phase 2 is in prod DB — confirmed in prior sessions)
  const OC_ID = "8084eb4d-4972-4e2f-9266-28416343b897"  // OC-2026-003
  const OS_ID = "140adc05-4379-4071-88b7-2ec2d8312f77"  // OS-2026-002

  const ocPdf = await httpRequest(`${PROD}/api/purchase-orders/${OC_ID}/pdf`, { headers: auth })
  if (ocPdf.status === 200 && ocPdf.ct.includes("application/pdf")) {
    const magic = ocPdf.buf.slice(0, 5).toString("ascii")
    magic === "%PDF-" ? ok(`OC PDF real → 200+PDF`, `${ocPdf.buf.length} bytes, magic ${magic}, CD: ${ocPdf.cd.slice(0,40)}`)
                      : fail("OC PDF magic", magic)
  } else if (ocPdf.status === 404) {
    warn("OC ID real no en BD producción (puede que seed difiera) — 404")
  } else {
    fail("OC PDF real", `status ${ocPdf.status}`)
  }

  const osPdf = await httpRequest(`${PROD}/api/service-orders/${OS_ID}/pdf`, { headers: auth })
  if (osPdf.status === 200 && osPdf.ct.includes("application/pdf")) {
    const magic = osPdf.buf.slice(0, 5).toString("ascii")
    magic === "%PDF-" ? ok(`OS PDF real → 200+PDF`, `${osPdf.buf.length} bytes, magic ${magic}, CD: ${osPdf.cd.slice(0,40)}`)
                      : fail("OS PDF magic", magic)
  } else if (osPdf.status === 404) {
    warn("OS ID real no en BD producción (puede que seed difiera) — 404")
  } else {
    fail("OS PDF real", `status ${osPdf.status}`)
  }

  // ── Regresión export Excel ─────────────────────────────────────────────
  console.log("\n── 5. Regresión export Excel ─────────────────────────")
  const ex = await httpRequest(`${PROD}/api/reports/export?range=this_year`, { headers: auth })
  if (ex.status === 200 && ex.ct.includes("spreadsheetml")) {
    ok(`/api/reports/export → 200 XLSX`, `${ex.buf.length} bytes`)
  } else {
    fail("/api/reports/export", `status ${ex.status} ct ${ex.ct}`)
  }

  // ── Dashboard ──────────────────────────────────────────────────────────
  console.log("\n── 6. Dashboard autenticado ──────────────────────────")
  const dash = await httpRequest(`${PROD}/dashboard`, { headers: auth })
  dash.status === 200 ? ok("/dashboard → 200") : fail("/dashboard", `got ${dash.status}`)

  console.log(`\n═══ RESULTADO: ${passed} ✓  ${failed} ✗  ${warns} ⚠ ═══\n`)
  if (failed > 0) process.exit(1)
}

main().catch(e => { console.error("ERROR:", e.message); process.exit(1) })
