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
import type { InvoiceItemInput } from "@/schemas/invoice.schema"

type Customer = { id: string; name: string }
type MasterItem = { id: string; name: string; unitPrice: number; unit: string; taxRate: number }

type InvoiceData = {
  id?: string
  customerId: string
  issueDate: string
  dueDate: string
  subject: string
  items: InvoiceItemInput[]
  notes: string
}

type Props = {
  initialData?: InvoiceData
}

const emptyItem: InvoiceItemInput = {
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

export function InvoiceForm({ initialData }: Props) {
  const router = useRouter()
  const isEdit = !!initialData?.id

  const [customers, setCustomers] = useState<Customer[]>([])
  const [masterItems, setMasterItems] = useState<MasterItem[]>([])
  const [customerId, setCustomerId] = useState(initialData?.customerId ?? "")
  const [issueDate, setIssueDate] = useState(initialData?.issueDate ?? toDateString(new Date()))
  const [dueDate, setDueDate] = useState(initialData?.dueDate ?? "")
  const [subject, setSubject] = useState(initialData?.subject ?? "")
  const [items, setItems] = useState<InvoiceItemInput[]>(
    initialData?.items ?? [{ ...emptyItem }]
  )
  const [notes, setNotes] = useState(initialData?.notes ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/customers").then((r) => r.json()).then(setCustomers)
    fetch("/api/items").then((r) => r.json()).then(setMasterItems)
  }, [])

  // 支払期限のデフォルト: 発行日の翌月末
  useEffect(() => {
    if (!dueDate && issueDate) {
      const d = new Date(issueDate)
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 2, 0)
      setDueDate(toDateString(nextMonth))
    }
  }, [issueDate, dueDate])

  const updateItem = useCallback((index: number, field: keyof InvoiceItemInput, value: string | number) => {
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
          ? {
              ...item,
              itemId: master.id,
              name: master.name,
              unitPrice: master.unitPrice,
              unit: master.unit,
              taxRate: master.taxRate as TaxRate,
            }
          : item
      )
    )
  }, [masterItems])

  const addItem = () => {
    setItems((prev) => [...prev, { ...emptyItem }])
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // 税額サマリーの計算
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

    const payload = { customerId, issueDate, dueDate, subject, items, notes }
    const url = isEdit ? `/api/invoices/${initialData?.id}` : "/api/invoices"
    const method = isEdit ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

    const invoice = await res.json()
    router.push(`/invoices/${invoice.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基本情報 */}
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
          <Input
            label="件名"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Webサイト制作の件"
          />
          <Input
            label="発行日"
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            error={errors.issueDate}
          />
          <Input
            label="支払期限"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            error={errors.dueDate}
          />
        </div>
      </Card>

      {/* 明細 */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">明細</h2>
          <Button type="button" variant="secondary" size="sm" onClick={addItem}>
            行を追加
          </Button>
        </div>
        {errors.items && <p className="mb-4 text-sm text-red-600">{errors.items}</p>}
        <div className="space-y-3">
          {/* ヘッダー */}
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
                <Input
                  value={item.name}
                  onChange={(e) => updateItem(index, "name", e.target.value)}
                  placeholder="品目名"
                />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <select
                  className="block w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
                  value=""
                  onChange={(e) => selectMasterItem(index, e.target.value)}
                >
                  <option value="">マスタから選択</option>
                  {masterItems.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-3 sm:col-span-1">
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                  min={1}
                />
              </div>
              <div className="col-span-3 sm:col-span-1">
                <Input
                  value={item.unit}
                  onChange={(e) => updateItem(index, "unit", e.target.value)}
                />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <Input
                  type="number"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, "unitPrice", parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="col-span-4 sm:col-span-1">
                <select
                  className="block w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
                  value={item.taxRate}
                  onChange={(e) => updateItem(index, "taxRate", parseInt(e.target.value))}
                >
                  <option value={10}>10%</option>
                  <option value={8}>8%</option>
                </select>
              </div>
              <div className="col-span-6 sm:col-span-1 flex items-center justify-end text-sm font-medium">
                {formatCurrency(calculateLineAmount(item.quantity, item.unitPrice))}
              </div>
              <div className="col-span-2 sm:col-span-1 flex items-center justify-end">
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 合計 */}
        <div className="mt-6 border-t pt-4">
          <div className="flex flex-col items-end gap-1 text-sm">
            {taxSummary.subtotal10 > 0 && (
              <div className="flex gap-8">
                <span className="text-gray-500">10%対象 小計:</span>
                <span>{formatCurrency(taxSummary.subtotal10)}</span>
                <span className="text-gray-500">消費税:</span>
                <span>{formatCurrency(taxSummary.tax10)}</span>
              </div>
            )}
            {taxSummary.subtotal8 > 0 && (
              <div className="flex gap-8">
                <span className="text-gray-500">8%対象 小計:</span>
                <span>{formatCurrency(taxSummary.subtotal8)}</span>
                <span className="text-gray-500">消費税:</span>
                <span>{formatCurrency(taxSummary.tax8)}</span>
              </div>
            )}
            <div className="flex gap-8 border-t pt-2 mt-2">
              <span className="text-gray-500">小計（税抜）:</span>
              <span>{formatCurrency(taxSummary.subtotal)}</span>
            </div>
            <div className="flex gap-8">
              <span className="text-gray-500">消費税合計:</span>
              <span>{formatCurrency(taxSummary.totalTax)}</span>
            </div>
            <div className="flex gap-8 text-lg font-bold">
              <span>合計:</span>
              <span>{formatCurrency(taxSummary.totalAmount)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 備考 */}
      <Card>
        <Textarea
          label="備考"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="支払い条件や特記事項など"
        />
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "保存中..." : isEdit ? "更新" : "作成"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/invoices")}>
          キャンセル
        </Button>
      </div>
    </form>
  )
}
