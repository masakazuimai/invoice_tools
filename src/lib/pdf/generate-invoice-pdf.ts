import PDFDocument from "pdfkit"
import path from "path"
import fs from "fs"
import { formatCurrency, formatDateJP } from "@/lib/format"
import type { BankInfo } from "@/schemas/settings.schema"

function resolveImagePath(url: string | null | undefined): string | null {
  if (!url) return null
  // /api/upload/xxx.png → uploads/xxx.png
  const match = url.match(/\/api\/upload\/(.+)$/)
  if (!match) return null
  const filePath = path.join(process.cwd(), "uploads", match[1])
  return fs.existsSync(filePath) ? filePath : null
}

type InvoiceItem = {
  name: string
  quantity: number
  unit: string
  unitPrice: number
  taxRate: number
  amount: number
}

type InvoiceData = {
  invoiceNumber: string
  issueDate: Date
  dueDate: Date
  customer: {
    name: string
    zipCode?: string | null
    address?: string | null
    contactPerson?: string | null
    contactTitle?: string | null
  }
  items: InvoiceItem[]
  subtotal: number
  taxAmount10: number
  taxAmount8: number
  totalAmount: number
  notes?: string | null
}

type CompanyData = {
  name: string
  zipCode: string
  address: string
  phone: string
  email: string
  bankInfo: string
  invoiceRegNumber: string
  logoUrl?: string | null
  sealUrl?: string | null
}

// A4サイズ: 595.28 x 841.89 pt
const PAGE = { width: 595.28, height: 841.89 }
const MARGIN = { top: 50, right: 50, bottom: 50, left: 50 }
const CONTENT_WIDTH = PAGE.width - MARGIN.left - MARGIN.right

export async function generateInvoicePdf(
  invoice: InvoiceData,
  company: CompanyData
): Promise<Buffer> {
  const fontsDir = path.join(process.cwd(), "public/fonts")
  const fontRegular = path.join(fontsDir, "NotoSansJP-Regular.ttf")
  const fontBold = path.join(fontsDir, "NotoSansJP-Bold.ttf")

  const doc = new PDFDocument({
    size: "A4",
    margin: MARGIN.top,
    info: {
      Title: `請求書 ${invoice.invoiceNumber}`,
      Author: company.name,
    },
  })

  const chunks: Buffer[] = []
  doc.on("data", (chunk: Buffer) => chunks.push(chunk))

  // 日本語フォント登録
  doc.registerFont("Regular", fontRegular)
  doc.registerFont("Bold", fontBold)
  doc.font("Regular")

  let y = MARGIN.top

  // --- タイトル ---
  doc.font("Bold").fontSize(22).text("請求書", MARGIN.left, y, { align: "center", characterSpacing: 4 })
  y += 40

  // --- 宛先（左側）と請求書情報（右側）---
  const leftX = MARGIN.left
  const rightX = PAGE.width - MARGIN.right - 200

  // 宛先
  doc.font("Regular")
  if (invoice.customer.zipCode) {
    doc.fontSize(9.5).text(`〒${invoice.customer.zipCode}`, leftX, y)
    y += 14
  }
  if (invoice.customer.address) {
    doc.fontSize(9.5).text(invoice.customer.address, leftX, y)
    y += 14
  }
  const customerY = y
  doc.font("Bold").fontSize(14).text(`${invoice.customer.name} 御中`, leftX, y, { characterSpacing: 0.5 })
  y += 22
  doc.font("Regular")
  if (invoice.customer.contactPerson) {
    const title = invoice.customer.contactTitle ? `${invoice.customer.contactTitle} ` : ""
    doc.fontSize(9.5).text(`${title}${invoice.customer.contactPerson} 様`, leftX, y)
    y += 14
  }

  // 請求書情報（右側）
  let ry = customerY - 36
  doc.fontSize(9.5)
  doc.text(`請求書番号: ${invoice.invoiceNumber}`, rightX, ry)
  ry += 14
  doc.text(`発行日: ${formatDateJP(invoice.issueDate)}`, rightX, ry)
  ry += 14
  doc.text(`支払期限: ${formatDateJP(invoice.dueDate)}`, rightX, ry)
  ry += 20

  // --- 発行元情報（右上・支払期限の下）---
  doc.font("Bold").fontSize(9.5).text(company.name, rightX, ry)
  ry += 13
  doc.font("Regular").fontSize(8)
  doc.text(`〒${company.zipCode} ${company.address}`, rightX, ry)
  ry += 11
  doc.text(`TEL: ${company.phone}  Email: ${company.email}`, rightX, ry)
  ry += 11
  doc.text(`登録番号: ${company.invoiceRegNumber}`, rightX, ry)
  ry += 15

  // --- ロゴ・社判（発行元情報の下）---
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

  // 左側の宛先と右側の発行元の高さを揃える
  y = Math.max(y, ry + 10)

  y += 10

  // --- ご請求金額（強調ボックス）---
  doc.font("Regular").fontSize(10).fillColor("#000000").text("下記の通りご請求申し上げます。", leftX, y)
  y += 24

  const amountBoxW = 320
  // 行高を実測してボックス高さを算出（上下パディング対称＝ビューア非依存で中央揃え）
  doc.font("Regular").fontSize(9.5)
  const amountLabelH = doc.currentLineHeight()
  doc.font("Bold").fontSize(20)
  const amountValueH = doc.currentLineHeight()
  const amountPadY = 12
  const amountGap = 2
  const amountBoxH = amountPadY + amountLabelH + amountGap + amountValueH + amountPadY
  doc.rect(leftX, y, amountBoxW, amountBoxH).fill("#f8fafc")
  doc.rect(leftX, y, 4, amountBoxH).fill("#334155") // 左アクセントバー
  doc.font("Regular").fontSize(9.5).fillColor("#64748b").text("ご請求金額（税込）", leftX + 18, y + amountPadY, { characterSpacing: 0.5, lineBreak: false })
  doc.font("Bold").fontSize(20).fillColor("#0f172a").text(formatCurrency(invoice.totalAmount), leftX + 18, y + amountPadY + amountLabelH + amountGap, { lineBreak: false })
  doc.font("Regular").fillColor("#000000")
  y += amountBoxH + 20

  // --- 明細テーブル ---
  const cols = [
    { label: "No.", width: 30, align: "center" as const },
    { label: "品目", width: 180, align: "left" as const },
    { label: "数量", width: 50, align: "right" as const },
    { label: "単位", width: 40, align: "center" as const },
    { label: "単価", width: 80, align: "right" as const },
    { label: "金額", width: 80, align: "right" as const },
    { label: "税率", width: 35, align: "center" as const },
  ]

  // ヘッダー（背景帯）
  doc.font("Bold").fontSize(8.5)
  const headPadY = 5
  const headBandH = headPadY + doc.currentLineHeight() + headPadY
  doc.rect(leftX, y, CONTENT_WIDTH, headBandH).fill("#f1f5f9")
  doc.fillColor("#334155")
  let cx = leftX
  for (const col of cols) {
    doc.text(col.label, cx, y + headPadY, { width: col.width, align: col.align, lineBreak: false })
    cx += col.width
  }
  y += headBandH + 4

  // 行（各行の下に薄い罫線）
  doc.font("Regular").fillColor("#111111").fontSize(9.5)
  invoice.items.forEach((item, index) => {
    cx = leftX
    const rowData = [
      { text: String(index + 1), width: cols[0].width, align: cols[0].align },
      { text: item.name, width: cols[1].width, align: cols[1].align },
      { text: String(item.quantity), width: cols[2].width, align: cols[2].align },
      { text: item.unit, width: cols[3].width, align: cols[3].align },
      { text: formatCurrency(item.unitPrice), width: cols[4].width, align: cols[4].align },
      { text: formatCurrency(item.amount), width: cols[5].width, align: cols[5].align },
      { text: item.taxRate === 8 ? "8% ※" : "10%", width: cols[6].width, align: cols[6].align },
    ]
    for (const cell of rowData) {
      doc.text(cell.text, cx, y, { width: cell.width, align: cell.align as "center" | "left" | "right" })
      cx += cell.width
    }
    y += 20
    doc.moveTo(leftX, y - 5).lineTo(PAGE.width - MARGIN.right, y - 5).strokeColor("#e5e7eb").stroke()
  })

  y += 5
  doc.moveTo(leftX, y).lineTo(PAGE.width - MARGIN.right, y).strokeColor("#333333").stroke()
  y += 10

  // --- 軽減税率注記 ---
  const has8 = invoice.taxAmount8 > 0
  if (has8) {
    doc.fontSize(8).fillColor("#666666").text("※ 軽減税率（8%）対象", leftX, y)
    y += 14
  }

  // --- 税額サマリー（右寄せ）---
  const summaryX = PAGE.width - MARGIN.right - 250
  // 明細の税率列（中央揃えの「10%」）の右端と揃えるための右余白
  const summaryRightInset = 8
  const summaryW = 250 - summaryRightInset
  doc.font("Regular").fontSize(9.5).fillColor("#000000")

  // 10%対象の小計を逆算
  const subtotal10 = invoice.subtotal - (has8 ? Math.round(invoice.taxAmount8 / 0.08) : 0)
  const subtotal8 = has8 ? invoice.subtotal - subtotal10 : 0

  if (invoice.taxAmount10 > 0) {
    doc.text(`10%対象  小計: ${formatCurrency(subtotal10)}   消費税: ${formatCurrency(invoice.taxAmount10)}`, summaryX, y, { width: summaryW, align: "right" })
    y += 22
  }
  if (has8) {
    doc.text(`8%対象  小計: ${formatCurrency(subtotal8)}   消費税: ${formatCurrency(invoice.taxAmount8)}`, summaryX, y, { width: summaryW, align: "right" })
    y += 22
  }

  y += 8
  doc.moveTo(summaryX, y).lineTo(PAGE.width - MARGIN.right, y).strokeColor("#cccccc").stroke()
  y += 14

  doc.text(`小計（税抜）: ${formatCurrency(invoice.subtotal)}`, summaryX, y, { width: summaryW, align: "right" })
  y += 22
  doc.text(`消費税合計: ${formatCurrency(invoice.taxAmount10 + invoice.taxAmount8)}`, summaryX, y, { width: summaryW, align: "right" })
  y += 24
  doc.font("Bold").fontSize(14)
  const totalPadY = 6
  // 字面はフォントサイズ分に収まるため、行高との差（ディセント等）を除いて帯を対称にする
  const totalBandH = totalPadY + 14 + totalPadY
  // 字面が描画基準より下に出るフォント特性に合わせ、帯を下げて文字を上下中央に収める（実測補正）
  doc.rect(summaryX - 6, y - totalPadY + 4.5, 256, totalBandH).fill("#f1f5f9")
  doc.font("Bold").fontSize(14).fillColor("#0f172a").text(`合計金額: ${formatCurrency(invoice.totalAmount)}`, summaryX, y, { width: summaryW, align: "right", lineBreak: false })
  doc.fillColor("#000000")
  y += totalBandH - totalPadY + 14

  // --- 備考 ---
  doc.font("Regular")
  if (invoice.notes) {
    doc.moveTo(leftX, y).lineTo(PAGE.width - MARGIN.right, y).strokeColor("#cccccc").stroke()
    y += 10
    doc.font("Bold").fontSize(8).fillColor("#444444").text("備考:", leftX, y)
    y += 12
    doc.font("Regular").fontSize(9.5).fillColor("#000000").text(invoice.notes, leftX, y, { width: CONTENT_WIDTH })
    y += doc.heightOfString(invoice.notes, { width: CONTENT_WIDTH }) + 10
  }

  // --- 振込先（背景ボックス）---
  y += 16
  const bankInfo: BankInfo = JSON.parse(company.bankInfo)
  const bankLabel = bankInfo.bankCode ? `${bankInfo.bankName}（${bankInfo.bankCode}）` : bankInfo.bankName
  const branchLabel = bankInfo.branchCode ? `${bankInfo.branchName}（${bankInfo.branchCode}）` : bankInfo.branchName

  doc.font("Bold").fontSize(9.5)
  const bankLineH = doc.currentLineHeight()
  const bankPadY = 12
  const bankGap = 5
  const bankBoxH = bankPadY + bankLineH * 3 + bankGap * 2 + bankPadY
  const bankTextTop = y + bankPadY - 2 // 背景に対しテキストを約4px（2pt）上げる視覚補正
  doc.rect(leftX, y, CONTENT_WIDTH, bankBoxH).fill("#f8fafc")
  doc.font("Bold").fontSize(9.5).fillColor("#334155").text("【お振込先】", leftX + 16, bankTextTop, { characterSpacing: 0.5, lineBreak: false })
  doc.font("Regular").fillColor("#111111")
  doc.text(`${bankLabel}　${branchLabel}　${bankInfo.accountType} ${bankInfo.accountNumber}`, leftX + 16, bankTextTop + bankLineH + bankGap, { lineBreak: false })
  doc.text(`口座名義：${bankInfo.accountHolder}`, leftX + 16, bankTextTop + (bankLineH + bankGap) * 2, { lineBreak: false })
  doc.fillColor("#000000")
  y += bankBoxH + 10

  doc.end()

  return new Promise((resolve) => {
    doc.on("end", () => {
      resolve(Buffer.concat(chunks))
    })
  })
}
