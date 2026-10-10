"use client";

import { useState } from "react";

import { ContactFormDialog } from "@/components/contact-form-dialog";
import { ContactRemoveDialog } from "@/components/contact-remove-dialog";
import { ContactsSkeleton } from "@/components/contacts-skeleton";
import { ContactsTable } from "@/components/contacts-table";
import { ContactsToolbar } from "@/components/contacts-toolbar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { count } from "@/lib/contact-format";
import { useContacts } from "@/lib/use-contacts";
import type { PublicContact } from "@phone-book/db/schema";

export function Contacts() {
  const contacts = useContacts();
  const [form, setForm] = useState<{ contact?: PublicContact } | null>(null);
  const [confirming, setConfirming] = useState<PublicContact[] | null>(null);

  const hasSearchRow = contacts.bookTotal > 0 || Boolean(contacts.typed);
  const hasFooter = contacts.bookTotal > 0;
  const countLine =
    contacts.search && !contacts.loading
      ? `${contacts.total} of ${count(contacts.bookTotal)}`
      : count(contacts.bookTotal);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {hasSearchRow && (
        <ContactsToolbar
          value={contacts.typed}
          onValueChange={contacts.setTyped}
          disabled={contacts.loading}
          onAdd={() => setForm({})}
        />
      )}

      {contacts.loading ? (
        <ContactsSkeleton showSearchRow={!hasSearchRow} showFooter={!hasFooter} />
      ) : contacts.failed ? (
        <Empty className="border-dashed">
          <EmptyHeader>
            <EmptyTitle className="font-mono text-sm tracking-wide uppercase">
              Couldn&rsquo;t load contacts
            </EmptyTitle>
            <EmptyDescription>
              {contacts.error instanceof Error
                ? contacts.error.message
                : "The book could not be read."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="lg" onClick={contacts.retry}>
              Try again
            </Button>
          </EmptyContent>
        </Empty>
      ) : !hasSearchRow ? (
        <Empty className="border-dashed">
          <EmptyHeader>
            <EmptyTitle className="font-mono text-sm tracking-wide uppercase">
              No contacts yet
            </EmptyTitle>
            <EmptyDescription>
              Add the people you call and their numbers stay on hand.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="lg" onClick={() => setForm({})}>
              Add contact
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ContactsTable
          rows={contacts.people}
          query={contacts.search}
          hasMore={contacts.hasMore}
          loadingMore={contacts.loadingMore}
          onLoadMore={contacts.loadMore}
          onEdit={(contact) => setForm({ contact })}
          onRemove={(contact) => setConfirming([contact])}
          onRemoveSelected={setConfirming}
        />
      )}

      {hasFooter && (
        <div className="flex shrink-0 items-center justify-center border-t border-border py-3 font-mono text-xs text-muted-foreground">
          {countLine}
        </div>
      )}

      {confirming && (
        <ContactRemoveDialog
          contacts={confirming}
          onCancel={() => setConfirming(null)}
          onConfirm={() => {
            const removed = confirming;
            setConfirming(null);
            contacts.hold(removed);
          }}
        />
      )}

      {form && (
        <ContactFormDialog
          key={form.contact?.id ?? "new"}
          contact={form.contact}
          people={contacts.people}
          onClose={() => setForm(null)}
          onSave={(input, id) => {
            setForm(null);
            contacts.save(input, id);
          }}
        />
      )}
    </div>
  );
}
