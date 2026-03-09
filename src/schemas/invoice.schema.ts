import { z } from "zod"

export const invoiceItemSchema = z.object({
  itemId: z.string().optional(),
  name: z.string().min(1, "品目名は必須です"),
  quantity: z.number().int().min(1, "数量は1以上です"),
  unit: z.string().min(1, "単位は必須です"),
  unitPrice: z.number().int().min(0, "単価は0以上です"),
  taxRate: z.union([z.literal(10), z.literal(8)]),
})

export const createInvoiceSchema = z.object({
  customerId: z.string().min(1, "顧客を選択してください"),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません"),
  items: z.array(invoiceItemSchema).min(1, "明細を1行以上追加してください"),
  notes: z.string().optional(),
})

export const updateInvoiceStatusSchema = z.object({
  status: z.enum(["draft", "sent", "paid", "overdue"]),
})

export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
