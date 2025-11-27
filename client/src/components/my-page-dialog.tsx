import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { X, Pencil } from "lucide-react";
import { useLocation } from "wouter";

interface MyPageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

type TabType = "profile" | "notices" | "inquiries" | "favorites";

export function MyPageDialog({ open, onOpenChange, user }: MyPageDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<User>) =>
      apiRequest("PATCH", `/api/users/${user.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "저장 완료",
        description: "프로필이 업데이트되었습니다.",
      });
      setIsEditing(null);
    },
    onError: () => {
      toast({
        title: "저장 실패",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/logout", {}),
    onSuccess: () => {
      onOpenChange(false);
      setLocation("/");
    },
  });

  const handleEdit = (field: string, currentValue: string) => {
    setIsEditing(field);
    setEditValue(currentValue || "");
  };

  const handleSave = (field: string) => {
    updateProfileMutation.mutate({ [field]: editValue });
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === "Enter") {
      handleSave(field);
    } else if (e.key === "Escape") {
      setIsEditing(null);
    }
  };

  const menuItems = [
    { id: "profile" as TabType, label: "내 프로필 설정" },
    { id: "notices" as TabType, label: "공지사항" },
    { id: "inquiries" as TabType, label: "1:1문의" },
    { id: "favorites" as TabType, label: "즐겨찾기 목록" },
  ];

  const getInitials = (name: string) => {
    return name ? name.charAt(0) : "U";
  };

  const renderEditableField = (
    label: string,
    field: keyof User,
    value: string | null | undefined
  ) => {
    const displayValue = value || "";
    const isCurrentlyEditing = isEditing === field;

    return (
      <div className="py-4 border-b border-gray-100">
        <div className="text-sm text-gray-500 mb-1">{label}</div>
        <div className="flex items-center justify-between">
          {isCurrentlyEditing ? (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, field)}
              onBlur={() => handleSave(field)}
              autoFocus
              className="flex-1 mr-2"
              data-testid={`input-edit-${field}`}
            />
          ) : (
            <span className="text-base text-gray-900">{displayValue || "-"}</span>
          )}
          {!isCurrentlyEditing && field !== "username" && field !== "role" && (
            <button
              onClick={() => handleEdit(field, displayValue)}
              className="p-1 hover:bg-gray-100 rounded"
              data-testid={`button-edit-${field}`}
            >
              <Pencil className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderReadOnlyField = (label: string, value: string | null | undefined, badge?: string) => {
    return (
      <div className="py-4 border-b border-gray-100">
        <div className="text-sm text-gray-500 mb-1">{label}</div>
        <div className="flex items-center gap-2">
          <span className="text-base text-gray-900">{value || "-"}</span>
          {badge && (
            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
              {badge}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-3xl p-0 gap-0 overflow-hidden"
        style={{ 
          borderRadius: '16px',
          maxHeight: '90vh',
        }}
      >
        <div className="flex h-full min-h-[600px]">
          <div 
            className="w-48 flex-shrink-0 p-6"
            style={{ 
              background: '#F8F9FA',
              borderRight: '1px solid #E9ECEF',
            }}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-6">마이페이지</h2>
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeTab === item.id
                      ? "bg-[#008FED]/10 text-[#008FED] font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                  data-testid={`tab-${item.id}`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 p-8 overflow-y-auto relative">
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg"
              data-testid="button-close-mypage"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            {activeTab === "profile" && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">내 프로필 설정</h3>
                <p className="text-sm text-gray-500 mb-6">
                  최신 연락수단을 유지해주세요. 변경사항은 즉시 저장됩니다.
                </p>

                <div 
                  className="w-24 h-24 rounded-lg flex items-center justify-center mb-6 relative"
                  style={{ background: 'rgba(0, 143, 237, 0.15)' }}
                >
                  <span className="text-3xl font-bold text-[#008FED]">
                    {getInitials(user.name)}
                  </span>
                  <button 
                    className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center"
                    data-testid="button-edit-avatar"
                  >
                    <Pencil className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>

                {renderReadOnlyField("성함", user.name)}
                {renderReadOnlyField("아이디", user.username)}
                {renderEditableField("연락처", "phone", user.phone)}
                {renderEditableField("이메일", "email", user.email)}
                {renderReadOnlyField("회사명", user.company, user.role)}
                {renderReadOnlyField("부서", user.department)}
                {renderEditableField("회사 연락처", "office", user.office)}

                <div className="mt-8 text-center">
                  <button
                    onClick={() => logoutMutation.mutate()}
                    className="text-sm text-gray-500 underline hover:text-gray-700"
                    data-testid="button-logout-mypage"
                  >
                    로그아웃
                  </button>
                </div>
              </div>
            )}

            {activeTab === "notices" && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-6">공지사항</h3>
                <div className="text-center py-12 text-gray-500">
                  등록된 공지사항이 없습니다.
                </div>
              </div>
            )}

            {activeTab === "inquiries" && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-6">1:1 문의</h3>
                <div className="text-center py-12 text-gray-500">
                  문의 내역이 없습니다.
                </div>
              </div>
            )}

            {activeTab === "favorites" && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-6">즐겨찾기 목록</h3>
                <div className="text-center py-12 text-gray-500">
                  즐겨찾기한 항목이 없습니다.
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
