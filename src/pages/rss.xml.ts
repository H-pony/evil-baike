import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { isIndexable } from '~/content.config';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  const events = await getCollection('events', (e) => isIndexable(e.data.status));
  events.sort((a, b) => b.data.updatedAt.getTime() - a.data.updatedAt.getTime());

  return rss({
    title: '恶人百科',
    description: '公共事件的永久档案馆',
    site: context.site ?? 'https://evil-baike.example.com',
    items: events.map((event) => ({
      title: event.data.title,
      description: event.data.summary,
      pubDate: event.data.updatedAt,
      link: `/events/${event.id}/`,
      categories: event.data.tags,
    })),
    customData: '<language>zh-cn</language>',
  });
};
