import { Resend } from "resend"

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

type SendInvoiceEmailParams = {
  to: string
  customerName: string
  invoiceNumber: string
  totalAmount: string
  dueDate: string
  companyName: string
  pdfBuffer: Buffer
}

export async function sendInvoiceEmail({
  to,
  customerName,
  invoiceNumber,
  totalAmount,
  dueDate,
  companyName,
  pdfBuffer,
}: SendInvoiceEmailParams) {
  const { error } = await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "noreply@example.com",
    to,
    subject: `【請求書】${invoiceNumber} - ${companyName}`,
    html: `
      <p>${customerName} 御中</p>
      <p>いつもお世話になっております。${companyName}です。</p>
      <p>下記の通り請求書をお送りいたします。</p>
      <table style="border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:4px 12px;color:#666">請求書番号</td><td style="padding:4px 12px">${invoiceNumber}</td></tr>
        <tr><td style="padding:4px 12px;color:#666">ご請求金額</td><td style="padding:4px 12px;font-weight:bold">${totalAmount}</td></tr>
        <tr><td style="padding:4px 12px;color:#666">お支払期限</td><td style="padding:4px 12px">${dueDate}</td></tr>
      </table>
      <p>請求書PDFを添付しておりますので、ご確認ください。</p>
      <p>何かご不明な点がございましたら、お気軽にお問い合わせください。</p>
      <br>
      <p>${companyName}</p>
    `,
    attachments: [
      {
        filename: `${invoiceNumber}.pdf`,
        content: pdfBuffer,
      },
    ],
  })

  if (error) {
    throw new Error(`メール送信に失敗しました: ${error.message}`)
  }
}
