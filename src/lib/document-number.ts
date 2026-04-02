import { prisma } from "./db"

type DocumentModel = "invoice" | "quotation" | "deliveryNote" | "receipt"

const modelConfig = {
  invoice: { prefix: "INV", field: "invoiceNumber" },
  quotation: { prefix: "QUO", field: "quotationNumber" },
  deliveryNote: { prefix: "DLV", field: "deliveryNoteNumber" },
  receipt: { prefix: "RCP", field: "receiptNumber" },
} as const

/**
 * 次の書類番号を生成
 * 形式: PREFIX-YYYYMM-XXXX（月別連番4桁）
 */
export async function generateNextDocumentNumber(model: DocumentModel): Promise<string> {
  const { prefix, field } = modelConfig[model]
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
  const numberPrefix = `${prefix}-${yearMonth}-`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaModel = prisma[model] as any
  const latest = await prismaModel.findFirst({
    where: { [field]: { startsWith: numberPrefix } },
    orderBy: { [field]: "desc" },
    select: { [field]: true },
  })

  const nextSeq = latest
    ? parseInt(String(latest[field]).slice(-4), 10) + 1
    : 1

  return `${numberPrefix}${String(nextSeq).padStart(4, "0")}`
}
