import { type NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generatePurchaseOrderPdf } from "@/lib/pdf/order-pdf"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 })
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Sin base de datos configurada." }, { status: 503 })
  }

  try {
    const { id } = await params
    const order = await prisma.purchaseOrder.findUnique({
      where: { id, isVoid: false },
      include: {
        supplier:    { select: { name: true, ruc: true, address: true } },
        responsible: { select: { name: true } },
        items:       { orderBy: { id: "asc" } },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 })
    }

    const buffer = await generatePurchaseOrderPdf({
      orderNumber:   order.orderNumber,
      issueDate:     order.issueDate.toISOString().slice(0, 10),
      expectedDate:  order.expectedDate?.toISOString().slice(0, 10) ?? null,
      status:        order.status,
      paymentStatus: order.paymentStatus,
      totalAmount:   Number(order.totalAmount),
      paidAmount:    Number(order.paidAmount),
      pendingAmount: Number(order.pendingAmount),
      notes:         order.notes,
      supplier:      order.supplier,
      responsible:   order.responsible,
      items:         order.items.map((item) => ({
        description: item.description,
        quantity:    Number(item.quantity),
        unit:        item.unit,
        unitPrice:   Number(item.unitPrice),
        subtotal:    Number(item.subtotal),
      })),
    })

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `inline; filename="OC-${order.orderNumber}.pdf"`,
        "Cache-Control":       "no-store",
      },
    })
  } catch {
    return NextResponse.json({ error: "Error al generar el PDF." }, { status: 500 })
  }
}
