import { prisma, withDb } from "@/lib/prisma"
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
  return withDb(
    () =>
      prisma.item.findMany({
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
      }),
    demoItems as ItemRow[],
  )
}
