export default function NoAccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-(--tm-bg)">
      <div className="max-w-md text-center p-8">
        <h1 className="text-2xl font-bold text-(--tm-text) mb-2">
          Access not granted
        </h1>
        <p className="text-(--tm-muted) mb-6">
          Your account doesn&apos;t have access to Trap Monitor. Contact your
          team administrator to request access.
        </p>
        <div className="flex gap-3 justify-center">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded bg-(--tm-accent) px-4 py-2 text-sm font-medium text-white hover:bg-(--tm-accent-strong)"
          >
            Back to home
          </a>
          <a
            href="/auth/signout"
            className="inline-flex items-center justify-center rounded border border-(--tm-border) bg-(--tm-panel) px-4 py-2 text-sm font-medium text-(--tm-text) hover:bg-(--tm-bg)"
          >
            Sign out
          </a>
        </div>
      </div>
    </div>
  );
}
