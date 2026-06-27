import { getItems } from "@/lib/data/items"
import { ItemsClientPage } from "@/components/items-client-page"

export default async function ItemsPage() {
  const items = await getItems()
  const isDemo = !process.env.DATABASE_URL
  return <ItemsClientPage items={items} isDemo={isDemo} />
}
