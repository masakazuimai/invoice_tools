import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateNextDocumentNumber } from "@/lib/document-number"

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params

  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    })

    if (!quotation) {
      return NextResponse.json({ error: "見積書が見つかりません" }, { status: 404 })
    }

    const deliveryNoteNumber = await generateNextDocumentNumber("deliveryNote")
    const now = new Date()

    const deliveryNote = await prisma.deliveryNote.create({
      data: {
        deliveryNoteNumber,
        customerId: quotation.customerId,
        quotationId: quotation.id,
        issueDate: now,
        deliveryDate: now,
        subject: quotation.subject,
        subtotal: quotation.subtotal,
        taxAmount10: quotation.taxAmount10,
        taxAmount8: quotation.taxAmount8,
        totalAmount: quotation.totalAmount,
        notes: quotation.notes,
        items: {
          create: quotation.items.map((item) => ({
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

    // 見積書を承認済みに更新
    await prisma.quotation.update({
      where: { id },
      data: { status: "accepted" },
    })

    return NextResponse.json(deliveryNote, { status: 201 })
  } catch (error) {
    console.error("納品書変換エラー:", error)
    const message = error instanceof Error ? error.message : "変換に失敗しました"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
