// 書類PDF共通の既定字間。読みやすさのため全テキストにわずかな字間を与える
export const DEFAULT_CHARACTER_SPACING = 0.4

type SpacingOptions = { characterSpacing?: number }

/**
 * doc.text / heightOfString / widthOfString に既定の字間を適用する。
 * 個別に characterSpacing を指定した箇所（タイトル・合計金額など）はそちらが優先される。
 */
export function applyDefaultCharacterSpacing(
  doc: PDFKit.PDFDocument,
  spacing: number = DEFAULT_CHARACTER_SPACING
): void {
  const withSpacing = <T extends SpacingOptions>(options?: T) => ({
    characterSpacing: spacing,
    ...(options ?? {}),
  })

  const text = doc.text.bind(doc)
  const heightOfString = doc.heightOfString.bind(doc)
  const widthOfString = doc.widthOfString.bind(doc)

  doc.text = ((content: string, x?: number, y?: number, options?: SpacingOptions) =>
    text(content, x, y, withSpacing(options))) as typeof doc.text

  doc.heightOfString = ((content: string, options?: SpacingOptions) =>
    heightOfString(content, withSpacing(options))) as typeof doc.heightOfString

  doc.widthOfString = ((content: string, options?: SpacingOptions) =>
    widthOfString(content, withSpacing(options))) as typeof doc.widthOfString
}
