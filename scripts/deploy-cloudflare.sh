#!/usr/bin/env bash
# 恶人百科 · 一键部署到 Cloudflare Pages
# 用法:
#   1. 在 https://dash.cloudflare.com/profile/api-tokens 创建 Token
#      权限: Account > Cloudflare Pages > Edit
#      Account Resources: 你的账户
#   2. 在 https://dash.cloudflare.com 右侧栏复制 Account ID
#   3. 跑本脚本,把两个值粘贴进去

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$PROJECT_DIR/dist"

# ---------- 颜色 ----------
RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
CYAN=$'\033[0;36m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

step() { echo -e "${CYAN}▸${RESET} ${BOLD}$*${RESET}"; }
ok()   { echo -e "${GREEN}✓${RESET} $*"; }
warn() { echo -e "${YELLOW}!${RESET} $*"; }
err()  { echo -e "${RED}✗${RESET} $*" >&2; exit 1; }

# ---------- 1. 读取 Token ----------
step "检查 Cloudflare API Token"
if [[ -z "${CF_API_TOKEN:-}" ]]; then
  echo
  warn "需要 Cloudflare API Token,打开这个链接创建一个:"
  echo "    https://dash.cloudflare.com/profile/api-tokens"
  echo "    推荐用 'Edit Cloudflare Pages' 模板"
  echo
  printf "%s" "粘贴 Token: "
  read -rs CF_API_TOKEN
  echo
fi
[[ -z "$CF_API_TOKEN" ]] && err "Token 不能为空"
ok "Token 已获取 (${#CF_API_TOKEN} 字符)"

# ---------- 2. 读取 Account ID ----------
step "检查 Cloudflare Account ID"
if [[ -z "${CF_ACCOUNT_ID:-}" ]]; then
  echo
  warn "Account ID 在 Cloudflare 控制台右侧栏"
  echo "    也可访问 https://dash.cloudflare.com 直接复制"
  echo
  printf "%s" "粘贴 Account ID (32 位 hex): "
  read -r CF_ACCOUNT_ID
  echo
fi
[[ -z "$CF_ACCOUNT_ID" ]] && err "Account ID 不能为空"
ok "Account ID: $CF_ACCOUNT_ID"

# ---------- 3. 验证 Token 有效性 ----------
step "验证 Token..."
VERIFY=$(curl -s "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $CF_API_TOKEN")
if echo "$VERIFY" | grep -q '"success":true'; then
  ok "Token 验证通过"
else
  err "Token 验证失败,请检查权限(需要 Cloudflare Pages Edit)"
  echo "$VERIFY" | head -5
fi

# ---------- 4. 检测项目名 ----------
PROJECT_NAME="${CF_PROJECT_NAME:-evil-baike}"
step "项目名: $PROJECT_NAME"

# ---------- 5. 检测 dist/ ----------
step "检查构建产物"
if [[ ! -f "$DIST_DIR/index.html" ]]; then
  warn "dist/index.html 不存在,正在构建..."
  cd "$PROJECT_DIR"
  npm ci
  npm run build
fi
SIZE=$(du -sh "$DIST_DIR" | awk '{print $1}')
FILE_COUNT=$(find "$DIST_DIR" -type f | wc -l | tr -d ' ')
ok "dist/ 已就绪 ($SIZE, $FILE_COUNT 个文件)"

# ---------- 6. 创建项目(如果不存在) ----------
step "确保 Pages 项目存在"
EXISTS=$(curl -s "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/pages/projects/$PROJECT_NAME" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -w "%{http_code}" -o /tmp/cf-probe.json)

if [[ "$EXISTS" == "200" ]]; then
  ok "项目 $PROJECT_NAME 已存在"
else
  warn "项目不存在,创建中..."
  CREATE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/pages/projects" \
    -H "Authorization: Bearer $CF_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{\"name\":\"$PROJECT_NAME\",\"production_branch\":\"main\"}")
  if echo "$CREATE" | grep -q '"success":true'; then
    ok "项目创建成功"
  else
    err "项目创建失败"
    echo "$CREATE" | head -10
  fi
fi

# ---------- 7. 打包并上传 ----------
step "打包 dist/ 为 ZIP"
TMP_ZIP="$(mktemp -t evil-baike-XXXXXX).zip"
cd "$DIST_DIR"
zip -qr "$TMP_ZIP" .
SIZE_ZIP=$(du -sh "$TMP_ZIP" | awk '{print $1}')
ok "打包完成: $SIZE_ZIP"

step "上传到 Cloudflare Pages"
UPLOAD=$(curl -s -X POST \
  "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/pages/projects/$PROJECT_NAME/deployments" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -F "branch=main" \
  -F "commit=direct-upload-$(date +%Y%m%d-%H%M%S)" \
  -F "zip=@$TMP_ZIP;type=application/zip")

rm -f "$TMP_ZIP"

if echo "$UPLOAD" | grep -q '"success":true'; then
  URL=$(echo "$UPLOAD" | sed -n 's/.*"url":"\([^"]*\)".*/\1/p')
  DEPLOY_ID=$(echo "$UPLOAD" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)
  ok "部署成功!"
  echo
  echo -e "${BOLD}${GREEN}🎉 你的站点已上线:${RESET}"
  echo -e "   ${CYAN}https://$PROJECT_NAME.pages.dev${RESET}"
  [[ -n "$DEPLOY_ID" ]] && echo "   Deployment ID: $DEPLOY_ID"
  echo
  echo -e "等待 30-60 秒让全球 CDN 节点同步,然后就能访问了。"
else
  err "部署失败"
  echo "$UPLOAD" | head -20
fi