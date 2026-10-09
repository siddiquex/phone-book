import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

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

// Kept internal: the API deals in the shapes below, which are derived from these two.
type Contact = typeof contacts.$inferSelect;
type NewContact = typeof contacts.$inferInsert;

export type PublicContact = Omit<Contact, "ownerId">;

export type ContactInput = Omit<NewContact, "id" | "ownerId" | "createdAt" | "updatedAt">;
export type ContactPatch = Partial<ContactInput>;

// Server-owned and owner-owned columns are omitted: the client may only send the three fields.
const clientFields = createInsertSchema(contacts, {
  firstName: (schema) => schema.trim().min(1).max(100),
  lastName: (schema) => schema.trim().min(1).max(100),
  phone: (schema) => schema.trim().min(1).max(32),
}).omit({ id: true, ownerId: true, createdAt: true, updatedAt: true });

export const contactCreateSchema = clientFields;
export const contactUpdateSchema = clientFields.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Provide at least one field to update" },
);

// The id shape is taken from the column, so it follows any change to it.
export const contactIdsSchema = z.object({
  ids: z.array(createSelectSchema(contacts).shape.id).min(1).max(1000),
});

export type ContactIds = z.infer<typeof contactIdsSchema>;
