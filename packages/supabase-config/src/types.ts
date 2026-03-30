export type AppId = "wildtrack" | "fire" | "trap_monitor";
export type AppRole = "viewer" | "member" | "admin";

export interface AppAccess {
  hasAccess: boolean;
  role: AppRole | null;
}
