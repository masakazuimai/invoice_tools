import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateNextInvoiceNumber } from "@/lib/invoice-number"

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params

  const original = await prisma.invoice.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  })

  if (!original) {
    return NextResponse.json({ error: "請求書が見つかりません" }, { status: 404 })
  }

  const invoiceNumber = await generateNextInvoiceNumber()
  const today = new Date()
  // 支払期限: 翌月末
  const dueDate = new Date(today.getFullYear(), today.getMonth() + 2, 0)

  const newInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      customerId: original.customerId,
      issueDate: today,
      dueDate,
      status: "draft",
      subtotal: original.subtotal,
      taxAmount10: original.taxAmount10,
      taxAmount8: original.taxAmount8,
      totalAmount: original.totalAmount,
      notes: original.notes,
      items: {
        create: original.items.map((item) => ({
          itemId: item.itemId,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          amount: item.amount,
          sortOrder: item.sortOrder,
        })),
      },
    },
    include: { customer: true, items: true },
  })

  return NextResponse.json(newInvoice, { status: 201 })
}
