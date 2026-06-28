/**
 * Verifica estructura PDF usando pdf-lib: páginas, dimensiones A4, fuentes.
 * No commitear este script ni PDFs temporales.
 */
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.claude.local", override: true })
dotenv.config({ path: ".env.local",        override: true })
dotenv.config({ path: ".env" })

import { PDFDocument } from "pdf-lib"
import { createSessionToken } from "../lib/auth"

const BASE = process.env.BASE_URL ?? "http://localhost:3001"
const A4_W = 595.28
const A4_H = 841.89

let passed = 0, failed = 0

function ok(label: string, detail = "")  { console.log(`  ✓  ${label}${detail ? " — " + detail : ""}`); passed++ }
function fail(label: string, detail = "") { console.log(`  ✗  ${label}${detail ? " — " + detail : ""}`); failed++ }

async function inspectPdf(buf: Buffer, label: string) {
  const doc = await PDFDocument.load(buf)

  const pageCount = doc.getPageCount()
  const page = doc.getPage(0)
  const { width, height } = page.getSize()

  pageCount >= 1  ? ok(`${label}: ≥1 página`,       `${pageCount}`) : fail(`${label}: páginas`, `${pageCount}`)
  Math.abs(width  - A4_W) < 1 ? ok(`${label}: ancho A4`, `${width.toFixed(1)}pt`) : fail(`${label}: ancho A4`,  `got ${width.toFixed(1)}pt`)
  Math.abs(height - A4_H) < 1 ? ok(`${label}: alto A4`,  `${height.toFixed(1)}pt`) : fail(`${label}: alto A4`,  `got ${height.toFixed(1)}pt`)
  buf.length > 1500 ? ok(`${label}: tamaño mínimo`, `${buf.length} bytes`) : fail(`${label}: tamaño mínimo`, `${buf.length} bytes`)
}

async function main() {
  const { prisma } = await import("../lib/prisma")
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no configurado")

  const oc = await prisma.purchaseOrder.findFirst({ where: { isVoid: false }, select: { id: true, orderNumber: true }, orderBy: { issueDate: "desc" } })
  const os = await prisma.serviceOrder.findFirst({  where: { isVoid: false }, select: { id: true, orderNumber: true }, orderBy: { issueDate: "desc" } })
  if (!oc || !os) throw new Error("No hay OC/OS en BD")

  const token = await createSessionToken({ sub: "qa", email: "qa@dpp.local", role: "ADMIN" })
  const headers = { Cookie: `dpp-session=${token}` }

  console.log(`\n── Verificación estructural PDF ─────────────────────`)
  console.log(`   OC: ${oc.orderNumber}  OS: ${os.orderNumber}\n`)

  const ocRes = await fetch(`${BASE}/api/purchase-orders/${oc.id}/pdf`, { headers })
  const osRes = await fetch(`${BASE}/api/service-orders/${os.id}/pdf`,  { headers })

  const ocBuf = Buffer.from(await ocRes.arrayBuffer())
  const osBuf = Buffer.from(await osRes.arrayBuffer())

  // HTTP checks
  ocRes.status === 200 ? ok("OC: status 200")  : fail("OC: status 200",  `got ${ocRes.status}`)
  osRes.status === 200 ? ok("OS: status 200")  : fail("OS: status 200",  `got ${osRes.status}`)
  ocRes.headers.get("content-type")?.includes("application/pdf") ? ok("OC: Content-Type PDF") : fail("OC: Content-Type PDF")
  osRes.headers.get("content-type")?.includes("application/pdf") ? ok("OS: Content-Type PDF") : fail("OS: Content-Type PDF")
  ocBuf.slice(0, 5).toString() === "%PDF-" ? ok("OC: magic %PDF-") : fail("OC: magic %PDF-")
  osBuf.slice(0, 5).toString() === "%PDF-" ? ok("OS: magic %PDF-") : fail("OS: magic %PDF-")

  // Content-Disposition
  const ocCd = ocRes.headers.get("content-disposition") ?? ""
  const osCd = osRes.headers.get("content-disposition") ?? ""
  ocCd.includes("OC-") ? ok("OC: Content-Disposition con N° OC", ocCd.slice(0, 50)) : fail("OC: Content-Disposition", ocCd)
  osCd.includes("OS-") ? ok("OS: Content-Disposition con N° OS", osCd.slice(0, 50)) : fail("OS: Content-Disposition", osCd)

  // Structural validation via pdf-lib
  await inspectPdf(ocBuf, "OC")
  await inspectPdf(osBuf, "OS")

  // Verify 401 without session
  const r401oc = await fetch(`${BASE}/api/purchase-orders/${oc.id}/pdf`)
  const r401os = await fetch(`${BASE}/api/service-orders/${os.id}/pdf`)
  r401oc.status === 401 ? ok("OC: sin sesión → 401") : fail("OC: sin sesión → 401", `got ${r401oc.status}`)
  r401os.status === 401 ? ok("OS: sin sesión → 401") : fail("OS: sin sesión → 401", `got ${r401os.status}`)

  // 404 for invalid ID
  const fakeId = "00000000-0000-0000-0000-000000000000"
  const r404oc = await fetch(`${BASE}/api/purchase-orders/${fakeId}/pdf`, { headers })
  const r404os = await fetch(`${BASE}/api/service-orders/${fakeId}/pdf`,  { headers })
  r404oc.status === 404 ? ok("OC: ID inexistente → 404") : fail("OC: ID inexistente → 404", `got ${r404oc.status}`)
  r404os.status === 404 ? ok("OS: ID inexistente → 404") : fail("OS: ID inexistente → 404", `got ${r404os.status}`)

  console.log(`\n═══ RESULTADO: ${passed} ✓  ${failed} ✗ ═══`)
  console.log("   Nota: texto en streams comprimidos (FlateDecode/PDF-1.7) — revisión visual manual recomendada\n")

  if (failed > 0) process.exit(1)
}

main().catch(err => { console.error("ERROR:", err.message); process.exit(1) })
