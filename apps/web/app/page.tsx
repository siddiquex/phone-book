import { Contacts } from "@/components/contacts";
import { ThemeToggle } from "@/components/theme-toggle";
import { site } from "@/lib/site";

export default function Home() {
  return (
    <main className="settle-in mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col px-6 sm:px-10">
      <header className="relative shrink-0 py-4 sm:py-5">
        <div className="absolute top-4 right-0 sm:top-5">
          <ThemeToggle />
        </div>
        <h1 className="text-3xl leading-none font-semibold tracking-tight sm:text-4xl">
          {site.name}
        </h1>
        <p className="mt-1 text-base text-muted-foreground">{site.tagline}</p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <Contacts />
      </div>
    </main>
  );
}
