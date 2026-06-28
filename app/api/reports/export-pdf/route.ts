import { type NextRequest } from "next/server"
import { buildFilters, getReportsData } from "@/lib/data/reports"
import { generateReportsPdf } from "@/lib/pdf/reports-pdf"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const sp = Object.fromEntries(request.nextUrl.searchParams.entries())
    const filters = buildFilters(sp)
    const data = await getReportsData(filters)
    const buffer = await generateReportsPdf(data)
    const date = new Date().toISOString().slice(0, 10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Response(buffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="dpp-reportes-${date}.pdf"`,
        "Cache-Control": "no-store",
      },
    })
  } catch {
    return new Response("Error al generar exportación.", { status: 500 })
  }
}
