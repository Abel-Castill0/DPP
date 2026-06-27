"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export type CreateItemResult = { error: string } | { success: true }

export async function createItem(data: {
  name: string
  itemType: string
  category: string
  unit: string
  description?: string
}): Promise<CreateItemResult> {
  if (!process.env.DATABASE_URL) {
    return { error: "Base de datos no conectada. Configura DATABASE_URL en .env." }
  }
  if (!data.name.trim()) return { error: "El nombre es obligatorio." }
  if (!data.itemType) return { error: "El tipo es obligatorio." }
  if (!data.category) return { error: "La categoría es obligatoria." }

  try {
    const prefix = data.itemType === "INSUMO" ? "I" : "S"
    const count = await prisma.item.count({ where: { itemType: data.itemType as never } })
    const code = `${prefix}${String(count + 1).padStart(3, "0")}`
    await prisma.item.create({
      data: {
        code,
        name: data.name.trim(),
        itemType: data.itemType as never,
        category: data.category as never,
        unit: data.unit || "UND",
        description: data.description?.trim() || null,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido"
    return { error: `No se pudo crear el ítem: ${msg}` }
  }

  revalidatePath("/items")
  redirect("/items")
}
