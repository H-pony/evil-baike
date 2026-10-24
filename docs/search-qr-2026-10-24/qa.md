# 搜索分类与页脚 QQ 群二维码 · 2026-10-24

final result: passed

本地和正式站验收均通过。正式地址：https://schemer.online/；部署：https://75696545.evil-baike.pages.dev；应用源码提交：`998a7e6`。

## 改动

- 搜索弹窗标题由桌面最大 48px / 手机 30px 调整为 28px / 24px；结果标题为 16px / 15px，摘要限制两行。
- 新增全部、事件档案、机构、人物四个分类按钮，显示当前关键词的各类数量。全部结果按事件、机构、人物分组，各组保留搜索相关性排序。
- 分类无匹配时说明其他类别的结果数，并可返回全部；切换分类重置活动结果，关闭时清空关键词和分类状态。
- 页脚投稿入口右侧新增 QQ 交流群二维码，群号 1121513455；手机改为横向卡片，点击打开原生放大弹窗。
- 直接保留上传的 1284 × 2289 PNG，使用 CSS 视窗展示二维码和白色留白，未重绘二维码。源图与公共文件 SHA-256 一致。

## 检查

- `npm run check:all`：通过，0 错误、0 警告、4 条已有弃用提示；12 项 Node 测试、关系/收藏与投稿回归、83 页构建、内容和公开路由扫描通过。日志见 `check-all.log`。
- 桌面 1280 × 720：弹窗标题实际 28px、结果标题 16px；仅结果区域滚动，无额外弹窗滚动条。
- 搜索“武汉”：全部 11，事件档案 2、机构 5、人物 4；逐类筛选的数量、分组和目标路径均正确。
- 人物分类搜索“工业和信息化部”：正确显示 0 条及其他分类 1 条，返回全部入口可用。
- ArrowDown 与 Enter 可选择并打开第二条事件；关闭后焦点恢复搜索入口，关键词为空、分类恢复全部。
- 手机 390 × 844：弹窗标题 24px、结果标题 15px，排版正常；320 × 720：分类保持一行，搜索和二维码区域无横向溢出。
- 二维码放大弹窗显示完整码区，Esc 关闭并恢复入口焦点；在该弹窗按 ⌘K 后只保留搜索弹窗，焦点在输入框，背景滚动锁定正常。

界面证据：`search-desktop.png`、`search-mobile.png`、`footer-desktop.png`、`footer-mobile.png`、`qr-enlarged.png`、`qr-mobile.png`。机器检查记录见 `browser-checks.json`。

## 正式发布与复核

从仓库根目录使用官方 Wrangler 执行 `pages deploy dist --project-name evil-baike --branch main`，静态文件、Functions bundle、路由、响应头和重定向均上传成功。

- 正式域名桌面搜索实际显示 28px 标题、16px 结果标题，“武汉”显示 11 条及 2 / 5 / 4 分类数量；机构筛选实际返回 5 条。
- 正式域名手机 390 × 844：搜索为 24px / 15px，11 条结果，无横向溢出；二维码可放大，图片加载成功且弹窗无横向溢出。临时浏览器尺寸已恢复。
- 正式页脚二维码 HTTP 200，SHA-256 与本地用户原图相同；搜索索引仍为 20 条。投稿页 HTTP 200，未登录后台投稿接口仍为 401。
- 本轮发布不涉及数据库迁移或 Secret 更新。

线上证据：`online-search-desktop.png`、`online-search-mobile.png`、`online-footer-desktop.png`、`online-qr-mobile.png`、`online-browser-checks.json`、`online-http-checks.json`。

本轮未实际加入 QQ 群；二维码内容采用用户原图。
