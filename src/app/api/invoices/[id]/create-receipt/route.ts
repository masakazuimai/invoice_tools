import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateNextDocumentNumber } from "@/lib/document-number"

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { customer: true },
    })

    if (!invoice) {
      return NextResponse.json({ error: "請求書が見つかりません" }, { status: 404 })
    }

    if (invoice.status !== "paid") {
      return NextResponse.json({ error: "入金済みの請求書のみ領収書を発行できます" }, { status: 400 })
    }

    const receiptNumber = await generateNextDocumentNumber("receipt")

    const receipt = await prisma.receipt.create({
      data: {
        receiptNumber,
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        issueDate: new Date(),
        totalAmount: invoice.totalAmount,
        taxAmount10: invoice.taxAmount10,
        taxAmount8: invoice.taxAmount8,
        paymentMethod: body.paymentMethod ?? "bankTransfer",
        subject: body.subject ?? (invoice.subject
          ? `${invoice.subject} 代として（${invoice.invoiceNumber}）`
          : `${invoice.invoiceNumber} 代として`),
      },
    })

    return NextResponse.json(receipt, { status: 201 })
  } catch (error) {
    console.error("領収書発行エラー:", error)
    const message = error instanceof Error ? error.message : "発行に失敗しました"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
