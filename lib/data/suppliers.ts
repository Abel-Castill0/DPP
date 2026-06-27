import { prisma, withDb } from "@/lib/prisma"
import { demoSuppliers } from "@/lib/demo-data"

export type SupplierRow = {
  id: string
  code: string | null
  name: string
  ruc: string | null
  supplierType: string
  contactName: string | null
  contactPhone: string | null
  bankName: string | null
  isActive: boolean
}

export async function getSuppliers(): Promise<SupplierRow[]> {
  return withDb(
    () =>
      prisma.supplier.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          ruc: true,
          supplierType: true,
          contactName: true,
          contactPhone: true,
          bankName: true,
          isActive: true,
        },
        orderBy: { code: "asc" },
      }),
    demoSuppliers as SupplierRow[],
  )
}
