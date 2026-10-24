/** Editorial illustrations are separate from the archive's factual evidence. */
const covers: Record<string, { src: string; alt: string }> = {
  '2023-wu-library-allegation': { src: '/images/library.webp', alt: '图书馆阅览室主题示意配图，非事件现场' },
  '2026-lvliang-judge-allegation': { src: '/images/documents.webp', alt: '档案文书主题示意配图，非事件证据' },
  '2026-bit-peiyi-feminism-course': { src: '/images/campus.webp', alt: '大学校园主题示意配图，非涉事学校' },
  '2026-wu-keai-pdf-report': { src: '/images/documents.webp', alt: '调查资料主题示意配图，非举报材料' },
};

export const eventCover = (id: string) => covers[id] ?? {
  src: '/images/documents.webp', alt: '公共事件档案主题示意配图',
};

export const typeLabels: Record<string, string> = {
  criminal: '刑事案件', legal: '法律诉讼', corporate: '企业事件',
  controversy: '公共争议', 'public-safety': '公共安全', moral: '道德争议',
  'human-rights': '人权事件', media: '媒体争议',
};

export const formatDate = (date: Date) => date.toISOString().slice(0, 10).replaceAll('-', '.');
