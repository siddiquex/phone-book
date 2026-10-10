"use client";

import {
  createColumnHelper,
  createSortedRowModel,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  type Row,
} from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { PhoneNumber } from "@/components/phone-number";
import { Checkbox } from "@/components/ui/checkbox";
import { fullName, recency } from "@/lib/contact-format";
import type { PublicContact } from "@phone-book/db/schema";

export type RowActions = {
  onEdit: (contact: PublicContact) => void;
  onRemove: (contact: PublicContact) => void;
};

// v9 registers features; the row-model stage is a separate slot.
export const features = tableFeatures({
  rowSortingFeature,
  rowSelectionFeature,
  sortedRowModel: createSortedRowModel(),
});

const helper = createColumnHelper<typeof features, PublicContact>();

const muted = "font-mono text-xs text-muted-foreground tabular-nums";

const rowAction =
  "shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 pointer-coarse:opacity-100";

const byLocale = (
  a: Row<typeof features, PublicContact>,
  b: Row<typeof features, PublicContact>,
  columnId: string,
) => String(a.getValue(columnId)).localeCompare(String(b.getValue(columnId)));

const stamp = (iso: string) => (
  <time dateTime={iso} className={muted}>
    {recency(iso)}
  </time>
);

export const columns = helper.columns([
  helper.display({
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllRowsSelected()}
        indeterminate={!table.getIsAllRowsSelected() && table.getIsSomeRowsSelected()}
        onCheckedChange={(checked) => table.toggleAllRowsSelected(checked)}
        aria-label="Select all contacts"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(checked)}
        aria-label={`Select ${fullName(row.original)}`}
      />
    ),
  }),
  helper.accessor((row) => fullName(row), {
    id: "name",
    header: "Name",
    sortFn: byLocale,
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  helper.accessor("phone", {
    header: "Phone number",
    cell: (info) => <PhoneNumber value={info.getValue()} className="font-mono tabular-nums" />,
  }),
  helper.accessor("createdAt", {
    header: "Added",
    cell: (info) => stamp(info.getValue()),
  }),
  helper.accessor("updatedAt", {
    header: "Edited",
    cell: ({ row, getValue }) => {
      const value = getValue();
      return value === row.original.createdAt ? (
        <span className="text-muted-foreground/40">—</span>
      ) : (
        stamp(value)
      );
    },
  }),
  helper.display({
    id: "actions",
    cell: ({ row, table }) => {
      if (table.getSelectedRowModel().rows.length > 0) return null;

      const { onEdit, onRemove } = table.options.meta as RowActions;
      const contact = row.original;

      return (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={() => onEdit(contact)}
            aria-label={`Edit ${fullName(contact)}`}
            className={`${rowAction} hover:text-foreground`}
          >
            <Pencil className="size-3" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(contact)}
            aria-label={`Remove ${fullName(contact)}`}
            className={`${rowAction} hover:text-destructive focus-visible:text-destructive`}
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      );
    },
  }),
]);
