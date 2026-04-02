import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateNextDocumentNumber } from "@/lib/document-number"

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    })

    if (!invoice) {
      return NextResponse.json({ error: "請求書が見つかりません" }, { status: 404 })
    }

    const deliveryNoteNumber = await generateNextDocumentNumber("deliveryNote")
    const now = new Date()

    const deliveryNote = await prisma.deliveryNote.create({
      data: {
        deliveryNoteNumber,
        customerId: invoice.customerId,
        issueDate: now,
        deliveryDate: now,
        subject: invoice.subject,
        subtotal: invoice.subtotal,
        taxAmount10: invoice.taxAmount10,
        taxAmount8: invoice.taxAmount8,
        totalAmount: invoice.totalAmount,
        notes: invoice.notes,
        items: {
          create: invoice.items.map((item) => ({
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

    return NextResponse.json(deliveryNote, { status: 201 })
  } catch (error) {
    console.error("納品書変換エラー:", error)
    const message = error instanceof Error ? error.message : "変換に失敗しました"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
