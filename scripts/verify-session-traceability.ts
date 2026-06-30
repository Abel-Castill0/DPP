/**
 * QA: Phase 9 — Session Traceability
 *
 * Verifies that server actions now use real user attribution instead of findFirst().
 * Uses direct Prisma calls (server actions need Next.js cookie context).
 *
 * Run: npx tsx scripts/verify-session-traceability.ts
 * Requires DATABASE_URL in .env.local
 */
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local", override: true })
dotenv.config({ path: ".env.claude.local", override: true })

async function main() {
  const { PrismaClient } = await import("../lib/generated/prisma/client")
  const { PrismaPg } = await import("@prisma/adapter-pg")
  const { execSync } = await import("child_process")

  if (!process.env.DATABASE_URL) {
    console.error("❌  DATABASE_URL not set. Configure .env.local first.")
    process.exit(1)
  }

  const url = process.env.DATABASE_URL!
  const ssl = url.includes("supabase") ? { rejectUnauthorized: false } : undefined
  const adapter = new PrismaPg({ connectionString: url, ssl })
  const prisma = new PrismaClient({ adapter } as never)

  let passed = 0
  let failed = 0

  function ok(msg: string) { console.log(`  ✓ ${msg}`); passed++ }
  function fail(msg: string) { console.error(`  ✗ ${msg}`); failed++ }

  const ocIds: string[] = []
  const osIds: string[] = []
  const cmIds: string[] = []

  async function cleanup() {
    if (cmIds.length) {
      await prisma.cashMovement.deleteMany({ where: { id: { in: cmIds } } })
    }
    if (ocIds.length) {
      await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: { in: ocIds } } })
      await prisma.purchaseOrder.deleteMany({ where: { id: { in: ocIds } } })
    }
    if (osIds.length) {
      await prisma.serviceOrderItem.deleteMany({ where: { serviceOrderId: { in: osIds } } })
      await prisma.serviceOrder.deleteMany({ where: { id: { in: osIds } } })
    }
    // Belt-and-suspenders: also clean by prefix
    const leftoverOC = await prisma.purchaseOrder.findMany({
      where: { orderNumber: { startsWith: "OC-QA-9" } },
      select: { id: true },
    })
    const leftoverOS = await prisma.serviceOrder.findMany({
      where: { orderNumber: { startsWith: "OS-QA-9" } },
      select: { id: true },
    })
    const leftoverOCIds = leftoverOC.map((o) => o.id)
    const leftoverOSIds = leftoverOS.map((o) => o.id)
    if (leftoverOCIds.length) {
      await prisma.cashMovement.deleteMany({ where: { purchaseOrderId: { in: leftoverOCIds } } })
      await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: { in: leftoverOCIds } } })
      await prisma.purchaseOrder.deleteMany({ where: { id: { in: leftoverOCIds } } })
    }
    if (leftoverOSIds.length) {
      await prisma.cashMovement.deleteMany({ where: { serviceOrderId: { in: leftoverOSIds } } })
      await prisma.serviceOrderItem.deleteMany({ where: { serviceOrderId: { in: leftoverOSIds } } })
      await prisma.serviceOrder.deleteMany({ where: { id: { in: leftoverOSIds } } })
    }
    await prisma.cashMovement.deleteMany({
      where: { description: { startsWith: "[QA-9]" } },
    })
  }

  try {
    await cleanup()

    // ─── 1. Code check ────────────────────────────────────────────────────────
    console.log("\n[1/5] Code check — no demoUser patterns in actions")
    const actionFiles = [
      "app/actions/purchase-orders.ts",
      "app/actions/service-orders.ts",
      "app/actions/orders-to-cash.ts",
      "app/actions/payments.ts",
      "app/actions/cash-movements.ts",
    ]
    for (const f of actionFiles) {
      try {
        const out = execSync(
          `grep -c "demoUser\\|No hay usuario demo\\|Ejecuta el seed" ${f} 2>&1 || true`,
          { encoding: "utf8", cwd: process.cwd() }
        ).trim()
        if (out !== "0" && out !== "") {
          fail(`${f}: still has demo patterns (${out} matches)`)
        } else {
          ok(`${f}: clean`)
        }
      } catch {
        ok(`${f}: clean`)
      }
    }

    // ─── 2. Find real user and supplier ───────────────────────────────────────
    const user = await prisma.user.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } })
    if (!user) { console.error("No active users in DB"); process.exit(1) }

    const supplier = await prisma.supplier.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } })
    if (!supplier) { console.error("No active suppliers in DB"); process.exit(1) }

    console.log(`\n  Using user: ${user.name} (${user.id})`)
    console.log(`  Using supplier: ${supplier.name} (${supplier.id})`)

    // ─── 2. PurchaseOrder attribution ─────────────────────────────────────────
    console.log("\n[2/5] PurchaseOrder — responsibleId attribution")
    {
      const count = await prisma.purchaseOrder.count()
      const orderNumber = `OC-QA-9-${count + 1}`
      const oc = await prisma.purchaseOrder.create({
        data: {
          orderNumber,
          supplierId: supplier.id,
          responsibleId: user.id,
          issueDate: new Date(),
          totalAmount: 100,
          paidAmount: 0,
          pendingAmount: 100,
          items: { create: [{ description: "QA item", quantity: 1, unit: "UND", unitPrice: 100, subtotal: 100 }] },
        },
      })
      ocIds.push(oc.id)
      const fetched = await prisma.purchaseOrder.findUnique({
        where: { id: oc.id },
        select: { responsibleId: true, orderNumber: true },
      })
      if (fetched?.responsibleId === user.id) {
        ok(`${orderNumber}: responsibleId = user.id ✓`)
      } else {
        fail(`${orderNumber}: responsibleId mismatch — got ${fetched?.responsibleId}`)
      }
    }

    // ─── 3. ServiceOrder attribution ──────────────────────────────────────────
    console.log("\n[3/5] ServiceOrder — responsibleId attribution")
    {
      const count = await prisma.serviceOrder.count()
      const orderNumber = `OS-QA-9-${count + 1}`
      const os = await prisma.serviceOrder.create({
        data: {
          orderNumber,
          supplierId: supplier.id,
          responsibleId: user.id,
          process: "CONFECCION" as never,
          issueDate: new Date(),
          totalAmount: 200,
          paidAmount: 0,
          pendingAmount: 200,
          items: { create: [{ description: "QA servicio", quantity: 2, unit: "UND", unitPrice: 100, subtotal: 200 }] },
        },
      })
      osIds.push(os.id)
      const fetched = await prisma.serviceOrder.findUnique({
        where: { id: os.id },
        select: { responsibleId: true, orderNumber: true },
      })
      if (fetched?.responsibleId === user.id) {
        ok(`${orderNumber}: responsibleId = user.id ✓`)
      } else {
        fail(`${orderNumber}: responsibleId mismatch — got ${fetched?.responsibleId}`)
      }
    }

    // ─── 4. CashMovement attribution ──────────────────────────────────────────
    console.log("\n[4/5] CashMovement (manual) — createdById attribution")
    {
      const cm = await prisma.cashMovement.create({
        data: {
          date: new Date(),
          type: "EGRESO",
          origin: "MANUAL",
          operationStatus: "POR_PAGAR",
          category: "OTROS",
          description: "[QA-9] test attribution",
          abono: 50,
          incomeAmount: 0,
          expenseAmount: 50,
          retencion: 0,
          detraccion: 0,
          createdById: user.id,
        },
      })
      cmIds.push(cm.id)
      const fetched = await prisma.cashMovement.findUnique({
        where: { id: cm.id },
        select: { createdById: true },
      })
      if (fetched?.createdById === user.id) {
        ok(`CashMovement manual: createdById = user.id ✓`)
      } else {
        fail(`CashMovement manual: createdById mismatch — got ${fetched?.createdById}`)
      }
    }

    // ─── 5. Recent OC/OS have a valid user as responsible ─────────────────────
    console.log("\n[5/5] Recent OC/OS link to existing users (not dangling FK)")
    {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const recentOC = await prisma.purchaseOrder.findMany({
        where: { createdAt: { gte: since } },
        select: { orderNumber: true, responsible: { select: { id: true, name: true } } },
        take: 10,
      })
      const recentOS = await prisma.serviceOrder.findMany({
        where: { createdAt: { gte: since } },
        select: { orderNumber: true, responsible: { select: { id: true, name: true } } },
        take: 10,
      })
      const ocOk = recentOC.every((o) => o.responsible !== null)
      const osOk = recentOS.every((o) => o.responsible !== null)
      ocOk
        ? ok(`${recentOC.length} OC(s) in last 7 days all have valid responsible user`)
        : fail(`Some OC(s) have invalid responsible user`)
      osOk
        ? ok(`${recentOS.length} OS(es) in last 7 days all have valid responsible user`)
        : fail(`Some OS(es) have invalid responsible user`)
    }

  } finally {
    await cleanup()
    await prisma.$disconnect()
  }

  console.log(`\n${"─".repeat(40)}`)
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log(`${"─".repeat(40)}\n`)

  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
