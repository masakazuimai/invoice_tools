import { prisma } from "@/lib/db"
import { sendDocumentEmail, type DocumentType } from "@/lib/email/send-document-email"

type SendAndLogParams = {
  documentType: DocumentType
  documentId: string
  documentNumber: string
  to: string
  subject: string
  bodyText: string
  pdfBuffer: Buffer
  fromName?: string // 差出人の表示名（自社名）
}

// メール送信し、成否をEmailLogに記録する。失敗時はログを残したうえで再スロー
export async function sendAndLogEmail({
  documentType,
  documentId,
  documentNumber,
  to,
  subject,
  bodyText,
  pdfBuffer,
  fromName,
}: SendAndLogParams) {
  try {
    await sendDocumentEmail({ to, subject, bodyText, documentNumber, pdfBuffer, fromName })

    await prisma.emailLog.create({
      data: { documentType, documentId, documentNumber, to, subject, status: "sent" },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "メール送信に失敗しました"
    await prisma.emailLog.create({
      data: {
        documentType,
        documentId,
        documentNumber,
        to,
        subject,
        status: "failed",
        errorMessage: message,
      },
    })
    throw error
  }
}
