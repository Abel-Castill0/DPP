import { prisma } from "@/lib/prisma"
import { demoItems } from "@/lib/demo-data"

export type ItemRow = {
  id: string
  code: string | null
  name: string
  itemType: string
  category: string
  unit: string
  isActive: boolean
}

export async function getItems(): Promise<ItemRow[]> {
  if (!process.env.DATABASE_URL) return demoItems as ItemRow[]
  try {
    return await prisma.item.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        itemType: true,
        category: true,
        unit: true,
        isActive: true,
      },
      orderBy: { code: "asc" },
    })
  } catch {
    return demoItems as ItemRow[]
  }
}
