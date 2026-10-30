#!/bin/bash
# invoice-tools のデータベース(dev.db)をGoogleドライブ同期フォルダへ月次バックアップする。
# launchd から毎月1回実行される想定。整合性のあるスナップショットを sqlite3 .backup で取得する。
set -euo pipefail

# 完了報告メール（成否にかかわらず必ず送る・共通の report_mail.py・2026-10-30 CEO指示）
DEST=""
report() {
  local st=$?
  local summary="バックアップに失敗（ログを確認）"
  [ "$st" -eq 0 ] && summary="$(basename "$DEST") を作成"
  /usr/bin/python3 "$HOME/.claude/automation/report_mail.py" send --job "invoice-tools 月次バックアップ" \
    --status "$st" --category なし --summary "$summary" --body "保存先: ${DEST:-（作成前に停止）}" >/dev/null 2>&1 || true
}
trap report EXIT

# スクリプトの位置からプロジェクトルート・DBパスを導出する
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB_PATH="$PROJECT_DIR/prisma/dev.db"

# Googleドライブ同期フォルダ（アカウントが変わってもワイルドカードで追従）
DRIVE_ROOT="$(ls -d "$HOME"/Library/CloudStorage/GoogleDrive-*/マイドライブ 2>/dev/null | head -1)"
if [ -z "$DRIVE_ROOT" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') エラー: Googleドライブ同期フォルダが見つかりません" >&2
  exit 1
fi

BACKUP_DIR="$DRIVE_ROOT/invoice-backup"
mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_PATH" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') エラー: DBが見つかりません ($DB_PATH)" >&2
  exit 1
fi

STAMP="$(date +%Y-%m-%d)"
DEST="$BACKUP_DIR/dev-$STAMP.db"

# まずローカルの一時ファイルへ整合スナップショットを作る
# （sqlite3の.backupはクラウド同期フォルダ上へ直接書けないことがあるため）
TMP="$(mktemp -t invoice-db-backup)"
sqlite3 "$DB_PATH" ".backup '$TMP'"

# 完成したファイルをDriveフォルダへ単純コピー（既存があれば上書き）
cp -f "$TMP" "$DEST"
rm -f "$TMP"

echo "$(date '+%Y-%m-%d %H:%M:%S') バックアップ成功 -> $DEST"

# 世代管理: 最新3世代だけ残し、古いものから削除する
KEEP=3
FILES="$(ls -1 "$BACKUP_DIR"/dev-*.db 2>/dev/null | sort)"
COUNT="$(printf '%s\n' "$FILES" | grep -c .)"
if [ "$COUNT" -gt "$KEEP" ]; then
  REMOVE=$((COUNT - KEEP))
  printf '%s\n' "$FILES" | head -n "$REMOVE" | while read -r OLD; do
    [ -n "$OLD" ] || continue
    rm -f "$OLD"
    echo "$(date '+%Y-%m-%d %H:%M:%S') 古いバックアップを削除 -> $OLD"
  done
fi
