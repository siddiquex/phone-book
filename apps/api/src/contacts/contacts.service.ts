import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  contacts,
  type ContactInput,
  type ContactListQuery,
  type ContactPage,
  type ContactPatch,
  type Db,
  type PublicContact,
} from '@phone-book/db';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { DB } from '../database.module.js';

const ownedBy = (ownerId: string, id: string) =>
  and(eq(contacts.id, id), eq(contacts.ownerId, ownerId));

/** Rows carry Date objects; the response type says ISO strings, so convert rather than lie. */
const wire = (row: {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}): PublicContact => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const publicColumns = {
  id: contacts.id,
  firstName: contacts.firstName,
  lastName: contacts.lastName,
  phone: contacts.phone,
  createdAt: contacts.createdAt,
  updatedAt: contacts.updatedAt,
};

const cursorPayload = z.tuple([z.string().min(1).max(100), z.string().min(1).max(100), z.uuid()]);

/** Opaque keyset cursor: the last row's sort key, so resuming needs no offset. */
const cursor = {
  encode: (row: { firstName: string; lastName: string; id: string }) =>
    Buffer.from(JSON.stringify([row.firstName, row.lastName, row.id])).toString('base64url'),

  decode: (raw: string) => {
    let json: unknown = null;
    try {
      json = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    } catch {
      json = null;
    }

    const parsed = cursorPayload.safeParse(json);
    if (!parsed.success) throw new BadRequestException('Invalid cursor');

    return parsed.data;
  },
};

@Injectable()
export class ContactsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  // Every statement filters by ownerId: another browser's rows are unreachable, not just hidden.
  async list(ownerId: string, query: ContactListQuery): Promise<ContactPage> {
    const after = query.cursor ? cursor.decode(query.cursor) : null;
    const owned = eq(contacts.ownerId, ownerId);
    const past = after
      ? sql`(${contacts.firstName}, ${contacts.lastName}, ${contacts.id}) > (${after[0]}, ${after[1]}, ${after[2]})`
      : undefined;

    // One extra row answers "is there another page?" without a second query.
    const rows = await this.db
      .select(publicColumns)
      .from(contacts)
      .where(after ? and(owned, past) : owned)
      .orderBy(asc(contacts.firstName), asc(contacts.lastName), asc(contacts.id))
      .limit(query.limit + 1);

    const items = rows.slice(0, query.limit);
    const last = items.at(-1);

    return {
      items: items.map(wire),
      nextCursor: rows.length > query.limit && last ? cursor.encode(last) : null,
    };
  }

  async create(ownerId: string, input: ContactInput): Promise<PublicContact> {
    const [created] = await this.db
      .insert(contacts)
      .values({ ...input, ownerId })
      .returning(publicColumns);

    return wire(created);
  }

  async update(ownerId: string, id: string, patch: ContactPatch): Promise<PublicContact> {
    const [updated] = await this.db
      .update(contacts)
      .set(patch)
      .where(ownedBy(ownerId, id))
      .returning(publicColumns);

    if (!updated) throw new NotFoundException(`No contact ${id}`);

    return wire(updated);
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const [deleted] = await this.db
      .delete(contacts)
      .where(ownedBy(ownerId, id))
      .returning({ id: contacts.id });

    if (!deleted) throw new NotFoundException(`No contact ${id}`);
  }

  // Ids the caller doesn't own are skipped, so a stale selection still clears.
  async removeMany(ownerId: string, ids: string[]): Promise<void> {
    await this.db
      .delete(contacts)
      .where(and(eq(contacts.ownerId, ownerId), inArray(contacts.id, ids)));
  }
}
