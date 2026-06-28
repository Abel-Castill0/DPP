export const dynamic = "force-dynamic"

import { Header } from "@/components/header"
import { ReportsClient } from "@/components/reports-client"
import { buildFilters, getReportsData } from "@/lib/data/reports"

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const filters = buildFilters(sp)
  const data = await getReportsData(filters)

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
