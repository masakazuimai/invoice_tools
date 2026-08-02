import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateInvoicePdf } from "@/lib/pdf/generate-invoice-pdf"
import { sendAndLogEmail } from "@/lib/email/send-and-log"
import { buildSubject, buildDefaultBodyText, isEmailConfigured } from "@/lib/email/send-document-email"
import { formatCurrency, formatDateJP, formatYearMonthJP } from "@/lib/format"

type Params = { params: Promise<{ id: string }> }
const DOCUMENT_TYPE = "invoice" as const

async function loadInvoice(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, items: { orderBy: { sortOrder: "asc" } } },
  })
}

type Invoice = NonNullable<Awaited<ReturnType<typeof loadInvoice>>>

// メール件名に使う表記。書類の件名を優先し、未入力なら対象月表記にする
function buildSubjectTitle(invoice: Invoice) {
  return invoice.subject?.trim() || formatYearMonthJP(invoice.issueDate)
}

function buildMetaRows(invoice: Invoice) {
  return [
    { label: "請求書番号", value: invoice.invoiceNumber },
    { label: "ご請求金額", value: formatCurrency(invoice.totalAmount) },
    { label: "お支払期限", value: formatDateJP(invoice.dueDate) },
  ]
}

// メールプレビュー（既定の宛先・件名・本文）を返す
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const invoice = await loadInvoice(id)
  if (!invoice) {
    return NextResponse.json({ error: "請求書が見つかりません" }, { status: 404 })
  }

  const company = await prisma.companyProfile.findFirst()
  const companyName = company?.name ?? ""

  return NextResponse.json({
    to: invoice.customer.email ?? "",
    subject: buildSubject(DOCUMENT_TYPE, buildSubjectTitle(invoice), companyName),
    body: buildDefaultBodyText({
      documentType: DOCUMENT_TYPE,
      customerName: invoice.customer.name,
      contactName: invoice.customer.staffName || invoice.customer.contactPerson,
      companyName,
      metaRows: buildMetaRows(invoice),
    }),
  })
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params

  const invoice = await loadInvoice(id)
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
    return NextResponse.json({ error: "自社情報が設定されていません" }, { status: 400 })
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "メール送信の設定がされていません（SMTP設定）" },
      { status: 400 }
    )
  }

  const payload = await request.json().catch(() => ({}))
  const metaRows = buildMetaRows(invoice)
  const subject =
    typeof payload.subject === "string" && payload.subject.trim()
      ? payload.subject
      : buildSubject(DOCUMENT_TYPE, buildSubjectTitle(invoice), company.name)
  const bodyText =
    typeof payload.body === "string" && payload.body.trim()
      ? payload.body
      : buildDefaultBodyText({
          documentType: DOCUMENT_TYPE,
          customerName: invoice.customer.name,
          contactName: invoice.customer.staffName || invoice.customer.contactPerson,
          companyName: company.name,
          metaRows,
        })

  try {
    const pdfBuffer = await generateInvoicePdf(invoice, company)

    await sendAndLogEmail({
      fromName: company.name,
      documentType: DOCUMENT_TYPE,
      documentId: invoice.id,
      documentNumber: invoice.invoiceNumber,
      to: invoice.customer.email,
      subject,
      bodyText,
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
