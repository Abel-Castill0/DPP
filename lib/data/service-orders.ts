import { prisma, withDb } from "@/lib/prisma"
import { demoServiceOrders } from "@/lib/demo-data"

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
