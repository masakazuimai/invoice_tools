"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

type Props = {
  invoiceId: string
  currentStatus: string
}

export function InvoiceActions({ invoiceId, currentStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState("")

  const updateStatus = async (status: string) => {
    setLoading(status)
    await fetch(`/api/invoices/${invoiceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    setLoading("")
    router.refresh()
  }

  const sendEmail = async () => {
    setLoading("send")
    const res = await fetch(`/api/invoices/${invoiceId}/send`, { method: "POST" })
    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json()
      alert(data.error ?? "送信に失敗しました")
    }
    setLoading("")
  }

  const duplicate = async () => {
    setLoading("duplicate")
    const res = await fetch(`/api/invoices/${invoiceId}/duplicate`, { method: "POST" })
    if (res.ok) {
      const newInvoice = await res.json()
      router.push(`/invoices/${newInvoice.id}`)
    } else {
      const data = await res.json()
      alert(data.error ?? "複製に失敗しました")
    }
    setLoading("")
  }

  const deleteInvoice = async () => {
    if (!confirm("この請求書を削除しますか？この操作は元に戻せません。")) return
    setLoading("delete")
    const res = await fetch(`/api/invoices/${invoiceId}`, { method: "DELETE" })
    if (res.ok) {
      router.push("/invoices")
    } else {
      alert("削除に失敗しました")
    }
    setLoading("")
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        onClick={() => window.open(`/api/invoices/${invoiceId}/pdf?inline=1`, "_blank")}
      >
        PDF
      </Button>

      <Button variant="secondary" onClick={duplicate} disabled={loading === "duplicate"}>
        {loading === "duplicate" ? "複製中..." : "複製"}
      </Button>

      {currentStatus === "draft" && (
        <Button onClick={sendEmail} disabled={loading === "send"}>
          {loading === "send" ? "送信中..." : "メール送信"}
        </Button>
      )}

      {currentStatus === "draft" && (
        <Button variant="secondary" onClick={() => updateStatus("sent")} disabled={loading === "sent"}>
          送信済みにする
        </Button>
      )}

      {(currentStatus === "sent" || currentStatus === "overdue") && (
        <Button onClick={() => updateStatus("paid")} disabled={loading === "paid"}>
          {loading === "paid" ? "処理中..." : "入金済みにする"}
        </Button>
      )}

      <Button variant="danger" onClick={deleteInvoice} disabled={loading === "delete"}>
        {loading === "delete" ? "削除中..." : "削除"}
      </Button>
    </div>
  )
}
