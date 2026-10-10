import type { InfiniteData } from "@tanstack/react-query";

import type { ContactPage, PublicContact } from "@phone-book/db/schema";

export type Pages = InfiniteData<ContactPage>;

export const rowsOf = (pages?: Pages) => pages?.pages.flatMap((page) => page.items) ?? [];

const mapPages = (
  pages: Pages,
  change: (page: ContactPage, index: number, all: ContactPage[]) => Partial<ContactPage>,
): Pages => ({
  ...pages,
  pages: pages.pages.map((page, index, all) => ({ ...page, ...change(page, index, all) })),
});

/** `total` is the whole match on every page. */
export const dropRows = (pages: Pages, ids: string[]): Pages => {
  const dropped = new Set(ids);

  return mapPages(pages, (page) => ({
    items: page.items.filter((item) => !dropped.has(item.id)),
    total: Math.max(0, page.total - ids.length),
  }));
};

export const addRows = (pages: Pages, rows: PublicContact[]): Pages =>
  mapPages(pages, (page, index, all) => ({
    items: index === all.length - 1 ? [...page.items, ...rows] : page.items,
    total: page.total + rows.length,
  }));

/** `match` is the placeholder's id for a new contact, the row's id otherwise. */
export const replaceRow = (pages: Pages, match: string, contact: PublicContact): Pages =>
  mapPages(pages, (page) => ({
    items: page.items.map((item) => (item.id === match ? contact : item)),
  }));
