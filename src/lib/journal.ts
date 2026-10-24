/** A source-linked event image; never a generated illustration or generic fallback. */
export interface EventCover {
  src: string;
  alt: string;
  width: number;
  height: number;
  kind: 'document' | 'photo';
  label: string;
  caption: string;
  sourceUrl: string;
  sourceName: string;
  originalImageUrl: string;
  sourceSha256: string;
  checkedOn: string;
}

const covers: Partial<Record<string, EventCover>> = {
  '2023-wu-library-allegation': {
    src: '/images/events/wu-library-review-notice-20250920.webp',
    alt: '武汉大学2025年9月20日关于图书馆事件调查复核情况通报的官网截图',
    width: 1080, height: 462, kind: 'document', label: '调查复核通报',
    caption: '武汉大学2025年9月20日调查复核通报，对应图书馆事件撤销处分及论文复核的后续节点。截图来自中国记协网转载报道，保留原文完整内容。',
    sourceUrl: 'http://www.zgjx.cn/20250920/262035e9691844f184be26170fac1de7/c.html',
    sourceName: '中国记协网转载武汉大学通报',
    originalImageUrl: 'http://www.zgjx.cn/20250920/262035e9691844f184be26170fac1de7/20250920262035e9691844f184be26170fac1de7_20250920056056885f7a462ab0d5967776a3c5b1.png',
    sourceSha256: '36b64efb3e031e65af1c3f83c9bdb0bee3f9c31fd766cbd6c864c3b36af65b56', checkedOn: '2026-10-24',
  },
  '2026-bit-peiyi-feminism-course': {
    src: '/images/events/bit-peiyi-official-notice-20260929.webp',
    alt: '北京理工大学2026年9月29日关于教师裴某处理结果的官方微博通报',
    width: 623, height: 412, kind: 'document', label: '校方处理通报',
    caption: '北京理工大学2026年9月29日关于教师裴某的处理通报，来自中国新闻网报道的校方微博截图。通报未披露具体违规事实，不能据此认定全部网传课堂言论属实。',
    sourceUrl: 'https://finance.sina.com.cn/jjxw/2026-09-29/doc-initpauc2848206.shtml',
    sourceName: '中国新闻网，经新浪转载；图片来源：北京理工大学微博',
    originalImageUrl: 'https://n.sinaimg.cn/sinakd20260929s/235/w623h412/20260929/7c66-2b0fc7ebdbc0d46dac3a959b4c247fec.png',
    sourceSha256: '920eb3088afca7c9b7f2f9a99c55e8e40fd5e86f944e492f59c8fab7b6ddcb15', checkedOn: '2026-10-24',
  },
  '2026-lvliang-judge-allegation': {
    src: '/images/events/lvliang-case-notice.webp',
    alt: '相关报道所附的吕梁市公安局离石分局行政案件立案告知书，个人信息保留原媒体遮挡',
    width: 1080,
    height: 706,
    kind: 'document',
    label: '立案告知书',
    caption: '吕梁法官相关举报事件报道所附的行政案件立案告知书，记录 2026 年 4 月 10 日的报案及立案节点。个人信息保留原媒体遮挡；立案不代表举报指控已被证实。',
    sourceUrl: 'https://api.app.anhuinews.com/content/9213668.html',
    sourceName: '中安在线转载大象新闻',
    originalImageUrl: 'https://resource.anhuiyun.anhuinews.com/ahtt/W0202604/W020260413/W020260413541128995675.jpeg',
    sourceSha256: '626fef396bf7e2e31545811a33751becdba39375aa730f493998cc8072ccfd74',
    checkedOn: '2026-10-24',
  },
  '2026-wu-keai-pdf-report': {
    src: '/images/events/wu-keai-official-notice.webp',
    alt: '武汉大学 2026 年 9 月 3 日关于教师曾某某被举报的情况通报全文，保留武汉大学微博水印',
    width: 1080,
    height: 1240,
    kind: 'document',
    label: '校方情况通报',
    caption: '武汉大学 2026 年 9 月 3 日情况通报，对应本事件中学校受理举报并启动调查的进展。通报不表示举报指控已经查实；原图文字与水印完整保留。',
    sourceUrl: 'https://www.thepaper.cn/newsDetail_forward_34003088',
    sourceName: '澎湃号转载新华社、武汉大学微博',
    originalImageUrl: 'https://imgpai.thepaper.cn/pphimage/20260903/810bad0d-e2fb-4903-82c1-64946e0871f3.jpg',
    sourceSha256: 'a44ad84d12df1579d4f0ba146c41fb4061f7237f1c2aeab6ea3633ff369ade23',
    checkedOn: '2026-10-24',
  },
};

export const eventCover = (id: string): EventCover | undefined => covers[id];

export const typeLabels: Record<string, string> = {
  criminal: '刑事案件', legal: '法律诉讼', corporate: '企业事件',
  controversy: '公共争议', 'public-safety': '公共安全', moral: '道德争议',
  'human-rights': '人权事件', media: '媒体争议',
};

export const formatDate = (date: Date) => date.toISOString().slice(0, 10).replaceAll('-', '.');
