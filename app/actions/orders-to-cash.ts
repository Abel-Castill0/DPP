"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireUserId } from "@/lib/session"

type Result = { error: string } | { success: true }

const processToCategory: Record<string, string> = {
  CORTE: "CORTE",
  CONFECCION: "CONFECCION",
  ESTAMPADO: "ESTAMPADO",
  BORDADO: "CONFECCION",
  ACABADO: "ACABADO_EMPAQUE",
  EMPAQUE: "ACABADO_EMPAQUE",
  LAVADO: "ACABADO_EMPAQUE",
  OTROS: "OTROS",
}

export async function generateFromPurchaseOrder(orderId: string): Promise<Result> {
  if (!process.env.DATABASE_URL) return { error: "Sin conexión a BD." }

  const existing = await prisma.cashMovement.findFirst({
    where: { purchaseOrderId: orderId, isVoid: false },
  })
  if (existing) return { error: "Ya existe un movimiento de caja para esta OC." }

  const order = await prisma.purchaseOrder.findUnique({
    where: { id: orderId },
    include: { supplier: true },
  })
  if (!order) return { error: "OC no encontrada." }
  if (order.isVoid) return { error: "La OC está anulada." }

  const totalAmount = Number(order.totalAmount)
  if (totalAmount <= 0) return { error: "La OC tiene monto cero. Agrega ítems con precio antes de enviar a caja." }

  const session = await requireUserId()
  if ("error" in session) return session

  await prisma.cashMovement.create({
    data: {
      date: new Date(),
      type: "EGRESO",
      origin: "ORDEN_COMPRA",
      operationStatus: "POR_PAGAR",
      category: "COMPRA",
      purchaseOrderId: orderId,
      supplierId: order.supplierId,
      invoiceAmount: totalAmount,
      abono: 0,
      expenseAmount: 0,
      incomeAmount: 0,
      retencion: 0,
      detraccion: 0,
      description: `OC ${order.orderNumber} — ${order.supplier.name}`,
      createdById: session.userId,
    },
  })

  revalidatePath("/cash-flow")
  revalidatePath("/purchase-orders")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function generateFromServiceOrder(orderId: string): Promise<Result> {
  if (!process.env.DATABASE_URL) return { error: "Sin conexión a BD." }

  const existing = await prisma.cashMovement.findFirst({
    where: { serviceOrderId: orderId, isVoid: false },
  })
  if (existing) return { error: "Ya existe un movimiento de caja para esta OS." }

  const order = await prisma.serviceOrder.findUnique({
    where: { id: orderId },
    include: { supplier: true },
  })
  if (!order) return { error: "OS no encontrada." }
  if (order.isVoid) return { error: "La OS está anulada." }

  const totalAmount = Number(order.totalAmount)
  if (totalAmount <= 0) return { error: "La OS tiene monto cero. Agrega ítems con precio antes de enviar a caja." }

  const session = await requireUserId()
  if ("error" in session) return session

  const category = processToCategory[order.process] ?? "OTROS"

  await prisma.cashMovement.create({
    data: {
      date: new Date(),
      type: "EGRESO",
      origin: "ORDEN_SERVICIO",
      operationStatus: "POR_PAGAR",
      category: category as never,
      serviceOrderId: orderId,
      supplierId: order.supplierId,
      invoiceAmount: totalAmount,
      abono: 0,
      expenseAmount: 0,
      incomeAmount: 0,
      retencion: 0,
      detraccion: 0,
      description: `OS ${order.orderNumber} — ${order.process} · ${order.supplier.name}`,
      createdById: session.userId,
    },
  })

  revalidatePath("/cash-flow")
  revalidatePath("/service-orders")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function markMovementPaid(movementId: string): Promise<Result> {
  if (!process.env.DATABASE_URL) return { error: "Sin conexión a BD." }

  const movement = await prisma.cashMovement.findUnique({
    where: { id: movementId },
  })
  if (!movement) return { error: "Movimiento no encontrado." }
  if (movement.isVoid) return { error: "El movimiento está anulado." }

  const totalAmount = Number(movement.invoiceAmount ?? 0)
  if (totalAmount <= 0) return { error: "El monto es cero. No se puede marcar como pagado." }

  const session = await requireUserId()
  const updatedById = "error" in session ? null : session.userId

  await prisma.$transaction(async (tx) => {
    await tx.cashMovement.update({
      where: { id: movementId },
      data: {
        operationStatus: "COBRADO",
        abono: totalAmount,
        expenseAmount: movement.type === "EGRESO" ? totalAmount : 0,
        incomeAmount: movement.type === "INGRESO" ? totalAmount : 0,
        updatedById,
      },
    })

    if (movement.purchaseOrderId) {
      await tx.purchaseOrder.update({
        where: { id: movement.purchaseOrderId },
        data: {
          paymentStatus: "PAGADO",
          paidAmount: totalAmount,
          pendingAmount: 0,
        },
      })
    }

    if (movement.serviceOrderId) {
      await tx.serviceOrder.update({
        where: { id: movement.serviceOrderId },
        data: {
          paymentStatus: "PAGADO",
          paidAmount: totalAmount,
          pendingAmount: 0,
        },
      })
    }
  })

  revalidatePath("/cash-flow")
  revalidatePath("/purchase-orders")
  revalidatePath("/service-orders")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function markMovementPending(movementId: string): Promise<Result> {
  if (!process.env.DATABASE_URL) return { error: "Sin conexión a BD." }

  const session = await requireUserId()
  const updatedById = "error" in session ? null : session.userId

  await prisma.cashMovement.update({
    where: { id: movementId },
    data: {
      operationStatus: "POR_PAGAR",
      abono: 0,
      expenseAmount: 0,
      incomeAmount: 0,
      updatedById,
    },
  })

  revalidatePath("/cash-flow")
  revalidatePath("/purchase-orders")
  revalidatePath("/service-orders")
  return { success: true }
}
