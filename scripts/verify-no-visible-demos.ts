/**
 * QA: Phase 10 — No visible demo data in production UI
 *
 * Verifies that demo placeholders, hardcoded users, and fake data
 * have been removed from all runtime-visible files.
 *
 * Run: npx tsx scripts/verify-no-visible-demos.ts
 */

import { readFileSync, existsSync, readdirSync, statSync } from "fs"
import { join } from "path"

let passed = 0
let failed = 0

function ok(msg: string) { console.log(`  ✓ ${msg}`); passed++ }
function fail(msg: string, detail?: string) {
  console.error(`  ✗ ${msg}`)
  if (detail) console.error(`    → ${detail}`)
  failed++
}

function readFile(path: string): string {
  if (!existsSync(path)) return ""
  return readFileSync(path, "utf8")
}

function findInFile(filePath: string, pattern: RegExp): string[] {
  const content = readFile(filePath)
  return content.split("\n").filter((line) => pattern.test(line))
}

function findInDir(dir: string, pattern: RegExp, exts = [".ts", ".tsx"]): string[] {
  const results: string[] = []
  function walk(d: string) {
    if (!existsSync(d)) return
    for (const entry of readdirSync(d)) {
      if (entry === "node_modules" || entry === ".next" || entry === "generated") continue
      const full = join(d, entry)
      const stat = statSync(full)
      if (stat.isDirectory()) { walk(full); continue }
      if (!exts.some((e) => full.endsWith(e))) continue
      const lines = findInFile(full, pattern)
      results.push(...lines.map((l) => `${full}: ${l.trim()}`))
    }
  }
  walk(dir)
  return results
}

console.log("\n[Phase 10 QA] Verify no visible demo data in production UI")
console.log("─".repeat(60))

// ─── 1. header.tsx — no MODO DEMO badge ──────────────────────────────────────
console.log("\n[1] header.tsx — no MODO DEMO badge")
{
  const matches = findInFile("components/header.tsx", /MODO DEMO/)
  matches.length === 0
    ? ok("'MODO DEMO' not found in header.tsx")
    : fail("'MODO DEMO' still present in header.tsx", matches[0])
}

// ─── 2. cash-flow/new — no demo-1/demo-2/demo-3/Parte demo ───────────────────
console.log("\n[2] cash-flow/new — no demo IDs or 'Parte demo'")
{
  const files = [
    "app/(app)/cash-flow/new/_components/new-movement-form.tsx",
    "app/(app)/cash-flow/new/page.tsx",
  ]

  const demoIds = files.flatMap((f) => findInFile(f, /demo-1|demo-2|demo-3/))
  demoIds.length === 0
    ? ok("No demo-1/2/3 in cash-flow/new")
    : fail("demo-1/2/3 still present in cash-flow/new", demoIds[0])

  const parteDemo = files.flatMap((f) => findInFile(f, /Parte demo/))
  parteDemo.length === 0
    ? ok("No 'Parte demo' in cash-flow/new")
    : fail("'Parte demo' still present in cash-flow/new", parteDemo[0])

  const clientCode = findInFile("app/(app)/cash-flow/new/page.tsx", /"use client"|useState/)
  clientCode.length === 0
    ? ok("page.tsx is server component (no 'use client' / useState)")
    : fail("page.tsx still has client code", clientCode[0])
}

// ─── 3. settings — no demoUsers / datos de demostración / Fase 7 ─────────────
console.log("\n[3] settings/page.tsx — no fictitious users or phase references")
{
  const file = "app/(app)/settings/page.tsx"
  const checks: Array<[RegExp, string]> = [
    [/demoUsers/, "demoUsers array"],
    [/datos de demostraci/i, "'datos de demostración'"],
    [/Fase 7/, "'Fase 7' reference"],
    [/implementar en Fase/i, "'implementar en Fase' title attribute"],
    [/paola@dpp\.pe|carlos@dpp\.pe|allison@dpp\.pe/, "hardcoded demo emails"],
  ]
  for (const [pattern, label] of checks) {
    const matches = findInFile(file, pattern)
    matches.length === 0
      ? ok(`No ${label} in settings`)
      : fail(`${label} still present in settings`, matches[0])
  }
}

// ─── 4. imports — no alert() / fake data counts ───────────────────────────────
console.log("\n[4] imports/page.tsx — no alert() or fake data")
{
  const file = "app/(app)/imports/page.tsx"
  const checks: Array<[RegExp, string]> = [
    [/alert\(/, "alert() call"],
    [/980 filas|18 filas/, "hardcoded fake row counts"],
    [/Fase 5\b/, "'Fase 5' visible label"],
    [/implementar parser/, "parser TODO in UI code"],
  ]
  for (const [pattern, label] of checks) {
    const matches = findInFile(file, pattern)
    matches.length === 0
      ? ok(`No ${label} in imports`)
      : fail(`${label} still present in imports`, matches[0])
  }
}

// ─── 5. dashboard — no demo data used in PRODUCTION path ────────────────────
// Note: demoMonthlyChart may still be imported for the dev/build fallback (demoData).
// What matters is that the production return path does NOT use demo values directly.
console.log("\n[5] lib/data/dashboard.ts — no demo data in production return path")
{
  const file = "lib/data/dashboard.ts"
  const content = readFile(file)

  // porCobrar and facturaVencidas must not appear in production path
  const checks: Array<[RegExp, string]> = [
    [/demoTopCobrar/, "demoTopCobrar usage (no clients module, should be removed)"],
    [/porCobrar:\s*demoKpis/, "porCobrar: demoKpis in production return"],
    [/facturaVencidas:\s*demoKpis/, "facturaVencidas: demoKpis in production return"],
  ]
  for (const [pattern, label] of checks) {
    const matches = findInFile(file, pattern)
    matches.length === 0
      ? ok(`No ${label}`)
      : fail(`${label} still present`, matches[0])
  }

  // Verify monthlyChart in the PRODUCTION RETURN uses a local variable, not demoMonthlyChart.
  // The demoData const (before withDb) may still use demoMonthlyChart — that's the dev fallback.
  // Split on "withDb(async" to isolate the production async callback body.
  // The demoData const is defined BEFORE withDb(async, so it won't appear in this slice.
  const insideWithDb = content.split("withDb(async")[1] ?? ""
  const productionReturnHasDemo = /monthlyChart:\s*demoMonthlyChart/.test(insideWithDb)
  productionReturnHasDemo
    ? fail("monthlyChart: demoMonthlyChart used inside withDb production callback")
    : ok("monthlyChart built from real DB query in production path")
}

// ─── 6. No prisma.user.findFirst used for user attribution in actions ─────────
// Note: other findFirst calls (e.g. cashMovement.findFirst, payment.findFirst) are
// legitimate business logic, not demo user lookups.
console.log("\n[6] Server actions — no prisma.user.findFirst() for user attribution")
{
  const actionFiles = [
    "app/actions/purchase-orders.ts",
    "app/actions/service-orders.ts",
    "app/actions/orders-to-cash.ts",
    "app/actions/payments.ts",
    "app/actions/cash-movements.ts",
  ]
  let anyUserFindFirst = false
  for (const f of actionFiles) {
    const matches = findInFile(f, /prisma\.user\.findFirst|user\.findFirst/)
    if (matches.length > 0) {
      fail(`${f}: still has prisma.user.findFirst()`, matches[0])
      anyUserFindFirst = true
    }
  }
  if (!anyUserFindFirst) ok("No prisma.user.findFirst() in any server action")
}

// ─── 7. No demoUser patterns in actions ───────────────────────────────────────
console.log("\n[7] Server actions — no demoUser or demo seed messages")
{
  const matches = findInDir("app/actions", /demoUser|No hay usuario demo|Ejecuta el seed/)
  matches.length === 0
    ? ok("No demoUser/seed messages in actions")
    : fail("Demo patterns still in actions", matches[0])
}

// ─── 8. No hardcoded credentials in runtime code ─────────────────────────────
console.log("\n[8] No hardcoded credentials in runtime code")
{
  const runtimeDirs = ["app", "components", "lib"]
  let found = false
  for (const dir of runtimeDirs) {
    // Exclude scripts and docs
    const matches = findInDir(dir, /admin123|DppAdmin2026/)
    if (matches.length > 0) {
      fail(`Hardcoded credential found in ${dir}`, matches[0])
      found = true
    }
  }
  if (!found) ok("No hardcoded credentials in runtime code")
}

// ─── 9. No demo supplier IDs in runtime ──────────────────────────────────────
console.log("\n[9] No demo supplier IDs (sup-1/sup-2) or value='demo' in runtime")
{
  const runtimeDirs = ["app/actions", "app/(app)", "components"]
  let found = false
  for (const dir of runtimeDirs) {
    const matches = findInDir(dir, /"sup-1"|"sup-2"|value="demo"/)
    if (matches.length > 0) {
      fail(`Demo supplier IDs found in ${dir}`, matches[0])
      found = true
    }
  }
  if (!found) ok("No demo supplier IDs in runtime code")
}

// ─── 10. createCashMovement uses requireUserId ────────────────────────────────
console.log("\n[10] createCashMovement uses requireUserId for attribution")
{
  const matches = findInFile("app/actions/cash-movements.ts", /requireUserId/)
  matches.length > 0
    ? ok("createCashMovement uses requireUserId()")
    : fail("createCashMovement does not use requireUserId()")
}

// ─── 11. dashboard-client — no hardcoded trend labels ────────────────────────
console.log("\n[11] dashboard-client — no hardcoded trend percentages")
{
  const matches = findInFile("components/dashboard-client.tsx", /\+8%|\-3%|vs\. mes anterior/)
  matches.length === 0
    ? ok("No hardcoded trend labels in dashboard-client")
    : fail("Hardcoded trend labels still in dashboard-client", matches[0])
}

// ─── 12. settings reads real session (not hardcoded) ─────────────────────────
console.log("\n[12] settings/page.tsx uses real session")
{
  const matches = findInFile("app/(app)/settings/page.tsx", /getSession/)
  matches.length > 0
    ? ok("settings/page.tsx uses getSession()")
    : fail("settings/page.tsx does not use getSession()")
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(60)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
console.log(`${"─".repeat(60)}\n`)

if (failed > 0) process.exit(1)
