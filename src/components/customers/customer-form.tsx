"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import type { CustomerInput } from "@/schemas/customer.schema"

type Props = {
  initialData?: CustomerInput & { id?: string }
}

const defaultData: CustomerInput = {
  name: "",
  zipCode: "",
  address: "",
  phone: "",
  email: "",
  contactPerson: "",
  memo: "",
}

export function CustomerForm({ initialData }: Props) {
  const router = useRouter()
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<CustomerInput>(initialData ?? defaultData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const updateField = (field: keyof CustomerInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})

    const url = isEdit ? `/api/customers/${initialData?.id}` : "/api/customers"
    const method = isEdit ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const data = await res.json()
      if (data.errors?.fieldErrors) {
        const flat: Record<string, string> = {}
        for (const [key, msgs] of Object.entries(data.errors.fieldErrors)) {
          flat[key] = (msgs as string[])[0]
        }
        setErrors(flat)
      }
      setSaving(false)
      return
    }

    router.push("/customers")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input label="顧客名（会社名）" value={form.name} onChange={(e) => updateField("name", e.target.value)} error={errors.name} />
          </div>
          <Input label="担当者名" value={form.contactPerson ?? ""} onChange={(e) => updateField("contactPerson", e.target.value)} />
          <Input label="メールアドレス" type="email" value={form.email ?? ""} onChange={(e) => updateField("email", e.target.value)} error={errors.email} />
          <Input label="電話番号" value={form.phone ?? ""} onChange={(e) => updateField("phone", e.target.value)} />
          <Input label="郵便番号" value={form.zipCode ?? ""} onChange={(e) => updateField("zipCode", e.target.value)} />
          <div className="sm:col-span-2">
            <Input label="住所" value={form.address ?? ""} onChange={(e) => updateField("address", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="メモ" value={form.memo ?? ""} onChange={(e) => updateField("memo", e.target.value)} rows={3} />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "保存中..." : isEdit ? "更新" : "作成"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push("/customers")}>
            キャンセル
          </Button>
        </div>
      </Card>
    </form>
  )
}
