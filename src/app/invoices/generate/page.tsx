"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { Card } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDateJP } from "@/lib/format"

type Customer = { id: string; name: string }
type DeliveryNote = {
  id: string
  deliveryNoteNumber: string
  deliveryDate: string
  totalAmount: number
  subject: string | null
  invoiceId: string | null
  status: string
  customer: { id: string; name: string }
}

export default function GenerateInvoicePage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState("")
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetch("/api/customers").then((r) => r.json()).then(setCustomers)
  }, [])

  // 顧客と月が変わったら未請求納品書を検索
  useEffect(() => {
    if (!customerId) {
      setDeliveryNotes([])
      return
    }

    setLoading(true)
    fetch("/api/delivery-notes")
      .then((r) => r.json())
      .then((all: DeliveryNote[]) => {
        const startDate = new Date(year, month - 1, 1)
        const endDate = new Date(year, month, 0, 23, 59, 59)

        const filtered = all.filter((dn) => {
          const d = new Date(dn.deliveryDate)
          return (
            dn.customer.id === customerId &&
            dn.invoiceId === null &&
            dn.status === "delivered" &&
            d >= startDate &&
            d <= endDate
          )
        })
        setDeliveryNotes(filtered)
        setLoading(false)
      })
  }, [customerId, year, month])

  const total = deliveryNotes.reduce((sum, dn) => sum + dn.totalAmount, 0)

  const handleGenerate = async () => {
    if (deliveryNotes.length === 0) return
    setGenerating(true)

    const res = await fetch("/api/invoices/generate-from-delivery-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, year, month }),
    })

    if (res.ok) {
      const invoice = await res.json()
      router.push(`/invoices/${invoice.id}`)
    } else {
      const data = await res.json()
      alert(data.error ?? "生成に失敗しました")
    }
    setGenerating(false)
  }

  const yearOptions = Array.from({ length: 3 }, (_, i) => {
    const y = new Date().getFullYear() - 1 + i
    return { value: String(y), label: `${y}年` }
  })

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1}月`,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="納品書から合算請求書を生成"
        description="月ごとの納品済み書類を合算して請求書を作成します"
      />

      <Card>
        <h2 className="mb-4 text-lg font-semibold">対象を選択</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label="顧客"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            options={customers.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="顧客を選択"
          />
          <Select
            label="年"
            value={String(year)}
            onChange={(e) => setYear(Number(e.target.value))}
            options={yearOptions}
          />
          <Select
            label="月"
            value={String(month)}
            onChange={(e) => setMonth(Number(e.target.value))}
            options={monthOptions}
          />
        </div>
      </Card>

      {loading && (
        <Card>
          <p className="text-base text-gray-500">検索中...</p>
        </Card>
      )}

      {!loading && customerId && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              未請求の納品書 ({deliveryNotes.length}件)
            </h2>
            {deliveryNotes.length > 0 && (
              <p className="text-lg font-bold">合計: {formatCurrency(total)}</p>
            )}
          </div>

          {deliveryNotes.length === 0 ? (
            <p className="text-base text-gray-500">
              対象月の未請求（納品済み）の納品書がありません
            </p>
          ) : (
            <>
              <table className="w-full text-base mb-6">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">納品書番号</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">件名</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">納品日</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">金額（税込）</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {deliveryNotes.map((dn) => (
                    <tr key={dn.id}>
                      <td className="px-4 py-3 font-medium">{dn.deliveryNoteNumber}</td>
                      <td className="px-4 py-3 text-gray-600">{dn.subject ?? "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDateJP(dn.deliveryDate)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(dn.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating ? "生成中..." : `${deliveryNotes.length}件を合算して請求書を生成`}
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  )
}
