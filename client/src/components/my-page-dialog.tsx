import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, UserFavorite, Notice, Inquiry } from "@shared/schema";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { X, Pencil, Star, Home, CalendarPlus, AlertCircle, Building2, TrendingUp, Settings, FileText, Plus, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";

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
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [inquiryTitle, setInquiryTitle] = useState("");
  const [inquiryContent, setInquiryContent] = useState("");
  const [expandedInquiry, setExpandedInquiry] = useState<string | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch favorites
  const { data: favorites = [], isLoading: favoritesLoading } = useQuery<UserFavorite[]>({
    queryKey: ["/api/favorites"],
    enabled: open,
  });

  // Fetch notices
  const { data: notices = [], isLoading: noticesLoading } = useQuery<Notice[]>({
    queryKey: ["/api/notices"],
    enabled: open,
  });

  // Fetch inquiries
  const { data: inquiries = [], isLoading: inquiriesLoading } = useQuery<Inquiry[]>({
    queryKey: ["/api/inquiries"],
    enabled: open,
  });

  // Create inquiry mutation
  const createInquiryMutation = useMutation({
    mutationFn: (data: { title: string; content: string }) =>
      apiRequest("POST", "/api/inquiries", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/inquiries"] });
      toast({
        title: "문의 등록 완료",
        description: "문의가 성공적으로 등록되었습니다.",
      });
      setShowInquiryForm(false);
      setInquiryTitle("");
      setInquiryContent("");
    },
    onError: () => {
      toast({
        title: "문의 등록 실패",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  // Remove favorite mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: (menuName: string) => apiRequest("DELETE", `/api/favorites/${encodeURIComponent(menuName)}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "즐겨찾기 해제",
        description: "즐겨찾기에서 제거되었습니다.",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<User>) =>
      apiRequest("PATCH", `/api/users/${user.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/user"] });
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
                <h3 className="text-xl font-semibold text-gray-900 mb-2">공지사항</h3>
                <p className="text-sm text-gray-500 mb-6">
                  보안·개인정보·권한 규정을 준수하세요. 위반 시 계정 제한이 발생할 수 있습니다.
                </p>
                {noticesLoading ? (
                  <div className="text-center py-12 text-gray-500">로딩 중...</div>
                ) : notices.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    등록된 공지사항이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notices.map((notice) => {
                      const formatDate = (date: Date | string) => {
                        try {
                          return format(new Date(date), "yyyy-MM-dd");
                        } catch {
                          return "-";
                        }
                      };

                      const contentLines = notice.content.split("\n").filter(line => line.trim());

                      return (
                        <div
                          key={notice.id}
                          className="p-4 rounded-xl bg-gray-50"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-gray-500" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-1">{notice.title}</h4>
                              <p className="text-sm text-gray-400 mb-3">{formatDate(notice.createdAt)}</p>
                              <ul className="space-y-1">
                                {contentLines.map((line, idx) => (
                                  <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                    <span className="text-gray-400 mt-1">•</span>
                                    <span>{line}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "inquiries" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">1:1 문의</h3>
                  {!showInquiryForm && (
                    <Button
                      onClick={() => setShowInquiryForm(true)}
                      size="sm"
                      className="bg-[#008FED] hover:bg-[#0070BE]"
                      data-testid="button-new-inquiry"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      문의하기
                    </Button>
                  )}
                </div>

                {showInquiryForm ? (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-xl mb-6">
                    <h4 className="font-medium text-gray-900">새 문의 작성</h4>
                    <Input
                      placeholder="문의 제목을 입력하세요"
                      value={inquiryTitle}
                      onChange={(e) => setInquiryTitle(e.target.value)}
                      data-testid="input-inquiry-title"
                    />
                    <Textarea
                      placeholder="문의 내용을 입력하세요"
                      value={inquiryContent}
                      onChange={(e) => setInquiryContent(e.target.value)}
                      rows={5}
                      data-testid="input-inquiry-content"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowInquiryForm(false);
                          setInquiryTitle("");
                          setInquiryContent("");
                        }}
                        data-testid="button-cancel-inquiry"
                      >
                        취소
                      </Button>
                      <Button
                        onClick={() => {
                          if (inquiryTitle.trim() && inquiryContent.trim()) {
                            createInquiryMutation.mutate({
                              title: inquiryTitle,
                              content: inquiryContent,
                            });
                          }
                        }}
                        disabled={!inquiryTitle.trim() || !inquiryContent.trim() || createInquiryMutation.isPending}
                        className="bg-[#008FED] hover:bg-[#0070BE]"
                        data-testid="button-submit-inquiry"
                      >
                        {createInquiryMutation.isPending ? "등록 중..." : "등록"}
                      </Button>
                    </div>
                  </div>
                ) : null}

                {inquiriesLoading ? (
                  <div className="text-center py-12 text-gray-500">로딩 중...</div>
                ) : inquiries.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    문의 내역이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inquiries.map((inquiry) => {
                      const formatDate = (date: Date | string) => {
                        try {
                          return format(new Date(date), "yyyy-MM-dd HH:mm");
                        } catch {
                          return "-";
                        }
                      };

                      const isExpanded = expandedInquiry === inquiry.id;

                      return (
                        <div
                          key={inquiry.id}
                          className="border border-gray-200 rounded-xl overflow-hidden"
                        >
                          <button
                            onClick={() => setExpandedInquiry(isExpanded ? null : inquiry.id)}
                            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            data-testid={`inquiry-item-${inquiry.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                inquiry.status === "완료" ? "bg-green-100" : "bg-orange-100"
                              }`}>
                                <MessageCircle className={`w-5 h-5 ${
                                  inquiry.status === "완료" ? "text-green-600" : "text-orange-600"
                                }`} />
                              </div>
                              <div className="text-left">
                                <h4 className="font-medium text-gray-900">{inquiry.title}</h4>
                                <p className="text-sm text-gray-400">{formatDate(inquiry.createdAt)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                inquiry.status === "완료" 
                                  ? "bg-green-100 text-green-700" 
                                  : "bg-orange-100 text-orange-700"
                              }`}>
                                {inquiry.status === "완료" ? "답변완료" : "처리중"}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="px-4 pb-4 border-t border-gray-100">
                              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">{inquiry.content}</p>
                              </div>
                              
                              {inquiry.response && (
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-[#008FED]">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm font-medium text-[#008FED]">관리자 답변</span>
                                    {inquiry.respondedAt && (
                                      <span className="text-xs text-gray-400">
                                        {formatDate(inquiry.respondedAt)}
                                      </span>
                                    )}
                                  </div>
                                  {inquiry.responseTitle && (
                                    <p className="font-medium text-gray-900 mb-1">{inquiry.responseTitle}</p>
                                  )}
                                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{inquiry.response}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "favorites" && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-6">즐겨찾기 목록</h3>
                {favoritesLoading ? (
                  <div className="text-center py-12 text-gray-500">로딩 중...</div>
                ) : favorites.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    즐겨찾기한 항목이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {favorites.map((fav) => {
                      const getMenuIcon = (menuName: string) => {
                        switch (menuName) {
                          case "홈": return <Home className="w-4 h-4" />;
                          case "접수하기": return <CalendarPlus className="w-4 h-4" />;
                          case "현장조사": return <AlertCircle className="w-4 h-4" />;
                          case "종합진행관리": return <Building2 className="w-4 h-4" />;
                          case "통계 및 정산": return <TrendingUp className="w-4 h-4" />;
                          case "관리자 설정": return <Settings className="w-4 h-4" />;
                          default: return <Star className="w-4 h-4" />;
                        }
                      };

                      const handleClick = () => {
                        onOpenChange(false);
                        switch (fav.menuName) {
                          case "홈": setLocation("/dashboard"); break;
                          case "접수하기": setLocation("/intake"); break;
                          case "현장조사": setLocation("/field-survey/management"); break;
                          case "종합진행관리": setLocation("/comprehensive-progress"); break;
                          case "통계 및 정산": setLocation("/statistics"); break;
                          case "관리자 설정": setLocation("/admin-settings"); break;
                        }
                      };

                      return (
                        <div
                          key={fav.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <button
                            onClick={handleClick}
                            className="flex items-center gap-3 flex-1"
                            data-testid={`favorite-item-${fav.menuName}`}
                          >
                            <div className="w-8 h-8 rounded-lg bg-[#008FED]/10 flex items-center justify-center text-[#008FED]">
                              {getMenuIcon(fav.menuName)}
                            </div>
                            <span className="text-sm font-medium text-gray-900">{fav.menuName}</span>
                          </button>
                          <button
                            onClick={() => removeFavoriteMutation.mutate(fav.menuName)}
                            className="p-1.5 hover:bg-gray-100 rounded"
                            data-testid={`remove-favorite-${fav.menuName}`}
                          >
                            <X className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
