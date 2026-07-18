"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SendEmailButton } from "@/components/email/send-email-button"

type Props = {
  deliveryNoteId: string
  currentStatus: string
}

export function DeliveryNoteActions({ deliveryNoteId, currentStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState("")

  const updateStatus = async (status: string) => {
    setLoading(status)
    await fetch(`/api/delivery-notes/${deliveryNoteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    setLoading("")
    router.refresh()
  }

  const deleteNote = async () => {
    if (!confirm("この納品書を削除しますか？この操作は元に戻せません。")) return
    setLoading("delete")
    const res = await fetch(`/api/delivery-notes/${deliveryNoteId}`, { method: "DELETE" })
    if (res.ok) {
      router.push("/delivery-notes")
    } else {
      alert("削除に失敗しました")
    }
    setLoading("")
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        onClick={() => window.open(`/api/delivery-notes/${deliveryNoteId}/pdf?inline=1`, "_blank")}
      >
        PDF
      </Button>

      <SendEmailButton endpoint={`/api/delivery-notes/${deliveryNoteId}/send`} />

      <Button
        variant="secondary"
        onClick={async () => {
          setLoading("to-invoice")
          const res = await fetch(`/api/delivery-notes/${deliveryNoteId}/convert-to-invoice`, { method: "POST" })
          if (res.ok) {
            const invoice = await res.json()
            router.push(`/invoices/${invoice.id}`)
          } else {
            const data = await res.json()
            alert(data.error ?? "変換に失敗しました")
          }
          setLoading("")
        }}
        disabled={loading === "to-invoice"}
      >
        {loading === "to-invoice" ? "作成中..." : "請求書を作成"}
      </Button>

      <Button
        variant="secondary"
        onClick={async () => {
          setLoading("to-receipt")
          const res = await fetch(`/api/delivery-notes/${deliveryNoteId}/convert-to-receipt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          })
          if (res.ok) {
            const receipt = await res.json()
            router.push(`/receipts/${receipt.id}`)
          } else {
            const data = await res.json()
            alert(data.error ?? "変換に失敗しました")
          }
          setLoading("")
        }}
        disabled={loading === "to-receipt"}
      >
        {loading === "to-receipt" ? "発行中..." : "領収書を発行"}
      </Button>

      {currentStatus === "draft" && (
        <Button onClick={() => updateStatus("delivered")} disabled={loading === "delivered"}>
          {loading === "delivered" ? "処理中..." : "納品済みにする"}
        </Button>
      )}

      {currentStatus !== "draft" && (
        <Button variant="secondary" onClick={() => updateStatus("draft")} disabled={loading === "draft"}>
          下書きに戻す
        </Button>
      )}

      <Button variant="danger" onClick={deleteNote} disabled={loading === "delete"}>
        {loading === "delete" ? "削除中..." : "削除"}
      </Button>
    </div>
  )
}
