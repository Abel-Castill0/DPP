import { prisma } from "@/lib/prisma"
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
  if (!process.env.DATABASE_URL) return demoSuppliers as SupplierRow[]
  try {
    return await prisma.supplier.findMany({
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
    })
  } catch {
    return demoSuppliers as SupplierRow[]
  }
}
