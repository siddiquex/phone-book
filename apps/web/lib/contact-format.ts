import type { ContactInput } from "@phone-book/db/schema";

export type Person = ContactInput;

export const fullName = (contact: Person) => `${contact.firstName} ${contact.lastName}`;
export const count = (n: number) => `${n} contact${n === 1 ? "" : "s"}`;

const date = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" });
const time = new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit" });

const DAY = 86_400_000;

const formatDate = (iso: string) => date.format(new Date(iso));

export const recency = (iso: string) => {
  const at = time.format(new Date(iso));
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);

  if (days <= 0) return `Today at ${at}`;
  if (days === 1) return `Yesterday at ${at}`;
  if (days < 30) return `${days} days ago at ${at}`;
  return `${formatDate(iso)} at ${at}`;
};
