import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  contacts,
  type ContactInput,
  type ContactPatch,
  type Db,
  type PublicContact,
} from '@phone-book/db';
import { and, asc, eq, inArray } from 'drizzle-orm';
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

@Injectable()
export class ContactsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  // Every statement filters by ownerId: another browser's rows are unreachable, not just hidden.
  async list(ownerId: string): Promise<PublicContact[]> {
    const rows = await this.db
      .select(publicColumns)
      .from(contacts)
      .where(eq(contacts.ownerId, ownerId))
      .orderBy(asc(contacts.firstName), asc(contacts.lastName), asc(contacts.id));

    return rows.map(wire);
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
