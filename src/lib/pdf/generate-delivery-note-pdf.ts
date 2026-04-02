import PDFDocument from "pdfkit"
import path from "path"
import fs from "fs"
import { formatCurrency, formatDateJP } from "@/lib/format"

function resolveImagePath(url: string | null | undefined): string | null {
  if (!url) return null
  const match = url.match(/\/api\/upload\/(.+)$/)
  if (!match) return null
  const filePath = path.join(process.cwd(), "uploads", match[1])
  return fs.existsSync(filePath) ? filePath : null
}

type DeliveryNoteItem = {
  name: string
  quantity: number
  unit: string
  unitPrice: number
  taxRate: number
  amount: number
}

type DeliveryNoteData = {
  deliveryNoteNumber: string
  issueDate: Date
  deliveryDate: Date
  customer: {
    name: string
    zipCode?: string | null
    address?: string | null
    contactPerson?: string | null
    contactTitle?: string | null
  }
  items: DeliveryNoteItem[]
  subtotal: number
  taxAmount10: number
  taxAmount8: number
  totalAmount: number
  subject?: string | null
  notes?: string | null
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

export async function generateDeliveryNotePdf(
  note: DeliveryNoteData,
  company: CompanyData
): Promise<Buffer> {
  const fontsDir = path.join(process.cwd(), "public/fonts")
  const fontRegular = path.join(fontsDir, "NotoSansJP-Regular.ttf")
  const fontBold = path.join(fontsDir, "NotoSansJP-Bold.ttf")

  const doc = new PDFDocument({
    size: "A4",
    margin: MARGIN.top,
    info: {
      Title: `納品書 ${note.deliveryNoteNumber}`,
      Author: company.name,
    },
  })

  const chunks: Buffer[] = []
  doc.on("data", (chunk: Buffer) => chunks.push(chunk))

  doc.registerFont("Regular", fontRegular)
  doc.registerFont("Bold", fontBold)
  doc.font("Regular")

  let y = MARGIN.top
  const leftX = MARGIN.left
  const rightX = PAGE.width - MARGIN.right - 200

  // --- タイトル ---
  doc.font("Bold").fontSize(22).text("納品書", leftX, y, { align: "center" })
  y += 40

  // --- 宛先 ---
  doc.font("Regular")
  if (note.customer.zipCode) {
    doc.fontSize(9).text(`〒${note.customer.zipCode}`, leftX, y)
    y += 14
  }
  if (note.customer.address) {
    doc.fontSize(9).text(note.customer.address, leftX, y)
    y += 14
  }
  const customerY = y
  doc.font("Bold").fontSize(14).text(`${note.customer.name} 御中`, leftX, y)
  y += 22
  doc.font("Regular")
  if (note.customer.contactPerson) {
    const title = note.customer.contactTitle ? `${note.customer.contactTitle} ` : ""
    doc.fontSize(9).text(`${title}${note.customer.contactPerson} 様`, leftX, y)
    y += 14
  }

  // --- 納品書情報（右側）---
  let ry = customerY - 36
  doc.fontSize(9)
  doc.text(`納品書番号: ${note.deliveryNoteNumber}`, rightX, ry)
  ry += 14
  doc.text(`発行日: ${formatDateJP(note.issueDate)}`, rightX, ry)
  ry += 14
  doc.text(`納品日: ${formatDateJP(note.deliveryDate)}`, rightX, ry)
  ry += 20

  // --- 発行元情報 ---
  doc.font("Bold").fontSize(9).text(company.name, rightX, ry)
  ry += 13
  doc.font("Regular").fontSize(7.5)
  doc.text(`〒${company.zipCode} ${company.address}`, rightX, ry)
  ry += 11
  doc.text(`TEL: ${company.phone}  Email: ${company.email}`, rightX, ry)
  ry += 11
  doc.text(`登録番号: ${company.invoiceRegNumber}`, rightX, ry)
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
  y += 10

  // --- 件名 ---
  if (note.subject) {
    doc.font("Regular").fontSize(10).text(`件名: ${note.subject}`, leftX, y)
    y += 18
  }

  doc.fontSize(10).text("下記の通り納品いたします。", leftX, y)
  y += 20

  doc.fontSize(9).text("合計金額（税込）", leftX, y)
  y += 14
  doc.font("Bold").fontSize(18).text(formatCurrency(note.totalAmount), leftX, y)
  y += 30

  // --- 罫線 ---
  doc.strokeColor("#333333").moveTo(leftX, y).lineTo(PAGE.width - MARGIN.right, y).stroke()
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

  doc.font("Bold").fontSize(8).fillColor("#444444")
  let cx = leftX
  for (const col of cols) {
    doc.text(col.label, cx, y, { width: col.width, align: col.align })
    cx += col.width
  }
  y += 14
  doc.moveTo(leftX, y).lineTo(PAGE.width - MARGIN.right, y).strokeColor("#cccccc").stroke()
  y += 5

  doc.font("Regular").fillColor("#000000").fontSize(9)
  note.items.forEach((item, index) => {
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
  doc.moveTo(leftX, y).lineTo(PAGE.width - MARGIN.right, y).strokeColor("#333333").stroke()
  y += 10

  const has8 = note.taxAmount8 > 0
  if (has8) {
    doc.fontSize(7).fillColor("#666666").text("※ 軽減税率（8%）対象", leftX, y)
    y += 14
  }

  // --- 税額サマリー ---
  const summaryX = PAGE.width - MARGIN.right - 250
  doc.font("Regular").fontSize(9).fillColor("#000000")

  const subtotal10 = note.subtotal - (has8 ? Math.round(note.taxAmount8 / 0.08) : 0)
  const subtotal8 = has8 ? note.subtotal - subtotal10 : 0

  if (note.taxAmount10 > 0) {
    doc.text(`10%対象  小計: ${formatCurrency(subtotal10)}   消費税: ${formatCurrency(note.taxAmount10)}`, summaryX, y, { width: 250, align: "right" })
    y += 14
  }
  if (has8) {
    doc.text(`8%対象  小計: ${formatCurrency(subtotal8)}   消費税: ${formatCurrency(note.taxAmount8)}`, summaryX, y, { width: 250, align: "right" })
    y += 14
  }

  y += 5
  doc.moveTo(summaryX, y).lineTo(PAGE.width - MARGIN.right, y).strokeColor("#cccccc").stroke()
  y += 8

  doc.text(`小計（税抜）: ${formatCurrency(note.subtotal)}`, summaryX, y, { width: 250, align: "right" })
  y += 14
  doc.text(`消費税合計: ${formatCurrency(note.taxAmount10 + note.taxAmount8)}`, summaryX, y, { width: 250, align: "right" })
  y += 14
  doc.font("Bold").fontSize(13).text(`合計金額: ${formatCurrency(note.totalAmount)}`, summaryX, y, { width: 250, align: "right" })
  y += 25

  // --- 備考 ---
  doc.font("Regular")
  if (note.notes) {
    doc.moveTo(leftX, y).lineTo(PAGE.width - MARGIN.right, y).strokeColor("#cccccc").stroke()
    y += 10
    doc.font("Bold").fontSize(8).fillColor("#444444").text("備考:", leftX, y)
    y += 12
    doc.font("Regular").fontSize(9).fillColor("#000000").text(note.notes, leftX, y, { width: CONTENT_WIDTH })
  }

  doc.end()

  return new Promise((resolve) => {
    doc.on("end", () => {
      resolve(Buffer.concat(chunks))
    })
  })
}
