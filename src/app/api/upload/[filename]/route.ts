import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"

type Params = { params: Promise<{ filename: string }> }

const MIME_MAP: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
}

export async function GET(_request: Request, { params }: Params) {
  const { filename } = await params
  const filePath = path.join(process.cwd(), "uploads", filename)

  try {
    const buffer = await readFile(filePath)
    const ext = filename.split(".").pop()?.toLowerCase() ?? "png"
    const contentType = MIME_MAP[ext] ?? "application/octet-stream"

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 404 })
  }
}
