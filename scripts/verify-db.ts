/**
 * QA script: verifica conexión real y CRUD mínimo contra la BD.
 * Ejecutar: npx tsx scripts/verify-db.ts
 * Requiere: .env.claude.local o DATABASE_URL configurado.
 *
 * SEGURIDAD: No imprime URLs ni secretos — solo nombres de tablas y conteos.
 */
import { existsSync } from "node:fs"
import { config as dotenvConfig } from "dotenv"
import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

if (existsSync(".env.claude.local")) {
  dotenvConfig({ path: ".env.claude.local", override: true })
} else {
  dotenvConfig()
}

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL no configurado")
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🔍 DPP Control — Verificación de BD")
  console.log("─".repeat(40))

  // 1. Conexión básica
  console.log("\n1. Conexión:")
  try {
    await prisma.$queryRaw`SELECT 1`
    console.log("   ✅ Conectado exitosamente")
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("   ❌ Error de conexión:", msg.slice(0, 100))
    process.exit(1)
  }

  // 2. Conteos de tablas (verificar que existen)
  console.log("\n2. Tablas y registros:")
  const tables = [
    { name: "users", query: () => prisma.user.count() },
    { name: "suppliers", query: () => prisma.supplier.count() },
    { name: "items", query: () => prisma.item.count() },
    { name: "purchase_orders", query: () => prisma.purchaseOrder.count() },
    { name: "service_orders", query: () => prisma.serviceOrder.count() },
    { name: "cash_movements", query: () => prisma.cashMovement.count() },
    { name: "cost_centers", query: () => prisma.costCenter.count() },
  ]
  for (const t of tables) {
    try {
      const count = await t.query()
      console.log(`   ✅ ${t.name.padEnd(20)} → ${count} registros`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.log(`   ❌ ${t.name.padEnd(20)} → ERROR: ${msg.slice(0, 60)}`)
    }
  }

  // 3. CRUD: crear proveedor demo
  console.log("\n3. CRUD mínimo:")
  let demoSupplierId: string | null = null
  try {
    const count = await prisma.supplier.count()
    const sup = await prisma.supplier.create({
      data: {
        code: `QA-P${String(count + 1).padStart(3, "0")}`,
        name: "QA Demo Proveedor (eliminar)",
        supplierType: "OTRO",
        isActive: true,
      },
    })
    demoSupplierId = sup.id
    console.log(`   ✅ CREATE supplier: ${sup.code} — ${sup.name}`)
  } catch (e) {
    console.log("   ❌ CREATE supplier:", e instanceof Error ? e.message.slice(0, 80) : e)
  }

  // 4. CRUD: crear ítem demo
  let demoItemId: string | null = null
  try {
    const count = await prisma.item.count({ where: { itemType: "INSUMO" } })
    const item = await prisma.item.create({
      data: {
        code: `QA-I${String(count + 1).padStart(3, "0")}`,
        name: "QA Demo Tela (eliminar)",
        itemType: "INSUMO",
        category: "TELA",
        unit: "KG",
      },
    })
    demoItemId = item.id
    console.log(`   ✅ CREATE item: ${item.code} — ${item.name}`)
  } catch (e) {
    console.log("   ❌ CREATE item:", e instanceof Error ? e.message.slice(0, 80) : e)
  }

  // 5. Listar proveedores
  try {
    const suppliers = await prisma.supplier.findMany({ take: 3, orderBy: { code: "asc" } })
    console.log(`   ✅ LIST suppliers: ${suppliers.map((s) => s.code).join(", ")}`)
  } catch (e) {
    console.log("   ❌ LIST suppliers:", e instanceof Error ? e.message.slice(0, 80) : e)
  }

  // 6. Listar ítems
  try {
    const items = await prisma.item.findMany({ take: 3, orderBy: { code: "asc" } })
    console.log(`   ✅ LIST items: ${items.map((i) => i.code).join(", ")}`)
  } catch (e) {
    console.log("   ❌ LIST items:", e instanceof Error ? e.message.slice(0, 80) : e)
  }

  // 7. Limpiar datos QA creados
  console.log("\n4. Limpieza:")
  if (demoSupplierId) {
    await prisma.supplier.delete({ where: { id: demoSupplierId } }).catch(() => {})
    console.log("   🗑  QA supplier eliminado")
  }
  if (demoItemId) {
    await prisma.item.delete({ where: { id: demoItemId } }).catch(() => {})
    console.log("   🗑  QA item eliminado")
  }

  console.log("\n✅ Verificación completada.")
}

main()
  .catch((e) => { console.error("Error fatal:", e); process.exit(1) })
  .finally(() => prisma.$disconnect())
