import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateNextDocumentNumber } from "@/lib/document-number"
import { calculateTaxSummary } from "@/lib/tax-calculator"
import type { TaxRate } from "@/lib/tax-calculator"

/**
 * 未請求の納品書を合算して請求書を生成
 * body: { customerId, year, month }
 */
export async function POST(request: Request) {
  const body = await request.json()
  const { customerId, year, month } = body

  if (!customerId || !year || !month) {
    return NextResponse.json({ error: "顧客、年、月は必須です" }, { status: 400 })
  }

  try {
    // 対象月の未請求納品書を取得
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    const deliveryNotes = await prisma.deliveryNote.findMany({
      where: {
        customerId,
        invoiceId: null,
        deliveryDate: { gte: startDate, lte: endDate },
        status: "delivered",
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { deliveryDate: "asc" },
    })

    if (deliveryNotes.length === 0) {
      return NextResponse.json(
        { error: "対象月の未請求納品書がありません" },
        { status: 400 }
      )
    }

    // 全納品書の明細を集約
    const allItems = deliveryNotes.flatMap((dn) =>
      dn.items.map((item) => ({
        itemId: item.itemId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        amount: item.amount,
      }))
    )

    const taxSummary = calculateTaxSummary(
      allItems.map((item) => ({
        amount: item.amount,
        taxRate: item.taxRate as TaxRate,
      }))
    )

    const invoiceNumber = await generateNextDocumentNumber("invoice")
    const now = new Date()
    const dueDate = new Date(now.getFullYear(), now.getMonth() + 2, 0)

    // 件名を生成
    const monthStr = `${year}年${month}月`
    const subject = `${monthStr}分 納品合算`

    // 請求書を作成
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId,
        issueDate: now,
        dueDate,
        subject,
        subtotal: taxSummary.subtotal,
        taxAmount10: taxSummary.tax10,
        taxAmount8: taxSummary.tax8,
        totalAmount: taxSummary.totalAmount,
        notes: `対象納品書: ${deliveryNotes.map((dn) => dn.deliveryNoteNumber).join(", ")}`,
        items: {
          create: allItems.map((item, index) => ({
            itemId: item.itemId,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            amount: item.amount,
            sortOrder: index,
          })),
        },
      },
    })

    // 各納品書に請求書IDをセット
    await prisma.deliveryNote.updateMany({
      where: { id: { in: deliveryNotes.map((dn) => dn.id) } },
      data: { invoiceId: invoice.id },
    })

    return NextResponse.json({
      ...invoice,
      deliveryNoteCount: deliveryNotes.length,
    }, { status: 201 })
  } catch (error) {
    console.error("合算請求書生成エラー:", error)
    const message = error instanceof Error ? error.message : "生成に失敗しました"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
