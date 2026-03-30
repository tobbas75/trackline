import { redirect } from "next/navigation";

/**
 * Root page redirects into the app shell.
 * The (app) route group handles the authenticated layout.
 */
export default function RootPage() {
  redirect("/map");
}
