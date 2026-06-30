"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export type ServiceLineInput = {
  description: string
  quantity: number
  unit: string
  unitPrice: number
}

export type CreateServiceOrderResult = { error: string } | { success: true; orderNumber: string }
export type UpdateServiceOrderResult = { error: string } | { success: true }
export type CancelServiceOrderResult = { error: string } | { success: true }

export async function createServiceOrder(data: {
  supplierId: string
  process: string
  proformaCode?: string
  issueDate: string
  expectedDate?: string
  notes?: string
  lines: ServiceLineInput[]
}): Promise<CreateServiceOrderResult> {
  if (!process.env.DATABASE_URL) {
    return { error: "Base de datos no conectada. Configura DATABASE_URL en .env." }
  }
  if (!data.supplierId) return { error: "El taller/proveedor es obligatorio." }
  if (!data.process) return { error: "El proceso es obligatorio." }
  if (!data.lines.length || data.lines.every((l) => !l.description)) {
    return { error: "Debe ingresar al menos un servicio." }
  }

  try {
    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId }, select: { id: true } })
    if (!supplier) return { error: "El proveedor seleccionado no existe. Recarga la página e intenta de nuevo." }

    const demoUser = await prisma.user.findFirst()
    if (!demoUser) return { error: "No hay usuario demo en la BD. Ejecuta el seed primero." }

    const count = await prisma.serviceOrder.count()
    const year = new Date().getFullYear()
    const orderNumber = `OS-${year}-${String(count + 1).padStart(3, "0")}`

    const validLines = data.lines.filter((l) => l.description && l.quantity > 0 && l.unitPrice > 0)
    const totalAmount = validLines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0)

    await prisma.serviceOrder.create({
      data: {
        orderNumber,
        supplierId: data.supplierId,
        responsibleId: demoUser.id,
        process: data.process as never,
        proformaCode: data.proformaCode?.trim() || null,
        issueDate: new Date(data.issueDate),
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
        totalAmount,
        paidAmount: 0,
        pendingAmount: totalAmount,
        notes: data.notes?.trim() || null,
        items: {
          create: validLines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unit: l.unit,
            unitPrice: l.unitPrice,
            subtotal: l.quantity * l.unitPrice,
          })),
        },
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido"
    return { error: `No se pudo crear la orden: ${msg}` }
  }

  revalidatePath("/service-orders")
  redirect("/service-orders")
}

export async function updateServiceOrder(
  id: string,
  data: {
    supplierId?: string
    process?: string
    proformaCode?: string
    issueDate: string
    expectedDate?: string
    notes?: string
    lines: ServiceLineInput[]
  }
): Promise<UpdateServiceOrderResult> {
  if (!process.env.DATABASE_URL) return { error: "Base de datos no conectada." }
  if (!id) return { error: "ID de orden requerido." }

  const validLines = data.lines.filter((l) => l.description && l.quantity > 0 && l.unitPrice >= 0)
  if (!validLines.length) return { error: "Debe ingresar al menos un servicio válido." }
  const anyNegative = validLines.some((l) => l.quantity < 0 || l.unitPrice < 0)
  if (anyNegative) return { error: "Cantidades y precios deben ser positivos." }

  try {
    const order = await prisma.serviceOrder.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        paidAmount: true,
        cashMovements: { where: { isVoid: false }, select: { id: true } },
      },
    })
    if (!order) return { error: "Orden no encontrada." }
    if (order.status === "ANULADA") return { error: "No se puede editar una orden anulada." }

    const hasCashMovement = order.cashMovements.length > 0

    if (data.supplierId && hasCashMovement) {
      return { error: "No se puede cambiar el proveedor de una orden ya registrada en caja." }
    }
    if (data.supplierId) {
      const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId }, select: { id: true } })
      if (!supplier) return { error: "Proveedor no encontrado." }
    }

    const newTotal = validLines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0)
    if (newTotal < 0) return { error: "El total no puede ser negativo." }
    const paidAmount = Number(order.paidAmount)

    await prisma.$transaction(async (tx) => {
      await tx.serviceOrderItem.deleteMany({ where: { serviceOrderId: id } })
      await tx.serviceOrder.update({
        where: { id },
        data: {
          ...(data.supplierId && !hasCashMovement ? { supplierId: data.supplierId } : {}),
          ...(data.process && !hasCashMovement ? { process: data.process as never } : {}),
          proformaCode: data.proformaCode?.trim() || null,
          issueDate: new Date(data.issueDate),
          expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
          notes: data.notes?.trim() || null,
          ...(!hasCashMovement
            ? {
                totalAmount: newTotal,
                pendingAmount: Math.max(0, newTotal - paidAmount),
              }
            : {}),
          items: {
            create: validLines.map((l) => ({
              description: l.description,
              quantity: l.quantity,
              unit: l.unit,
              unitPrice: l.unitPrice,
              subtotal: l.quantity * l.unitPrice,
            })),
          },
        },
      })
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido"
    return { error: `No se pudo actualizar la orden: ${msg}` }
  }

  revalidatePath("/service-orders")
  revalidatePath(`/service-orders/${id}/edit`)
  redirect("/service-orders")
}

export async function cancelServiceOrder(
  id: string,
  reason: string
): Promise<CancelServiceOrderResult> {
  if (!process.env.DATABASE_URL) return { error: "Base de datos no conectada." }
  if (!id) return { error: "ID de orden requerido." }
  if (!reason?.trim()) return { error: "Debe ingresar un motivo de anulación." }

  try {
    const order = await prisma.serviceOrder.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        paidAmount: true,
        cashMovements: {
          where: { isVoid: false },
          select: { id: true, payments: { select: { id: true } } },
        },
      },
    })
    if (!order) return { error: "Orden no encontrada." }
    if (order.status === "ANULADA") return { error: "La orden ya está anulada." }
    if (Number(order.paidAmount) > 0) {
      return { error: "No se puede anular una orden con pagos registrados." }
    }
    const cmWithPayments = order.cashMovements.filter((cm) => cm.payments.length > 0)
    if (cmWithPayments.length > 0) {
      return { error: "No se puede anular: el movimiento de caja asociado tiene pagos." }
    }

    await prisma.$transaction(async (tx) => {
      if (order.cashMovements.length > 0) {
        await tx.cashMovement.updateMany({
          where: { id: { in: order.cashMovements.map((cm) => cm.id) } },
          data: { isVoid: true, voidReason: `OS anulada: ${reason.trim()}` },
        })
      }
      await tx.serviceOrder.update({
        where: { id },
        data: { status: "ANULADA", voidReason: reason.trim() },
      })
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido"
    return { error: `No se pudo anular la orden: ${msg}` }
  }

  revalidatePath("/service-orders")
  revalidatePath("/cash-flow")
  return { success: true }
}
