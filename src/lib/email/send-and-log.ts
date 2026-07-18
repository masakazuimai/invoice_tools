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
}: SendAndLogParams) {
  try {
    await sendDocumentEmail({ to, subject, bodyText, documentNumber, pdfBuffer })

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
