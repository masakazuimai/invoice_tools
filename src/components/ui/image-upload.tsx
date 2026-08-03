"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"

type Props = {
  label: string
  value?: string
  onChange: (url: string) => void
  onClear: () => void
}

export function ImageUpload({ label, value, onChange, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError("")

    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch("/api/upload", { method: "POST", body: formData })
    const data = await res.json()

    if (res.ok) {
      onChange(data.url)
    } else {
      setError(data.error ?? "アップロードに失敗しました")
    }

    setUploading(false)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="space-y-2">
      <label className="block text-base font-medium text-gray-700">{label}</label>
      {value ? (
        <div className="flex items-center gap-3">
          <img src={value} alt={label} className="h-16 w-auto rounded border border-gray-200 bg-white object-contain p-1" />
          <Button type="button" variant="danger" onClick={onClear}>
            削除
          </Button>
        </div>
      ) : (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleUpload}
            className="text-base text-gray-500 file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-base file:font-medium file:text-gray-700 hover:file:bg-gray-200"
          />
          {uploading && <p className="mt-1 text-base text-gray-500">アップロード中...</p>}
        </div>
      )}
      {error && <p className="text-base text-red-600">{error}</p>}
    </div>
  )
}
