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
   */
  const hasCategory = (category: string): boolean => {
    if (!permissions[category]) return false;
    return permissions[category].enabled === true;
  };

  /**
   * Check if user has access to a specific item within a category
   */
  const hasItem = (category: string, item: string): boolean => {
    if (!permissions[category]) return false;
    if (!permissions[category].enabled) return false;
    if (!permissions[category].items) return true; // If category enabled but no items, allow all
    return permissions[category].items[item] === true;
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
