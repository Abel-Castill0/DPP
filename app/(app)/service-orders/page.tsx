export const dynamic = "force-dynamic"

import { getServiceOrders } from "@/lib/data/service-orders"
import { ServiceOrdersClientPage } from "@/components/service-orders-client-page"

export default async function ServiceOrdersPage() {
  const orders = await getServiceOrders()
  const isDemo = !process.env.DATABASE_URL
  return <ServiceOrdersClientPage orders={orders} isDemo={isDemo} />
}
