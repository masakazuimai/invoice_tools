import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: { customer: true, invoice: true },
  })

  if (!receipt) {
    return NextResponse.json({ error: "領収書が見つかりません" }, { status: 404 })
  }

  return NextResponse.json(receipt)
}

export async function DELETE() {
  return NextResponse.json({ error: "領収書は削除できません" }, { status: 403 })
}
