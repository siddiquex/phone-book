"use client";

import { useState } from "react";

import { Field } from "@/components/field";
import { formatPhone, readPhone } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NAME_MAX, PHONE_MAX } from "@phone-book/db/limits";
import type { Person } from "@/lib/contact-format";
import type { PublicContact } from "@phone-book/db/schema";

type Errors = Partial<Record<keyof Person, string>>;

const EMPTY: Person = { firstName: "", lastName: "", phone: "" };

export function ContactFormDialog({
  contact,
  people,
  onSave,
  onClose,
}: {
  contact?: PublicContact;
  people: PublicContact[];
  onSave: (input: Person, id: string | null) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Person>(
    contact
      ? { firstName: contact.firstName, lastName: contact.lastName, phone: contact.phone }
      : EMPTY,
  );
  const [errors, setErrors] = useState<Errors>({});
  const [pulse, setPulse] = useState(0);

  const id = contact?.id ?? null;

  function setField(field: keyof Person, value: string) {
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setDraft((previous) => ({ ...previous, [field]: value }));
  }

  function onPhone(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const before = input.value;
    const caret = input.selectionStart ?? before.length;
    const typed = before.replace(/[^\d+\-() ]/g, "");
    const atEnd = caret === before.length;
    const next = atEnd && before.length > draft.phone.length ? formatPhone(typed) : typed;

    setField("phone", next);

    // Unchanged state skips React's write, stranding a rejected character.
    if (before !== next) {
      input.value = next;
      const at = atEnd ? next.length : Math.max(0, caret - (before.length - next.length));
      input.setSelectionRange(at, at);
    }
  }

  function check(input: Person): Errors {
    const found: Errors = {};

    if (!input.firstName) found.firstName = "Add a first name.";
    if (!input.lastName) found.lastName = "Add a last name.";

    if (!input.phone) found.phone = "Add a phone number.";
    else if (input.phone.replace(/\D/g, "").length < 7) found.phone = "Use at least 7 digits.";
    else if (people.some((contact) => contact.phone === input.phone && contact.id !== id)) {
      found.phone = "That number is already in the list.";
    }

    return found;
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = {
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      phone: draft.phone.trim(),
    };

    const found = check(input);
    if (Object.keys(found).length > 0) {
      if (Object.keys(errors).length > 0) setPulse((n) => n + 1);
      return setErrors(found);
    }

    onSave(input, id);
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {contact ? "Edit contact" : "Add contact"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
          <Field
            label="First name"
            error={errors.firstName}
            pulse={pulse}
            input={{
              value: draft.firstName,
              maxLength: NAME_MAX,
              onChange: (event) => setField("firstName", event.target.value),
            }}
          />
          <Field
            label="Last name"
            error={errors.lastName}
            pulse={pulse}
            input={{
              value: draft.lastName,
              maxLength: NAME_MAX,
              onChange: (event) => setField("lastName", event.target.value),
            }}
          />
          <Field
            label="Phone number"
            error={errors.phone}
            hint={draft.phone ? undefined : "Include the country code, e.g. +61 400 111 222"}
            leading={readPhone(draft.phone).flag}
            pulse={pulse}
            input={{
              type: "tel",
              inputMode: "tel",
              autoComplete: "tel",
              maxLength: PHONE_MAX,
              value: draft.phone,
              onChange: onPhone,
            }}
          />

          <DialogFooter className="mt-1">
            <Button variant="outline" size="lg" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button size="lg" type="submit">
              {contact ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
