import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateNextDocumentNumber } from "@/lib/document-number"

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))

  try {
    const deliveryNote = await prisma.deliveryNote.findUnique({
      where: { id },
      include: { customer: true },
    })

    if (!deliveryNote) {
      return NextResponse.json({ error: "納品書が見つかりません" }, { status: 404 })
    }

    // 納品書→請求書→領収書の流れが正式だが、直接発行も可能にする
    // invoiceId は必須なので、まず請求書を自動生成する
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
        status: "paid",
        sentAt: now,
        paidAt: now,
        subtotal: deliveryNote.subtotal,
        taxAmount10: deliveryNote.taxAmount10,
        taxAmount8: deliveryNote.taxAmount8,
        totalAmount: deliveryNote.totalAmount,
        notes: deliveryNote.notes,
        items: {
          create: (await prisma.deliveryNoteItem.findMany({
            where: { deliveryNoteId: id },
            orderBy: { sortOrder: "asc" },
          })).map((item) => ({
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

    const receiptNumber = await generateNextDocumentNumber("receipt")

    const receipt = await prisma.receipt.create({
      data: {
        receiptNumber,
        customerId: deliveryNote.customerId,
        invoiceId: invoice.id,
        issueDate: now,
        totalAmount: deliveryNote.totalAmount,
        taxAmount10: deliveryNote.taxAmount10,
        taxAmount8: deliveryNote.taxAmount8,
        paymentMethod: body.paymentMethod ?? "bankTransfer",
        subject: body.subject ?? (deliveryNote.subject
          ? `${deliveryNote.subject} 代として（${deliveryNote.deliveryNoteNumber}）`
          : `${deliveryNote.deliveryNoteNumber} 代として`),
      },
    })

    return NextResponse.json(receipt, { status: 201 })
  } catch (error) {
    console.error("領収書変換エラー:", error)
    const message = error instanceof Error ? error.message : "変換に失敗しました"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
