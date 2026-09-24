#!/usr/bin/env bash
# 恶人百科 · 一键部署到 Cloudflare Pages
# 用法:
#   1. 在 https://dash.cloudflare.com/profile/api-tokens 创建 Token
#      权限: Account > Cloudflare Pages > Edit
#      Account Resources: 你的账户
#   2. 在 https://dash.cloudflare.com 右侧栏复制 Account ID
#   3. 跑本脚本,把两个值粘贴进去；Wrangler 会上传 dist/ 与 Pages Functions

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
CF_API_TOKEN="${CLOUDFLARE_API_TOKEN:-${CF_API_TOKEN:-}}"
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
CF_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-${CF_ACCOUNT_ID:-}}"
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
VERIFY=$(curl -fsS "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $CF_API_TOKEN")
if [[ "$(echo "$VERIFY" | jq -r '.success and .result.status == "active"')" == "true" ]]; then
  ok "Token 验证通过"
else
  echo "$VERIFY" | jq '{success, errors}' >&2
  err "Token 验证失败,请检查权限(需要 Cloudflare Pages Edit)"
fi

step "验证账户访问"
ACCOUNTS=$(curl -fsS "https://api.cloudflare.com/client/v4/accounts" \
  -H "Authorization: Bearer $CF_API_TOKEN")
if [[ "$(echo "$ACCOUNTS" | jq -r '.success')" != "true" ]]; then
  echo "$ACCOUNTS" | jq '{success, errors}' >&2
  err "无法查询 Cloudflare 账户"
fi
if ! echo "$ACCOUNTS" | jq -e --arg id "$CF_ACCOUNT_ID" '.result[]? | select(.id == $id)' >/dev/null; then
  warn "/accounts 未列出目标账户，改为直接验证该账户的 Pages 权限"
fi
PROJECTS=$(curl -fsS "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/pages/projects" \
  -H "Authorization: Bearer $CF_API_TOKEN")
if [[ "$(echo "$PROJECTS" | jq -r '.success')" != "true" ]]; then
  echo "$PROJECTS" | jq '{success, errors}' >&2
  err "目标账户的 Pages 权限验证失败"
fi
ok "目标账户的 Pages 权限可用"

# ---------- 4. 检测项目名 ----------
PROJECT_NAME="${CF_PROJECT_NAME:-evil-baike}"
step "项目名: $PROJECT_NAME"

# ---------- 5. 构建 ----------
step "构建站点和管理页面"
cd "$PROJECT_DIR"
if [[ ! -d "$PROJECT_DIR/node_modules" ]]; then
  npm ci
fi
npm run build
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
elif [[ "$EXISTS" == "404" ]]; then
  warn "项目不存在,创建中..."
  CREATE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/pages/projects" \
    -H "Authorization: Bearer $CF_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{\"name\":\"$PROJECT_NAME\",\"production_branch\":\"main\"}")
  if [[ "$(echo "$CREATE" | jq -r '.success')" == "true" ]]; then
    ok "项目创建成功"
  else
    echo "$CREATE" | jq '{success, errors}' >&2
    err "项目创建失败"
  fi
else
  cat /tmp/cf-probe.json >&2
  err "查询 Pages 项目失败 (HTTP $EXISTS)"
fi

# ---------- 7. 上传 ----------
# Pages 的 deployments API 需要 manifest，单独上传 ZIP 不再可用。
step "上传 dist/ 到 Cloudflare Pages"
cd "$PROJECT_DIR"
export CLOUDFLARE_API_TOKEN="$CF_API_TOKEN"
export CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT_ID"
npx wrangler pages deploy "$DIST_DIR" --project-name "$PROJECT_NAME" --branch main
ok "部署完成: https://$PROJECT_NAME.pages.dev"
