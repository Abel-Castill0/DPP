import { getDashboardData } from "@/lib/data/dashboard"
import { DashboardClient } from "@/components/dashboard-client"

export default async function DashboardPage() {
  const data = await getDashboardData()
  const isDemo = !process.env.DATABASE_URL
  return <DashboardClient data={data} isDemo={isDemo} />
}
