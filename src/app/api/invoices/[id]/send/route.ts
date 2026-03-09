import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateInvoicePdf } from "@/lib/pdf/generate-invoice-pdf"
import { sendInvoiceEmail } from "@/lib/email/send-invoice-email"
import { formatCurrency, formatDateJP } from "@/lib/format"

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { orderBy: { sortOrder: "asc" } },
    },
  })

  if (!invoice) {
    return NextResponse.json({ error: "請求書が見つかりません" }, { status: 404 })
  }

  if (!invoice.customer.email) {
    return NextResponse.json(
      { error: "顧客のメールアドレスが設定されていません" },
      { status: 400 }
    )
  }

  const company = await prisma.companyProfile.findFirst()
  if (!company) {
    return NextResponse.json(
      { error: "自社情報が設定されていません" },
      { status: 400 }
    )
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "メール送信の設定がされていません（RESEND_API_KEY）" },
      { status: 400 }
    )
  }

  try {
    const pdfBuffer = await generateInvoicePdf(invoice, company)

    await sendInvoiceEmail({
      to: invoice.customer.email,
      customerName: invoice.customer.name,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: formatCurrency(invoice.totalAmount),
      dueDate: formatDateJP(invoice.dueDate),
      companyName: company.name,
      pdfBuffer,
    })

    // ステータスを送信済みに更新
    await prisma.invoice.update({
      where: { id },
      data: { status: "sent", sentAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "メール送信に失敗しました"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
