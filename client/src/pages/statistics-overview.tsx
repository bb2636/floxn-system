import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, CaseWithLatestProgress } from "@shared/schema";
import { Search, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type FilterTag = {
  id: string;
  label: string;
  category: string;
};

export default function StatisticsOverview() {
  const [searchQuery, setSearchQuery] = useState("");
  
  // 등록일자
  const [registrationDate, setRegistrationDate] = useState<string[]>(["전체"]);
  
  // 배정여부
  const [assignmentStatus, setAssignmentStatus] = useState<string[]>(["전체"]);
  
  // 공사유무
  const [constructionStatus, setConstructionStatus] = useState<string[]>(["전체"]);
  
  // 중복여부
  const [duplicateStatus, setDuplicateStatus] = useState<string[]>(["전체"]);
  
  // 필터추가
  const [insuranceCompany, setInsuranceCompany] = useState<string>("");
  const [assessor, setAssessor] = useState<string>("");
  const [investigator, setInvestigator] = useState<string>("");
  const [partner, setPartner] = useState<string>("");
  const [settlementManager, setSettlementManager] = useState<string>("");
  
  // 자료처리(반려) 기준
  const [rejectionCriteria, setRejectionCriteria] = useState<string>("전체");
  
  // 적용된 필터 태그
  const [filterTags, setFilterTags] = useState<FilterTag[]>([]);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: cases } = useQuery<CaseWithLatestProgress[]>({
    queryKey: ["/api/cases"],
  });

  if (!user) {
    return null;
  }

  const handleCheckboxChange = (
    category: string,
    value: string,
    currentState: string[],
    setState: (value: string[]) => void
  ) => {
    if (value === "전체") {
      setState(["전체"]);
    } else {
      const newState = currentState.filter(v => v !== "전체");
      if (newState.includes(value)) {
        const filtered = newState.filter(v => v !== value);
        setState(filtered.length === 0 ? ["전체"] : filtered);
      } else {
        setState([...newState, value]);
      }
    }
  };

  const removeFilterTag = (tagId: string) => {
    setFilterTags(filterTags.filter(tag => tag.id !== tagId));
  };

  const resetFilters = () => {
    setSearchQuery("");
    setRegistrationDate(["전체"]);
    setAssignmentStatus(["전체"]);
    setConstructionStatus(["전체"]);
    setDuplicateStatus(["전체"]);
    setInsuranceCompany("");
    setAssessor("");
    setInvestigator("");
    setPartner("");
    setSettlementManager("");
    setRejectionCriteria("전체");
    setFilterTags([]);
  };

  return (
    <div className="p-8">
      {/* Page title */}
      <div className="flex items-center gap-4 mb-9">
        <h1 className="text-[26px] font-semibold leading-[128%] tracking-[-0.02em] text-[#0C0C0C]">
          통계
        </h1>
      </div>

      {/* Search and filters card */}
      <div className="bg-white rounded-xl shadow-[0px_0px_20px_#DBE9F5] mb-6">
        {/* Card header */}
        <div className="flex items-center px-6 py-6 border-b-2 border-[rgba(12,12,12,0.1)]">
          <h2 className="text-xl font-semibold leading-[128%] tracking-[-0.02em] text-[#0C0C0C]">
            조회하기
          </h2>
        </div>

        {/* Card content */}
        <div className="flex flex-col gap-6 p-6">
          {/* 검색 */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[rgba(12,12,12,0.7)]">
              검색
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgba(12,12,12,0.4)]" />
                <Input
                  type="text"
                  placeholder="검색어를 직접 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12"
                  style={{
                    background: "#FAFAFA",
                    border: "1px solid rgba(12, 12, 12, 0.1)",
                    borderRadius: "8px",
                  }}
                  data-testid="input-search"
                />
              </div>
              <Button
                className="h-12 px-8"
                style={{
                  background: "#008FED",
                  borderRadius: "8px",
                  fontWeight: 600,
                }}
                data-testid="button-search"
              >
                검색
              </Button>
            </div>
          </div>

          {/* Filters Row 1 */}
          <div className="grid grid-cols-4 gap-6">
            {/* 등록일자 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[rgba(12,12,12,0.7)]">
                등록일자
              </label>
              <div className="flex gap-3">
                {["전체", "6개월", "올해"].map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={registrationDate.includes(option)}
                      onCheckedChange={() =>
                        handleCheckboxChange("등록일자", option, registrationDate, setRegistrationDate)
                      }
                      data-testid={`checkbox-registration-${option}`}
                    />
                    <span className="text-sm text-[rgba(12,12,12,0.8)]">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 배정여부 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[rgba(12,12,12,0.7)]">
                배정여부
              </label>
              <div className="flex gap-3">
                {["전체", "배정", "미배정"].map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={assignmentStatus.includes(option)}
                      onCheckedChange={() =>
                        handleCheckboxChange("배정여부", option, assignmentStatus, setAssignmentStatus)
                      }
                      data-testid={`checkbox-assignment-${option}`}
                    />
                    <span className="text-sm text-[rgba(12,12,12,0.8)]">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 공사유무 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[rgba(12,12,12,0.7)]">
                공사유무
              </label>
              <div className="flex gap-3">
                {["전체", "수리", "보수금지", "공사", "무공사"].map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={constructionStatus.includes(option)}
                      onCheckedChange={() =>
                        handleCheckboxChange("공사유무", option, constructionStatus, setConstructionStatus)
                      }
                      data-testid={`checkbox-construction-${option}`}
                    />
                    <span className="text-sm text-[rgba(12,12,12,0.8)]">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 중복여부 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[rgba(12,12,12,0.7)]">
                중복여부
              </label>
              <div className="flex gap-3">
                {["전체", "중복", "이주택"].map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={duplicateStatus.includes(option)}
                      onCheckedChange={() =>
                        handleCheckboxChange("중복여부", option, duplicateStatus, setDuplicateStatus)
                      }
                      data-testid={`checkbox-duplicate-${option}`}
                    />
                    <span className="text-sm text-[rgba(12,12,12,0.8)]">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Filters Row 2 - 필터추가 & 자료처리 기준 */}
          <div className="flex gap-8">
            {/* 필터추가 */}
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-sm font-medium text-[rgba(12,12,12,0.7)]">
                필터추가
              </label>
              <div className="flex gap-3">
                <Select value={insuranceCompany} onValueChange={setInsuranceCompany}>
                  <SelectTrigger 
                    className="h-10" 
                    style={{
                      border: "2px solid #008FED",
                      borderRadius: "8px",
                    }}
                    data-testid="select-insurance-company"
                  >
                    <SelectValue placeholder="보험사" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="삼성화재">삼성화재</SelectItem>
                    <SelectItem value="현대해상">현대해상</SelectItem>
                    <SelectItem value="DB손해보험">DB손해보험</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={assessor} onValueChange={setAssessor}>
                  <SelectTrigger className="h-10" data-testid="select-assessor">
                    <SelectValue placeholder="심사사" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="심사사1">심사사1</SelectItem>
                    <SelectItem value="심사사2">심사사2</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={investigator} onValueChange={setInvestigator}>
                  <SelectTrigger className="h-10" data-testid="select-investigator">
                    <SelectValue placeholder="조사사" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="조사사1">조사사1</SelectItem>
                    <SelectItem value="조사사2">조사사2</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={partner} onValueChange={setPartner}>
                  <SelectTrigger className="h-10" data-testid="select-partner">
                    <SelectValue placeholder="협력사" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="협력사1">협력사1</SelectItem>
                    <SelectItem value="협력사2">협력사2</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={settlementManager} onValueChange={setSettlementManager}>
                  <SelectTrigger className="h-10" data-testid="select-settlement-manager">
                    <SelectValue placeholder="당사 담당자" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="담당자1">담당자1</SelectItem>
                    <SelectItem value="담당자2">담당자2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 자료처리(반려사) 기준 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[rgba(12,12,12,0.7)]">
                자료처리(반려사) 기준
              </label>
              <div className="flex gap-2">
                {["전체", "당월", "직접입력"].map((option) => (
                  <button
                    key={option}
                    onClick={() => setRejectionCriteria(option)}
                    className="h-10 px-6 rounded-lg transition-colors"
                    style={{
                      background: rejectionCriteria === option ? "#E3F2FD" : "white",
                      border: rejectionCriteria === option 
                        ? "1px solid #008FED" 
                        : "1px solid rgba(12, 12, 12, 0.2)",
                      color: rejectionCriteria === option ? "#008FED" : "rgba(12, 12, 12, 0.7)",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: rejectionCriteria === option ? 600 : 400,
                    }}
                    data-testid={`button-rejection-${option}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 적용된 필터 태그 */}
          {filterTags.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              {filterTags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#E3F2FD] rounded-md"
                >
                  <span className="text-sm text-[#008FED]">{tag.label}</span>
                  <button
                    onClick={() => removeFilterTag(tag.id)}
                    className="text-[#008FED] hover:text-[#0066CC]"
                    data-testid={`remove-filter-${tag.id}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-between items-center pt-4">
            <Button
              variant="outline"
              onClick={resetFilters}
              className="h-10 px-6"
              data-testid="button-reset"
            >
              초기화
            </Button>
            <Button
              className="h-10 px-6"
              style={{
                background: "#008FED",
                fontWeight: 600,
              }}
              data-testid="button-search-with-filters"
            >
              선택한 조건 검색하기
            </Button>
          </div>
        </div>
      </div>

      {/* Results placeholder */}
      <div className="bg-white rounded-xl shadow-[0px_0px_20px_#DBE9F5] p-8">
        <p className="text-center text-[rgba(12,12,12,0.5)]">
          통계 데이터가 여기에 표시됩니다.
        </p>
      </div>
    </div>
  );
}
