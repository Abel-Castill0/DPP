import { getSuppliers } from "@/lib/data/suppliers"
import { NewServiceOrderForm } from "./_components/new-service-order-form"

export const dynamic = "force-dynamic"

export default async function NewServiceOrderPage() {
  const suppliers = await getSuppliers()
  const today = new Date().toISOString().slice(0, 10)
  return <NewServiceOrderForm suppliers={suppliers} today={today} />
}
