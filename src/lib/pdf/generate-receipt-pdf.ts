import PDFDocument from "pdfkit"
import path from "path"
import fs from "fs"
import { formatCurrency, formatDateJP } from "@/lib/format"
import { applyDefaultCharacterSpacing } from "@/lib/pdf/text-spacing"

function resolveImagePath(url: string | null | undefined): string | null {
  if (!url) return null
  const match = url.match(/\/api\/upload\/(.+)$/)
  if (!match) return null
  const filePath = path.join(process.cwd(), "uploads", match[1])
  return fs.existsSync(filePath) ? filePath : null
}

type ReceiptData = {
  receiptNumber: string
  issueDate: Date
  totalAmount: number
  taxAmount10: number
  taxAmount8: number
  paymentMethod: string
  subject?: string | null
  notes?: string | null
  customer: {
    name: string
    zipCode?: string | null
    address?: string | null
    contactPerson?: string | null
    contactTitle?: string | null
  }
  invoice: {
    invoiceNumber: string
  }
}

type CompanyData = {
  name: string
  zipCode: string
  address: string
  phone: string
  email: string
  invoiceRegNumber: string
  logoUrl?: string | null
  sealUrl?: string | null
}

const PAGE = { width: 595.28, height: 841.89 }
const MARGIN = { top: 50, right: 50, bottom: 50, left: 50 }
const CONTENT_WIDTH = PAGE.width - MARGIN.left - MARGIN.right

function formatPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    bankTransfer: "銀行振込",
    cash: "現金",
    other: "その他",
  }
  return map[method] ?? method
}

export async function generateReceiptPdf(
  receipt: ReceiptData,
  company: CompanyData
): Promise<Buffer> {
  const fontsDir = path.join(process.cwd(), "public/fonts")
  const fontRegular = path.join(fontsDir, "NotoSansJP-Regular.ttf")
  const fontBold = path.join(fontsDir, "NotoSansJP-Bold.ttf")

  const doc = new PDFDocument({
    size: "A4",
    margin: MARGIN.top,
    info: {
      Title: `領収書 ${receipt.receiptNumber}`,
      Author: company.name,
    },
  })

  const chunks: Buffer[] = []
  doc.on("data", (chunk: Buffer) => chunks.push(chunk))

  doc.registerFont("Regular", fontRegular)
  doc.registerFont("Bold", fontBold)
  applyDefaultCharacterSpacing(doc) // 全テキストに既定の字間を適用
  doc.font("Regular")

  let y = MARGIN.top
  const leftX = MARGIN.left
  const rightX = PAGE.width - MARGIN.right - 200

  // --- タイトル ---
  doc.font("Bold").fontSize(22).text("領収書", leftX, y, { align: "center", characterSpacing: 4 })
  y += 70

  // --- 宛先 ---
  doc.font("Regular")
  if (receipt.customer.zipCode) {
    doc.fontSize(9.5).text(`〒${receipt.customer.zipCode}`, leftX, y)
    y += 14
  }
  if (receipt.customer.address) {
    doc.fontSize(9.5).text(receipt.customer.address, leftX, y)
    y += 14
  }
  const customerY = y
  doc.font("Bold").fontSize(14).text(`${receipt.customer.name} 様`, leftX, y, { characterSpacing: 0.5 })
  y += 30

  // --- 領収書情報（右側）---
  let ry = customerY - 36
  doc.font("Regular").fontSize(9.5)
  doc.text(`領収書番号: ${receipt.receiptNumber}`, rightX, ry)
  ry += 14
  doc.text(`発行日: ${formatDateJP(receipt.issueDate)}`, rightX, ry)
  ry += 20

  // --- 発行元情報 ---
  doc.font("Bold").fontSize(9.5).text(company.name, rightX, ry)
  ry += 13
  doc.font("Regular").fontSize(8)
  doc.text(`〒${company.zipCode} ${company.address}`, rightX, ry, { lineBreak: false })
  ry += 11
  doc.text(`TEL: ${company.phone}`, rightX, ry, { lineBreak: false })
  ry += 11
  doc.text(`Email: ${company.email}`, rightX, ry, { lineBreak: false })
  ry += 11
  doc.text(`登録番号: ${company.invoiceRegNumber}`, rightX, ry, { lineBreak: false })
  ry += 15

  // --- ロゴ・社判 ---
  const logoPath = resolveImagePath(company.logoUrl)
  const sealPath = resolveImagePath(company.sealUrl)

  if (logoPath || sealPath) {
    const imgY = ry
    let imgX = rightX
    try {
      if (logoPath) {
        doc.image(logoPath, imgX, imgY, { height: 40 })
        imgX += 50
      }
      if (sealPath) {
        doc.image(sealPath, imgX, imgY, { height: 40 })
      }
      ry += 45
    } catch (err) {
      console.error("画像読み込みエラー:", err)
    }
  }

  y = Math.max(y, ry + 10)
  y += 20

  // --- 但し書き（背景バンド＋左アクセントバー）---
  if (receipt.subject) {
    const subjectLabelW = 46
    doc.font("Bold").fontSize(11)
    const subjectValueH = doc.heightOfString(receipt.subject, {
      width: CONTENT_WIDTH - subjectLabelW - 34,
    })
    const subjectPadY = 9
    const subjectBoxH = subjectPadY + subjectValueH + subjectPadY
    doc.rect(leftX, y, CONTENT_WIDTH, subjectBoxH).fill("#f8fafc")
    doc.rect(leftX, y, 3, subjectBoxH).fill("#334155") // 左アクセントバー
    doc
      .font("Regular")
      .fontSize(8.5)
      .fillColor("#64748b")
      .text("但し書き", leftX + 16, y + subjectPadY + 3, { width: subjectLabelW, lineBreak: false })
    doc
      .font("Bold")
      .fontSize(11)
      .fillColor("#0f172a")
      .text(receipt.subject, leftX + 16 + subjectLabelW, y + subjectPadY, {
        width: CONTENT_WIDTH - subjectLabelW - 34,
      })
    doc.fillColor("#000000")
    y += subjectBoxH + 16
  }

  doc.font("Regular").fontSize(10).fillColor("#000000").text("下記の金額を領収いたしました。", leftX, y)
  y += 32

  // 領収金額（強調ボックス）。行高を実測して上下パディングを対称にする
  const amountBoxW = 320
  doc.font("Regular").fontSize(9.5)
  const amountLabelH = doc.currentLineHeight()
  doc.font("Bold").fontSize(20)
  const amountValueH = doc.currentLineHeight()
  const amountPadY = 12
  const amountGap = 2
  const amountBoxH = amountPadY + amountLabelH + amountGap + amountValueH + amountPadY
  doc.rect(leftX, y, amountBoxW, amountBoxH).fill("#f8fafc")
  doc.rect(leftX, y, 4, amountBoxH).fill("#334155") // 左アクセントバー
  doc
    .font("Regular")
    .fontSize(9.5)
    .fillColor("#64748b")
    .text("領収金額（税込）", leftX + 18, y + amountPadY, { characterSpacing: 0.5, lineBreak: false })
  doc
    .font("Bold")
    .fontSize(20)
    .fillColor("#0f172a")
    .text(formatCurrency(receipt.totalAmount), leftX + 18, y + amountPadY + amountLabelH + amountGap, { lineBreak: false })
  doc.font("Regular").fillColor("#000000")
  y += amountBoxH + 20

  // --- 詳細 ---
  doc.font("Regular").fontSize(9.5).fillColor("#000000")

  doc.text(`支払方法: ${formatPaymentMethod(receipt.paymentMethod)}`, leftX, y)
  y += 18
  doc.text(`対応請求書: ${receipt.invoice.invoiceNumber}`, leftX, y)
  y += 24

  // --- 税額内訳 ---
  if (receipt.taxAmount10 > 0 || receipt.taxAmount8 > 0) {
    doc.moveTo(leftX, y).lineTo(PAGE.width - MARGIN.right, y).strokeColor("#cccccc").stroke()
    y += 10
    doc.font("Bold").fontSize(8).fillColor("#444444").text("消費税内訳:", leftX, y)
    y += 14
    doc.font("Regular").fontSize(9.5).fillColor("#000000")

    if (receipt.taxAmount10 > 0) {
      doc.text(`10%対象 消費税: ${formatCurrency(receipt.taxAmount10)}`, leftX, y)
      y += 14
    }
    if (receipt.taxAmount8 > 0) {
      doc.text(`8%対象 消費税: ${formatCurrency(receipt.taxAmount8)}`, leftX, y)
      y += 14
    }
    y += 10
  }

  // --- 収入印紙枠（5万円以上の場合）---
  if (receipt.totalAmount >= 50000) {
    y += 10
    doc.moveTo(leftX, y).lineTo(PAGE.width - MARGIN.right, y).strokeColor("#cccccc").stroke()
    y += 10
    doc.fontSize(8).fillColor("#666666").text("※ 領収金額が5万円以上のため、収入印紙の貼付が必要です。", leftX, y)
    y += 14

    // 印紙枠
    const stampX = PAGE.width - MARGIN.right - 100
    const stampY = y
    doc.rect(stampX, stampY, 80, 50).strokeColor("#999999").stroke()
    doc.fontSize(8).fillColor("#999999").text("収入印紙", stampX, stampY + 20, { width: 80, align: "center" })
  }

  // --- 備考 ---
  doc.font("Regular").fillColor("#000000")
  if (receipt.notes) {
    y += 30
    doc.moveTo(leftX, y).lineTo(PAGE.width - MARGIN.right, y).strokeColor("#cccccc").stroke()
    y += 10
    doc.font("Bold").fontSize(8).fillColor("#444444").text("備考:", leftX, y)
    y += 12
    doc.font("Regular").fontSize(9.5).fillColor("#000000").text(receipt.notes, leftX, y, { width: CONTENT_WIDTH })
  }

  doc.end()

  return new Promise((resolve) => {
    doc.on("end", () => {
      resolve(Buffer.concat(chunks))
    })
  })
}
