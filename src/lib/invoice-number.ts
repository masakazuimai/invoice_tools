import { prisma } from "./db"

/**
 * 次の請求書番号を生成
 * 形式: INV-YYYYMM-XXXX（月別連番4桁）
 */
export async function generateNextInvoiceNumber(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
  const prefix = `INV-${yearMonth}-`

  const latest = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  })

  const nextSeq = latest
    ? parseInt(latest.invoiceNumber.slice(-4), 10) + 1
    : 1

  return `${prefix}${String(nextSeq).padStart(4, "0")}`
}
