import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { NAME_MAX, PHONE_MAX } from "./limits.js";

export const contacts = pgTable(
  "contacts",
  {
    id: uuid().primaryKey().defaultRandom(),
    // Who the book belongs to. Comes from the browser's owner cookie, never the request body.
    ownerId: uuid("owner_id").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    phone: text("phone").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  // Owner first, then the page order, so the keyset walk needs no sort.
  (table) => [
    index("contacts_owner_name_idx").on(
      table.ownerId,
      table.firstName,
      table.lastName,
      table.id,
    ),
  ],
);

export type Contact = typeof contacts.$inferSelect;
type NewContact = typeof contacts.$inferInsert;

export type PublicContact = Omit<Contact, "ownerId" | "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export type ContactInput = Omit<NewContact, "id" | "ownerId" | "createdAt" | "updatedAt">;
export type ContactPatch = Partial<ContactInput>;

const clientFields = createInsertSchema(contacts, {
  firstName: (schema) => schema.trim().min(1).max(NAME_MAX),
  lastName: (schema) => schema.trim().min(1).max(NAME_MAX),
  phone: (schema) => schema.trim().min(1).max(PHONE_MAX),
}).omit({ id: true, ownerId: true, createdAt: true, updatedAt: true });

export const contactCreateSchema = clientFields;
export const contactUpdateSchema = clientFields.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Provide at least one field to update" },
);

const contactId = createSelectSchema(contacts).shape.id;

export const contactIdsSchema = z.object({
  ids: z.array(contactId).min(1).max(1000),
});

export type ContactIds = z.infer<typeof contactIdsSchema>;

/** Cursor and limit paging; the search narrows before either applies. */
export const contactListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().max(512).optional(),
  search: z.string().trim().max(100).optional(),
});

export type ContactListQuery = z.infer<typeof contactListQuerySchema>;

/** A page, the cursor for the next one, and the size of the whole match. */
export type ContactPage = { items: PublicContact[]; nextCursor: string | null; total: number };
