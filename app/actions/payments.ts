"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

type Result<T = true> = { error: string } | { success: T }

// Recalcula operationStatus y abono en CashMovement según pagos actuales
async function recalc(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], movementId: string) {
  const movement = await tx.cashMovement.findUnique({
    where: { id: movementId },
    select: { invoiceAmount: true },
  })
  const invoiceAmount = Number(movement?.invoiceAmount ?? 0)

  const agg = await tx.payment.aggregate({
    where: { cashMovementId: movementId },
    _sum: { amount: true },
  })
  const totalAbonado = Number(agg._sum.amount ?? 0)

  let operationStatus: "POR_PAGAR" | "ADELANTO" | "COBRADO"
  if (totalAbonado <= 0) operationStatus = "POR_PAGAR"
  else if (invoiceAmount > 0 && totalAbonado >= invoiceAmount) operationStatus = "COBRADO"
  else operationStatus = "ADELANTO"

  await tx.cashMovement.update({
    where: { id: movementId },
    data: {
      abono: totalAbonado,
      expenseAmount: totalAbonado,
      operationStatus,
    },
  })

  return { totalAbonado, invoiceAmount, operationStatus }
}

export async function registerPayment(data: {
  cashMovementId: string
  amount: number
  date: string
  paymentMethod: string
  operationNumber?: string
  notes?: string
}): Promise<Result> {
  if (!process.env.DATABASE_URL) return { error: "Sin conexión a BD." }
  if (!data.amount || data.amount <= 0) return { error: "El monto debe ser mayor a cero." }
  if (!data.date) return { error: "La fecha es obligatoria." }
  if (!data.paymentMethod) return { error: "El método de pago es obligatorio." }

  const movement = await prisma.cashMovement.findUnique({
    where: { id: data.cashMovementId },
    select: { invoiceAmount: true, abono: true, isVoid: true },
  })
  if (!movement) return { error: "Movimiento no encontrado." }
  if (movement.isVoid) return { error: "El movimiento está anulado." }

  const invoiceAmount = Number(movement.invoiceAmount ?? 0)
  const abonoActual = Number(movement.abono)
  const saldoPendiente = invoiceAmount - abonoActual

  if (invoiceAmount <= 0) return { error: "El movimiento no tiene importe definido." }
  if (saldoPendiente <= 0) return { error: "Este movimiento ya está completamente pagado." }
  if (data.amount > saldoPendiente + 0.001) {
    return { error: `El pago (S/ ${data.amount.toFixed(2)}) supera el saldo pendiente (S/ ${saldoPendiente.toFixed(2)}).` }
  }

  const demoUser = await prisma.user.findFirst()

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        cashMovementId: data.cashMovementId,
        amount: data.amount,
        date: new Date(data.date),
        paymentMethod: data.paymentMethod as never,
        operationNumber: data.operationNumber?.trim() || null,
        notes: data.notes?.trim() || null,
        createdById: demoUser?.id ?? null,
      },
    })
    const { operationStatus, totalAbonado } = await recalc(tx, data.cashMovementId)

    // Sync paymentStatus en OC/OS si aplica
    const cm = await tx.cashMovement.findUnique({
      where: { id: data.cashMovementId },
      select: { purchaseOrderId: true, serviceOrderId: true, invoiceAmount: true },
    })
    const payStatus = operationStatus === "COBRADO" ? "PAGADO"
      : totalAbonado > 0 ? "ADELANTO"
      : "PENDIENTE"

    if (cm?.purchaseOrderId) {
      await tx.purchaseOrder.update({
        where: { id: cm.purchaseOrderId },
        data: {
          paidAmount: totalAbonado,
          pendingAmount: Math.max(0, Number(cm.invoiceAmount ?? 0) - totalAbonado),
          paymentStatus: payStatus as never,
        },
      })
    }
    if (cm?.serviceOrderId) {
      await tx.serviceOrder.update({
        where: { id: cm.serviceOrderId },
        data: {
          paidAmount: totalAbonado,
          pendingAmount: Math.max(0, Number(cm.invoiceAmount ?? 0) - totalAbonado),
          paymentStatus: payStatus as never,
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

export async function revertLastPayment(cashMovementId: string): Promise<Result> {
  if (!process.env.DATABASE_URL) return { error: "Sin conexión a BD." }

  const lastPayment = await prisma.payment.findFirst({
    where: { cashMovementId },
    orderBy: { createdAt: "desc" },
  })
  if (!lastPayment) return { error: "No hay pagos registrados para revertir." }

  const movement = await prisma.cashMovement.findUnique({
    where: { id: cashMovementId },
    select: { abono: true, invoiceAmount: true, purchaseOrderId: true, serviceOrderId: true },
  })
  if (!movement) return { error: "Movimiento no encontrado." }

  await prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id: lastPayment.id } })
    const { totalAbonado, operationStatus } = await recalc(tx, cashMovementId)

    const payStatus = operationStatus === "COBRADO" ? "PAGADO"
      : totalAbonado > 0 ? "ADELANTO"
      : "PENDIENTE"

    if (movement.purchaseOrderId) {
      await tx.purchaseOrder.update({
        where: { id: movement.purchaseOrderId },
        data: {
          paidAmount: totalAbonado,
          pendingAmount: Math.max(0, Number(movement.invoiceAmount ?? 0) - totalAbonado),
          paymentStatus: payStatus as never,
        },
      })
    }
    if (movement.serviceOrderId) {
      await tx.serviceOrder.update({
        where: { id: movement.serviceOrderId },
        data: {
          paidAmount: totalAbonado,
          pendingAmount: Math.max(0, Number(movement.invoiceAmount ?? 0) - totalAbonado),
          paymentStatus: payStatus as never,
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

export type PaymentHistoryItem = {
  id: string
  amount: number
  date: string
  paymentMethod: string
  operationNumber: string | null
  notes: string | null
  createdByName: string | null
  createdAt: string
}

export async function getPaymentHistory(cashMovementId: string): Promise<Result<PaymentHistoryItem[]>> {
  if (!process.env.DATABASE_URL) return { error: "Sin conexión a BD." }

  const payments = await prisma.payment.findMany({
    where: { cashMovementId },
    select: {
      id: true,
      amount: true,
      date: true,
      paymentMethod: true,
      operationNumber: true,
      notes: true,
      createdAt: true,
      createdBy: { select: { name: true } },
    },
    orderBy: { date: "asc" },
  })

  return {
    success: payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      date: p.date.toISOString().slice(0, 10),
      paymentMethod: p.paymentMethod,
      operationNumber: p.operationNumber,
      notes: p.notes,
      createdByName: p.createdBy?.name ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
  }
}
