"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/format"
import { calculateTaxSummary, calculateLineAmount } from "@/lib/tax-calculator"
import type { TaxRate } from "@/lib/tax-calculator"
import type { DeliveryNoteItemInput } from "@/schemas/delivery-note.schema"

type Customer = { id: string; name: string }
type MasterItem = { id: string; name: string; unitPrice: number; unit: string; taxRate: number }

type DeliveryNoteData = {
  id?: string
  customerId: string
  issueDate: string
  deliveryDate: string
  subject: string
  items: DeliveryNoteItemInput[]
  notes: string
}

type Props = {
  initialData?: DeliveryNoteData
}

const emptyItem: DeliveryNoteItemInput = {
  itemId: "",
  name: "",
  quantity: 1,
  unit: "個",
  unitPrice: 0,
  taxRate: 10,
}

function toDateString(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toISOString().split("T")[0]
}

export function DeliveryNoteForm({ initialData }: Props) {
  const router = useRouter()
  const isEdit = !!initialData?.id

  const [customers, setCustomers] = useState<Customer[]>([])
  const [masterItems, setMasterItems] = useState<MasterItem[]>([])
  const [customerId, setCustomerId] = useState(initialData?.customerId ?? "")
  const [issueDate, setIssueDate] = useState(initialData?.issueDate ?? toDateString(new Date()))
  const [deliveryDate, setDeliveryDate] = useState(initialData?.deliveryDate ?? toDateString(new Date()))
  const [subject, setSubject] = useState(initialData?.subject ?? "")
  const [items, setItems] = useState<DeliveryNoteItemInput[]>(
    initialData?.items ?? [{ ...emptyItem }]
  )
  const [notes, setNotes] = useState(initialData?.notes ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/customers").then((r) => r.json()).then(setCustomers)
    fetch("/api/items").then((r) => r.json()).then(setMasterItems)
  }, [])

  const updateItem = useCallback((index: number, field: keyof DeliveryNoteItemInput, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }, [])

  const selectMasterItem = useCallback((index: number, masterItemId: string) => {
    const master = masterItems.find((m) => m.id === masterItemId)
    if (!master) return
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, itemId: master.id, name: master.name, unitPrice: master.unitPrice, unit: master.unit, taxRate: master.taxRate as TaxRate }
          : item
      )
    )
  }, [masterItems])

  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }])
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index))

  const taxSummary = calculateTaxSummary(
    items.map((item) => ({
      amount: calculateLineAmount(item.quantity, item.unitPrice),
      taxRate: item.taxRate as TaxRate,
    }))
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})

    const payload = { customerId, issueDate, deliveryDate, subject, items, notes }
    const url = isEdit ? `/api/delivery-notes/${initialData?.id}` : "/api/delivery-notes"
    const method = isEdit ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
          setErrors({ customerId: data.error })
        }
      } catch {
        setErrors({ customerId: "保存に失敗しました" })
      }
      setSaving(false)
      return
    }

    const deliveryNote = await res.json()
    router.push(`/delivery-notes/${deliveryNote.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <h2 className="mb-4 text-lg font-semibold">基本情報</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="顧客"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            options={customers.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="顧客を選択"
            error={errors.customerId}
          />
          <Input label="件名" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="納品物の件名" />
          <Input label="発行日" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} error={errors.issueDate} />
          <Input label="納品日" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} error={errors.deliveryDate} />
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">明細</h2>
          <Button type="button" variant="secondary" size="sm" onClick={addItem}>行を追加</Button>
        </div>
        {errors.items && <p className="mb-4 text-sm text-red-600">{errors.items}</p>}
        <div className="space-y-3">
          <div className="hidden sm:grid sm:grid-cols-12 sm:gap-2 text-xs font-medium text-gray-500 px-1">
            <div className="col-span-3">品目</div>
            <div className="col-span-2">品目マスタ</div>
            <div className="col-span-1">数量</div>
            <div className="col-span-1">単位</div>
            <div className="col-span-2">単価</div>
            <div className="col-span-1">税率</div>
            <div className="col-span-1 text-right">金額</div>
            <div className="col-span-1"></div>
          </div>
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 sm:col-span-3">
                <Input value={item.name} onChange={(e) => updateItem(index, "name", e.target.value)} placeholder="品目名" />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <select className="block w-full rounded-md border border-gray-300 px-2 py-2 text-sm" value="" onChange={(e) => selectMasterItem(index, e.target.value)}>
                  <option value="">マスタから選択</option>
                  {masterItems.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                </select>
              </div>
              <div className="col-span-3 sm:col-span-1">
                <Input type="number" value={item.quantity} onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)} min={1} />
              </div>
              <div className="col-span-3 sm:col-span-1">
                <Input value={item.unit} onChange={(e) => updateItem(index, "unit", e.target.value)} />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <Input type="number" value={item.unitPrice} onChange={(e) => updateItem(index, "unitPrice", parseInt(e.target.value) || 0)} />
              </div>
              <div className="col-span-4 sm:col-span-1">
                <select className="block w-full rounded-md border border-gray-300 px-2 py-2 text-sm" value={item.taxRate} onChange={(e) => updateItem(index, "taxRate", parseInt(e.target.value))}>
                  <option value={10}>10%</option>
                  <option value={8}>8%</option>
                </select>
              </div>
              <div className="col-span-6 sm:col-span-1 flex items-center justify-end text-sm font-medium">
                {formatCurrency(calculateLineAmount(item.quantity, item.unitPrice))}
              </div>
              <div className="col-span-2 sm:col-span-1 flex items-center justify-end">
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 text-sm">削除</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 border-t pt-4">
          <div className="flex flex-col items-end gap-1 text-sm">
            {taxSummary.subtotal10 > 0 && (
              <div className="flex gap-8">
                <span className="text-gray-500">10%対象 小計:</span><span>{formatCurrency(taxSummary.subtotal10)}</span>
                <span className="text-gray-500">消費税:</span><span>{formatCurrency(taxSummary.tax10)}</span>
              </div>
            )}
            {taxSummary.subtotal8 > 0 && (
              <div className="flex gap-8">
                <span className="text-gray-500">8%対象 小計:</span><span>{formatCurrency(taxSummary.subtotal8)}</span>
                <span className="text-gray-500">消費税:</span><span>{formatCurrency(taxSummary.tax8)}</span>
              </div>
            )}
            <div className="flex gap-8 border-t pt-2 mt-2">
              <span className="text-gray-500">小計（税抜）:</span><span>{formatCurrency(taxSummary.subtotal)}</span>
            </div>
            <div className="flex gap-8">
              <span className="text-gray-500">消費税合計:</span><span>{formatCurrency(taxSummary.totalTax)}</span>
            </div>
            <div className="flex gap-8 text-lg font-bold">
              <span>合計:</span><span>{formatCurrency(taxSummary.totalAmount)}</span>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <Textarea label="備考" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="納品に関する備考" />
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>{saving ? "保存中..." : isEdit ? "更新" : "作成"}</Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/delivery-notes")}>キャンセル</Button>
      </div>
    </form>
  )
}
