"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export type CreateSupplierResult = { error: string } | { success: true }

export async function createSupplier(data: {
  name: string
  ruc?: string
  supplierType: string
  contactName?: string
  contactPhone?: string
  bankName?: string
  notes?: string
}): Promise<CreateSupplierResult> {
  if (!process.env.DATABASE_URL) {
    return { error: "Base de datos no conectada. Configura DATABASE_URL en .env." }
  }
  if (!data.name.trim()) return { error: "El nombre es obligatorio." }

  try {
    const count = await prisma.supplier.count()
    const code = `P${String(count + 1).padStart(3, "0")}`
    await prisma.supplier.create({
      data: {
        code,
        name: data.name.trim(),
        ruc: data.ruc?.trim() || null,
        supplierType: data.supplierType as never,
        contactName: data.contactName?.trim() || null,
        contactPhone: data.contactPhone?.trim() || null,
        bankName: data.bankName?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido"
    return { error: `No se pudo crear el proveedor: ${msg}` }
  }

  revalidatePath("/suppliers")
  redirect("/suppliers")
}
