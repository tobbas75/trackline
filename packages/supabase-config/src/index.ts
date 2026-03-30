// Types
export type { AppId, AppRole, AppAccess } from "./types";

// Client factory (browser only — server client must be imported directly)
export { createBrowserClient } from "./client";

// Access utilities
export { checkAppAccess, getUserApps } from "./check-access";
