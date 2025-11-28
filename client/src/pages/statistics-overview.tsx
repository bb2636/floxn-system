import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Search, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const headerStyle = {
  padding: "17.5px 8px",
  fontFamily: "Pretendard",
  fontSize: "15px",
  fontWeight: 600,
  lineHeight: "128%",
  letterSpacing: "-0.02em",
  color: "rgba(12, 12, 12, 0.6)",
  borderRight: "1px solid rgba(12, 12, 12, 0.06)",
  borderBottom: "1px solid rgba(12, 12, 12, 0.06)",
  textAlign: "center" as const,
  background: "rgba(12, 12, 12, 0.04)",
};

const cellStyle = {
  padding: "17.5px 8px",
  fontFamily: "Pretendard",
  fontSize: "15px",
  lineHeight: "128%",
  letterSpacing: "-0.02em",
  color: "rgba(12, 12, 12, 0.6)",
  borderRight: "1px solid rgba(12, 12, 12, 0.06)",
  borderBottom: "1px solid rgba(12, 12, 12, 0.06)",
  textAlign: "center" as const,
};

export default function StatisticsOverview() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("수임");

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  if (!user) {
    return null;
  }

  const tableRows = Array(5).fill(null);

  return (
    <div className="p-8">
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

      <div className="mb-6">
        <div className="flex items-center gap-4">
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

          <div
            style={{
              width: "1px",
              height: "24px",
              background: "rgba(12, 12, 12, 0.1)",
            }}
          />

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

      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          border: "1px solid rgba(12, 12, 12, 0.06)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1800px" }}>
            <thead>
              {/* 1행: 최상위 헤더 */}
              <tr>
                <th rowSpan={3} style={{ ...headerStyle, width: "100px", verticalAlign: "middle" }}>
                  구분값
                </th>
                <th colSpan={3} style={headerStyle}>
                  이월
                </th>
                <th colSpan={3} style={headerStyle}>
                  수임
                </th>
                <th colSpan={12} style={headerStyle}>
                  종결
                </th>
                <th rowSpan={3} style={{ ...headerStyle, width: "80px", verticalAlign: "middle" }}>
                  처리율
                </th>
                <th colSpan={3} style={headerStyle}>
                  미결
                </th>
              </tr>

              {/* 2행: 중간 헤더 */}
              <tr>
                {/* 이월 하위 */}
                <th rowSpan={2} style={headerStyle}>직접복구</th>
                <th rowSpan={2} style={headerStyle}>선견적요청</th>
                <th rowSpan={2} style={headerStyle}>계</th>
                
                {/* 수임 하위 */}
                <th rowSpan={2} style={headerStyle}>직접복구</th>
                <th rowSpan={2} style={headerStyle}>선견적요청</th>
                <th rowSpan={2} style={headerStyle}>계</th>
                
                {/* 종결 하위 - 직접복구 */}
                <th colSpan={4} style={headerStyle}>직접복구</th>
                
                {/* 종결 하위 - 선견적요청 */}
                <th colSpan={4} style={headerStyle}>선견적요청</th>
                
                {/* 종결 하위 - 합계 */}
                <th colSpan={4} style={headerStyle}>합계</th>
                
                {/* 미결 하위 */}
                <th rowSpan={2} style={headerStyle}>직접복구</th>
                <th rowSpan={2} style={headerStyle}>선견적요청</th>
                <th rowSpan={2} style={headerStyle}>계</th>
              </tr>

              {/* 3행: 최하위 헤더 (종결 세부) */}
              <tr>
                {/* 종결 > 직접복구 하위 */}
                <th style={headerStyle}>직접복구</th>
                <th style={headerStyle}>선견적요청</th>
                <th style={headerStyle}>접수취소</th>
                <th style={headerStyle}>소계</th>
                
                {/* 종결 > 선견적요청 하위 */}
                <th style={headerStyle}>직접복구</th>
                <th style={headerStyle}>선견적요청</th>
                <th style={headerStyle}>접수취소</th>
                <th style={headerStyle}>소계</th>
                
                {/* 종결 > 합계 하위 */}
                <th style={headerStyle}>직접복구</th>
                <th style={headerStyle}>선견적요청</th>
                <th style={headerStyle}>접수취소</th>
                <th style={headerStyle}>소계</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((_, index) => (
                <tr key={index}>
                  {/* 구분값 */}
                  <td style={cellStyle}>-</td>
                  
                  {/* 이월 (3) */}
                  <td style={cellStyle}>-</td>
                  <td style={cellStyle}>-</td>
                  <td style={cellStyle}>-</td>
                  
                  {/* 수임 (3) */}
                  <td style={cellStyle}>-</td>
                  <td style={cellStyle}>-</td>
                  <td style={cellStyle}>-</td>
                  
                  {/* 종결 > 직접복구 (4) */}
                  <td style={cellStyle}>-</td>
                  <td style={cellStyle}>-</td>
                  <td style={cellStyle}>-</td>
                  <td style={cellStyle}>-</td>
                  
                  {/* 종결 > 선견적요청 (4) */}
                  <td style={cellStyle}>-</td>
                  <td style={cellStyle}>-</td>
                  <td style={cellStyle}>-</td>
                  <td style={cellStyle}>-</td>
                  
                  {/* 종결 > 합계 (4) */}
                  <td style={cellStyle}>-</td>
                  <td style={cellStyle}>-</td>
                  <td style={cellStyle}>-</td>
                  <td style={cellStyle}>-</td>
                  
                  {/* 처리율 */}
                  <td style={cellStyle}>-</td>
                  
                  {/* 미결 (3) */}
                  <td style={cellStyle}>-</td>
                  <td style={cellStyle}>-</td>
                  <td style={cellStyle}>-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
