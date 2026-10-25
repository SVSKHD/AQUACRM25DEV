export const SUPER_ADMIN_ROLE = "super-admin";

type StaffRoleRef = {
  slug?: string;
  isActive?: boolean;
  permissions?: string[];
};

type StaffUser = {
  role?: number | string;
  directPermissions?: string[];
  roleRef?: StaffRoleRef | string | null;
};

/** Admins: legacy role 1 or the super-admin role (when roleRef is populated). */
export const isAdminUser = (user: unknown): boolean => {
  if (!user || typeof user !== "object") return false;
  const staff = user as StaffUser;
  if (Number(staff.role) === 1) return true;
  return (
    typeof staff.roleRef === "object" &&
    staff.roleRef?.slug === SUPER_ADMIN_ROLE
  );
};

/**
 * Mirrors the backend's staffHasPermission for the stored login user.
 * Returns null when the answer depends on a role that the login payload only
 * references by id (roleRef isn't populated there), so callers must ask the API.
 */
export const resolveStaffPermission = (
  user: unknown,
  permission: string,
): boolean | null => {
  if (!user || typeof user !== "object") return null;
  const staff = user as StaffUser;

  if (Number(staff.role) === 1) return true;
  if (staff.directPermissions?.includes(permission)) return true;

  const roleRef = staff.roleRef;
  if (roleRef && typeof roleRef === "object") {
    if (roleRef.slug === SUPER_ADMIN_ROLE) return true;
    return Boolean(
      roleRef.isActive && roleRef.permissions?.includes(permission),
    );
  }
  if (roleRef) return null;
  return false;
};
