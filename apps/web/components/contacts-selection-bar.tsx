"use client";

import { Button } from "@/components/ui/button";
import { count } from "@/lib/contact-format";

export function ContactsSelectionBar({
  selected,
  onClear,
  onRemove,
}: {
  selected: number;
  onClear: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={`rows-animate grid shrink-0 ${
        selected > 0 ? "rows-open opacity-100" : "rows-closed opacity-0"
      }`}
      inert={selected === 0}
    >
      <div className="overflow-hidden">
        <div className="mb-2 flex items-center gap-3 rounded-lg border border-border px-3 py-2">
          <span className="text-sm font-medium">{count(selected)} selected</span>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
          <Button variant="destructive" size="sm" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}
