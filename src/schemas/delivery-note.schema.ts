import { z } from "zod"

export const deliveryNoteItemSchema = z.object({
  itemId: z.string().optional(),
  name: z.string().min(1, "品目名は必須です"),
  quantity: z.number().int().min(1, "数量は1以上です"),
  unit: z.string().min(1, "単位は必須です"),
  unitPrice: z.number().int().min(0, "単価は0以上です"),
  taxRate: z.union([z.literal(10), z.literal(8)]),
})

export const createDeliveryNoteSchema = z.object({
  customerId: z.string().min(1, "顧客を選択してください"),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません"),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません"),
  subject: z.string().optional(),
  items: z.array(deliveryNoteItemSchema).min(1, "明細を1行以上追加してください"),
  notes: z.string().optional(),
})

export const updateDeliveryNoteStatusSchema = z.object({
  status: z.enum(["draft", "delivered"]),
})

export type DeliveryNoteItemInput = z.infer<typeof deliveryNoteItemSchema>
export type CreateDeliveryNoteInput = z.infer<typeof createDeliveryNoteSchema>
