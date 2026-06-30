export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import { getPurchaseOrderDetail } from "@/lib/data/purchase-orders"
import { getSuppliers } from "@/lib/data/suppliers"
import { getItems } from "@/lib/data/items"
import { EditPurchaseOrderForm } from "./_components/edit-purchase-order-form"

export default async function EditPurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [order, suppliers, items] = await Promise.all([
    getPurchaseOrderDetail(id),
    getSuppliers(),
    getItems(),
  ])

  if (!order) notFound()

  const today = new Date().toISOString().slice(0, 10)
  return <EditPurchaseOrderForm order={order} suppliers={suppliers} items={items} today={today} />
}
