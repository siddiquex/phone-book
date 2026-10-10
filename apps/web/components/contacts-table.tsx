"use client";

import { useTable } from "@tanstack/react-table";
import { useEffect, useRef } from "react";
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";

import { columns, features, type RowActions } from "@/components/contact-columns";
import { ContactsSelectionBar } from "@/components/contacts-selection-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PublicContact } from "@phone-book/db/schema";

const cellClass = "px-3 py-2";
const headClass = "h-9 font-mono text-xs font-medium tracking-wide text-muted-foreground uppercase";

export function ContactsTable({
  rows,
  query,
  hasMore,
  loadingMore,
  onLoadMore,
  onEdit,
  onRemove,
  onRemoveSelected,
}: {
  rows: PublicContact[];
  query: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onEdit: (contact: PublicContact) => void;
  onRemove: (contact: PublicContact) => void;
  onRemoveSelected: (contacts: PublicContact[]) => void;
}) {
  const table = useTable({
    features,
    columns,
    data: rows,
    getRowId: (row) => row.id,
    initialState: { sorting: [{ id: "name", desc: false }] },
    enableSortingRemoval: false,
    meta: { onEdit, onRemove } satisfies RowActions,
  });

  const selected = table.getSelectedRowModel().rows.map((row) => row.original);

  const endRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef(onLoadMore);
  const loadingMoreRef = useRef(loadingMore);

  useEffect(() => {
    loadMoreRef.current = onLoadMore;
    loadingMoreRef.current = loadingMore;
  });

  // Keyed on row count, and never shrinking: a zero-height sentinel sits on the edge, where isIntersecting is flaky.
  useEffect(() => {
    const end = endRef.current;
    if (!end || !hasMore) return;

    const watcher = new IntersectionObserver(([entry]) => {
      // Staying armed re-asks after a failure; the guard blocks re-entry over a page in flight.
      if (entry?.isIntersecting && !loadingMoreRef.current) loadMoreRef.current();
    });

    watcher.observe(end);

    return () => watcher.disconnect();
  }, [hasMore, rows.length]);

  return (
    <>
      <ContactsSelectionBar
        selected={selected.length}
        onClear={() => table.resetRowSelection()}
        onRemove={() => {
          const chosen = selected;
          table.resetRowSelection();
          onRemoveSelected(chosen);
        }}
      />

      <div className="table-flat scroll-thin -mr-3.5 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-auto pr-3.5">
        {rows.length === 0 ? (
          // Only a search says "no match"; an empty list is mid-refetch.
          query ? (
            <p className="py-8 text-sm text-muted-foreground">
              No contacts match “{query.trim()}”.
            </p>
          ) : null
        ) : (
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id} className="hover:bg-transparent">
                  {group.headers.map((header) => (
                    <TableHead key={header.id} className={cellClass}>
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={`${headClass} flex items-center gap-1 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50`}
                        >
                          <table.FlexRender header={header} />
                          {header.column.getIsSorted() === "asc" ? (
                            <ArrowUp className="size-3" />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <ArrowDown className="size-3" />
                          ) : null}
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="group data-[selected=true]:bg-muted/50"
                  data-selected={row.getIsSelected()}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id} className={cellClass}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {hasMore && (
          <div
            ref={endRef}
            className={`flex shrink-0 items-center justify-center ${
              rows.length === 0 ? "grow" : "h-10"
            }`}
          >
            {(loadingMore || rows.length === 0) && (
              <Loader2
                role="status"
                aria-label="Loading more contacts"
                className="size-4 animate-spin text-muted-foreground"
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}
