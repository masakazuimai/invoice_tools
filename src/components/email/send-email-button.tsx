"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

type Props = {
  // 送信APIのエンドポイント（GETでプレビュー取得・POSTで送信）
  endpoint: string
}

// メール送信ボタン。押すとプレビュー（既定の件名・本文入り）を開き、確認・編集して送信する
export function SendEmailButton({ endpoint }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<"idle" | "loading" | "sending">("idle")
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [error, setError] = useState("")

  const openDialog = async () => {
    setOpen(true)
    setPhase("loading")
    setError("")
    try {
      const res = await fetch(endpoint)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "プレビューの取得に失敗しました")
      } else {
        setTo(data.to ?? "")
        setSubject(data.subject ?? "")
        setBody(data.body ?? "")
      }
    } catch {
      setError("プレビューの取得に失敗しました")
    }
    setPhase("idle")
  }

  const close = () => {
    if (phase === "sending") return
    setOpen(false)
  }

  const send = async () => {
    setPhase("sending")
    setError("")
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      })
      if (res.ok) {
        setOpen(false)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "送信に失敗しました")
      }
    } catch {
      setError("送信に失敗しました")
    }
    setPhase("idle")
  }

  return (
    <>
      <Button onClick={openDialog}>メール送信</Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={close}
        >
          <div
            className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4">メール送信プレビュー</h2>

            {phase === "loading" ? (
              <p className="py-8 text-center text-gray-500">プレビューを読み込み中...</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-1">宛先</label>
                  <input
                    type="text"
                    value={to}
                    readOnly
                    className="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-base text-gray-600"
                  />
                  {!to && (
                    <p className="mt-1 text-base text-red-600">
                      顧客のメールアドレスが未設定です。顧客情報から登録してください。
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 mb-1">件名</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
                  />
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 mb-1">本文</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={14}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-base leading-relaxed"
                  />
                  <p className="mt-1 text-base text-gray-500">
                    ※ 書類PDFが自動で添付されます。
                  </p>
                </div>

                {error && <p className="text-base text-red-600">{error}</p>}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={close} disabled={phase === "sending"}>
                キャンセル
              </Button>
              <Button
                onClick={send}
                disabled={phase !== "idle" || !to || !subject.trim() || !body.trim()}
              >
                {phase === "sending" ? "送信中..." : "送信"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
