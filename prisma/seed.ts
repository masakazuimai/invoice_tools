import { PrismaClient } from "../src/generated/prisma/client"

const prisma = new PrismaClient()

async function main() {
  // 自社情報
  const company = await prisma.companyProfile.create({
    data: {
      name: "株式会社サンプルテック",
      zipCode: "150-0001",
      address: "東京都渋谷区神宮前1-2-3 テックビル5F",
      phone: "03-1234-5678",
      email: "info@sample-tech.co.jp",
      invoiceRegNumber: "T1234567890123",
      bankInfo: JSON.stringify({
        bankName: "三菱UFJ銀行",
        branchName: "渋谷支店",
        accountType: "普通",
        accountNumber: "1234567",
        accountHolder: "カ）サンプルテック",
      }),
    },
  })
  console.log("自社情報を作成:", company.name)

  // 顧客
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: "株式会社ABC商事",
        zipCode: "100-0001",
        address: "東京都千代田区丸の内1-1-1",
        phone: "03-9876-5432",
        email: "tanaka@abc-shoji.co.jp",
        contactPerson: "田中太郎",
        memo: "月末締め翌月末払い",
      },
    }),
    prisma.customer.create({
      data: {
        name: "合同会社デザインラボ",
        zipCode: "530-0001",
        address: "大阪府大阪市北区梅田2-3-4",
        phone: "06-1111-2222",
        email: "suzuki@design-lab.co.jp",
        contactPerson: "鈴木花子",
      },
    }),
    prisma.customer.create({
      data: {
        name: "有限会社山田食品",
        zipCode: "460-0001",
        address: "愛知県名古屋市中区栄3-5-6",
        phone: "052-333-4444",
        email: "yamada@yamada-foods.co.jp",
        contactPerson: "山田一郎",
        memo: "軽減税率対象品目あり",
      },
    }),
  ])
  console.log("顧客を作成:", customers.length, "件")

  // 品目マスタ
  const items = await Promise.all([
    prisma.item.create({
      data: { name: "Webサイト制作", unitPrice: 500000, unit: "式", taxRate: 10, description: "レスポンシブ対応のコーポレートサイト制作" },
    }),
    prisma.item.create({
      data: { name: "ロゴデザイン", unitPrice: 200000, unit: "式", taxRate: 10, description: "ロゴ3案提案、修正2回まで" },
    }),
    prisma.item.create({
      data: { name: "システム開発（人日）", unitPrice: 80000, unit: "人日", taxRate: 10, description: "エンジニア1名分の稼働" },
    }),
    prisma.item.create({
      data: { name: "月額保守運用", unitPrice: 50000, unit: "月", taxRate: 10, description: "サーバー監視、バグ修正、軽微な改修" },
    }),
    prisma.item.create({
      data: { name: "コンサルティング", unitPrice: 100000, unit: "回", taxRate: 10, description: "IT戦略・DX推進の相談" },
    }),
    prisma.item.create({
      data: { name: "食品パッケージデザイン", unitPrice: 150000, unit: "式", taxRate: 10, description: "パッケージデザイン一式" },
    }),
    prisma.item.create({
      data: { name: "食品素材撮影", unitPrice: 30000, unit: "点", taxRate: 10, description: "商品写真撮影" },
    }),
    prisma.item.create({
      data: { name: "お茶（会議用）", unitPrice: 500, unit: "本", taxRate: 8, description: "軽減税率対象" },
    }),
    prisma.item.create({
      data: { name: "お弁当（イベント用）", unitPrice: 1500, unit: "個", taxRate: 8, description: "軽減税率対象" },
    }),
  ])
  console.log("品目を作成:", items.length, "件")

  // 請求書1: 入金済み（Web制作案件）
  const inv1 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-202602-0001",
      customerId: customers[0].id,
      issueDate: new Date("2026-02-01"),
      dueDate: new Date("2026-02-28"),
      status: "paid",
      subtotal: 700000,
      taxAmount10: 70000,
      taxAmount8: 0,
      totalAmount: 770000,
      notes: "納品完了後のお支払いをお願いいたします。",
      sentAt: new Date("2026-02-01"),
      paidAt: new Date("2026-02-25"),
      items: {
        create: [
          { name: "Webサイト制作", quantity: 1, unit: "式", unitPrice: 500000, taxRate: 10, amount: 500000, sortOrder: 0 },
          { name: "ロゴデザイン", quantity: 1, unit: "式", unitPrice: 200000, taxRate: 10, amount: 200000, sortOrder: 1 },
        ],
      },
    },
  })
  console.log("請求書を作成:", inv1.invoiceNumber, "(入金済み)")

  // 請求書2: 送信済み（システム開発案件）
  const inv2 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-202603-0001",
      customerId: customers[0].id,
      issueDate: new Date("2026-03-01"),
      dueDate: new Date("2026-03-31"),
      status: "sent",
      subtotal: 1040000,
      taxAmount10: 104000,
      taxAmount8: 0,
      totalAmount: 1144000,
      notes: "3月分の開発稼働と保守費用です。",
      sentAt: new Date("2026-03-01"),
      items: {
        create: [
          { name: "システム開発（人日）", quantity: 12, unit: "人日", unitPrice: 80000, taxRate: 10, amount: 960000, sortOrder: 0 },
          { name: "月額保守運用", quantity: 1, unit: "月", unitPrice: 50000, taxRate: 10, amount: 50000, sortOrder: 1 },
          { name: "お弁当（レビュー会）", quantity: 20, unit: "個", unitPrice: 1500, taxRate: 8, amount: 30000, sortOrder: 2 },
        ],
      },
    },
  })
  // taxAmount8を正しく設定
  await prisma.invoice.update({
    where: { id: inv2.id },
    data: {
      subtotal: 960000 + 50000 + 30000,
      taxAmount10: Math.floor((960000 + 50000) * 0.1),
      taxAmount8: Math.floor(30000 * 0.08),
      totalAmount: 960000 + 50000 + 30000 + Math.floor((960000 + 50000) * 0.1) + Math.floor(30000 * 0.08),
    },
  })
  console.log("請求書を作成:", inv2.invoiceNumber, "(送信済み・軽減税率あり)")

  // 請求書3: 期限超過（デザイン案件）
  const inv3 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-202601-0001",
      customerId: customers[1].id,
      issueDate: new Date("2026-01-15"),
      dueDate: new Date("2026-02-15"),
      status: "overdue",
      subtotal: 350000,
      taxAmount10: 35000,
      taxAmount8: 0,
      totalAmount: 385000,
      notes: "デザイン制作費用",
      sentAt: new Date("2026-01-15"),
      items: {
        create: [
          { name: "食品パッケージデザイン", quantity: 1, unit: "式", unitPrice: 150000, taxRate: 10, amount: 150000, sortOrder: 0 },
          { name: "ロゴデザイン", quantity: 1, unit: "式", unitPrice: 200000, taxRate: 10, amount: 200000, sortOrder: 1 },
        ],
      },
    },
  })
  console.log("請求書を作成:", inv3.invoiceNumber, "(期限超過)")

  // 請求書4: 下書き（食品会社向け・軽減税率多め）
  const sub10 = 150000 + 150000
  const sub8 = 25000 + 30000
  const tax10 = Math.floor(sub10 * 0.1)
  const tax8 = Math.floor(sub8 * 0.08)

  const inv4 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-202603-0002",
      customerId: customers[2].id,
      issueDate: new Date("2026-03-09"),
      dueDate: new Date("2026-04-30"),
      status: "draft",
      subtotal: sub10 + sub8,
      taxAmount10: tax10,
      taxAmount8: tax8,
      totalAmount: sub10 + sub8 + tax10 + tax8,
      notes: "商品撮影およびイベント用飲食費",
      items: {
        create: [
          { name: "食品パッケージデザイン", quantity: 1, unit: "式", unitPrice: 150000, taxRate: 10, amount: 150000, sortOrder: 0 },
          { name: "食品素材撮影", quantity: 5, unit: "点", unitPrice: 30000, taxRate: 10, amount: 150000, sortOrder: 1 },
          { name: "お茶（撮影現場用）", quantity: 50, unit: "本", unitPrice: 500, taxRate: 8, amount: 25000, sortOrder: 2 },
          { name: "お弁当（撮影スタッフ用）", quantity: 20, unit: "個", unitPrice: 1500, taxRate: 8, amount: 30000, sortOrder: 3 },
        ],
      },
    },
  })
  console.log("請求書を作成:", inv4.invoiceNumber, "(下書き・軽減税率あり)")

  // 請求書5: 送信済み（コンサルティング）
  const inv5 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-202603-0003",
      customerId: customers[1].id,
      issueDate: new Date("2026-03-05"),
      dueDate: new Date("2026-04-30"),
      status: "sent",
      subtotal: 300000,
      taxAmount10: 30000,
      taxAmount8: 0,
      totalAmount: 330000,
      sentAt: new Date("2026-03-05"),
      items: {
        create: [
          { name: "コンサルティング", quantity: 3, unit: "回", unitPrice: 100000, taxRate: 10, amount: 300000, sortOrder: 0 },
        ],
      },
    },
  })
  console.log("請求書を作成:", inv5.invoiceNumber, "(送信済み)")

  console.log("\nシードデータの投入が完了しました")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
