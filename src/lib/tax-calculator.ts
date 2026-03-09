export type TaxRate = 10 | 8

export type TaxSummary = {
  readonly subtotal10: number // 10%対象小計（税抜）
  readonly subtotal8: number // 8%対象小計（税抜）
  readonly tax10: number // 10%消費税額
  readonly tax8: number // 8%消費税額
  readonly subtotal: number // 税抜合計
  readonly totalTax: number // 消費税合計
  readonly totalAmount: number // 税込合計
}

type LineItem = {
  readonly amount: number
  readonly taxRate: TaxRate
}

/**
 * 明細行から税額サマリーを計算
 * インボイス制度: 税率ごとの合計に対して1回だけ端数切り捨て
 */
export function calculateTaxSummary(
  items: ReadonlyArray<LineItem>
): TaxSummary {
  const subtotal10 = items
    .filter((item) => item.taxRate === 10)
    .reduce((sum, item) => sum + item.amount, 0)

  const subtotal8 = items
    .filter((item) => item.taxRate === 8)
    .reduce((sum, item) => sum + item.amount, 0)

  // 税率ごとの合計に対して1回だけ切り捨て（インボイス制度準拠）
  const tax10 = Math.floor(subtotal10 * 0.1)
  const tax8 = Math.floor(subtotal8 * 0.08)

  const subtotal = subtotal10 + subtotal8
  const totalTax = tax10 + tax8
  const totalAmount = subtotal + totalTax

  return { subtotal10, subtotal8, tax10, tax8, subtotal, totalTax, totalAmount }
}

/** 明細行の金額を計算 */
export function calculateLineAmount(quantity: number, unitPrice: number): number {
  return quantity * unitPrice
}
