import { readPhone } from "@/lib/phone";

export function PhoneNumber({ value, className }: { value: string; className?: string }) {
  const { flag, dial, prefix, national } = readPhone(value);
  const head = dial ?? prefix;

  return (
    <span className={className}>
      {flag ? <span aria-hidden>{flag} </span> : null}
      {head ? (
        <span className="text-muted-foreground">
          {head}
          {dial ? " " : ""}
        </span>
      ) : null}
      {national}
    </span>
  );
}
