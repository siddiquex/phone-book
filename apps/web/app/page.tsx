export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-3 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Phone Book</h1>
      <p className="text-muted-foreground">
        A contacts directory. Add people with their name and phone number, find them by name or
        number, and remove them when they are no longer needed.
      </p>
    </main>
  );
}
