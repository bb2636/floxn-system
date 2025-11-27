import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Search, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StatisticsOverview() {
  const [searchQuery, setSearchQuery] = useState("");
  const [transactionNumberChecked, setTransactionNumberChecked] = useState(false);
  const [receiptChecked, setReceiptChecked] = useState(false);
  const [exemplaryChecked, setExemplaryChecked] = useState(false);
  const [autoNoticeChecked, setAutoNoticeChecked] = useState(false);
  const [outputDateRange, setOutputDateRange] = useState("전체");
  const [businessPlace, setBusinessPlace] = useState("전체");

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
        <div className="flex items-center gap-6 flex-wrap">
          {/* 거래번호 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={transactionNumberChecked}
              onCheckedChange={(checked) => setTransactionNumberChecked(checked === true)}
              style={{
                width: "18px",
                height: "18px",
              }}
              data-testid="checkbox-transaction-number"
            />
            <span
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
                fontWeight: 500,
                color: transactionNumberChecked ? "#008FED" : "rgba(12, 12, 12, 0.7)",
              }}
            >
              거래번호
            </span>
          </label>

          {/* 수령 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={receiptChecked}
              onCheckedChange={(checked) => setReceiptChecked(checked === true)}
              style={{
                width: "18px",
                height: "18px",
              }}
              data-testid="checkbox-receipt"
            />
            <span
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
                fontWeight: 500,
                color: receiptChecked ? "#008FED" : "rgba(12, 12, 12, 0.7)",
              }}
            >
              수령
            </span>
          </label>

          {/* 모범 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={exemplaryChecked}
              onCheckedChange={(checked) => setExemplaryChecked(checked === true)}
              style={{
                width: "18px",
                height: "18px",
              }}
              data-testid="checkbox-exemplary"
            />
            <span
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
                fontWeight: 500,
                color: exemplaryChecked ? "#008FED" : "rgba(12, 12, 12, 0.7)",
              }}
            >
              모범
            </span>
          </label>

          {/* 자동공고 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={autoNoticeChecked}
              onCheckedChange={(checked) => setAutoNoticeChecked(checked === true)}
              style={{
                width: "18px",
                height: "18px",
              }}
              data-testid="checkbox-auto-notice"
            />
            <span
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
                fontWeight: 500,
                color: autoNoticeChecked ? "#008FED" : "rgba(12, 12, 12, 0.7)",
              }}
            >
              자동공고
            </span>
          </label>

          {/* 출력일 범위 */}
          <Select value={outputDateRange} onValueChange={setOutputDateRange}>
            <SelectTrigger
              style={{
                width: "160px",
                height: "40px",
                background: "#F5F5F5",
                border: "1px solid rgba(12, 12, 12, 0.1)",
                borderRadius: "8px",
                fontFamily: "Pretendard",
                fontSize: "14px",
              }}
              data-testid="select-output-date-range"
            >
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} style={{ color: "rgba(12, 12, 12, 0.5)" }} />
                <SelectValue placeholder="출력일 범위" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="전체">전체</SelectItem>
              <SelectItem value="오늘">오늘</SelectItem>
              <SelectItem value="이번주">이번주</SelectItem>
              <SelectItem value="이번달">이번달</SelectItem>
              <SelectItem value="직접입력">직접입력</SelectItem>
            </SelectContent>
          </Select>

          {/* 사업장 */}
          <Select value={businessPlace} onValueChange={setBusinessPlace}>
            <SelectTrigger
              style={{
                width: "160px",
                height: "40px",
                background: "#F5F5F5",
                border: "1px solid rgba(12, 12, 12, 0.1)",
                borderRadius: "8px",
                fontFamily: "Pretendard",
                fontSize: "14px",
              }}
              data-testid="select-business-place"
            >
              <SelectValue placeholder="사업장" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="전체">전체</SelectItem>
              <SelectItem value="본사">본사</SelectItem>
              <SelectItem value="지점1">지점1</SelectItem>
              <SelectItem value="지점2">지점2</SelectItem>
            </SelectContent>
          </Select>
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
