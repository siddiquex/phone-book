"use client";

import { fieldClass } from "@/components/field";
import { Button } from "@/components/ui/button";

export function ContactsToolbar({
  value,
  onValueChange,
  disabled,
  onAdd,
}: {
  value: string;
  onValueChange: (value: string) => void;
  disabled: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex shrink-0 gap-2 pb-3">
      <input
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder="Search by name or number"
        aria-label="Search contacts"
        className={`${fieldClass} flex-1 rounded-lg`}
      />
      <Button size="lg" disabled={disabled} onClick={onAdd}>
        Add contact
      </Button>
    </div>
  );
}
