import { prisma, withDb } from "@/lib/prisma"
import { demoCashMovements } from "@/lib/demo-data"

export type CashMovementRow = {
  id: string
  date: string
  type: string
  origin: string
  orderNumber: string | null
  purchaseOrderId: string | null
  serviceOrderId: string | null
  operationStatus: string
  category: string
  description: string | null
  party: string
  invoiceNumber: string | null
  abono: number
  invoiceAmount: number | null
  aPagar: number
  saldo: number
  paymentCount: number
}

export async function getCashMovements(): Promise<CashMovementRow[]> {
  return withDb(async () => {
    const rows = await prisma.cashMovement.findMany({
      select: {
        id: true,
        date: true,
        type: true,
        origin: true,
        operationStatus: true,
        category: true,
        description: true,
        abono: true,
        invoiceAmount: true,
        purchaseOrderId: true,
        serviceOrderId: true,
        supplier: { select: { name: true } },
        purchaseOrder: { select: { orderNumber: true } },
        serviceOrder: { select: { orderNumber: true } },
        _count: { select: { payments: true } },
      },
      orderBy: { date: "desc" },
      where: { isVoid: false },
    })
    let running = 0
    const withBalance = rows.reverse().map((r) => {
      const amount = Number(r.abono)
      if (r.type === "INGRESO") running += amount
      else running -= amount
      const invoice = Number(r.invoiceAmount ?? 0)
      return {
        id: r.id,
        date: r.date.toISOString().slice(0, 10),
        type: r.type,
        origin: r.origin,
        orderNumber: r.purchaseOrder?.orderNumber ?? r.serviceOrder?.orderNumber ?? null,
        purchaseOrderId: r.purchaseOrderId,
        serviceOrderId: r.serviceOrderId,
        operationStatus: r.operationStatus,
        category: r.category,
        description: r.description,
        party: r.supplier?.name ?? "—",
        invoiceNumber: null,
        abono: amount,
        invoiceAmount: invoice > 0 ? invoice : null,
        aPagar: Math.max(0, invoice - amount),
        saldo: running,
        paymentCount: r._count.payments,
      }
    })
    return withBalance.reverse()
  }, (demoCashMovements as unknown[]).map((m) => ({
    ...(m as CashMovementRow),
    purchaseOrderId: null,
    serviceOrderId: null,
    paymentCount: 0,
  })) as CashMovementRow[])
}
