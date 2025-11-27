import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Search, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function StatisticsOverview() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("수임");

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  if (!user) {
    return null;
  }

  // Mock data for table rows - will be replaced with real data later
  const tableRows = Array(15).fill(null);

  return (
    <div className="p-8">
      {/* Page title */}
      <div className="flex items-center gap-2 mb-6">
        <h1
          style={{
            fontFamily: "Pretendard",
            fontSize: "26px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "#0C0C0C",
          }}
        >
          통계
        </h1>
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "rgba(12, 12, 12, 0.2)",
          }}
        />
      </div>
      {/* Search Section */}
      <div className="mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2"
              size={20}
              style={{ color: "rgba(12, 12, 12, 0.4)" }}
            />
            <Input
              type="text"
              placeholder="검색어를 입력해주세요"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                height: "48px",
                paddingLeft: "48px",
                background: "#FAFAFA",
                border: "1px solid rgba(12, 12, 12, 0.1)",
                borderRadius: "8px",
                fontFamily: "Pretendard",
                fontSize: "14px",
              }}
              data-testid="input-search-statistics"
            />
          </div>
          <Button
            style={{
              height: "48px",
              padding: "0 32px",
              background: "#008FED",
              borderRadius: "8px",
              fontFamily: "Pretendard",
              fontSize: "14px",
              fontWeight: 600,
              color: "#FFFFFF",
            }}
            data-testid="button-search-statistics"
          >
            검색
          </Button>
        </div>
      </div>
      {/* Filter Section */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          {/* 기간추가 Button */}
          <Button
            variant="outline"
            style={{
              height: "40px",
              padding: "0 16px",
              background: "#FFFFFF",
              border: "1px solid rgba(12, 12, 12, 0.2)",
              borderRadius: "8px",
              fontFamily: "Pretendard",
              fontSize: "14px",
              fontWeight: 500,
              color: "rgba(12, 12, 12, 0.7)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            data-testid="button-add-period"
          >
            <CalendarIcon size={16} style={{ color: "rgba(12, 12, 12, 0.5)" }} />
            기간추가
          </Button>

          {/* Vertical Divider */}
          <div
            style={{
              width: "1px",
              height: "24px",
              background: "rgba(12, 12, 12, 0.1)",
            }}
          />

          {/* Tab Buttons */}
          <div className="flex items-center gap-2">
            {["수임", "미결", "직접복구", "출동비 청구", "사고확인"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  height: "40px",
                  padding: "0 20px",
                  background: "transparent",
                  border: "none",
                  borderRadius: "8px",
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: activeTab === tab ? "#008FED" : "rgba(12, 12, 12, 0.5)",
                  cursor: "pointer",
                  transition: "color 0.2s",
                }}
                data-testid={`tab-${tab}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Results label */}
      <div
        className="mb-4"
        style={{
          fontFamily: "Pretendard",
          fontSize: "14px",
          fontWeight: 500,
          color: "rgba(12, 12, 12, 0.6)",
        }}
      >
        총 0건의 통계
      </div>
      {/* Statistics Table */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          border: "1px solid rgba(12, 12, 12, 0.08)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(12, 12, 12, 0.03)" }}>
                <th
                  rowSpan={2}
                  style={{
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    verticalAlign: "middle",
                  }}
                >
                  구분
                </th>
                <th
                  colSpan={3}
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                  }}
                >이월
</th>
                <th
                  colSpan={3}
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                  }}
                >
                  수령
                </th>
                <th
                  colSpan={4}
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                  }}
                >
                  정산관련
                </th>
                <th
                  colSpan={3}
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                  }}
                >
                  출장
                </th>
              </tr>
              <tr style={{ background: "rgba(12, 12, 12, 0.03)" }}>
                {/* 여행 */}
                <th
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                  }}
                >직접복구</th>
                <th
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                  }}
                >
                  심리변호사
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                  }}
                >
                  계
                </th>
                {/* 수령 */}
                <th
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                  }}
                >직접복구</th>
                <th
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                  }}
                >
                  심리변호사
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                  }}
                >
                  계
                </th>
                {/* 정산관련 */}
                <th
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                  }}
                >
                  직접방문
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                  }}
                >
                  심리변호사
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                  }}
                >
                  중수수료
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                  }}
                >
                  소계
                </th>
                {/* 출장 */}
                <th
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                  }}
                >
                  직접방문
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                  }}
                >
                  심리변호사
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                  }}
                >
                  중수수료
                </th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((_, index) => (
                <tr
                  key={index}
                  style={{
                    borderBottom:
                      index < tableRows.length - 1
                        ? "1px solid rgba(12, 12, 12, 0.05)"
                        : "none",
                  }}
                >
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    -
                  </td>
                  {/* 여행 3개 */}
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    -
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    -
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    -
                  </td>
                  {/* 수령 3개 */}
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    -
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    -
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    -
                  </td>
                  {/* 정산관련 4개 */}
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    -
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    -
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    -
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    -
                  </td>
                  {/* 출장 3개 */}
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    -
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    -
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      textAlign: "center",
                    }}
                  >
                    -
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
