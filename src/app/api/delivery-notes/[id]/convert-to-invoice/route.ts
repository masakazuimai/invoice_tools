import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateNextDocumentNumber } from "@/lib/document-number"

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params

  try {
    const deliveryNote = await prisma.deliveryNote.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    })

    if (!deliveryNote) {
      return NextResponse.json({ error: "納品書が見つかりません" }, { status: 404 })
    }

    const invoiceNumber = await generateNextDocumentNumber("invoice")
    const now = new Date()
    const dueDate = new Date(now.getFullYear(), now.getMonth() + 2, 0)

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: deliveryNote.customerId,
        deliveryNoteId: deliveryNote.id,
        issueDate: now,
        dueDate,
        subject: deliveryNote.subject,
        subtotal: deliveryNote.subtotal,
        taxAmount10: deliveryNote.taxAmount10,
        taxAmount8: deliveryNote.taxAmount8,
        totalAmount: deliveryNote.totalAmount,
        notes: deliveryNote.notes,
        items: {
          create: deliveryNote.items.map((item) => ({
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
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error("請求書変換エラー:", error)
    const message = error instanceof Error ? error.message : "変換に失敗しました"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
