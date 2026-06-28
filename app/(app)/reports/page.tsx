export const dynamic = "force-dynamic"

import { Header } from "@/components/header"
import { ReportsClient } from "@/components/reports-client"
import { getReportsData } from "@/lib/data/reports"

export default async function ReportsPage() {
  const data = await getReportsData()
  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Reportes gerenciales"
        subtitle="Indicadores financieros y operativos basados en órdenes, caja y pagos."
      />
      <ReportsClient data={data} />
    </div>
  )
}
