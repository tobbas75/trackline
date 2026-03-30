import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <span className="text-xl font-bold">WildTrack</span>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Ecological monitoring,
            <br />
            <span className="text-primary">made collaborative</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Upload, manage, visualise, and share camera trap data. Built for
            ranger teams, national parks, researchers, Indigenous land managers,
            and conservation groups.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href="/auth/register">Create your team</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/explore">Browse published projects</Link>
            </Button>
          </div>
        </div>

        <div className="mt-20 grid max-w-4xl gap-8 md:grid-cols-3">
          <div className="text-center">
            <h3 className="mb-2 text-lg font-semibold">Any data format</h3>
            <p className="text-sm text-muted-foreground">
              Import from TimeLapse, AddaxAI, or any CSV. Our column mapper
              auto-detects your format.
            </p>
          </div>
          <div className="text-center">
            <h3 className="mb-2 text-lg font-semibold">ALA integrated</h3>
            <p className="text-sm text-muted-foreground">
              Species autocomplete, taxonomy validation, and conservation status
              from the Atlas of Living Australia.
            </p>
          </div>
          <div className="text-center">
            <h3 className="mb-2 text-lg font-semibold">Team workspaces</h3>
            <p className="text-sm text-muted-foreground">
              Organisations with roles. Rangers, researchers, and stakeholders
              each get the right level of access.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        WildTrack — Open-source ecological monitoring platform
      </footer>
    </div>
  );
}
