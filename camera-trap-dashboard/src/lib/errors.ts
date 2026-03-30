/** Map Supabase/Postgres error codes to user-friendly messages */
export function friendlyError(code: string | undefined, message: string): string {
  if (!code) return "Something went wrong. Please try again.";

  switch (code) {
    case "42501":
      return "You don't have permission to do this.";
    case "23505":
      return "This already exists. Please choose a different name or slug.";
    case "23503":
      return "This item is referenced by other data and cannot be changed.";
    case "23502":
      return "A required field is missing.";
    case "PGRST301":
      return "You are not authorised to access this resource.";
    default:
      // Log the real error for debugging, return generic message
      console.error(`Supabase error [${code}]: ${message}`);
      return "Something went wrong. Please try again.";
  }
}

/** Validate a redirect URL is safe (internal path only) */
export function isSafeRedirect(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//");
}
