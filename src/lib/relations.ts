import type { CollectionEntry } from 'astro:content';

type Event = CollectionEntry<'events'>;
type Person = CollectionEntry<'people'>;
type Organization = CollectionEntry<'organizations'>;

/** Either side may declare a relationship. Callers supply only publicly allowed entries. */
export const eventHasPerson = (event: Event, person: Person): boolean =>
  event.data.people.includes(person.id) || person.data.events.includes(event.id);

export const eventHasOrganization = (event: Event, organization: Organization): boolean =>
  event.data.organizations.includes(organization.id) || organization.data.events.includes(event.id);

export const personHasOrganization = (person: Person, organization: Organization): boolean =>
  person.data.organizations.includes(organization.id) || organization.data.people.includes(person.id);

/** Preserve explicit event ordering, including the existing primary-person convention. */
function declaredFirst<T extends { id: string }>(entries: T[], ids: string[]): T[] {
  const positions = new Map(ids.map((id, index) => [id, index]));
  return [...entries].sort((a, b) => (positions.get(a.id) ?? Infinity) - (positions.get(b.id) ?? Infinity));
}

export const getEventPeople = (event: Event, people: Person[]): Person[] =>
  declaredFirst(people.filter(person => eventHasPerson(event, person)), event.data.people);

export const getEventOrganizations = (event: Event, organizations: Organization[]): Organization[] =>
  declaredFirst(organizations.filter(organization => eventHasOrganization(event, organization)), event.data.organizations);
