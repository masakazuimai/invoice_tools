// 書類PDF共通の宛先住所描画。郵便番号・住所1・住所2を上から順に描く

type CustomerAddress = {
  zipCode?: string | null
  address?: string | null
  address2?: string | null
}

type Position = { x: number; y: number; width: number }

const LINE_ADVANCE = 14

/** 指定幅で折り返したときの行数（最低1行） */
function countLines(doc: PDFKit.PDFDocument, text: string, width: number): number {
  return Math.max(1, Math.round(doc.heightOfString(text, { width }) / doc.currentLineHeight()))
}

/**
 * 宛先の郵便番号・住所1・住所2を描画し、描画後のyを返す。
 * width を超える住所は折り返すため、右カラムに被らない幅を渡すこと。
 */
export function drawCustomerAddress(
  doc: PDFKit.PDFDocument,
  customer: CustomerAddress,
  { x, y, width }: Position
): number {
  doc.font("Regular").fontSize(9.5)

  let currentY = y

  if (customer.zipCode) {
    doc.text(`〒${customer.zipCode}`, x, currentY, { width })
    currentY += LINE_ADVANCE
  }

  for (const line of [customer.address, customer.address2]) {
    if (!line) continue
    doc.text(line, x, currentY, { width })
    currentY += LINE_ADVANCE * countLines(doc, line, width)
  }

  return currentY
}
