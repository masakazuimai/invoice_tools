import { z } from "zod"

export const bankInfoSchema = z.object({
  bankName: z.string().min(1, "銀行名は必須です"),
  branchName: z.string().min(1, "支店名は必須です"),
  accountType: z.enum(["普通", "当座"]),
  accountNumber: z.string().min(1, "口座番号は必須です"),
  accountHolder: z.string().min(1, "口座名義は必須です"),
})

export const companyProfileSchema = z.object({
  name: z.string().min(1, "会社名は必須です"),
  zipCode: z.string().regex(/^\d{3}-?\d{4}$/, "郵便番号の形式が正しくありません"),
  address: z.string().min(1, "住所は必須です"),
  phone: z.string().min(1, "電話番号は必須です"),
  email: z.string().email("メールアドレスの形式が正しくありません"),
  bankInfo: bankInfoSchema,
  invoiceRegNumber: z
    .string()
    .regex(/^T\d{13}$/, "登録番号はT+13桁の数字です"),
  logoUrl: z.string().optional(),
})

export type CompanyProfileInput = z.infer<typeof companyProfileSchema>
export type BankInfo = z.infer<typeof bankInfoSchema>
