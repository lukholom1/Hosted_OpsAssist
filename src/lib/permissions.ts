/**
 * Centralized role → navigation/permission configuration.
 *
 * The app has two admin tiers, both stored as the `admin` role in
 * `user_roles`; they are distinguished by `profiles.department`:
 *   - SuperAdmin       -> department IS NULL
 *   - Department Admin -> department = 'HR' | 'IT' | 'Finance' | 'Operations'
 *
 * IMPORTANT: permissions must only be evaluated once the profile has loaded.
 * `department === null` is also the *initial* state of the auth hook, so
 * checking it before the profile resolves makes every admin look like a
 * SuperAdmin for a moment (nav items flash in, then disappear).
 */

export type AppRole = "admin" | "employee" | "it_personnel";

export type AdminTier = "super_admin" | "department_admin";

export type Permission =
  | "tickets"
  | "insights"
  | "approvals"
  | "predictions"
  | "compliance"
  | "escalated"
  | "users";

export const ADMIN_TIER_PERMISSIONS: Record<AdminTier, Permission[]> = {
  super_admin: [
    "tickets",
    "insights",
    "approvals",
    "predictions",
    "compliance",
    "escalated",
    "users",
  ],
  department_admin: [
    "tickets",
    "insights",
    "approvals",
    "predictions",
    "compliance",
  ],
};

export function getAdminTier(department: string | null): AdminTier {
  return department === null ? "super_admin" : "department_admin";
}

/**
 * `ready` MUST be the auth hook's profile-loaded flag. While false this
 * returns false for everything so no unauthorized item is ever rendered
 * optimistically.
 */
export function hasPermission(
  ready: boolean,
  role: AppRole | null,
  department: string | null,
  permission: Permission,
): boolean {
  if (!ready || role !== "admin") return false;
  return ADMIN_TIER_PERMISSIONS[getAdminTier(department)].includes(permission);
}
