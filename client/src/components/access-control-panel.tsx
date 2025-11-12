import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Minus, Save } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VALID_ROLES, PERMISSION_CATEGORIES, type RolePermission } from "@shared/schema";

type PermissionCategory = keyof typeof PERMISSION_CATEGORIES;

interface PermissionState {
  [category: string]: {
    enabled: boolean;
    items: { [item: string]: boolean };
  };
}

interface RolePermissions {
  [role: string]: PermissionState;
}

export function AccessControlPanel() {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<string>("협력사");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["현장조사"])
  );
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>({});

  const categories = Object.keys(PERMISSION_CATEGORIES) as PermissionCategory[];

  // Fetch all role permissions
  const { data: allPermissions, isLoading } = useQuery<RolePermission[]>({
    queryKey: ["/api/role-permissions"],
  });

  // Save role permission mutation
  const savePermissionMutation = useMutation({
    mutationFn: async (data: { roleName: string; permissions: string }) => {
      return await apiRequest("POST", "/api/role-permissions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-permissions"] });
      toast({
        title: "저장 완료",
        description: "권한이 성공적으로 저장되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "저장 실패",
        description: "권한 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Load permissions from API when data is fetched
  useEffect(() => {
    if (allPermissions) {
      const loadedPermissions: RolePermissions = {};
      allPermissions.forEach((perm) => {
        try {
          loadedPermissions[perm.roleName] = JSON.parse(perm.permissions);
        } catch (e) {
          console.error("Failed to parse permissions for role:", perm.roleName, e);
        }
      });
      setRolePermissions(loadedPermissions);
    }
  }, [allPermissions]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const getCurrentPermissions = (): PermissionState => {
    return rolePermissions[selectedRole] || {};
  };

  const updateCurrentPermissions = (newPermissions: PermissionState) => {
    setRolePermissions((prev) => ({
      ...prev,
      [selectedRole]: newPermissions,
    }));
  };

  const toggleCategoryPermission = (category: string, checked: boolean) => {
    const currentPerms = getCurrentPermissions();
    const items = PERMISSION_CATEGORIES[category as PermissionCategory];
    const newState = { ...currentPerms };
    newState[category] = {
      enabled: checked,
      items:
        items.length > 0
          ? Object.fromEntries(items.map((item) => [item, checked]))
          : {},
    };
    updateCurrentPermissions(newState);
  };

  const toggleItemPermission = (
    category: string,
    item: string,
    checked: boolean
  ) => {
    const currentPerms = getCurrentPermissions();
    const newState = { ...currentPerms };
    if (!newState[category]) {
      newState[category] = { enabled: false, items: {} };
    }
    newState[category].items[item] = checked;
    
    // Check if all items are checked to update parent
    const items = PERMISSION_CATEGORIES[category as PermissionCategory];
    const allChecked = items.every((i) => newState[category].items[i]);
    newState[category].enabled = allChecked;
    
    updateCurrentPermissions(newState);
  };

  const handleAllowAll = () => {
    const allPermissions: PermissionState = {};
    categories.forEach((category) => {
      const items = PERMISSION_CATEGORIES[category];
      allPermissions[category] = {
        enabled: true,
        items:
          items.length > 0
            ? Object.fromEntries(items.map((item) => [item, true]))
            : {},
      };
    });
    updateCurrentPermissions(allPermissions);
  };

  const isCategoryChecked = (category: string) => {
    const currentPerms = getCurrentPermissions();
    return currentPerms[category]?.enabled || false;
  };

  const isItemChecked = (category: string, item: string) => {
    const currentPerms = getCurrentPermissions();
    return currentPerms[category]?.items[item] || false;
  };

  const handleSave = () => {
    const currentPerms = getCurrentPermissions();
    savePermissionMutation.mutate({
      roleName: selectedRole,
      permissions: JSON.stringify(currentPerms),
    });
  };

  return (
    <>
      {/* Title */}
      <div className="flex items-center mb-6">
        <h1
          style={{
            fontFamily: "Pretendard",
            fontSize: "26px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "#0C0C0C",
          }}
        >
          접근 권한 관리
        </h1>
      </div>

      <div className="flex gap-6">
        {/* Left Card - Role Selection */}
        <div
          className="rounded-xl"
          style={{
            width: "444px",
            background: "#FFFFFF",
            boxShadow: "0px 0px 20px #DBE9F5",
          }}
        >
          {/* Card Header */}
          <div
            className="px-6 py-6"
            style={{
              borderBottom: "2px solid rgba(12, 12, 12, 0.1)",
            }}
          >
            <span
              style={{
                fontFamily: "Pretendard",
                fontSize: "20px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "#0C0C0C",
              }}
            >
              역할
            </span>
          </div>

          {/* Role Selection */}
          <div className="px-5 py-6">
            <label
              className="mb-2 block"
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
                fontWeight: 500,
                letterSpacing: "-0.01em",
                color: "#686A6E",
              }}
            >
              역할 선택
            </label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger
                className="w-full"
                style={{
                  height: "68px",
                  background: "#FDFDFD",
                  border: "2px solid rgba(12, 12, 12, 0.08)",
                  borderRadius: "8px",
                  fontFamily: "Pretendard",
                  fontSize: "16px",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "rgba(12, 12, 12, 0.9)",
                }}
                data-testid="select-role"
              >
                <SelectValue placeholder="접근 가능 범위를 역할별 파악을 선택하세요." />
              </SelectTrigger>
              <SelectContent>
                {VALID_ROLES.map((role) => (
                  <SelectItem 
                    key={role} 
                    value={role}
                    data-testid={`select-role-option-${role}`}
                  >
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right Card - Permissions */}
        <div
          className="flex-1 rounded-xl"
          style={{
            background: "#FFFFFF",
            boxShadow: "0px 0px 20px #DBE9F5",
          }}
        >
          {/* Header */}
          <div
            className="px-6 py-6 flex items-center justify-between"
            style={{
              borderBottom: "2px solid rgba(12, 12, 12, 0.1)",
            }}
          >
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  color: "#686A6E",
                }}
                data-testid="text-selected-role-label"
              >
                선택된 역할
              </span>
              <span
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "20px",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "#0C0C0C",
                }}
                data-testid="text-selected-role-value"
              >
                {selectedRole}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAllowAll}
                className="px-6 py-3 rounded-lg"
                style={{
                  background: "linear-gradient(126.03deg, #FFD5A8 0%, #E0A4FF 100%)",
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "#0C0C0C",
                }}
                data-testid="button-allow-all"
              >
                전체 허용
              </button>
              <button
                onClick={handleSave}
                disabled={savePermissionMutation.isPending || isLoading}
                className="px-6 py-3 rounded-lg flex items-center gap-2"
                style={{
                  background: (savePermissionMutation.isPending || isLoading) ? "#CCCCCC" : "#008FED",
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "#FFFFFF",
                }}
                data-testid="button-save"
              >
                <Save className="w-4 h-4" />
                {savePermissionMutation.isPending ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>

          {/* Permissions List */}
          <div className="px-6 py-6 flex flex-col gap-4">
            {categories.map((category) => {
              const items = PERMISSION_CATEGORIES[category];
              const hasItems = items.length > 0;
              const isExpanded = expandedCategories.has(category);
              const isChecked = isCategoryChecked(category);

              return (
                <div
                  key={category}
                  className="rounded-lg"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid rgba(12, 12, 12, 0.08)",
                  }}
                >
                  {/* Category Header */}
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          toggleCategoryPermission(category, checked as boolean)
                        }
                        style={{
                          width: "20px",
                          height: "20px",
                        }}
                        data-testid={`checkbox-${category}`}
                      />
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          fontWeight: 500,
                          letterSpacing: "-0.02em",
                          color: "#0C0C0C",
                        }}
                        data-testid={`text-category-${category}`}
                      >
                        {category}
                      </span>
                    </div>
                    {hasItems && (
                      <button
                        onClick={() => toggleCategory(category)}
                        className="p-1"
                        data-testid={`button-toggle-${category}`}
                      >
                        <Minus className="w-5 h-5 text-[#0C0C0C]" />
                      </button>
                    )}
                  </div>

                  {/* Sub Items */}
                  {hasItems && isExpanded && (
                    <div
                      className="px-6 pb-4 pt-2 flex flex-wrap gap-6"
                      style={{
                        borderTop: "1px solid rgba(12, 12, 12, 0.08)",
                      }}
                    >
                      {items.map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-2"
                          style={{ minWidth: "150px" }}
                        >
                          <Checkbox
                            checked={isItemChecked(category, item)}
                            onCheckedChange={(checked) =>
                              toggleItemPermission(
                                category,
                                item,
                                checked as boolean
                              )
                            }
                            style={{
                              width: "18px",
                              height: "18px",
                            }}
                            data-testid={`checkbox-${category}-${item}`}
                          />
                          <span
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "14px",
                              fontWeight: 500,
                              letterSpacing: "-0.01em",
                              color: "#0C0C0C",
                            }}
                            data-testid={`text-item-${category}-${item}`}
                          >
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
