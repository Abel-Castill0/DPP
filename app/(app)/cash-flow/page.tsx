import { getCashMovements } from "@/lib/data/cash-movements"
import { CashFlowClientPage } from "@/components/cash-flow-client-page"

export default async function CashFlowPage() {
  const movements = await getCashMovements()
  const isDemo = !process.env.DATABASE_URL
  return <CashFlowClientPage movements={movements} isDemo={isDemo} />
}
