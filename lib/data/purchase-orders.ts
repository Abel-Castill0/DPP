import { prisma, withDb } from "@/lib/prisma"
import { demoPurchaseOrders } from "@/lib/demo-data"

export type PurchaseOrderDetail = {
  id: string
  orderNumber: string
  supplierId: string
  supplierName: string
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

export async function getPurchaseOrderDetail(id: string): Promise<PurchaseOrderDetail | null> {
  if (!process.env.DATABASE_URL) return null
  const row = await prisma.purchaseOrder.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      supplierId: true,
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
  const activeCashMovements = row.cashMovements
  const hasCashMovement = activeCashMovements.length > 0
  const hasPayments = Number(row.paidAmount) > 0
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    supplierId: row.supplierId,
    supplierName: row.supplier.name,
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

export type PurchaseOrderRow = {
  id: string
  orderNumber: string
  issueDate: string
  supplier: string
  mainItem: string
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

export async function getPurchaseOrders(): Promise<PurchaseOrderRow[]> {
  return withDb(async () => {
    const rows = await prisma.purchaseOrder.findMany({
      select: {
        id: true,
        orderNumber: true,
        issueDate: true,
        status: true,
        paymentStatus: true,
        totalAmount: true,
        paidAmount: true,
        pendingAmount: true,
        supplier: { select: { name: true } },
        responsible: { select: { name: true } },
        items: {
          select: { description: true },
          take: 1,
          orderBy: { id: "asc" },
        },
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
      mainItem: r.items[0]?.description ?? "—",
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
  }, (demoPurchaseOrders as unknown[]).map((r) => ({
    ...(r as PurchaseOrderRow),
    hasCashMovement: false,
    cashMovementStatus: null,
    cashMovementId: null,
  })) as PurchaseOrderRow[])
}
