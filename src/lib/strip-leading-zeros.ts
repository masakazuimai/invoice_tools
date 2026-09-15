import type { FocusEvent } from "react"

// 数値入力欄からフォーカスが外れた時に、表示上の先頭0（例: "05000"）を削除する
// stateはparseInt済みの数値を保持しているため、表示値だけを揃える
export function stripLeadingZeros(e: FocusEvent<HTMLInputElement>) {
  const input = e.currentTarget
  const normalized = input.value.replace(/^0+(?=\d)/, "")
  if (normalized !== input.value) input.value = normalized
}
