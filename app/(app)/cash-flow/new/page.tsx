import { getSuppliers } from "@/lib/data/suppliers"
import { getSession } from "@/lib/auth"
import { NewMovementForm } from "./_components/new-movement-form"

export const dynamic = "force-dynamic"

export default async function NewMovementPage() {
  const [suppliers, session] = await Promise.all([getSuppliers(), getSession()])
  const currentUserName = session?.name ?? session?.email ?? "—"
  return <NewMovementForm suppliers={suppliers} currentUserName={currentUserName} />
}
