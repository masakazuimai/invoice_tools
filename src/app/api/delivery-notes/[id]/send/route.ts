import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateDeliveryNotePdf } from "@/lib/pdf/generate-delivery-note-pdf"
import { sendAndLogEmail } from "@/lib/email/send-and-log"
import { buildSubject, buildDefaultBodyText, isEmailConfigured } from "@/lib/email/send-document-email"
import { formatCurrency, formatDateJP, formatYearMonthJP } from "@/lib/format"

type Params = { params: Promise<{ id: string }> }
const DOCUMENT_TYPE = "delivery-note" as const

async function loadDeliveryNote(id: string) {
  return prisma.deliveryNote.findUnique({
    where: { id },
    include: { customer: true, items: { orderBy: { sortOrder: "asc" } } },
  })
}

type DeliveryNote = NonNullable<Awaited<ReturnType<typeof loadDeliveryNote>>>

function buildMetaRows(deliveryNote: DeliveryNote) {
  return [
    { label: "納品書番号", value: deliveryNote.deliveryNoteNumber },
    { label: "合計金額", value: formatCurrency(deliveryNote.totalAmount) },
    { label: "納品日", value: formatDateJP(deliveryNote.deliveryDate) },
  ]
}

// メールプレビュー（既定の宛先・件名・本文）を返す
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const deliveryNote = await loadDeliveryNote(id)
  if (!deliveryNote) {
    return NextResponse.json({ error: "納品書が見つかりません" }, { status: 404 })
  }

  const company = await prisma.companyProfile.findFirst()
  const companyName = company?.name ?? ""

  return NextResponse.json({
    to: deliveryNote.customer.email ?? "",
    subject: buildSubject(DOCUMENT_TYPE, formatYearMonthJP(deliveryNote.issueDate), companyName),
    body: buildDefaultBodyText({
      documentType: DOCUMENT_TYPE,
      customerName: deliveryNote.customer.name,
      contactName: deliveryNote.customer.staffName || deliveryNote.customer.contactPerson,
      companyName,
      metaRows: buildMetaRows(deliveryNote),
    }),
  })
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params

  const deliveryNote = await loadDeliveryNote(id)
  if (!deliveryNote) {
    return NextResponse.json({ error: "納品書が見つかりません" }, { status: 404 })
  }

  if (!deliveryNote.customer.email) {
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
  const metaRows = buildMetaRows(deliveryNote)
  const subject =
    typeof payload.subject === "string" && payload.subject.trim()
      ? payload.subject
      : buildSubject(DOCUMENT_TYPE, formatYearMonthJP(deliveryNote.issueDate), company.name)
  const bodyText =
    typeof payload.body === "string" && payload.body.trim()
      ? payload.body
      : buildDefaultBodyText({
          documentType: DOCUMENT_TYPE,
          customerName: deliveryNote.customer.name,
          contactName: deliveryNote.customer.staffName || deliveryNote.customer.contactPerson,
          companyName: company.name,
          metaRows,
        })

  try {
    const pdfBuffer = await generateDeliveryNotePdf(deliveryNote, company)

    await sendAndLogEmail({
      fromName: company.name,
      documentType: DOCUMENT_TYPE,
      documentId: deliveryNote.id,
      documentNumber: deliveryNote.deliveryNoteNumber,
      to: deliveryNote.customer.email,
      subject,
      bodyText,
      pdfBuffer,
    })

    // 下書きの場合は納品済みに更新
    if (deliveryNote.status === "draft") {
      await prisma.deliveryNote.update({
        where: { id },
        data: { status: "delivered" },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "メール送信に失敗しました"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
