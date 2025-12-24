import { useQuery } from "@tanstack/react-query";
import { User, RolePermission } from "@shared/schema";

interface PermissionState {
  [category: string]: {
    enabled: boolean;
    items: { [item: string]: boolean };
  };
}

export function usePermissions() {
  // Get current user
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Get current user's permissions (single permission for their role)
  const { data: userPermission, isLoading: permissionsLoading } = useQuery<RolePermission | null>({
    queryKey: ["/api/my-permissions"],
    enabled: !!user, // Only fetch if user is logged in
  });

  // Parse permissions JSON
  let permissions: PermissionState = {};
  if (userPermission) {
    try {
      permissions = JSON.parse(userPermission.permissions);
    } catch (e) {
      console.error("Failed to parse user permissions:", e);
    }
  }

  /**
   * Check if user has access to a specific category
   * Returns true if:
   * 1. The category's enabled is true, OR
   * 2. Any item within the category is true
   */
  const hasCategory = (category: string): boolean => {
    if (!permissions[category]) return false;
    // If enabled is true, return true
    if (permissions[category].enabled === true) return true;
    // If enabled is false, check if any item is true
    const items = permissions[category].items;
    if (items) {
      return Object.values(items).some(value => value === true);
    }
    return false;
  };

  /**
   * Check if user has access to a specific item within a category
   * Returns true if:
   * 1. Category enabled is true AND (no items defined OR specific item is true), OR
   * 2. The specific item is explicitly true (even if category enabled is false)
   */
  const hasItem = (category: string, item: string): boolean => {
    if (!permissions[category]) return false;
    const items = permissions[category].items;
    // If specific item is explicitly true, allow access regardless of category enabled
    if (items && items[item] === true) return true;
    // If category enabled but no items defined, allow all
    if (permissions[category].enabled && !items) return true;
    return false;
  };

  /**
   * Check if user has any of the specified categories
   */
  const hasAnyCategory = (categories: string[]): boolean => {
    return categories.some((category) => hasCategory(category));
  };

  /**
   * Check if user is admin
   */
  const isAdmin = user?.role === "관리자";

  return {
    user,
    permissions,
    isLoading: userLoading || permissionsLoading,
    hasCategory,
    hasItem,
    hasAnyCategory,
    isAdmin,
  };
}
