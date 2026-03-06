import { useLocation } from "wouter";
import { usePermissions } from "@/hooks/use-permissions";

const menuItems = [
  {
    title: "현장입력",
    url: "/field-survey/management",
    testId: "submenu-field-management",
    permissionItem: "현장입력",
  },
  {
    title: "도면작성",
    url: "/field-survey/drawing",
    testId: "submenu-drawing",
    permissionItem: "도면작성",
  },
  {
    title: "증빙자료 등록",
    url: "/field-survey/documents",
    testId: "submenu-documents",
    permissionItem: "증빙자료 업로드",
  },
  {
    title: "견적서 작성",
    url: "/field-survey/estimate",
    testId: "submenu-estimate",
    permissionItem: "견적서 작성",
  },
  {
    title: "현장출동보고서",
    url: "/field-survey/report",
    testId: "submenu-report",
    permissionItem: "보고서 작성",
  },
];

export function AppSidebarFieldSurvey() {
  const [location, setLocation] = useLocation();
  const { hasItem, hasCategory, isAdmin, isLoading } = usePermissions();

  const visibleItems = menuItems.filter((item) => {
    if (isLoading) return false;
    if (isAdmin) {
      return hasItem("현장조사", item.permissionItem);
    }
    if (!hasCategory("현장조사")) return false;
    return hasItem("현장조사", item.permissionItem);
  });

  return (
    <div
      className="flex flex-col"
      style={{
        width: "260px",
        background: "rgba(255, 255, 255, 0.06)",
        borderRight: "1px solid rgba(0, 143, 237, 0.2)",
      }}
    >
      <div className="px-8 py-4">
        <span
          style={{
            fontFamily: "Pretendard",
            fontSize: "15px",
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: "rgba(12, 12, 12, 0.5)",
          }}
        >
          현장조사
        </span>
      </div>

      <div className="flex flex-col px-3 gap-2">
        {visibleItems.map((item) => (
          <button
            type="button"
            key={item.title}
            onClick={() => setLocation(item.url)}
            className="flex items-center px-5 py-3 rounded-lg transition-colors"
            style={{
              background:
                location === item.url
                  ? "rgba(12, 12, 12, 0.08)"
                  : "transparent",
              fontFamily: "Pretendard",
              fontSize: "16px",
              fontWeight: location === item.url ? 700 : 500,
              letterSpacing: "-0.02em",
              color:
                location === item.url
                  ? "#008FED"
                  : "rgba(12, 12, 12, 0.8)",
            }}
            data-testid={item.testId}
          >
            {item.title}
          </button>
        ))}
      </div>
    </div>
  );
}
