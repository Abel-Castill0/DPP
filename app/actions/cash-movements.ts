"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireUserId } from "@/lib/session"

export type CreateMovementResult = { error: string } | { success: true }

export async function createCashMovement(data: {
  date: string
  type: "INGRESO" | "EGRESO"
  operationStatus: string
  category: string
  description?: string
  supplierId?: string
  invoiceNumber?: string
  invoiceAmount?: number
  abono: number
  retencion?: number
  detraccion?: number
  paymentMethod?: string
  operationNumber?: string
}): Promise<CreateMovementResult> {
  if (!process.env.DATABASE_URL) {
    return { error: "Base de datos no conectada. Configura DATABASE_URL en .env." }
  }
  if (!data.date) return { error: "La fecha es obligatoria." }
  if (!data.abono || data.abono <= 0) return { error: "El abono debe ser mayor a cero." }
  if (!data.operationStatus) return { error: "El tipo de operación es obligatorio." }
  if (!data.category) return { error: "La categoría es obligatoria." }

  try {
    const session = await requireUserId()
    if ("error" in session) return session

    const invoiceAmt = data.invoiceAmount ?? 0
    await prisma.cashMovement.create({
      data: {
        date: new Date(data.date),
        type: data.type as never,
        origin: "MANUAL",
        operationStatus: data.operationStatus as never,
        category: data.category as never,
        description: data.description?.trim() || null,
        supplierId: data.supplierId || null,
        invoiceAmount: invoiceAmt > 0 ? invoiceAmt : null,
        abono: data.abono,
        retencion: data.retencion ?? 0,
        detraccion: data.detraccion ?? 0,
        incomeAmount: data.type === "INGRESO" ? data.abono : 0,
        expenseAmount: data.type === "EGRESO" ? data.abono : 0,
        paymentMethod: data.paymentMethod ? (data.paymentMethod as never) : null,
        operationNumber: data.operationNumber?.trim() || null,
        createdById: session.userId,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido"
    return { error: `No se pudo crear el movimiento: ${msg}` }
  }

  revalidatePath("/cash-flow")
  redirect("/cash-flow")
}
