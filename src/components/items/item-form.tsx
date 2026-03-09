"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import type { ItemInput } from "@/schemas/item.schema"

type Props = {
  initialData?: ItemInput & { id?: string }
}

const defaultData: ItemInput = {
  name: "",
  unitPrice: 0,
  unit: "個",
  taxRate: 10,
  description: "",
}

export function ItemForm({ initialData }: Props) {
  const router = useRouter()
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<ItemInput>(initialData ?? defaultData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const updateField = (field: keyof ItemInput, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})

    const url = isEdit ? `/api/items/${initialData?.id}` : "/api/items"
    const method = isEdit ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        unitPrice: Number(form.unitPrice),
        taxRate: Number(form.taxRate),
      }),
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

    router.push("/items")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input label="品目名" value={form.name} onChange={(e) => updateField("name", e.target.value)} error={errors.name} />
          </div>
          <Input
            label="単価（円）"
            type="number"
            value={form.unitPrice}
            onChange={(e) => updateField("unitPrice", parseInt(e.target.value) || 0)}
            error={errors.unitPrice}
          />
          <Input label="単位" value={form.unit} onChange={(e) => updateField("unit", e.target.value)} error={errors.unit} />
          <Select
            label="税率"
            value={String(form.taxRate)}
            onChange={(e) => updateField("taxRate", parseInt(e.target.value))}
            options={[
              { value: "10", label: "10%（標準税率）" },
              { value: "8", label: "8%（軽減税率）" },
            ]}
          />
          <div className="sm:col-span-2">
            <Textarea label="説明" value={form.description ?? ""} onChange={(e) => updateField("description", e.target.value)} rows={3} />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "保存中..." : isEdit ? "更新" : "作成"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push("/items")}>
            キャンセル
          </Button>
        </div>
      </Card>
    </form>
  )
}
