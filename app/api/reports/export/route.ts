import { type NextRequest } from "next/server"
import { buildFilters, getReportsData } from "@/lib/data/reports"
import { generateReportsWorkbook } from "@/lib/excel/reports-workbook"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const sp = Object.fromEntries(request.nextUrl.searchParams.entries())
  const filters = buildFilters(sp)
  const data = await getReportsData(filters)
  const buffer = await generateReportsWorkbook(data)
  const date = new Date().toISOString().slice(0, 10)

  // Uint8Array<ArrayBufferLike> vs DOM BodyInit generic mismatch — safe at runtime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Response(buffer as any, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="dpp-reportes-${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  })
}
