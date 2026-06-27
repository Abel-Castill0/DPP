/**
 * Seed demo — DPP Control
 * Solo inserta datos de demostración. No contiene información real de la empresa.
 * Ejecutar: npx prisma db seed
 */
import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🌱 Iniciando seed demo...")

  // ── Usuario demo ───────────────────────────────────────────────────────────
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@dpp.pe" },
    update: {},
    create: {
      name: "Usuario Demo",
      email: "demo@dpp.pe",
      passwordHash: "$demo-no-real-auth-yet$",
      role: "FINANZAS",
      isActive: true,
    },
  })
  console.log(`  ✓ Usuario demo: ${demoUser.email}`)

  // ── Centro de costo demo ──────────────────────────────────────────────────
  const costCenter = await prisma.costCenter.upsert({
    where: { code: "CC-GENERAL" },
    update: {},
    create: { code: "CC-GENERAL", name: "General Demo", isActive: true },
  })
  console.log(`  ✓ Centro de costo: ${costCenter.code}`)

  // ── Proveedores demo ──────────────────────────────────────────────────────
  const supplierData = [
    { code: "P001", name: "Taller Demo Confección A", ruc: "20100000001", supplierType: "TALLER" as const, contactName: "Juan Pérez", contactPhone: "987654321", bankName: "BCP" },
    { code: "P002", name: "Textil Demo B S.A.C.", ruc: "20100000002", supplierType: "PROVEEDOR_INSUMO" as const, contactName: "María García", contactPhone: "912345678", bankName: "Scotiabank" },
    { code: "P003", name: "Estampadora Demo C", ruc: "20100000003", supplierType: "SERVICIO" as const, contactName: "Carlos López", contactPhone: "999888777", bankName: "BBVA" },
    { code: "P004", name: "Avíos Demo D E.I.R.L.", ruc: "20100000004", supplierType: "PROVEEDOR_INSUMO" as const, contactName: "Ana Torres", contactPhone: "966554433", bankName: "Interbank" },
  ]

  const suppliers: Record<string, { id: string }> = {}
  for (const s of supplierData) {
    const sup = await prisma.supplier.upsert({
      where: { code: s.code },
      update: {},
      create: { ...s, isActive: true },
    })
    suppliers[s.code] = sup
    console.log(`  ✓ Proveedor: ${s.code} — ${s.name}`)
  }

  // ── Insumos y servicios demo ──────────────────────────────────────────────
  const itemData = [
    { code: "I001", name: "Tela Jersey 30/1", itemType: "INSUMO" as const, category: "TELA" as const, unit: "KG" },
    { code: "I002", name: "Hilo poliéster 40/2", itemType: "INSUMO" as const, category: "HILO" as const, unit: "CONO" },
    { code: "I003", name: "Elástico 3cm", itemType: "INSUMO" as const, category: "AVIOS" as const, unit: "MT" },
    { code: "I004", name: "Etiqueta tejida", itemType: "INSUMO" as const, category: "AVIOS" as const, unit: "UND" },
    { code: "S001", name: "Corte de tela", itemType: "SERVICIO" as const, category: "CORTE" as const, unit: "UND" },
    { code: "S002", name: "Confección polo", itemType: "SERVICIO" as const, category: "CONFECCION" as const, unit: "UND" },
    { code: "S003", name: "Estampado digital", itemType: "SERVICIO" as const, category: "ESTAMPADO" as const, unit: "UND" },
    { code: "S004", name: "Acabado y doblado", itemType: "SERVICIO" as const, category: "ACABADO" as const, unit: "UND" },
  ]

  for (const it of itemData) {
    await prisma.item.upsert({
      where: { code: it.code },
      update: {},
      create: { ...it, isActive: true },
    })
    console.log(`  ✓ Item: ${it.code} — ${it.name}`)
  }

  // ── Órdenes de compra demo ────────────────────────────────────────────────
  const ocData = [
    {
      orderNumber: "OC-2026-001",
      supplierId: suppliers["P002"].id,
      issueDate: new Date("2026-05-02"),
      status: "EMITIDA" as const,
      paymentStatus: "PENDIENTE" as const,
      totalAmount: 8500,
      paidAmount: 0,
      pendingAmount: 8500,
      items: [{ description: "Tela Jersey 30/1 — 100 KG", quantity: 100, unit: "KG", unitPrice: 85, subtotal: 8500 }],
    },
    {
      orderNumber: "OC-2026-002",
      supplierId: suppliers["P004"].id,
      issueDate: new Date("2026-05-05"),
      status: "COMPLETADA" as const,
      paymentStatus: "PAGADO" as const,
      totalAmount: 2100,
      paidAmount: 2100,
      pendingAmount: 0,
      items: [{ description: "Hilo poliéster 40/2 — 70 conos", quantity: 70, unit: "CONO", unitPrice: 30, subtotal: 2100 }],
    },
    {
      orderNumber: "OC-2026-003",
      supplierId: suppliers["P002"].id,
      issueDate: new Date("2026-05-10"),
      status: "EN_PROCESO" as const,
      paymentStatus: "ADELANTO" as const,
      totalAmount: 12000,
      paidAmount: 6000,
      pendingAmount: 6000,
      items: [{ description: "Tela Jersey 30/1 — 140 KG", quantity: 140, unit: "KG", unitPrice: 85, subtotal: 11900 }],
    },
  ]

  for (const oc of ocData) {
    const { items, ...ocFields } = oc
    await prisma.purchaseOrder.upsert({
      where: { orderNumber: oc.orderNumber },
      update: {},
      create: {
        ...ocFields,
        responsibleId: demoUser.id,
        items: { create: items },
      },
    })
    console.log(`  ✓ OC: ${oc.orderNumber}`)
  }

  // ── Órdenes de servicio demo ──────────────────────────────────────────────
  const osData = [
    {
      orderNumber: "OS-2026-001",
      supplierId: suppliers["P001"].id,
      process: "CONFECCION" as const,
      proformaCode: "PI-2026-0017",
      issueDate: new Date("2026-05-03"),
      status: "COMPLETADA" as const,
      paymentStatus: "PAGADO" as const,
      totalAmount: 4200,
      paidAmount: 4200,
      pendingAmount: 0,
      items: [{ description: "Confección polo básico — 600 und", quantity: 600, unit: "UND", unitPrice: 7, subtotal: 4200 }],
    },
    {
      orderNumber: "OS-2026-002",
      supplierId: suppliers["P003"].id,
      process: "ESTAMPADO" as const,
      proformaCode: "PI-2026-0017",
      issueDate: new Date("2026-05-07"),
      status: "EN_PROCESO" as const,
      paymentStatus: "PENDIENTE" as const,
      totalAmount: 3100,
      paidAmount: 0,
      pendingAmount: 3100,
      items: [{ description: "Estampado digital frente — 620 und", quantity: 620, unit: "UND", unitPrice: 5, subtotal: 3100 }],
    },
  ]

  for (const os of osData) {
    const { items, ...osFields } = os
    await prisma.serviceOrder.upsert({
      where: { orderNumber: os.orderNumber },
      update: {},
      create: {
        ...osFields,
        responsibleId: demoUser.id,
        items: { create: items },
      },
    })
    console.log(`  ✓ OS: ${os.orderNumber}`)
  }

  // ── Movimientos de caja demo ──────────────────────────────────────────────
  const movementsData = [
    {
      date: new Date("2026-05-02"),
      type: "EGRESO" as const,
      origin: "ORDEN_COMPRA" as const,
      operationStatus: "ADELANTO" as const,
      category: "MATERIA_PRIMA" as const,
      description: "Adelanto tela jersey — OC-2026-001",
      supplierId: suppliers["P002"].id,
      abono: 4250,
      invoiceAmount: 8500,
      incomeAmount: 0,
      expenseAmount: 4250,
    },
    {
      date: new Date("2026-05-03"),
      type: "EGRESO" as const,
      origin: "ORDEN_SERVICIO" as const,
      operationStatus: "CANCELADO" as const,
      category: "CONFECCION" as const,
      description: "Pago completo confección — OS-2026-001",
      supplierId: suppliers["P001"].id,
      abono: 4200,
      invoiceAmount: 4200,
      incomeAmount: 0,
      expenseAmount: 4200,
    },
    {
      date: new Date("2026-05-05"),
      type: "INGRESO" as const,
      origin: "MANUAL" as const,
      operationStatus: "COBRADO" as const,
      category: "VENTA" as const,
      description: "Cobranza exportación cliente demo",
      abono: 18500,
      invoiceAmount: 18500,
      incomeAmount: 18500,
      expenseAmount: 0,
    },
  ]

  for (const mv of movementsData) {
    await prisma.cashMovement.create({
      data: { ...mv, createdById: demoUser.id, retencion: 0, detraccion: 0 },
    })
  }
  console.log(`  ✓ ${movementsData.length} movimientos de caja demo creados`)

  console.log("\n✅ Seed demo completado.")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
