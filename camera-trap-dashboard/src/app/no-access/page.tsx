import Link from "next/link";

export default function NoAccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="max-w-md text-center p-8">
        <h1 className="text-2xl font-bold mb-2">Access not granted</h1>
        <p className="text-muted-foreground mb-6">
          Your account doesn&apos;t have access to WildTrack. Contact your team
          administrator to request access.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
