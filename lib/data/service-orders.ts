import { prisma, withDb } from "@/lib/prisma"
import { demoServiceOrders } from "@/lib/demo-data"

export type ServiceOrderDetail = {
  id: string
  orderNumber: string
  supplierId: string
  supplierName: string
  process: string
  proformaCode: string | null
  issueDate: string
  expectedDate: string | null
  status: string
  paymentStatus: string
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  notes: string | null
  hasCashMovement: boolean
  hasPayments: boolean
  canEditFinancial: boolean
  canCancel: boolean
  items: Array<{
    id: string
    description: string
    quantity: number
    unit: string
    unitPrice: number
    subtotal: number
  }>
}

export async function getServiceOrderDetail(id: string): Promise<ServiceOrderDetail | null> {
  if (!process.env.DATABASE_URL) return null
  const row = await prisma.serviceOrder.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      supplierId: true,
      process: true,
      proformaCode: true,
      issueDate: true,
      expectedDate: true,
      status: true,
      paymentStatus: true,
      totalAmount: true,
      paidAmount: true,
      pendingAmount: true,
      notes: true,
      supplier: { select: { name: true } },
      items: {
        select: { id: true, description: true, quantity: true, unit: true, unitPrice: true, subtotal: true },
        orderBy: { id: "asc" },
      },
      cashMovements: {
        where: { isVoid: false },
        select: { id: true, payments: { select: { id: true } } },
      },
    },
  })
  if (!row) return null
  const hasCashMovement = row.cashMovements.length > 0
  const hasPayments = Number(row.paidAmount) > 0
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    supplierId: row.supplierId,
    supplierName: row.supplier.name,
    process: row.process,
    proformaCode: row.proformaCode,
    issueDate: row.issueDate.toISOString().slice(0, 10),
    expectedDate: row.expectedDate?.toISOString().slice(0, 10) ?? null,
    status: row.status,
    paymentStatus: row.paymentStatus,
    totalAmount: Number(row.totalAmount),
    paidAmount: Number(row.paidAmount),
    pendingAmount: Number(row.pendingAmount),
    notes: row.notes,
    hasCashMovement,
    hasPayments,
    canEditFinancial: !hasCashMovement && row.status !== "ANULADA",
    canCancel: row.status !== "ANULADA" && !hasPayments,
    items: row.items.map((it) => ({
      id: it.id,
      description: it.description,
      quantity: Number(it.quantity),
      unit: it.unit,
      unitPrice: Number(it.unitPrice),
      subtotal: Number(it.subtotal),
    })),
  }
}

export type ServiceOrderRow = {
  id: string
  orderNumber: string
  issueDate: string
  supplier: string
  process: string
  proformaCode: string | null
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  status: string
  paymentStatus: string
  responsible: string
  hasCashMovement: boolean
  cashMovementStatus: string | null
  cashMovementId: string | null
}

export async function getServiceOrders(): Promise<ServiceOrderRow[]> {
  return withDb(async () => {
    const rows = await prisma.serviceOrder.findMany({
      select: {
        id: true,
        orderNumber: true,
        issueDate: true,
        process: true,
        proformaCode: true,
        status: true,
        paymentStatus: true,
        totalAmount: true,
        paidAmount: true,
        pendingAmount: true,
        supplier: { select: { name: true } },
        responsible: { select: { name: true } },
        cashMovements: {
          select: { id: true, operationStatus: true },
          where: { isVoid: false },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { issueDate: "desc" },
      where: { isVoid: false },
    })
    return rows.map((r) => ({
      id: r.id,
      orderNumber: r.orderNumber,
      issueDate: r.issueDate.toISOString().slice(0, 10),
      supplier: r.supplier.name,
      process: r.process,
      proformaCode: r.proformaCode,
      totalAmount: Number(r.totalAmount),
      paidAmount: Number(r.paidAmount),
      pendingAmount: Number(r.pendingAmount),
      status: r.status,
      paymentStatus: r.paymentStatus,
      responsible: r.responsible.name,
      hasCashMovement: r.cashMovements.length > 0,
      cashMovementStatus: r.cashMovements[0]?.operationStatus ?? null,
      cashMovementId: r.cashMovements[0]?.id ?? null,
    }))
  }, (demoServiceOrders as unknown[]).map((r) => ({
    ...(r as ServiceOrderRow),
    hasCashMovement: false,
    cashMovementStatus: null,
    cashMovementId: null,
  })) as ServiceOrderRow[])
}
