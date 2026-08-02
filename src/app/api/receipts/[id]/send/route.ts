import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateReceiptPdf } from "@/lib/pdf/generate-receipt-pdf"
import { sendAndLogEmail } from "@/lib/email/send-and-log"
import { buildSubject, buildDefaultBodyText, isEmailConfigured } from "@/lib/email/send-document-email"
import { formatCurrency, formatDateJP, formatYearMonthJP } from "@/lib/format"

type Params = { params: Promise<{ id: string }> }
const DOCUMENT_TYPE = "receipt" as const

async function loadReceipt(id: string) {
  return prisma.receipt.findUnique({
    where: { id },
    include: { customer: true, invoice: true },
  })
}

type Receipt = NonNullable<Awaited<ReturnType<typeof loadReceipt>>>

// メール件名に使う表記。書類の件名を優先し、未入力なら対象月表記にする
function buildSubjectTitle(receipt: Receipt) {
  return receipt.subject?.trim() || formatYearMonthJP(receipt.issueDate)
}

function buildMetaRows(receipt: Receipt) {
  return [
    { label: "領収書番号", value: receipt.receiptNumber },
    { label: "領収金額", value: formatCurrency(receipt.totalAmount) },
    { label: "発行日", value: formatDateJP(receipt.issueDate) },
  ]
}

// メールプレビュー（既定の宛先・件名・本文）を返す
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const receipt = await loadReceipt(id)
  if (!receipt) {
    return NextResponse.json({ error: "領収書が見つかりません" }, { status: 404 })
  }

  const company = await prisma.companyProfile.findFirst()
  const companyName = company?.name ?? ""

  return NextResponse.json({
    to: receipt.customer.email ?? "",
    subject: buildSubject(DOCUMENT_TYPE, buildSubjectTitle(receipt), companyName),
    body: buildDefaultBodyText({
      documentType: DOCUMENT_TYPE,
      customerName: receipt.customer.name,
      contactName: receipt.customer.staffName || receipt.customer.contactPerson,
      companyName,
      metaRows: buildMetaRows(receipt),
    }),
  })
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params

  const receipt = await loadReceipt(id)
  if (!receipt) {
    return NextResponse.json({ error: "領収書が見つかりません" }, { status: 404 })
  }

  if (!receipt.customer.email) {
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
  const metaRows = buildMetaRows(receipt)
  const subject =
    typeof payload.subject === "string" && payload.subject.trim()
      ? payload.subject
      : buildSubject(DOCUMENT_TYPE, buildSubjectTitle(receipt), company.name)
  const bodyText =
    typeof payload.body === "string" && payload.body.trim()
      ? payload.body
      : buildDefaultBodyText({
          documentType: DOCUMENT_TYPE,
          customerName: receipt.customer.name,
          contactName: receipt.customer.staffName || receipt.customer.contactPerson,
          companyName: company.name,
          metaRows,
        })

  try {
    const pdfBuffer = await generateReceiptPdf(receipt, company)

    await sendAndLogEmail({
      fromName: company.name,
      documentType: DOCUMENT_TYPE,
      documentId: receipt.id,
      documentNumber: receipt.receiptNumber,
      to: receipt.customer.email,
      subject,
      bodyText,
      pdfBuffer,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "メール送信に失敗しました"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
