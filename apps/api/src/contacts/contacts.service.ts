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

// The one place ownership is enforced: every statement over a single row goes through this.
const ownedBy = (ownerId: string, id: string) =>
  and(eq(contacts.id, id), eq(contacts.ownerId, ownerId));

// The owner id is the credential, so it never leaves the cookie.
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
  list(ownerId: string): Promise<PublicContact[]> {
    return this.db
      .select(publicColumns)
      .from(contacts)
      .where(eq(contacts.ownerId, ownerId))
      .orderBy(asc(contacts.firstName), asc(contacts.lastName), asc(contacts.id));
  }

  async create(ownerId: string, input: ContactInput): Promise<PublicContact> {
    const [created] = await this.db
      .insert(contacts)
      .values({ ...input, ownerId })
      .returning(publicColumns);

    return created;
  }

  async update(ownerId: string, id: string, patch: ContactPatch): Promise<PublicContact> {
    const [updated] = await this.db
      .update(contacts)
      .set(patch)
      .where(ownedBy(ownerId, id))
      .returning(publicColumns);

    if (!updated) throw new NotFoundException(`No contact ${id}`);

    return updated;
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
