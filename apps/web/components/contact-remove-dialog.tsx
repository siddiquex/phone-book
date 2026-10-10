"use client";

import { PhoneNumber } from "@/components/phone-number";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { count, fullName } from "@/lib/contact-format";
import type { PublicContact } from "@phone-book/db/schema";

export function ContactRemoveDialog({
  contacts,
  onConfirm,
  onCancel,
}: {
  contacts: PublicContact[];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {contacts.length > 1
              ? `Remove ${count(contacts.length)}?`
              : `Remove ${fullName(contacts[0])}?`}
          </DialogTitle>
          <DialogDescription>You can undo this right after.</DialogDescription>
        </DialogHeader>

        <ul className="scroll-thin flex max-h-40 flex-col overflow-y-auto border-y border-border pr-3.5">
          {contacts.map((contact) => (
            <li key={contact.id} className="flex items-center gap-3 py-1.5 text-sm">
              <span className="min-w-0 flex-1 truncate">{fullName(contact)}</span>
              <PhoneNumber
                value={contact.phone}
                className="shrink-0 font-mono text-muted-foreground"
              />
            </li>
          ))}
        </ul>

        <DialogFooter className="mt-1">
          <Button variant="outline" size="lg" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" size="lg" onClick={onConfirm}>
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
