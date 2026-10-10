export const fieldClass =
  "h-9 w-full border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground aria-invalid:border-destructive focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function Field({
  label,
  error,
  hint,
  leading,
  input,
  pulse,
}: {
  label: string;
  error?: string;
  hint?: string;
  leading?: React.ReactNode;
  input: React.ComponentProps<"input">;
  pulse: number;
}) {
  const id = `contact-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const note = error ?? hint ?? "";

  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <span className="relative flex items-center">
        {leading ? (
          <span aria-hidden className="pointer-events-none absolute left-3 text-sm">
            {leading}
          </span>
        ) : null}
        <input
          {...input}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-error`}
          className={`${fieldClass} rounded-lg ${leading ? "pl-9" : ""}`}
        />
      </span>
      <span
        id={`${id}-error`}
        className={`rows-animate grid text-xs ${
          note ? "rows-open opacity-100" : "rows-closed opacity-0"
        } ${error ? "text-destructive" : "text-muted-foreground"}`}
      >
        <span key={pulse} className={`w-fit overflow-hidden ${pulse > 0 ? "heartbeat" : ""}`}>
          {note}
        </span>
      </span>
    </label>
  );
}
