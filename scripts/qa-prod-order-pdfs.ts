/**
 * QA autenticado contra producción para PDFs OC/OS.
 * Crea token JWT con AUTH_SECRET local; funciona si coincide con Vercel.
 * Si difiere, los endpoints PDF dan 401 y se documenta como QA-manual.
 * No imprime secretos. No commitear PDFs.
 */
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.claude.local", override: true })
dotenv.config({ path: ".env.local",        override: true })
dotenv.config({ path: ".env" })

import * as https from "https"
import { createSessionToken } from "../lib/auth"

const PROD = process.env.PROD_URL ?? "https://dpp-pink.vercel.app"
let passed = 0, failed = 0
function ok(l: string, d = "")  { console.log(`  ✓  ${l}${d ? " — " + d : ""}`); passed++ }
function fail(l: string, d = "") { console.log(`  ✗  ${l}${d ? " — " + d : ""}`); failed++ }

function getStatus(url: string, headers: Record<string, string> = {}): Promise<{ status: number; ct: string; size: number; magic: string }> {
  return new Promise(resolve => {
    const opts = new URL(url)
    const req = https.request({
      hostname: opts.hostname, path: opts.pathname + opts.search,
      method: "GET", headers,
    }, (res) => {
      const status = res.statusCode ?? 0
      const ct = res.headers["content-type"] ?? ""
      const chunks: Buffer[] = []
      res.on("data", c => chunks.push(c))
      res.on("end", () => {
        const buf = Buffer.concat(chunks)
        resolve({ status, ct, size: buf.length, magic: buf.slice(0, 5).toString("ascii") })
      })
    })
    req.on("error", () => resolve({ status: 0, ct: "", size: 0, magic: "" }))
    req.end()
  })
}

async function main() {
  console.log(`\n═══ QA Producción PDF OC/OS — ${PROD} ═══\n`)

  // Generar token de sesión con AUTH_SECRET local
  const token = await createSessionToken({ sub: "qa-prod", email: "admin@dpp.local", role: "ADMIN" })
  const auth = { Cookie: `dpp-session=${token}` }

  // IDs de prueba — endpoint 404 con UUID nulo
  const FAKE = "00000000-0000-0000-0000-000000000000"

  // ── Sin sesión ────────────────────────────────────────────
  console.log("── 1. Sin sesión → 401 ─────────────────────────────")
  const r1 = await getStatus(`${PROD}/api/purchase-orders/${FAKE}/pdf`)
  const r2 = await getStatus(`${PROD}/api/service-orders/${FAKE}/pdf`)
  r1.status === 401 ? ok("OC PDF sin sesión → 401") : fail("OC PDF sin sesión → 401", `got ${r1.status}`)
  r2.status === 401 ? ok("OS PDF sin sesión → 401") : fail("OS PDF sin sesión → 401", `got ${r2.status}`)

  // ── Páginas sin sesión → redirect ────────────────────────
  console.log("\n── 2. Páginas sin sesión → redirect ────────────────")
  const pages = ["/dashboard", "/purchase-orders", "/service-orders", "/reports"]
  for (const p of pages) {
    const r = await getStatus(`${PROD}${p}`)
    ;[302, 307].includes(r.status) ? ok(`${p} → ${r.status} (redirect)`) : fail(`${p} redirect`, `got ${r.status}`)
  }

  // ── Autenticado — UUID inexistente → 404 ─────────────────
  console.log("\n── 3. UUID inexistente → 404 ───────────────────────")
  const f1 = await getStatus(`${PROD}/api/purchase-orders/${FAKE}/pdf`, auth)
  const f2 = await getStatus(`${PROD}/api/service-orders/${FAKE}/pdf`,  auth)
  if (f1.status === 401 || f2.status === 401) {
    console.log("  ⚠  AUTH_SECRET local difiere del de Vercel — QA autenticado manual recomendado")
    console.log(`     OC: ${f1.status}  OS: ${f2.status}`)
  } else {
    f1.status === 404 ? ok("OC UUID inexistente → 404") : fail("OC UUID inexistente → 404", `got ${f1.status}`)
    f2.status === 404 ? ok("OS UUID inexistente → 404") : fail("OS UUID inexistente → 404", `got ${f2.status}`)
  }

  // ── Regresión rápida: /api/reports/export XLSX ───────────
  console.log("\n── 4. Regresión export Excel ───────────────────────")
  const ex = await getStatus(`${PROD}/api/reports/export?range=this_year`, auth)
  if (ex.status === 401) {
    console.log("  ⚠  Export: 401 (AUTH_SECRET difiere) — manual")
  } else if (ex.status === 200 && ex.ct.includes("spreadsheetml")) {
    ok("export Excel → 200 XLSX", `${ex.size} bytes`)
  } else {
    fail("export Excel", `status ${ex.status} ct ${ex.ct}`)
  }

  // ── Resumen ──────────────────────────────────────────────
  console.log(`\n═══ RESULTADO: ${passed} ✓  ${failed} ✗ ═══\n`)
  if (failed > 0) process.exit(1)
}

main().catch(e => { console.error("ERROR:", e.message); process.exit(1) })
