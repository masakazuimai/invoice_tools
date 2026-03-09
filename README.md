# 請求書管理システム

個人・法人向けの請求書作成・管理ツール。インボイス制度（適格請求書）対応。

## 機能

- **請求書管理** - 作成・編集・複製・削除・ステータス管理（下書き→送信済み→入金済み/期限超過）
- **PDF出力** - 適格請求書フォーマットの日本語PDF生成
- **顧客管理** - 顧客情報のCRUD
- **品目マスタ** - 単価・税率の管理
- **メール送信** - PDF添付で請求書をメール送信（Resend）
- **ダッシュボード** - ステータス別集計・未入金一覧

### インボイス制度対応

適格請求書の法定6要件をすべて満たすPDFを生成します。

- 適格請求書発行事業者の名称・登録番号（T+13桁）
- 取引年月日・取引内容
- 税率区分別の対価の額と消費税額（10%/8%軽減税率）

## 技術スタック

- Next.js 16（App Router）/ TypeScript / Tailwind CSS
- SQLite（Prisma ORM）
- PDFKit（日本語フォント: Noto Sans JP）
- Resend（メール送信）

## セットアップ

```bash
git clone https://github.com/masakazuimai/invoice_tools.git
cd invoice_tools
cp .env.example .env
npm run setup
```

### 起動

```bash
npm run dev
```

http://localhost:3000 でアクセス（ポート3000が使用中の場合は `npm run dev -- --port 3333`）

### サンプルデータの投入

```bash
npx tsx prisma/seed.ts
```

## 環境変数

| 変数 | 説明 | 必須 |
|------|------|------|
| `DATABASE_URL` | SQLiteファイルパス | はい |
| `RESEND_API_KEY` | Resend APIキー | メール送信時のみ |
| `EMAIL_FROM` | 送信元メールアドレス | メール送信時のみ |

## データ保存先

すべてのデータは `prisma/dev.db`（SQLiteファイル）にローカル保存されます。外部サーバーへのデータ送信はありません。
