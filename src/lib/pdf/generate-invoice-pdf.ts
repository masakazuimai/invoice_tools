import PDFDocument from "pdfkit"
import path from "path"
import { formatCurrency, formatDateJP } from "@/lib/format"
import type { BankInfo } from "@/schemas/settings.schema"

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
}

// A4サイズ: 595.28 x 841.89 pt
const PAGE = { width: 595.28, height: 841.89 }
const MARGIN = { top: 50, right: 50, bottom: 50, left: 50 }
const CONTENT_WIDTH = PAGE.width - MARGIN.left - MARGIN.right

export async function generateInvoicePdf(
  invoice: InvoiceData,
  company: CompanyData
): Promise<Buffer> {
  const fontPath = path.join(process.cwd(), "public/fonts/NotoSansJP-Regular.ttf")

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
  doc.registerFont("NotoSansJP", fontPath)
  doc.font("NotoSansJP")

  let y = MARGIN.top

  // --- タイトル ---
  doc.fontSize(22).text("請求書", MARGIN.left, y, { align: "center" })
  y += 40

  // --- 宛先（左側）と請求書情報（右側）---
  const leftX = MARGIN.left
  const rightX = PAGE.width - MARGIN.right - 200

  // 宛先
  if (invoice.customer.zipCode) {
    doc.fontSize(9).text(`〒${invoice.customer.zipCode}`, leftX, y)
    y += 14
  }
  if (invoice.customer.address) {
    doc.fontSize(9).text(invoice.customer.address, leftX, y)
    y += 14
  }
  const customerY = y
  doc.fontSize(14).text(`${invoice.customer.name} 御中`, leftX, y)
  y += 22
  if (invoice.customer.contactPerson) {
    doc.fontSize(9).text(`${invoice.customer.contactPerson} 様`, leftX, y)
    y += 14
  }

  // 請求書情報（右側）
  let ry = customerY - 36
  doc.fontSize(9)
  doc.text(`請求書番号: ${invoice.invoiceNumber}`, rightX, ry)
  ry += 14
  doc.text(`発行日: ${formatDateJP(invoice.issueDate)}`, rightX, ry)
  ry += 14
  doc.text(`支払期限: ${formatDateJP(invoice.dueDate)}`, rightX, ry)

  y += 10

  // --- ご請求金額 ---
  doc.fontSize(10).text("下記の通りご請求申し上げます。", leftX, y)
  y += 20

  doc.fontSize(9).text("ご請求金額（税込）", leftX, y)
  y += 14
  doc.fontSize(18).text(formatCurrency(invoice.totalAmount), leftX, y)
  y += 30

  // --- 罫線 ---
  doc.moveTo(leftX, y).lineTo(PAGE.width - MARGIN.right, y).stroke()
  y += 10

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

  // ヘッダー
  doc.fontSize(8).fillColor("#666666")
  let cx = leftX
  for (const col of cols) {
    doc.text(col.label, cx, y, { width: col.width, align: col.align })
    cx += col.width
  }
  y += 14
  doc.moveTo(leftX, y).lineTo(PAGE.width - MARGIN.right, y).strokeColor("#cccccc").stroke()
  y += 5

  // 行
  doc.fillColor("#000000").fontSize(9)
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
    y += 16
  })

  y += 5
  doc.moveTo(leftX, y).lineTo(PAGE.width - MARGIN.right, y).stroke()
  y += 10

  // --- 軽減税率注記 ---
  const has8 = invoice.taxAmount8 > 0
  if (has8) {
    doc.fontSize(7).fillColor("#666666").text("※ 軽減税率（8%）対象", leftX, y)
    y += 14
  }

  // --- 税額サマリー（右寄せ）---
  const summaryX = PAGE.width - MARGIN.right - 250
  doc.fontSize(9).fillColor("#000000")

  // 10%対象の小計を逆算
  const subtotal10 = invoice.subtotal - (has8 ? Math.round(invoice.taxAmount8 / 0.08) : 0)
  const subtotal8 = has8 ? invoice.subtotal - subtotal10 : 0

  if (invoice.taxAmount10 > 0) {
    doc.text(`10%対象  小計: ${formatCurrency(subtotal10)}   消費税: ${formatCurrency(invoice.taxAmount10)}`, summaryX, y, { width: 250, align: "right" })
    y += 14
  }
  if (has8) {
    doc.text(`8%対象  小計: ${formatCurrency(subtotal8)}   消費税: ${formatCurrency(invoice.taxAmount8)}`, summaryX, y, { width: 250, align: "right" })
    y += 14
  }

  y += 5
  doc.moveTo(summaryX, y).lineTo(PAGE.width - MARGIN.right, y).strokeColor("#cccccc").stroke()
  y += 8

  doc.text(`小計（税抜）: ${formatCurrency(invoice.subtotal)}`, summaryX, y, { width: 250, align: "right" })
  y += 14
  doc.text(`消費税合計: ${formatCurrency(invoice.taxAmount10 + invoice.taxAmount8)}`, summaryX, y, { width: 250, align: "right" })
  y += 14
  doc.fontSize(12).text(`合計金額: ${formatCurrency(invoice.totalAmount)}`, summaryX, y, { width: 250, align: "right" })
  y += 25

  // --- 備考 ---
  if (invoice.notes) {
    doc.moveTo(leftX, y).lineTo(PAGE.width - MARGIN.right, y).strokeColor("#cccccc").stroke()
    y += 10
    doc.fontSize(8).fillColor("#666666").text("備考:", leftX, y)
    y += 12
    doc.fontSize(9).fillColor("#000000").text(invoice.notes, leftX, y, { width: CONTENT_WIDTH })
    y += doc.heightOfString(invoice.notes, { width: CONTENT_WIDTH }) + 10
  }

  // --- 振込先 ---
  y += 10
  doc.moveTo(leftX, y).lineTo(PAGE.width - MARGIN.right, y).strokeColor("#cccccc").stroke()
  y += 10

  const bankInfo: BankInfo = JSON.parse(company.bankInfo)
  doc.fontSize(9)
  doc.text("【お振込先】", leftX, y)
  y += 14
  doc.text(`${bankInfo.bankName} ${bankInfo.branchName} ${bankInfo.accountType} ${bankInfo.accountNumber}`, leftX, y)
  y += 14
  doc.text(`口座名義: ${bankInfo.accountHolder}`, leftX, y)
  y += 25

  // --- 発行元情報 ---
  doc.moveTo(leftX, y).lineTo(PAGE.width - MARGIN.right, y).strokeColor("#cccccc").stroke()
  y += 10

  doc.fontSize(10).text(company.name, leftX, y)
  y += 14
  doc.fontSize(8)
  doc.text(`〒${company.zipCode} ${company.address}`, leftX, y)
  y += 12
  doc.text(`TEL: ${company.phone}  Email: ${company.email}`, leftX, y)
  y += 12
  doc.text(`登録番号: ${company.invoiceRegNumber}`, leftX, y)

  doc.end()

  return new Promise((resolve) => {
    doc.on("end", () => {
      resolve(Buffer.concat(chunks))
    })
  })
}
