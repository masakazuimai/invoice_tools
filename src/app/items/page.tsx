import Link from "next/link"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function ItemsPage() {
  const items = await prisma.item.findMany({
    orderBy: { updatedAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="品目管理"
        description={`${items.length}件の品目`}
        actions={
          <Link href="/items/new">
            <Button>新規作成</Button>
          </Link>
        }
      />
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-base">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-600">品目名</th>
              <th className="px-6 py-3 text-right font-medium text-gray-600">単価</th>
              <th className="px-6 py-3 text-left font-medium text-gray-600">単位</th>
              <th className="px-6 py-3 text-left font-medium text-gray-600">税率</th>
              <th className="px-6 py-3 text-right font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                <td className="px-6 py-4 text-right text-gray-900 tabular-nums">{formatCurrency(item.unitPrice)}</td>
                <td className="px-6 py-4 text-gray-600">{item.unit}</td>
                <td className="px-6 py-4 text-gray-600">{item.taxRate}%</td>
                <td className="px-6 py-4 text-right tabular-nums">
                  <Link href={`/items/${item.id}/edit`} className="text-blue-600 hover:text-blue-800">
                    編集
                  </Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  品目がまだ登録されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
