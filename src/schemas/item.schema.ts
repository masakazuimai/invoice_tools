import { z } from "zod"

export const itemSchema = z.object({
  name: z.string().min(1, "品目名は必須です"),
  unitPrice: z.number().int().min(0, "単価は0以上です"),
  unit: z.string().min(1, "単位は必須です"),
  taxRate: z.union([z.literal(10), z.literal(8)]),
  description: z.string().optional(),
})

export type ItemInput = z.infer<typeof itemSchema>
