import { useLocation } from "wouter";

const menuItems = [
  {
    title: "통계",
    url: "/statistics",
    testId: "submenu-statistics",
  },
  {
    title: "정산 조회",
    url: "/settlements",
    testId: "submenu-settlement-inquiry",
  },
];

export function AppSidebarStatistics() {
  const [location, setLocation] = useLocation();

  return (
    <div
      className="flex flex-col"
      style={{
        width: "260px",
        background: "rgba(255, 255, 255, 0.06)",
        borderRight: "1px solid rgba(0, 143, 237, 0.2)",
      }}
    >
      {/* Section Header */}
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
          통계 및 정산
        </span>
      </div>

      {/* Menu Items */}
      <div className="flex flex-col px-3 gap-2">
        {menuItems.map((item) => (
          <button
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
