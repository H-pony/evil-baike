# 搜索分类与页脚 QQ 群入口 · 2026-10-24

final result: passed

已发布到 [schemer.online](https://schemer.online/)，部署为 [75696545.evil-baike.pages.dev](https://75696545.evil-baike.pages.dev)，应用源码提交 `998a7e6`。搜索标题缩小为桌面28px、手机24px，新增全部、事件档案、机构、人物筛选与分组；页脚新增用户提供的QQ群二维码及放大弹窗，原图逐字节保留。桌面与手机正式站复核通过，构建、测试与内容检查均通过。详情和截图见 [本轮验收记录](docs/search-qr-2026-10-24/qa.md)。

---

# 首次生产发布与实操验收 · 2026-10-24

final result: passed

正式地址：[schemer.online](https://schemer.online/)。最终生产部署：[c1b6898f.evil-baike.pages.dev](https://c1b6898f.evil-baike.pages.dev)，应用源码提交 `111a32e`。上一轮对照记录保留在 `docs/production-release-2026-10-24/previous-design-qa.md`。

## 真实事件图片

四条事件全部替换为直接对应的公开通报或立案告知书，取消通用示意图及fallback。图片保留原有遮挡和水印，经无损WebP转换逐RGBA像素校验；正式站四张文件均HTTP200且与本地字节一致。卡片保持紧凑，文书完整缩略显示；详情使用原比例完整图并提供事件说明、出处与完整图片入口。来源见 `docs/event-images-2026-10-24.md`。

北理工9月29日处理通报晚于旧档案核对日期，已同步更新事件、人物、机构、时间线和信源，明确处理结果与具体网传言论的证据边界。

## 正式站交互

Chrome桌面1686×873：鼠标移入翻动单块，停下后36块恢复平面，文字环跟随；顶部导航处180px滚轮触发整组背面，scrollY保持0，导航透明且终态文字连续可读；下一次下滚scrollY为280；回到顶部向上滚动后恢复正面与scrollY 0。实拍连续截图动图见 `online-interaction.gif`，没有生成中间帧。

手机模拟390×844：分步滑动从650到644、再到630（总20px），18块完成切换且scrollY 0；带1px抖动点击背面档案入口正常进入事件列表，四张对应图片均存在，无横向溢出。本轮孤立6px探测未翻面，不将其计为通过；此前“6px即可触发”的表述已纠正为实际执行的分步20px测试，不据此宣称实体手机全覆盖。

## 数据库、后台与发布

生产实际绑定 `evil-baike-analytics`。先取得D1 Time Travel恢复书签、核对旧schema和投稿数，再逐条执行0002的10条语句并确认成功。迁移后6个新增字段、历史表和3个索引均齐全，无孤立历史，旧投稿数0→0。恢复书签保存在Git忽略的本机发布状态中。

生产ADMIN_PASSWORD及SESSION_SECRET已通过获授权的官方Wrangler自动生成并作为加密Secret写入，随后重新部署使其生效；没有将密钥写入源码、公开报告或Git。管理员密码单独保存在本机 `.wrangler/production-admin-credentials.txt`（0600）。

生产接口联调通过：真实管理员登录、重复同回执只保存一条、拒绝虚构公开档案链接、审核保存处理说明、拒绝旧版本更新、回执返回已处理结果且不泄露原文、历史记录保存、退出后未登录访问返回401。仅新增1条明确标注系统验收的测试投稿，最终状态已处理，未创建公开事件。回执不写入报告或Git。

## 检查与证据

`npm run check:all`通过：0错误、0警告、4条已有弃用提示，12项Node测试、关系/收藏与投稿回归、83页构建和内部路由扫描均通过。[对应代码CI](https://github.com/H-pony/evil-baike/actions/runs/40052651363)通过。临时设备、触屏模拟均恢复。

证据目录 `docs/production-release-2026-10-24/`：正式站首屏、绿面、手机、事件列表及动图；`http-checks.json`、`backend-checks.json`、`release-checks.json`和完整检查日志。GET回执接口不提供查询，实际POST回执接口已验证；HTTP记录中的GET404不作为功能失败。

未发现剩余P0/P1/P2阻塞。采用CSS 3D实现参考行为，不声明原站WebGL材质与逐帧时序完全一致。现有Pages项目没有Git连接，GitHub仍负责CI；本次已实际发布，之后仅push不会自动发布。
