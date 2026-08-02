import nodemailer from "nodemailer"

// SMTP送信用のトランスポーターを生成（ConoHa等のサーバーメール）
function getTransporter() {
  const port = Number(process.env.SMTP_PORT ?? 465)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465はSSL、587はSTARTTLS。SMTP_SECUREで明示指定も可能
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

// SMTP送信に必要な設定が揃っているか
export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

export type DocumentType = "invoice" | "quotation" | "delivery-note" | "receipt"

type MetaRow = { label: string; value: string }

// 書類種別ごとの表示情報
const DOCUMENT_LABELS: Record<DocumentType, { name: string; lead: string }> = {
  invoice: { name: "請求書", lead: "下記の通り請求書をお送りいたします。" },
  quotation: { name: "見積書", lead: "下記の通りお見積書をお送りいたします。" },
  "delivery-note": { name: "納品書", lead: "下記の通り納品書をお送りいたします。" },
  receipt: { name: "領収書", lead: "下記の通り領収書をお送りいたします。" },
}

// メール件名を生成（送信履歴の記録・プレビューにも利用する）
// title は書類の件名（未入力なら対象月表記。例: 2026年7月分）
export function buildSubject(
  documentType: DocumentType,
  title: string,
  companyName: string
): string {
  const { name } = DOCUMENT_LABELS[documentType]
  return `【${name}】${title} - ${companyName}`
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
  const { name, lead } = DOCUMENT_LABELS[documentType]
  const metaLines = metaRows.map((row) => `${row.label}：${row.value}`).join("\n")

  // 会社名（屋号）行は常に御中。担当者名があればその下に「担当者 様」を添える
  const addresseeLines = contactName
    ? [`${customerName} 御中`, `${contactName} 様`]
    : [`${customerName} 御中`]

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
  fromName?: string // 差出人の表示名（自社名）。指定時は「表示名 <アドレス>」で送る
}

export async function sendDocumentEmail({
  to,
  subject,
  bodyText,
  documentNumber,
  pdfBuffer,
  fromName,
}: SendDocumentEmailParams) {
  const address = process.env.EMAIL_FROM || process.env.SMTP_USER || ""
  const from = fromName ? { name: fromName, address } : address

  try {
    await getTransporter().sendMail({
      from,
      to,
      subject,
      text: bodyText,
      html: textToHtml(bodyText),
      attachments: [
        {
          filename: `${documentNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー"
    throw new Error(`メール送信に失敗しました: ${message}`)
  }
}
