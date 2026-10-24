import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { isPubliclyVisible } from '~/content.config';

/** Backend publication check: only generated, publicly accessible detail routes. */
export const GET: APIRoute = async () => {
  const [events, people, organizations] = await Promise.all([
    getCollection('events', entry => isPubliclyVisible(entry.data.status)),
    getCollection('people', entry => isPubliclyVisible(entry.data.status)),
    getCollection('organizations', entry => isPubliclyVisible(entry.data.status)),
  ]);
  const entries = [
    ...events.map(entry => ({ path: `/events/${entry.id}`, title: entry.data.title })),
    ...people.map(entry => ({ path: `/people/${entry.id}`, title: entry.data.name })),
    ...organizations.map(entry => ({ path: `/organizations/${entry.id}`, title: entry.data.name })),
  ];
  return new Response(JSON.stringify({ entries }), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' } });
};
