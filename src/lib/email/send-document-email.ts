import { Resend } from "resend"

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export type DocumentType = "invoice" | "quotation" | "delivery-note" | "receipt"

type MetaRow = { label: string; value: string }

// 書類種別ごとの表示情報
const DOCUMENT_LABELS: Record<
  DocumentType,
  { name: string; honorific: string; lead: string }
> = {
  invoice: { name: "請求書", honorific: "御中", lead: "下記の通り請求書をお送りいたします。" },
  quotation: { name: "見積書", honorific: "御中", lead: "下記の通りお見積書をお送りいたします。" },
  "delivery-note": { name: "納品書", honorific: "御中", lead: "下記の通り納品書をお送りいたします。" },
  receipt: { name: "領収書", honorific: "様", lead: "下記の通り領収書をお送りいたします。" },
}

// メール件名を生成（送信履歴の記録・プレビューにも利用する）
export function buildSubject(
  documentType: DocumentType,
  documentNumber: string,
  companyName: string
): string {
  const { name } = DOCUMENT_LABELS[documentType]
  return `【${name}】${documentNumber} - ${companyName}`
}

type BuildBodyParams = {
  documentType: DocumentType
  customerName: string
  companyName: string
  metaRows: MetaRow[]
  contactName?: string | null // 宛名に使う担当者名（無ければ会社名＋敬称のみ）
}

// 既定のメール本文（プレーンテキスト）を生成する。プレビューの初期値に使う
export function buildDefaultBodyText({
  documentType,
  customerName,
  companyName,
  metaRows,
  contactName,
}: BuildBodyParams): string {
  const { name, honorific, lead } = DOCUMENT_LABELS[documentType]
  const metaLines = metaRows.map((row) => `${row.label}：${row.value}`).join("\n")

  // 担当者名があれば「会社名／担当者 様」、無ければ「会社名 御中」
  const addresseeLines = contactName
    ? [customerName, `${contactName} 様`]
    : [`${customerName} ${honorific}`]

  return [
    ...addresseeLines,
    ``,
    `いつもお世話になっております。${companyName}です。`,
    lead,
    ``,
    metaLines,
    ``,
    `${name}PDFを添付しておりますので、ご確認ください。`,
    `何かご不明な点がございましたら、お気軽にお問い合わせください。`,
    ``,
    companyName,
  ].join("\n")
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

// プレーンテキストの本文を、改行を保持したHTMLに変換する
function textToHtml(text: string): string {
  return `<div style="white-space:pre-wrap;font-family:sans-serif;line-height:1.6">${escapeHtml(text).replace(/\n/g, "<br>")}</div>`
}

type SendDocumentEmailParams = {
  to: string
  subject: string
  bodyText: string
  documentNumber: string
  pdfBuffer: Buffer
}

export async function sendDocumentEmail({
  to,
  subject,
  bodyText,
  documentNumber,
  pdfBuffer,
}: SendDocumentEmailParams) {
  const { error } = await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "noreply@example.com",
    to,
    subject,
    html: textToHtml(bodyText),
    attachments: [
      {
        filename: `${documentNumber}.pdf`,
        content: pdfBuffer,
      },
    ],
  })

  if (error) {
    throw new Error(`メール送信に失敗しました: ${error.message}`)
  }
}
