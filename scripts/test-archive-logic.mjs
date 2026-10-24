import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function loadTypeScript(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const relations = await loadTypeScript('../src/lib/relations.ts');
const favorites = await loadTypeScript('../src/lib/favorites.ts');
const event = { id: 'event-a', data: { people: ['declared-first'], organizations: ['org-direct'] } };
const person = id => ({ id, data: { events: id === 'reverse-only' ? ['event-a'] : [], organizations: ['org-reverse'] } });
const organization = id => ({ id, data: { events: id === 'org-reverse' ? ['event-a'] : [], people: ['reverse-only'] } });
assert.deepEqual(relations.getEventPeople(event, [person('reverse-only'), person('unrelated'), person('declared-first')]).map(item => item.id), ['declared-first', 'reverse-only']);
assert.deepEqual(relations.getEventOrganizations(event, [organization('org-reverse'), organization('unrelated'), organization('org-direct')]).map(item => item.id), ['org-direct', 'org-reverse']);
assert.equal(relations.personHasOrganization(person('reverse-only'), organization('org-direct')), true);
assert.equal(relations.personHasOrganization(person('unrelated'), organization('org-reverse')), true);
assert.deepEqual(relations.getEventPeople(event, []), [], 'A filtered public collection must not resurrect private records');

const malformed = { event: [null, 12, {}, { id: '' }, 'legacy', { id: 'legacy', title: 'duplicate' }, { id: 'new', title: 'A & B', ts: 42 }, { id: 'bad-time', ts: Infinity }], person: 'invalid', organization: [{ id: 'org' }] };
assert.deepEqual(favorites.normalizeFavorites(malformed), { event: [{ id: 'legacy', title: '', ts: 0 }, { id: 'new', title: 'A & B', ts: 42 }, { id: 'bad-time', title: '', ts: 0 }], person: [], organization: [{ id: 'org', title: '', ts: 0 }] });
assert.deepEqual(favorites.normalizeFavorites(null), { event: [], person: [], organization: [] });
let stored = '{bad-json'; let notifications = 0;
globalThis.localStorage = { getItem: () => stored, setItem: (_key, value) => { stored = value; } };
globalThis.window = { dispatchEvent: () => { notifications++; } };
assert.deepEqual(favorites.readFavorites(), { event: [], person: [], organization: [] });
assert.equal(favorites.saveFavorites(favorites.normalizeFavorites(malformed)), true);
assert.equal(notifications, 1);
assert.equal(favorites.readFavorites().event[1].title, 'A & B');
globalThis.localStorage.setItem = () => { throw new Error('Storage denied'); };
assert.equal(favorites.saveFavorites({ event: [], person: [], organization: [] }), false);
assert.equal(notifications, 1, 'Failed writes must not announce a saved change');
console.log('Archive relation and favorite regressions passed.');
