import { Loader2, OctagonX } from "lucide-react";
import { toast } from "sonner";

import { PhoneNumber } from "@/components/phone-number";
import { TOAST_DURATION } from "@/components/ui/sonner";
import { count, fullName, type Person } from "@/lib/contact-format";
import type { PublicContact } from "@phone-book/db/schema";

export type Subject = { line: string; detail?: string };

const TOAST_ID = "contacts";

export const one = (contact: Person): Subject => ({ line: fullName(contact), detail: contact.phone });
export const batch = (n: number): Subject => ({ line: count(n) });

export const subjectOf = (contacts: PublicContact[]): Subject =>
  contacts.length === 1 ? one(contacts[0]) : batch(contacts.length);

function body(
  heading: string,
  subject: Subject,
  icon: React.ReactNode,
  options: { action?: { label: string; onClick: () => void }; countdown?: boolean } = {},
) {
  const { action, countdown } = options;

  return (
    <div className="flex w-full min-w-0 flex-col gap-1 p-4">
      <div className="flex min-w-0 items-center gap-2">
        {icon}
        <p className="flex-1 text-sm font-medium">{heading}</p>
        {action ? (
          <button
            type="button"
            onClick={() => action.onClick()}
            className="rounded-md border border-border px-2 py-0.5 text-sm font-normal transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {action.label}
          </button>
        ) : null}
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <span className="min-w-0 flex-1 truncate text-sm font-normal">{subject.line}</span>
        {subject.detail ? (
          <PhoneNumber
            value={subject.detail}
            className="shrink-0 font-mono text-sm font-normal text-muted-foreground"
          />
        ) : null}
      </div>
      {countdown ? <span aria-hidden className="cn-timer" /> : null}
    </div>
  );
}

export const working = (heading: string, subject: Subject) =>
  toast(body(heading, subject, <Loader2 className="size-4 animate-spin text-muted-foreground" />), {
    id: TOAST_ID,
    duration: Infinity,
    classNames: { toast: "cn-toast" },
  });

/** Sonner keeps the duration it was made with. */
export function notice(
  heading: string,
  subject: Subject,
  options: {
    icon: React.ReactNode;
    action?: { label: string; onClick: () => void };
    onClose?: () => void;
  },
) {
  toast(body(heading, subject, options.icon, { action: options.action, countdown: true }), {
    id: TOAST_ID,
    duration: TOAST_DURATION,
    classNames: { toast: "cn-toast" },
    onAutoClose: options.onClose,
    onDismiss: options.onClose,
  });
}

export function failed(cause: unknown, fallback: string, subject: Subject) {
  notice(cause instanceof Error ? cause.message : fallback, subject, {
    icon: <OctagonX className="size-4 text-destructive" />,
  });
}
