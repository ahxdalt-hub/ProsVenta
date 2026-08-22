import type { OrganizationRole } from "@/types/database";

// ============================================================================
// Role-Based Permissions
// ============================================================================

export type Permission =
  | "view_prospects"
  | "create_prospects"
  | "edit_prospects"
  | "delete_prospects"
  | "assign_prospects"
  | "comment_on_prospects"
  | "create_lists"
  | "edit_lists"
  | "delete_lists"
  | "invite_members"
  | "remove_members"
  | "change_member_roles"
  | "edit_workspace"
  | "delete_workspace"
  | "manage_billing"
  | "export_data"
  | "import_data"
  | "share_views";

export interface RoleDefinition {
  label: string;
  description: string;
  badgeVariant: "primary" | "default" | "neutral" | "success" | "warning" | "danger";
  permissions: Permission[];
}

// Role hierarchy levels
const ROLE_LEVELS: Record<OrganizationRole, number> = {
  owner: 4,
  admin: 3,
  manager: 2,
  sales: 1,
  viewer: 0,
};

// Permission definitions for each role
const ROLE_PERMISSIONS: Record<OrganizationRole, Permission[]> = {
  owner: [
    "view_prospects",
    "create_prospects",
    "edit_prospects",
    "delete_prospects",
    "assign_prospects",
    "comment_on_prospects",
    "create_lists",
    "edit_lists",
    "delete_lists",
    "invite_members",
    "remove_members",
    "change_member_roles",
    "edit_workspace",
    "delete_workspace",
    "manage_billing",
    "export_data",
    "import_data",
    "share_views",
  ],
  admin: [
    "view_prospects",
    "create_prospects",
    "edit_prospects",
    "delete_prospects",
    "assign_prospects",
    "comment_on_prospects",
    "create_lists",
    "edit_lists",
    "delete_lists",
    "invite_members",
    "remove_members",
    "change_member_roles",
    "edit_workspace",
    "export_data",
    "import_data",
    "share_views",
  ],
  manager: [
    "view_prospects",
    "create_prospects",
    "edit_prospects",
    "delete_prospects",
    "assign_prospects",
    "comment_on_prospects",
    "create_lists",
    "edit_lists",
    "delete_lists",
    "export_data",
    "import_data",
    "share_views",
  ],
  sales: [
    "view_prospects",
    "create_prospects",
    "edit_prospects",
    "assign_prospects",
    "comment_on_prospects",
    "create_lists",
    "edit_lists",
    "export_data",
    "import_data",
    "share_views",
  ],
  viewer: [
    "view_prospects",
    "comment_on_prospects",
    "create_lists",
    "export_data",
    "share_views",
  ],
};

export const ROLE_DEFINITIONS: Record<OrganizationRole, RoleDefinition> = {
  owner: {
    label: "Owner",
    description: "Full control of the workspace and its organization settings.",
    badgeVariant: "primary",
    permissions: ROLE_PERMISSIONS.owner,
  },
  admin: {
    label: "Admin",
    description: "Can help manage the workspace and its members.",
    badgeVariant: "default",
    permissions: ROLE_PERMISSIONS.admin,
  },
  manager: {
    label: "Manager",
    description: "Manages prospects, lists, and team assignments.",
    badgeVariant: "success",
    permissions: ROLE_PERMISSIONS.manager,
  },
  sales: {
    label: "Sales",
    description: "Uses Prosventa for day-to-day prospect work without managing access.",
    badgeVariant: "neutral",
    permissions: ROLE_PERMISSIONS.sales,
  },
  viewer: {
    label: "Viewer",
    description: "Can view workspace data without making changes.",
    badgeVariant: "warning",
    permissions: ROLE_PERMISSIONS.viewer,
  },
};

// ============================================================================
// Permission Helpers
// ============================================================================

/**
 * Checks if a role has a specific permission.
 */
export function hasPermission(
  role: OrganizationRole | null | undefined,
  permission: Permission
): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role] ?? [];
  return permissions.includes(permission);
}

/**
 * Checks if a role can manage another role.
 * Returns true if the actor's role level is higher than the target's.
 */
export function canManageRole(
  actorRole: OrganizationRole | null | undefined,
  targetRole: OrganizationRole | null | undefined
): boolean {
  if (!actorRole || !targetRole) return false;
  return ROLE_LEVELS[actorRole] > ROLE_LEVELS[targetRole];
}

/**
 * Checks if the actor role is allowed to assign the given target role.
 * A role can only assign roles strictly below its own hierarchy level.
 * The owner role can never be assigned by anyone (no ownership transfer in V1).
 */
export function canAssignRole(
  actorRole: OrganizationRole | null | undefined,
  targetRole: OrganizationRole | null | undefined
): boolean {
  if (!actorRole || !targetRole) return false;
  if (targetRole === "owner") return false;
  return ROLE_LEVELS[actorRole] > ROLE_LEVELS[targetRole];
}

/**
 * Gets the role level for comparison.
 * Owner=4, Admin=3, Manager=2, Sales=1, Viewer=0
 */
export function getRoleLevel(role: OrganizationRole | null | undefined): number {
  if (!role) return -1;
  return ROLE_LEVELS[role];
}

/**
 * Returns whether a role is in the admin tier (owner or admin).
 */
export function isAdminRole(role: OrganizationRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Returns the human-readable label for a role.
 */
export function getRoleLabel(role: OrganizationRole | null | undefined): string {
  if (!role) return "Unknown";
  return ROLE_DEFINITIONS[role]?.label ?? role;
}