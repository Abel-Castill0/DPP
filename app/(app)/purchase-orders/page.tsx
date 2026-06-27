import { getPurchaseOrders } from "@/lib/data/purchase-orders"
import { PurchaseOrdersClientPage } from "@/components/purchase-orders-client-page"

export default async function PurchaseOrdersPage() {
  const orders = await getPurchaseOrders()
  const isDemo = !process.env.DATABASE_URL
  return <PurchaseOrdersClientPage orders={orders} isDemo={isDemo} />
}
