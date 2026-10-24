import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// ============================================================
// 公开页面可见的状态
// ============================================================
//
// 状态机与公开策略：
//
//   draft / submitted / reviewing / withdrawn
//     → 不生成任何静态页面、不出现在列表 / 搜索 / 推荐 / 站点地图
//
//   published
//     → 公开访问，列入列表、搜索、关联推荐、RSS、sitemap
//
//   archived
//     → 保留原 URL 可访问（页面顶部显示"已归档"标识 + 归档原因）
//     → 不列入首页 / 列表 / 标签页 / 搜索 / 关联推荐 / RSS
//     → sitemap 仍收录（确保旧链接不失效）
//
// 验证：`npm run validate` 会扫描 dist/ 确保无草稿/撤回条目出现在构建产物中。

// ============================================================
// 公开筛选函数（供列表 / 搜索 / 推荐统一调用）
// ============================================================

/** 公开可见：仅 published 与 archived */
export const isPubliclyVisible = (s: string): boolean =>
  s === 'published' || s === 'archived';

/** 推荐 / 列表 / 搜索可见：仅 published */
export const isIndexable = (s: string): boolean => s === 'published';

// ============================================================
// 共享 schema 片段
// ============================================================

/** 公共信源只允许可直接访问的 HTTP(S) 页面。 */
const sourceUrl = z.string().url().refine(value => /^https?:\/\//i.test(value), '信源必须使用 http 或 https 地址');

/** 信源条目：每条事实都必须能溯源到这里 */
const sourceItem = z.object({
  url: sourceUrl,
  title: z.string(),
  publisher: z.string().optional(),
  publishedAt: z.coerce.date().optional(),
  accessedAt: z.coerce.date().optional(),
  archive: sourceUrl.optional(),
  note: z.string().optional(),
});

/** 时间线日期：保留仅到年份或月份的日期精度 */
const timelineDate = z.preprocess(
  (value) =>
    typeof value === 'number' && Number.isInteger(value) && value >= 1000 && value <= 9999
      ? String(value)
      : value,
  z.union([
    z.string().regex(/^\d{4}(?:-(?:0[1-9]|1[0-2]))?$/),
    z.date(),
    z.coerce.date(),
  ])
);

/** 时间线节点：一个事实单元 */
const timelineEntry = z.object({
  date: timelineDate,
  title: z.string(),
  description: z.string(),
  sources: z.array(sourceUrl).default([]),
  tags: z.array(z.string()).default([]),
  // 信息性质：决定节点在时间线上的呈现标签
  nature: z
    .enum([
      'confirmed',        // 已被法院 / 官方文件确认
      'official-action',  // 官方处置动作（处分、立案、撤案）
      'media-claim',      // 媒体陈述（需注明出处）
      'self-claim',       // 当事人/相关方陈述
      'rumor',            // 网传待核实
      'correction',       // 更正 / 辟谣
    ])
    .default('media-claim'),
});

/** 引用：人物 id */
const personRef = z.string();

/** 引用：机构 id */
const organizationRef = z.string();

/** 状态枚举 */
const statusEnum = z.enum([
  'draft',       // 草稿，未公开
  'submitted',   // 已投稿，待审
  'reviewing',   // 审核中
  'published',   // 已发布（公众可见，列入索引）
  'archived',    // 归档（保留 URL，不列入索引）
  'withdrawn',   // 已撤回（如收到合规要求；不生成页面）
]);

/** 事件类型 */
const eventTypeEnum = z.enum([
  'criminal',          // 刑事案件
  'legal',             // 民事/行政诉讼
  'corporate',         // 企业丑闻
  'controversy',       // 公共争议事件
  'public-safety',     // 公共安全事件
  'moral',             // 道德层面（家暴、出轨、学术不端等）
  'human-rights',      // 人权事件
  'media',             // 媒体争议
]);

/** 机构类型 */
const organizationTypeEnum = z.enum([
  'company',
  'government',
  'political-party',
  'ngo',
  'academic',
  'media',
  'religious',
  'military',
  'other',
]);

/** 争议状态：用于在公开页面替代旧 riskLevel */
const contestedEnum = z.enum([
  'uncontested',       // 公开陈述未见有效异议
  'partial',           // 关键事实仍有不同陈述
  'contested',         // 主要事实存在重大争议
  'pending-review',    // 等待关键信源核实
]);

/** 归档原因（archived 时建议填写） */
const archivedReasonEnum = z.enum([
  'superseded',        // 已被新版本/新条目取代
  'historical',        // 仅作历史存档
  'unverified',        // 关键信源失效且无替代
  'other',
]);

// ============================================================
// 事件 (events)
// ============================================================

const events = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/events' }),
  schema: z.object({
    title: z.string().min(2).max(120),
    aliases: z.array(z.string()).default([]),
    type: eventTypeEnum,
    status: statusEnum.default('draft'),
    dateStart: z.coerce.date(),
    dateEnd: z.coerce.date().optional(),

    summary: z.string().min(10).max(500),

    tags: z.array(z.string()).default([]),
    people: z.array(personRef).default([]),
    organizations: z.array(organizationRef).default([]),

    timeline: z.array(timelineEntry).default([]),
    sources: z.array(sourceItem).default([]),

    // 公开阅读结构：详情页顶部"档案概览"使用
    // 文本用纯事实陈述，不作定性。
    confirmedFacts: z.array(z.string()).default([]),
    claims: z
      .array(
        z.object({
          claim: z.string(),
          by: z.string(),                  // 陈述方（"原告方"、"被告方"、"自媒体报道" 等）
          sources: z.array(sourceUrl).default([]),
        })
      )
      .default([]),
    currentOutcome: z.string().optional(),
    pendingVerification: z.array(z.string()).default([]),

    authors: z.array(z.string()).default([]),
    reviewers: z.array(z.string()).default([]),
    submittedBy: z.string().optional(),
    related: z.array(z.string()).default([]), // ref to other events by id

    notes: z.string().optional(),

    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),

    // 公开字段：最后核对日期 + 争议状态
    verifiedAt: z.coerce.date().optional(),
    contested: contestedEnum.default('uncontested'),

    // 归档原因（仅 status=archived 时填写）
    archivedReason: archivedReasonEnum.optional(),
    archivedNote: z.string().optional(),

    // —— 内部编辑字段（不公开显示） ——
    /** 编辑审核用的风险标记，不在公开页面渲染、不在筛选器暴露、不在搜索结果展示。 */
    riskLevel: z.enum(['low', 'medium', 'high']).default('medium'),
    legalReview: z.boolean().default(false),
  }),
});

// ============================================================
// 人物 (people)
// ============================================================

const people = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/people' }),
  schema: z.object({
    name: z.string().min(1).max(80),
    aliases: z.array(z.string()).default([]),
    status: statusEnum.default('draft'),

    summary: z.string().min(10).max(500),

    tags: z.array(z.string()).default([]),
    events: z.array(z.string()).default([]),
    organizations: z.array(organizationRef).default([]),

    sources: z.array(sourceItem).default([]),

    authors: z.array(z.string()).default([]),
    reviewers: z.array(z.string()).default([]),
    notes: z.string().optional(),

    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),

    verifiedAt: z.coerce.date().optional(),
    contested: contestedEnum.default('uncontested'),

    archivedReason: archivedReasonEnum.optional(),
    archivedNote: z.string().optional(),

    // 内部字段
    riskLevel: z.enum(['low', 'medium', 'high']).default('medium'),
    legalReview: z.boolean().default(false),
  }),
});

// ============================================================
// 机构 (organizations)
// ============================================================

const organizations = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/organizations' }),
  schema: z.object({
    name: z.string().min(2).max(120),
    aliases: z.array(z.string()).default([]),
    type: organizationTypeEnum,
    status: statusEnum.default('draft'),

    summary: z.string().min(10).max(500),

    tags: z.array(z.string()).default([]),
    events: z.array(z.string()).default([]),
    people: z.array(personRef).default([]),

    sources: z.array(sourceItem).default([]),

    authors: z.array(z.string()).default([]),
    reviewers: z.array(z.string()).default([]),
    notes: z.string().optional(),

    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),

    verifiedAt: z.coerce.date().optional(),
    contested: contestedEnum.default('uncontested'),

    archivedReason: archivedReasonEnum.optional(),
    archivedNote: z.string().optional(),

    // 内部字段
    riskLevel: z.enum(['low', 'medium', 'high']).default('medium'),
    legalReview: z.boolean().default(false),
  }),
});

export const collections = { events, people, organizations };

// ============================================================
// 导出共享 schema 供组件复用
// ============================================================

export {
  sourceItem,
  timelineEntry,
  statusEnum,
  eventTypeEnum,
  organizationTypeEnum,
  contestedEnum,
  archivedReasonEnum,
};
