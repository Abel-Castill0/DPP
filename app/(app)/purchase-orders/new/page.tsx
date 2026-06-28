import { getSuppliers } from "@/lib/data/suppliers"
import { getItems } from "@/lib/data/items"
import { NewPurchaseOrderForm } from "./_components/new-purchase-order-form"

export const dynamic = "force-dynamic"

export default async function NewPurchaseOrderPage() {
  const [suppliers, items] = await Promise.all([getSuppliers(), getItems()])
  const today = new Date().toISOString().slice(0, 10)
  return <NewPurchaseOrderForm suppliers={suppliers} items={items} today={today} />
}
