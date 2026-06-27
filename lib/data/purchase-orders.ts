import { prisma, withDb } from "@/lib/prisma"
import { demoPurchaseOrders } from "@/lib/demo-data"

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
    }))
  }, demoPurchaseOrders as PurchaseOrderRow[])
}
