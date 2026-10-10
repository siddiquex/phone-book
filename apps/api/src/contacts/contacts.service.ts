import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  contacts,
  type Contact,
  type ContactInput,
  type ContactListQuery,
  type ContactPage,
  type ContactPatch,
  type Db,
  type PublicContact,
} from '@phone-book/db';
import { and, asc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { DB } from '../database.module.js';

const fullName = sql`(${contacts.firstName} || ' ' || ${contacts.lastName})`;
const phoneDigits = sql`regexp_replace(${contacts.phone}, '\\D', '', 'g')`;

/** The order the list is read and paged in; the index is built to match it. */
const pageOrder = [asc(contacts.firstName), asc(contacts.lastName), asc(contacts.id)];

const responseColumns = {
  id: contacts.id,
  firstName: contacts.firstName,
  lastName: contacts.lastName,
  phone: contacts.phone,
  createdAt: contacts.createdAt,
  updatedAt: contacts.updatedAt,
};

const toResponse = (row: Omit<Contact, 'ownerId'>): PublicContact => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const ownedRow = (ownerId: string, id: string) =>
  and(eq(contacts.id, id), eq(contacts.ownerId, ownerId));

/** A name word starting with the term, or the digits inside the number. */
const matchingWord = (word: string): SQL => {
  // "%" and "_" are LIKE wildcards, so a term holding one must be escaped to stay literal.
  const literal = word.replace(/[\\%_]/g, '\\$&');
  const byName = sql`(${fullName} ILIKE ${literal + '%'} OR ${fullName} ILIKE ${'% ' + literal + '%'})`;
  const digits = word.replace(/\D/g, '');

  return digits.length > 0 ? sql`(${byName} OR ${phoneDigits} LIKE ${'%' + digits + '%'})` : byName;
};

/** Every word narrows the result, so "grace hop" and "422" both work. */
const ownedAndMatching = (ownerId: string, search?: string) =>
  and(
    eq(contacts.ownerId, ownerId),
    ...(search ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map(matchingWord),
  );

/** Everything after that row in pageOrder: a keyset, so paging needs no offset. */
const rowsAfter = ([firstName, lastName, id]: CursorPosition) =>
  sql`(${contacts.firstName}, ${contacts.lastName}, ${contacts.id}) > (${firstName}, ${lastName}, ${id})`;

/** The page position: the sort key of the last row sent, checked before it is used. */
const cursorPosition = z.tuple([z.string().min(1).max(100), z.string().min(1).max(100), z.uuid()]);
type CursorPosition = z.infer<typeof cursorPosition>;

/** Base64url, so clients pass it back untouched rather than parsing it. */
const pageCursor = {
  encode: (row: { firstName: string; lastName: string; id: string }) =>
    toBase64Url([row.firstName, row.lastName, row.id]),

  decode: (raw: string): CursorPosition => {
    const parsed = cursorPosition.safeParse(fromBase64Url(raw));
    if (!parsed.success) throw new BadRequestException('Invalid cursor');

    return parsed.data;
  },
};

const toBase64Url = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

function fromBase64Url(raw: string): unknown {
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

@Injectable()
export class ContactsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  // Every statement filters by ownerId: another browser's rows are unreachable, not just hidden.
  async list(ownerId: string, query: ContactListQuery): Promise<ContactPage> {
    const filter = ownedAndMatching(ownerId, query.search);
    const after = query.cursor ? pageCursor.decode(query.cursor) : null;

    // One extra row answers "is there another page?" without a second query.
    const [rows, counted] = await Promise.all([
      this.db
        .select(responseColumns)
        .from(contacts)
        .where(after ? and(filter, rowsAfter(after)) : filter)
        .orderBy(...pageOrder)
        .limit(query.limit + 1),
      // The whole match, not the page, so it counts without the cursor.
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(contacts)
        .where(filter),
    ]);

    const items = rows.slice(0, query.limit).map(toResponse);
    const last = items.at(-1);

    return {
      items,
      nextCursor: rows.length > query.limit && last ? pageCursor.encode(last) : null,
      total: counted[0]?.total ?? 0,
    };
  }

  async create(ownerId: string, input: ContactInput): Promise<PublicContact> {
    const [created] = await this.db
      .insert(contacts)
      .values({ ...input, ownerId })
      .returning(responseColumns);

    return toResponse(created);
  }

  async update(ownerId: string, id: string, patch: ContactPatch): Promise<PublicContact> {
    const [updated] = await this.db
      .update(contacts)
      .set(patch)
      .where(ownedRow(ownerId, id))
      .returning(responseColumns);

    if (!updated) throw new NotFoundException(`No contact ${id}`);

    return toResponse(updated);
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const [deleted] = await this.db
      .delete(contacts)
      .where(ownedRow(ownerId, id))
      .returning({ id: contacts.id });

    if (!deleted) throw new NotFoundException(`No contact ${id}`);
  }

  async removeMany(ownerId: string, ids: string[]): Promise<void> {
    await this.db
      .delete(contacts)
      .where(and(eq(contacts.ownerId, ownerId), inArray(contacts.id, ids)));
  }
}
