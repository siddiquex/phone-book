"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { failed, notice, one, subjectOf, working } from "@/components/contact-toast";
import { contactsApi } from "@/lib/contacts";
import { addRows, dropRows, replaceRow, rowsOf, type Pages } from "@/lib/contact-pages";
import type { Person } from "@/lib/contact-format";
import type { PublicContact } from "@phone-book/db/schema";

/** Keeps the spinner readable against a fast local API. */
const MIN_SPINNER_MS = 400;
const TYPING_PAUSE_MS = 300;

const releaseIfCurrent = (removed: PublicContact[]) => (current: PublicContact[] | null) =>
  current === removed ? null : current;

export function useContacts() {
  const queryClient = useQueryClient();
  const [typed, setTyped] = useState("");
  const [search, setSearch] = useState("");
  const pendingRemoval = useRef<PublicContact[] | null>(null);
  const [held, setHeld] = useState<PublicContact[] | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(typed.trim()), TYPING_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [typed]);

  const queryKey = useMemo(() => ["contacts", search], [search]);

  const contacts = useInfiniteQuery({
    queryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const [page] = await Promise.all([
        contactsApi.list({ cursor: pageParam, search: search || undefined }),
        pageParam ? new Promise((done) => setTimeout(done, MIN_SPINNER_MS)) : null,
      ]);
      return page;
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  useEffect(() => {
    if (contacts.isFetchNextPageError) toast.error("Couldn't load more contacts.");
  }, [contacts.isFetchNextPageError]);

  const rows = useMemo(() => rowsOf(contacts.data), [contacts.data]);
  const heldIds = useMemo(() => new Set(held?.map((contact) => contact.id) ?? []), [held]);

  // Hidden, not dropped: a refetch would refill a dropped row.
  const { people, heldCount } = useMemo(() => {
    const visible = rows.filter((contact) => !heldIds.has(contact.id));

    return { people: visible, heldCount: rows.length - visible.length };
  }, [rows, heldIds]);

  // The server's counts still include the held rows.
  const firstPage = contacts.data?.pages[0];
  const total = Math.max(0, (firstPage?.total ?? 0) - heldCount);
  const bookTotal = Math.max(0, (firstPage?.bookTotal ?? 0) - heldCount);

  const editPages = (change: (pages: Pages) => Pages) =>
    queryClient.setQueryData<Pages>(queryKey, (current) => (current ? change(current) : current));

  const saveContact = useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: Person }) =>
      id ? contactsApi.update(id, input) : contactsApi.create(input),

    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<Pages>(queryKey);
      const existing = people.find((contact) => contact.id === id);
      const optimisticId = id ?? crypto.randomUUID();
      const now = new Date().toISOString();

      editPages((pages) =>
        id && existing
          ? replaceRow(pages, id, { ...existing, ...input })
          : addRows(pages, [{ id: optimisticId, ...input, createdAt: now, updatedAt: now }]),
      );

      return { optimisticId, previous };
    },

    onSuccess: (saved, { id }, context) => {
      if (!id && context) {
        // The placeholder's id is not the one the server stored.
        editPages((pages) => replaceRow(pages, context.optimisticId, saved));
      }
      notice(id ? "Updated" : "Added", one(saved), {
        icon: id ? <Pencil className="size-4" /> : <CircleCheck className="size-4 text-emerald-500" />,
      });
    },

    onError: (cause, { input }, context) => {
      // Restore, never drop: an edit's placeholder is the contact's own id.
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);      failed(cause, "Couldn't save the contact.", one(input));
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });

  const removeContacts = useMutation({
    mutationFn: (ids: string[]) => contactsApi.removeMany(ids),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });

  function commitRemoval(removed: PublicContact[]) {
    if (pendingRemoval.current !== removed) return;
    pendingRemoval.current = null;

    const ids = removed.map((contact) => contact.id);

    removeContacts.mutate(ids, {
      onSuccess: () => {
        editPages((pages) => dropRows(pages, ids));
        setHeld(releaseIfCurrent(removed));
      },
      onError: (cause) => {
        setHeld(releaseIfCurrent(removed));
        failed(cause, "Couldn't remove that.", subjectOf(removed));
      },
    });
  }

  function hold(removed: PublicContact[]) {
    const subject = subjectOf(removed);

    if (pendingRemoval.current) void commitRemoval(pendingRemoval.current);
    pendingRemoval.current = removed;
    setHeld(removed);

    notice("Removed", subject, {
      icon: <Trash2 className="size-4 text-destructive" />,
      action: {
        label: "Undo",
        onClick: () => {
          pendingRemoval.current = null;
          setHeld(releaseIfCurrent(removed));
          notice("Restored", subject, {
            icon: <CircleCheck className="size-4 text-emerald-500" />,
          });
        },
      },
      onClose: () => void commitRemoval(removed),
    });
  }

  function save(input: Person, id: string | null) {
    if (pendingRemoval.current) void commitRemoval(pendingRemoval.current);

    working(id ? "Saving…" : "Adding…", one(input));
    saveContact.mutate({ id, input });
  }

  return {
    typed,
    setTyped,
    search,
    people,
    total,
    bookTotal,
    loading: contacts.isPending,
    failed: contacts.isError,
    error: contacts.error,
    retry: () => void contacts.refetch(),
    hasMore: contacts.hasNextPage,
    loadingMore: contacts.isFetchingNextPage,
    loadMore: () => void contacts.fetchNextPage(),
    save,
    hold,
  };
}
