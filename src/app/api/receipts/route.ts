import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  const receipts = await prisma.receipt.findMany({
    include: { customer: true, invoice: true },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(receipts)
}
