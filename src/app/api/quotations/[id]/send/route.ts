import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateQuotationPdf } from "@/lib/pdf/generate-quotation-pdf"
import { sendAndLogEmail } from "@/lib/email/send-and-log"
import { buildSubject, buildDefaultBodyText, isEmailConfigured } from "@/lib/email/send-document-email"
import { formatCurrency, formatDateJP, formatYearMonthJP } from "@/lib/format"

type Params = { params: Promise<{ id: string }> }
const DOCUMENT_TYPE = "quotation" as const

async function loadQuotation(id: string) {
  return prisma.quotation.findUnique({
    where: { id },
    include: { customer: true, items: { orderBy: { sortOrder: "asc" } } },
  })
}

type Quotation = NonNullable<Awaited<ReturnType<typeof loadQuotation>>>

function buildMetaRows(quotation: Quotation) {
  return [
    { label: "見積書番号", value: quotation.quotationNumber },
    { label: "お見積金額", value: formatCurrency(quotation.totalAmount) },
    { label: "有効期限", value: formatDateJP(quotation.validUntil) },
  ]
}

// メールプレビュー（既定の宛先・件名・本文）を返す
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const quotation = await loadQuotation(id)
  if (!quotation) {
    return NextResponse.json({ error: "見積書が見つかりません" }, { status: 404 })
  }

  const company = await prisma.companyProfile.findFirst()
  const companyName = company?.name ?? ""

  return NextResponse.json({
    to: quotation.customer.email ?? "",
    subject: buildSubject(DOCUMENT_TYPE, formatYearMonthJP(quotation.issueDate), companyName),
    body: buildDefaultBodyText({
      documentType: DOCUMENT_TYPE,
      customerName: quotation.customer.name,
      contactName: quotation.customer.staffName || quotation.customer.contactPerson,
      companyName,
      metaRows: buildMetaRows(quotation),
    }),
  })
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params

  const quotation = await loadQuotation(id)
  if (!quotation) {
    return NextResponse.json({ error: "見積書が見つかりません" }, { status: 404 })
  }

  if (!quotation.customer.email) {
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
  const metaRows = buildMetaRows(quotation)
  const subject =
    typeof payload.subject === "string" && payload.subject.trim()
      ? payload.subject
      : buildSubject(DOCUMENT_TYPE, formatYearMonthJP(quotation.issueDate), company.name)
  const bodyText =
    typeof payload.body === "string" && payload.body.trim()
      ? payload.body
      : buildDefaultBodyText({
          documentType: DOCUMENT_TYPE,
          customerName: quotation.customer.name,
          contactName: quotation.customer.staffName || quotation.customer.contactPerson,
          companyName: company.name,
          metaRows,
        })

  try {
    const pdfBuffer = await generateQuotationPdf(quotation, company)

    await sendAndLogEmail({
      fromName: company.name,
      documentType: DOCUMENT_TYPE,
      documentId: quotation.id,
      documentNumber: quotation.quotationNumber,
      to: quotation.customer.email,
      subject,
      bodyText,
      pdfBuffer,
    })

    // 下書きの場合は送付済みに更新
    if (quotation.status === "draft") {
      await prisma.quotation.update({
        where: { id },
        data: { status: "sent", sentAt: new Date() },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "メール送信に失敗しました"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
