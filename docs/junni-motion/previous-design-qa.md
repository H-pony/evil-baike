# JUNNI 风格改版 · Design QA

Date: 2026-10-23
final result: passed

## 对照范围

用户选定 https://junni.co.jp/ 与其当前 Chrome 截图作为视觉方向。本轮将其深色分块、巨字、手写副标、圆形菜单、荧光色场景和大字号内容层级应用到现有恶人百科；站名、档案内容、现有业务流程继续使用本项目本身的身份。

- Source visual truth: `docs/junni-redesign/reference-hero.png`、`reference-manifesto.png`；用户提供的首屏截图。
- Rendered implementation: `http://127.0.0.1:8788/`，`docs/junni-redesign/home-desktop.png`。
- CSS viewport: 桌面 1686 × 873；手机 390 × 844；另检查 320、768、1024、1440px。
- Source PNG: 1686 × 873；implementation PNG: 1671 × 865。浏览器捕获返回像素边界略有差异，合成时将实现图归一到 1686 × 873，同尺度并排比较；原图保留。
- State: 首页顶部、深色、菜单关闭。参考中的 Cookie 提示和 JUNNI 商标是该站自身内容，不属于本项目的目标 UI。
- Full-view comparison: `docs/junni-redesign/comparison-final.png`。
- Focused comparison: `docs/junni-redesign/comparison-type.png`，重点比较字体、网格分割、标题占比及副标。

## 迭代记录

### V1：存在需修复项

Evidence: `home-desktop-v1.png`、`comparison-v1.png`。

- [P2] 滚动环与英文眉题重叠。移除首屏多余眉题，让旋转提示与主标题各自完整呈现。
- [P2] 文字层未呈现参考网格分割关系。增加与背景瓦片一致的非交互网格接缝；不影响标题语义或操作命中。
- [P2] 卡片局部仍采用 20px 圆角和 4:3 图片，与全站更紧的分块语言不一致。统一 9px 卡角、6px 图角和 16:10 图片，并清除旧定位规则对示意图标签与阅读提示的干扰。
- [P2] 首页菜单原本随页面离开视口。改为固定极简导航，滚动后使用深色透明表面，保证长页面可导航。
- [P2] 局部分享/引用按钮低于统一触达高度。统一主要操作为 44px；正文实体链接保留行内呈现。

### V2：修复后复核

Evidence: `home-desktop.png`、`comparison-final.png`、`comparison-type.png`、`home-mobile.png`、`home-320.png`、`menu-desktop.png`、`menu-mobile.png`、`search-mobile.png`、`events-desktop.png`、`detail-mobile.png`、`submit-mobile.png`、`admin-desktop.png`。

上述 P2 已消除。最终对照没有发现仍需修复的 P0/P1/P2 问题。

## 五项视觉验收

| Surface | 结果 |
| --- | --- |
| 字体与层级 | 暖白中文巨字对应本项目品牌；楷体副标对应手写气质。英文眉题使用本地 Geist/Montserrat。正文保留中文阅读行高，菜单和移动标题未裁切。 |
| 间距与布局 | 桌面 6×6、手机 3×6 瓦片；3px 间距与 9px 圆角一致。首屏满高、内容分区留白、大标题和固定 MENU 形成参考的整体节奏。 |
| 颜色与 token | `#111214` 页面、`#1c1d21` 表面、`#f4f2e9` 暖白、`#d7ff36` 荧光色；表单、搜索、详情、后台已统一。错误使用珊瑚红，并有明确文字。 |
| 图像与图标 | 沿用项目已有主题示意图并明确标注；首屏为可访问的文字与真实网格布局。标准菜单点来自 Tabler Icons，方向/关闭/搜索复用 SVG 图标。没有复制 JUNNI 品牌或其专属插画。 |
| 产品文案 | 首屏、说明、入口均为公共档案产品文案；不把参考站的公司服务、招聘或 Cookie 提示带入产品。 |

## 交互与检查

- 浏览器实测：首屏滚动入口、全屏菜单、菜单→档案导航→事件列表、手机搜索结果、Escape 关闭、后台登录和真实本地审核队列。
- 截图检查：手机详情与投稿输入框、桌面列表/表格/图表、暖白正文和状态反馈。
- `responsive.json`：320、390、768、1024、1440px 均无横向内容溢出，菜单按钮均在视口内。
- 浏览器 console errors: 0。
- `npm run check:all`：0 errors、0 warnings、4 项既有兼容 API 提示；脚手架、关系/收藏、投稿工作流回归通过；83 页构建与内部链接扫描通过。日志：`docs/junni-redesign/checks.log`。
- 设计规范：`docs/DESIGN-SYSTEM.md`；原规范与上一轮 QA 已归档在本次截图目录。

## 实现约束与非阻断差异

这是现有产品的视觉适配：中文品牌字形、档案搜索、收录数据和操作入口按产品需要保留。首屏采用轻量瓦片倾斜和旋转提示，未照搬参考站完整 WebGL 翻转场景。新动效支持暂停、系统减少动画偏好和触屏降级。未做屏幕阅读器逐页认证或所有实体设备验证。

## Implementation checklist

- [x] 首屏与荧光场景
- [x] 内容列表、详情、搜索、菜单、收藏、投稿与后台主题
- [x] 手机断点与主要交互
- [x] 类型、回归、构建、路由检查
- [x] 设计规范与视觉证据
