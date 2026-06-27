import { getSuppliers } from "@/lib/data/suppliers"
import { SuppliersClientPage } from "@/components/suppliers-client-page"

export default async function SuppliersPage() {
  const suppliers = await getSuppliers()
  const isDemo = !process.env.DATABASE_URL
  return <SuppliersClientPage suppliers={suppliers} isDemo={isDemo} />
}
