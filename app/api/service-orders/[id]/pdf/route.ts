import { type NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateServiceOrderPdf } from "@/lib/pdf/order-pdf"

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
    const order = await prisma.serviceOrder.findUnique({
      where: { id, isVoid: false },
      include: {
        supplier:    { select: { name: true, ruc: true, address: true } },
        responsible: { select: { name: true } },
        style:       { select: { code: true, name: true } },
        items:       { orderBy: { id: "asc" } },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 })
    }

    const buffer = await generateServiceOrderPdf({
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
      process:       order.process,
      proformaCode:  order.proformaCode,
      style:         order.style ?? null,
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
        "Content-Disposition": `inline; filename="OS-${order.orderNumber}.pdf"`,
        "Cache-Control":       "no-store",
      },
    })
  } catch {
    return NextResponse.json({ error: "Error al generar el PDF." }, { status: 500 })
  }
}
