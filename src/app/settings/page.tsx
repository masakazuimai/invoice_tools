"use client"

import { useEffect, useState } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ImageUpload } from "@/components/ui/image-upload"
import type { CompanyProfileInput } from "@/schemas/settings.schema"

const defaultProfile: CompanyProfileInput = {
  name: "",
  zipCode: "",
  address: "",
  phone: "",
  email: "",
  bankInfo: {
    bankName: "",
    branchName: "",
    accountType: "普通",
    accountNumber: "",
    accountHolder: "",
  },
  invoiceRegNumber: "",
  logoUrl: "",
  sealUrl: "",
}

export default function SettingsPage() {
  const [form, setForm] = useState<CompanyProfileInput>(defaultProfile)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data) setForm(data)
      })
  }, [])

  const updateField = (field: keyof CompanyProfileInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const updateBankField = (field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      bankInfo: { ...prev.bankInfo, [field]: value },
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    setMessage("")

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const text = await res.text()
      try {
        const data = JSON.parse(text)
        if (data.errors?.fieldErrors) {
          const flat: Record<string, string> = {}
          for (const [key, msgs] of Object.entries(data.errors.fieldErrors)) {
            flat[key] = (msgs as string[])[0]
          }
          setErrors(flat)
        } else if (data.error) {
          setMessage(data.error)
        }
      } catch {
        setMessage("保存に失敗しました")
      }
    } else {
      setMessage("保存しました")
      setTimeout(() => setMessage(""), 3000)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="自社情報設定" description="請求書に表示される自社の情報を設定します" />
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 text-lg font-semibold">基本情報</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="会社名" value={form.name} onChange={(e) => updateField("name", e.target.value)} error={errors.name} />
              <Input label="適格請求書発行事業者登録番号" value={form.invoiceRegNumber} onChange={(e) => updateField("invoiceRegNumber", e.target.value)} error={errors.invoiceRegNumber} placeholder="T1234567890123" />
              <Input label="郵便番号" value={form.zipCode} onChange={(e) => updateField("zipCode", e.target.value)} error={errors.zipCode} placeholder="123-4567" />
              <Input label="電話番号" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} error={errors.phone} />
              <div className="sm:col-span-2">
                <Input label="住所" value={form.address} onChange={(e) => updateField("address", e.target.value)} error={errors.address} />
              </div>
              <Input label="メールアドレス" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} error={errors.email} />
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-semibold">ロゴ・社判</h2>
            <p className="mb-4 text-sm text-gray-500">PDFの右上（自社情報欄）に表示されます。PNG/JPEG/WebP、2MB以下。</p>
            <div className="grid gap-6 sm:grid-cols-2">
              <ImageUpload
                label="ロゴ"
                value={form.logoUrl}
                onChange={(url) => updateField("logoUrl", url)}
                onClear={() => updateField("logoUrl", "")}
              />
              <ImageUpload
                label="社判"
                value={form.sealUrl}
                onChange={(url) => updateField("sealUrl", url)}
                onClear={() => updateField("sealUrl", "")}
              />
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-semibold">振込先情報</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="銀行名" value={form.bankInfo.bankName} onChange={(e) => updateBankField("bankName", e.target.value)} />
              <Input label="支店名" value={form.bankInfo.branchName} onChange={(e) => updateBankField("branchName", e.target.value)} />
              <Select
                label="口座種別"
                value={form.bankInfo.accountType}
                onChange={(e) => updateBankField("accountType", e.target.value)}
                options={[
                  { value: "普通", label: "普通" },
                  { value: "当座", label: "当座" },
                ]}
              />
              <Input label="口座番号" value={form.bankInfo.accountNumber} onChange={(e) => updateBankField("accountNumber", e.target.value)} />
              <Input label="口座名義" value={form.bankInfo.accountHolder} onChange={(e) => updateBankField("accountHolder", e.target.value)} />
            </div>
          </Card>

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
            {message && <span className="text-sm text-green-600">{message}</span>}
          </div>
        </div>
      </form>
    </div>
  )
}
