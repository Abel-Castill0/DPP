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
