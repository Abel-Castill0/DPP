/**
 * Descarga un PDF OC y OS del dev server y verifica contenido textual.
 * Uso: npx tsx scripts/qa-pdf-inspect.ts
 * No committear los PDFs descargados.
 */
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.claude.local", override: true })
dotenv.config({ path: ".env.local",        override: true })
dotenv.config({ path: ".env" })

import { createSessionToken } from "../lib/auth"

const BASE = process.env.BASE_URL ?? "http://localhost:3001"

async function main() {
  const { prisma } = await import("../lib/prisma")
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no configurado")

  // Get real IDs
  const oc = await prisma.purchaseOrder.findFirst({ where: { isVoid: false }, select: { id: true, orderNumber: true }, orderBy: { issueDate: "desc" } })
  const os = await prisma.serviceOrder.findFirst({  where: { isVoid: false }, select: { id: true, orderNumber: true }, orderBy: { issueDate: "desc" } })
  if (!oc) throw new Error("No hay OC en BD")
  if (!os) throw new Error("No hay OS en BD")

  const token = await createSessionToken({ sub: "qa", email: "qa@dpp.local", role: "ADMIN" })
  const headers = { Cookie: `dpp-session=${token}` }

  console.log(`OC: ${oc.orderNumber}  OS: ${os.orderNumber}`)

  for (const [type, id, num] of [["OC", oc.id, oc.orderNumber], ["OS", os.id, os.orderNumber]] as const) {
    const path = type === "OC" ? "purchase-orders" : "service-orders"
    const res = await fetch(`${BASE}/api/${path}/${id}/pdf`, { headers })

    console.log(`\n${type} PDF (${num}):`)
    console.log(`  status:  ${res.status}`)
    console.log(`  ct:      ${res.headers.get("content-type")}`)
    console.log(`  cd:      ${res.headers.get("content-disposition")}`)

    const buf = Buffer.from(await res.arrayBuffer())
    console.log(`  size:    ${buf.length} bytes`)
    console.log(`  magic:   ${buf.slice(0, 5).toString("ascii")}`)

    // PDF content stream inspection: search for text markers
    // pdf-lib stores text in PDF stream objects. Content may be in compressed streams.
    // Search the raw buffer for readable strings using both ASCII and PDF string syntax.
    const raw = buf.toString("binary")

    // Look for PDF version header
    const pdfVersion = raw.match(/%PDF-\d+\.\d+/)
    console.log(`  version: ${pdfVersion?.[0] ?? "(no encontrado)"}`)

    // Check if content streams are compressed (FlateDecode presence)
    const hasFlate = raw.includes("FlateDecode") || raw.includes("Fl\x61teDecode")
    console.log(`  flate:   ${hasFlate ? "sí (streams comprimidos)" : "no (streams en claro)"}`)

    // Search for text in clear (if not compressed)
    const textMarkers = [
      "ORDEN DE COMPRA", "ORDEN DE SERVICIO", "DPP CONTROL",
      "SALDO PENDIENTE", "Responsable DPP", num,
      "Dise", "P.P", "Lima",
    ]
    const found = textMarkers.filter(t => raw.includes(t))
    const notFound = textMarkers.filter(t => !raw.includes(t))

    if (found.length > 0) console.log(`  texto encontrado (${found.length}): ${found.join(", ")}`)
    if (notFound.length > 0) console.log(`  texto no encontrado (comprimido): ${notFound.join(", ")}`)

    // Additional structure checks
    const hasPages = raw.includes("/Type /Page") || raw.includes("/Type/Page")
    const hasFont  = raw.includes("/Font")
    const hasContent = raw.includes("/Contents")
    console.log(`  /Page:     ${hasPages ? "✓" : "✗"}`)
    console.log(`  /Font:     ${hasFont  ? "✓" : "✗"}`)
    console.log(`  /Contents: ${hasContent ? "✓" : "✗"}`)
  }
}

main().catch(err => { console.error("ERROR:", err.message); process.exit(1) })
