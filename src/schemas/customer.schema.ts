import { z } from "zod"

export const customerSchema = z.object({
  name: z.string().min(1, "顧客名は必須です"),
  zipCode: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("メールアドレスの形式が正しくありません").optional().or(z.literal("")),
  contactPerson: z.string().optional(),
  memo: z.string().optional(),
})

export type CustomerInput = z.infer<typeof customerSchema>
