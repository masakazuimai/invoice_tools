import { NextResponse } from "next/server"
import { generateNextInvoiceNumber } from "@/lib/invoice-number"

export async function GET() {
  const number = await generateNextInvoiceNumber()
  return NextResponse.json({ number })
}
