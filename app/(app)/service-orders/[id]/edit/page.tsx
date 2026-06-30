export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import { getServiceOrderDetail } from "@/lib/data/service-orders"
import { getSuppliers } from "@/lib/data/suppliers"
import { getItems } from "@/lib/data/items"
import { EditServiceOrderForm } from "./_components/edit-service-order-form"

export default async function EditServiceOrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [order, suppliers, items] = await Promise.all([
    getServiceOrderDetail(id),
    getSuppliers(),
    getItems(),
  ])

  if (!order) notFound()

  const today = new Date().toISOString().slice(0, 10)
  return <EditServiceOrderForm order={order} suppliers={suppliers} items={items} today={today} />
}
