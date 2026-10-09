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
  // Every query filters by owner; without this it is a sequential scan.
  (table) => [index("contacts_owner_id_idx").on(table.ownerId)],
);

type Contact = typeof contacts.$inferSelect;
type NewContact = typeof contacts.$inferInsert;

// What the API returns: no owner id (it is the credential) and ISO strings, not row Dates.
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

export const contactIdsSchema = z.object({
  ids: z.array(createSelectSchema(contacts).shape.id).min(1).max(1000),
});

export type ContactIds = z.infer<typeof contactIdsSchema>;
