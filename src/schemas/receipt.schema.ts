import { z } from "zod"

export const createReceiptSchema = z.object({
  invoiceId: z.string().min(1, "請求書を指定してください"),
  paymentMethod: z.enum(["bankTransfer", "cash", "other"]).default("bankTransfer"),
  subject: z.string().optional(),
  notes: z.string().optional(),
})

export type CreateReceiptInput = z.infer<typeof createReceiptSchema>
