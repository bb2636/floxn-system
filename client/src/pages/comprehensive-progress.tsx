import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User, CaseWithLatestProgress } from "@shared/schema";
import { Search, Cloud } from "lucide-react";
import logoIcon from "@assets/Frame 2_1762217940686.png";

export default function ComprehensiveProgress() {
  const [activeMenu, setActiveMenu] = useState("종합진행관리");
  const [activeTab, setActiveTab] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: cases, isLoading } = useQuery<CaseWithLatestProgress[]>({
    queryKey: ["/api/cases"],
  });

  const menuItems = [
    { name: "홈" },
    { name: "접수하기" },
    { name: "진행상황" },
    { name: "현장조사" },
    { name: "종합진행관리" },
    { name: "통계 및 정산" },
    { name: "관리자 설정" },
  ];

  const tabs = [
    { name: "전체", key: "all" },
    { name: "협력사 미배정", key: "unassigned" },
    { name: "심사대기", key: "pending" },
    { name: "반려", key: "rejected" },
    { name: "2차 심사대기", key: "pending2" },
    { name: "승인", key: "approved" },
  ];

  // 탭 필터링
  const filteredByTab = (cases || []).filter((caseItem) => {
    if (activeTab === "전체") return true;
    if (activeTab === "협력사 미배정") return !caseItem.assignedPartner;
    if (activeTab === "심사대기") return caseItem.status === "심사대기";
    if (activeTab === "반려") return caseItem.status === "반려";
    if (activeTab === "2차 심사대기") return caseItem.status === "2차 심사대기";
    if (activeTab === "승인") return caseItem.status === "승인";
    return true;
  });

  // 검색 필터링
  const filteredData = filteredByTab.filter((caseItem) => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    
    if (normalizedQuery === "") {
      return true;
    }

    const insuranceCompany = (caseItem.insuranceCompany || "").toLowerCase();
    const insuranceAccidentNo = (caseItem.insuranceAccidentNo || "").toLowerCase();
    const caseNumber = (caseItem.caseNumber || "").toLowerCase();
    const clientName = (caseItem.clientName || "").toLowerCase();
    const assignedPartnerManager = (caseItem.assignedPartnerManager || "").toLowerCase();
    
    return (
      insuranceCompany.includes(normalizedQuery) ||
      insuranceAccidentNo.includes(normalizedQuery) ||
      caseNumber.includes(normalizedQuery) ||
      clientName.includes(normalizedQuery) ||
      assignedPartnerManager.includes(normalizedQuery)
    );
  });

  const totalCount = filteredData.length;

  // 당일차 계산 (접수일부터 오늘까지)
  const calculateDays = (createdAt: string | null) => {
    if (!createdAt) return 0;
    const created = new Date(createdAt);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // 날짜 포맷팅 (YYYY-MM-DD)
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  if (userLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(0deg, #E7EDFE, #E7EDFE)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background blur effects */}
      <div
        style={{
          position: "absolute",
          width: "1095px",
          height: "776.83px",
          left: "97.61px",
          bottom: "1169.19px",
          background: "rgba(254, 240, 230, 0.4)",
          filter: "blur(212px)",
          transform: "rotate(-35.25deg)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "1334.83px",
          height: "1322.98px",
          right: "0",
          bottom: "0",
          background: "rgba(234, 230, 254, 0.5)",
          filter: "blur(212px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "348px",
          height: "1322.98px",
          left: "0",
          bottom: "188.99px",
          background: "rgba(234, 230, 254, 0.5)",
          filter: "blur(212px)",
          pointerEvents: "none",
        }}
      />

      {/* Header (Desktop >= 1024px) */}
      <div className="hidden lg:block">
        <header
          style={{
            height: "89px",
            background: "#FFFFFF",
            boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 40px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "60px" }}>
            <img
              src={logoIcon}
              alt="FLOXN"
              style={{ height: "32px", cursor: "pointer" }}
              onClick={() => setLocation("/dashboard")}
              data-testid="logo"
            />
            
            <div className="flex items-center gap-6">
              {menuItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    setActiveMenu(item.name);
                    if (item.name === "홈") setLocation("/dashboard");
                    else if (item.name === "관리자 설정") setLocation("/admin-settings");
                    else if (item.name === "접수하기") setLocation("/intake");
                    else if (item.name === "진행상황") setLocation("/progress");
                    else if (item.name === "종합진행관리") setLocation("/comprehensive-progress");
                  }}
                  className="px-6 py-3 rounded-lg transition-colors"
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '18px',
                    fontWeight: activeMenu === item.name ? 600 : 500,
                    letterSpacing: '-0.02em',
                    color: activeMenu === item.name ? '#0C0C0C' : 'rgba(12, 12, 12, 0.5)',
                  }}
                  data-testid={`menu-${item.name}`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div
              className="flex items-center gap-3"
              style={{
                padding: "12px 20px",
                background: "#FDFDFD",
                border: "1px solid rgba(12, 12, 12, 0.08)",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #FEF0E6 0%, #EAE6FE 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Pretendard",
                  fontWeight: 600,
                  fontSize: "16px",
                  color: "#0C0C0C",
                }}
              >
                {user.name?.charAt(0) || "U"}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "Pretendard",
                    fontWeight: 600,
                    fontSize: "14px",
                    color: "#0C0C0C",
                  }}
                >
                  {user.name}
                </div>
                <div
                  style={{
                    fontFamily: "Pretendard",
                    fontWeight: 400,
                    fontSize: "12px",
                    color: "rgba(12, 12, 12, 0.6)",
                  }}
                >
                  {user.role}
                </div>
              </div>
            </div>
            <button
              onClick={() => setLocation("/")}
              style={{
                padding: "12px 24px",
                background: "#008FED",
                borderRadius: "8px",
                border: "none",
                fontFamily: "Pretendard",
                fontWeight: 600,
                fontSize: "14px",
                color: "#FFFFFF",
                cursor: "pointer",
              }}
              data-testid="button-logout"
            >
              로그아웃
            </button>
          </div>
        </header>
      </div>

      {/* Mobile Header (< 1024px) */}
      <div className="block lg:hidden">
        <header
          style={{
            height: "58px",
            background: "#FFFFFF",
            boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
          }}
        >
          <img
            src={logoIcon}
            alt="FLOXN"
            style={{ height: "24px", cursor: "pointer" }}
            onClick={() => setLocation("/dashboard")}
            data-testid="logo-mobile"
          />
          <button
            onClick={() => setLocation("/")}
            style={{
              padding: "8px 16px",
              background: "#008FED",
              borderRadius: "6px",
              border: "none",
              fontFamily: "Pretendard",
              fontWeight: 600,
              fontSize: "12px",
              color: "#FFFFFF",
              cursor: "pointer",
            }}
            data-testid="button-logout-mobile"
          >
            로그아웃
          </button>
        </header>
      </div>

      {/* Main Content */}
      <div
        style={{
          maxWidth: "1595px",
          margin: "0 auto",
          padding: "32px 20px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Page Title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "24px",
          }}
        >
          <h1
            style={{
              fontFamily: "Pretendard",
              fontWeight: 600,
              fontSize: "28px",
              lineHeight: "128%",
              letterSpacing: "-0.02em",
              color: "#0C0C0C",
            }}
          >
            종합진행관리
          </h1>
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#008FED",
            }}
          />
        </div>

        {/* Search Section */}
        <div
          style={{
            background: "#FFFFFF",
            boxShadow: "0px 0px 20px #DBE9F5",
            borderRadius: "12px",
            padding: "0 0 20px",
            marginBottom: "16px",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "24px",
              borderBottom: "2px solid rgba(12, 12, 12, 0.1)",
            }}
          >
            <h2
              style={{
                fontFamily: "Pretendard",
                fontWeight: 600,
                fontSize: "20px",
                lineHeight: "128%",
                letterSpacing: "-0.02em",
                color: "#0C0C0C",
              }}
            >
              검색
            </h2>
          </div>

          <div style={{ padding: "16px 20px 0" }}>
            {/* Tabs */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
                flexWrap: "wrap",
              }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.name}
                  onClick={() => setActiveTab(tab.name)}
                  style={{
                    padding: "12px 16px",
                    background:
                      activeTab === tab.name
                        ? "#008FED"
                        : "rgba(255, 255, 255, 0.04)",
                    boxShadow:
                      activeTab === tab.name
                        ? "2px 4px 30px #BDD1F0"
                        : "inset 0px -2px 4px rgba(0, 0, 0, 0.05), inset 0px 2px 4px rgba(0, 0, 0, 0.05)",
                    backdropFilter: activeTab !== tab.name ? "blur(7px)" : "none",
                    borderRadius: "6px",
                    border: "none",
                    fontFamily: "Pretendard",
                    fontWeight: activeTab === tab.name ? 600 : 500,
                    fontSize: "16px",
                    lineHeight: "128%",
                    letterSpacing: "-0.02em",
                    color:
                      activeTab === tab.name ? "#FDFDFD" : "rgba(12, 12, 12, 0.4)",
                    cursor: "pointer",
                  }}
                  data-testid={`tab-${tab.key}`}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "0 20px",
              }}
            >
              <div style={{ position: "relative", flex: 1 }}>
                <Search
                  className="absolute left-4 top-1/2 transform -translate-y-1/2"
                  style={{ width: "20px", height: "20px", color: "rgba(12, 12, 12, 0.4)" }}
                />
                <input
                  type="text"
                  placeholder="보험사 사고번호, 접수번호, 보험계약자, 당사 담당자 등으로 검색해주세요."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    height: "68px",
                    padding: "0 20px 0 52px",
                    background: "#FDFDFD",
                    border: "2px solid rgba(12, 12, 12, 0.08)",
                    borderRadius: "8px",
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 400,
                    letterSpacing: "-0.02em",
                    color: "#0C0C0C",
                  }}
                  data-testid="input-search"
                />
              </div>
              <button
                style={{
                  width: "120px",
                  height: "68px",
                  background: "#008FED",
                  borderRadius: "8px",
                  border: "none",
                  fontFamily: "Pretendard",
                  fontSize: "16px",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "#FFFFFF",
                  cursor: "pointer",
                }}
                data-testid="button-search"
              >
                검색
              </button>
            </div>
          </div>
        </div>

        {/* Count */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 4px", marginBottom: "16px" }}>
          <span
            style={{
              fontFamily: "Pretendard",
              fontWeight: 600,
              fontSize: "18px",
              lineHeight: "128%",
              letterSpacing: "-0.02em",
              color: "rgba(12, 12, 12, 0.8)",
            }}
          >
            전체건
          </span>
          <span
            style={{
              fontFamily: "Pretendard",
              fontWeight: 600,
              fontSize: "18px",
              lineHeight: "128%",
              letterSpacing: "-0.02em",
              color: "#008FED",
            }}
          >
            {totalCount}
          </span>
        </div>

        {/* Table */}
        <div
          style={{
            background: "#FFFFFF",
            boxShadow: "0px 0px 20px #DBE9F5",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          {/* Table Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "100px 120px 140px 140px 100px 100px 120px 80px 100px 200px 80px",
              padding: "16px 20px",
              background: "rgba(12, 12, 12, 0.04)",
              borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
              overflowX: "auto",
            }}
          >
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.6)" }}>
              날짜
            </div>
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.6)" }}>
              보험사
            </div>
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.6)" }}>
              보험사 사고번호
            </div>
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.6)" }}>
              접수번호
            </div>
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.6)" }}>
              계약자
            </div>
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.6)" }}>
              심사사
            </div>
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.6)" }}>
              당사 담당자
            </div>
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.6)" }}>
              당일차
            </div>
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.6)" }}>
              메모등록
            </div>
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.6)" }}>
              주요 진행사항
            </div>
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.6)" }}>
              담당
            </div>
          </div>

          {/* Table Body */}
          {filteredData.length === 0 ? (
            <div
              style={{
                padding: "80px 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "24px",
              }}
            >
              <Cloud
                style={{
                  width: "80px",
                  height: "80px",
                  color: "#008FED",
                  opacity: 0.3,
                }}
              />
              <div
                style={{
                  fontFamily: "Pretendard",
                  fontWeight: 500,
                  fontSize: "18px",
                  color: "rgba(12, 12, 12, 0.6)",
                }}
              >
                검색 결과가 없습니다.
              </div>
              <div
                style={{
                  padding: "20px 24px",
                  background: "rgba(12, 12, 12, 0.02)",
                  borderRadius: "8px",
                  display: "flex",
                  gap: "8px",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "rgba(12, 12, 12, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "Pretendard",
                    fontWeight: 600,
                    fontSize: "12px",
                    color: "rgba(12, 12, 12, 0.6)",
                    flexShrink: 0,
                  }}
                >
                  i
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontWeight: 600,
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.7)",
                      marginBottom: "8px",
                    }}
                  >
                    이렇게 검색해보세요
                  </div>
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                      fontFamily: "Pretendard",
                      fontWeight: 400,
                      fontSize: "13px",
                      color: "rgba(12, 12, 12, 0.6)",
                      lineHeight: "1.6",
                    }}
                  >
                    <li>• 검색어를 콤마(,)로 분리하면 다중검색이 가능합니다</li>
                    <li>• 보험사명, 사고번호, 접수번호, 계약자, 당사 담당자 등으로 검색해보세요.</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            filteredData.map((caseItem) => (
              <div
                key={caseItem.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "100px 120px 140px 140px 100px 100px 120px 80px 100px 200px 80px",
                  padding: "16px 20px",
                  borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                  overflowX: "auto",
                }}
                data-testid={`case-row-${caseItem.id}`}
              >
                <div style={{ fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>
                  {formatDate(caseItem.createdAt)}
                </div>
                <div style={{ fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>
                  {caseItem.insuranceCompany || "-"}
                </div>
                <div style={{ fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>
                  {caseItem.insuranceAccidentNo || "-"}
                </div>
                <div style={{ fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>
                  {caseItem.caseNumber || "-"}
                </div>
                <div style={{ fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>
                  {caseItem.clientName || "-"}
                </div>
                <div style={{ fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>
                  {caseItem.assessorId || "-"}
                </div>
                <div style={{ fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>
                  {caseItem.assignedPartnerManager || "-"}
                </div>
                <div style={{ fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>
                  {calculateDays(caseItem.createdAt)}일차
                </div>
                <div>
                  <button
                    style={{
                      padding: "4px 12px",
                      background: "rgba(12, 12, 12, 0.04)",
                      border: "1px solid rgba(12, 12, 12, 0.1)",
                      borderRadius: "4px",
                      fontFamily: "Pretendard",
                      fontSize: "12px",
                      color: "rgba(12, 12, 12, 0.6)",
                      cursor: "pointer",
                    }}
                    data-testid={`button-memo-${caseItem.id}`}
                  >
                    메모
                  </button>
                </div>
                <div
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    color: "rgba(12, 12, 12, 0.8)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {caseItem.latestProgress?.content || "-"}
                </div>
                <div>
                  <button
                    style={{
                      padding: "4px 12px",
                      background: "#008FED",
                      border: "none",
                      borderRadius: "4px",
                      fontFamily: "Pretendard",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#FFFFFF",
                      cursor: "pointer",
                    }}
                    data-testid={`button-assign-${caseItem.id}`}
                  >
                    담당
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
