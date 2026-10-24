import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { isIndexable } from '~/content.config';
import { getEventPeople, getEventOrganizations } from '~/lib/relations';

export const GET: APIRoute = async () => {
  const events = await getCollection('events', (e) => isIndexable(e.data.status));
  const people = await getCollection('people', (p) => isIndexable(p.data.status));
  const orgs = await getCollection('organizations', (o) => isIndexable(o.data.status));

  const docs = [
    ...events.map((e) => ({
      type: 'event' as const,
      id: e.id,
      title: e.data.title,
      summary: e.data.summary,
      aliases: [...new Set([
        ...e.data.aliases,
        ...getEventPeople(e, people).flatMap(person => [person.data.name, ...person.data.aliases]),
        ...getEventOrganizations(e, orgs).flatMap(org => [org.data.name, ...org.data.aliases]),
      ])],
      tags: e.data.tags,
      url: `/events/${e.id}`,
      dateStart: e.data.dateStart?.toISOString() ?? null,
      // P0：移除 riskLevel 公开字段
    })),
    ...people.map((p) => ({
      type: 'person' as const,
      id: p.id,
      title: p.data.name,
      summary: p.data.summary,
      aliases: p.data.aliases,
      tags: p.data.tags,
      url: `/people/${p.id}`,
    })),
    ...orgs.map((o) => ({
      type: 'organization' as const,
      id: o.id,
      title: o.data.name,
      summary: o.data.summary,
      aliases: o.data.aliases,
      tags: o.data.tags,
      url: `/organizations/${o.id}`,
      orgType: o.data.type,
    })),
  ];

  return new Response(JSON.stringify(docs), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
};
