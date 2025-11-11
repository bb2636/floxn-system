import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, CaseWithLatestProgress } from "@shared/schema";
import { Search, X, ChevronDown, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

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
  
  // 필터추가 (멀티셀렉트)
  const [insuranceCompanies, setInsuranceCompanies] = useState<string[]>(["전체"]);
  const [assessors, setAssessors] = useState<string[]>(["전체"]);
  const [investigators, setInvestigators] = useState<string[]>(["전체"]);
  const [partners, setPartners] = useState<string[]>(["전체"]);
  const [settlementManagers, setSettlementManagers] = useState<string[]>(["전체"]);
  
  // 자료처리(반려) 기준
  const [rejectionCriteria, setRejectionCriteria] = useState<string>("전체");
  
  // 직접입력 날짜 범위
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  // 적용된 필터 태그
  const [filterTags, setFilterTags] = useState<FilterTag[]>([]);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: cases } = useQuery<CaseWithLatestProgress[]>({
    queryKey: ["/api/cases"],
  });

  // Fetch filter data
  const { data: filterData, isLoading: isLoadingFilters } = useQuery<{
    insuranceCompanies: string[];
    assessors: string[];
    investigators: string[];
    partners: string[];
    settlementManagers: string[];
  }>({
    queryKey: ["/api/statistics/filters"],
  });

  if (!user) {
    return null;
  }

  // Helper function to create filter tag
  const createFilterTag = (category: string, value: string): FilterTag => ({
    id: `${category}-${value}`,
    label: `${category} > ${value}`,
    category: category,
  });

  const handleCheckboxChange = (
    category: string,
    value: string,
    currentState: string[],
    setState: (value: string[]) => void
  ) => {
    if (value === "전체") {
      setState(["전체"]);
      // Remove all tags for this category
      setFilterTags(prev => prev.filter(tag => tag.category !== category));
    } else {
      const newState = currentState.filter(v => v !== "전체");
      if (newState.includes(value)) {
        const filtered = newState.filter(v => v !== value);
        setState(filtered.length === 0 ? ["전체"] : filtered);
        // Remove this specific tag
        setFilterTags(prev => prev.filter(tag => tag.id !== `${category}-${value}`));
      } else {
        setState([...newState, value]);
        // Add new tag
        setFilterTags(prev => [...prev, createFilterTag(category, value)]);
      }
    }
  };

  const handleRejectionChange = (value: string) => {
    if (value === "직접입력") {
      setDateRangeOpen(true);
      return;
    }
    
    setRejectionCriteria(value);
    setDateRangeOpen(false);
    setStartDate(undefined);
    setEndDate(undefined);
    
    const category = "자료처리(협력사) 기간";
    // Remove existing tag for this category and add new one if not "전체"
    setFilterTags(prev => {
      const newTags = prev.filter(tag => tag.category !== category);
      return value !== "전체" ? [...newTags, createFilterTag(category, value)] : newTags;
    });
  };

  const handleDateRangeApply = () => {
    if (startDate && endDate) {
      // 1년 제한 검증
      const oneYearAgo = new Date(endDate);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      if (startDate < oneYearAgo) {
        alert("최대 1년까지 조회할 수 있어요");
        return;
      }
      
      setRejectionCriteria("직접입력");
      const dateRangeLabel = `${format(startDate, "yyyy.MM.dd")} ~ ${format(endDate, "yyyy.MM.dd")}`;
      
      const category = "자료처리(협력사) 기간";
      setFilterTags(prev => {
        const newTags = prev.filter(tag => tag.category !== category);
        return [...newTags, createFilterTag(category, dateRangeLabel)];
      });
      
      setDateRangeOpen(false);
    }
  };

  const handleDateRangeReset = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const removeFilterTag = (tagId: string) => {
    const tag = filterTags.find(t => t.id === tagId);
    if (!tag) return;

    // Remove the tag
    setFilterTags(filterTags.filter(t => t.id !== tagId));

    // Update the corresponding filter state
    const [category, value] = tagId.split('-').slice(0, 2);
    
    switch (tag.category) {
      case "종결여부":
        const newRegistrationDate = registrationDate.filter(v => v !== value);
        setRegistrationDate(newRegistrationDate.length === 0 ? ["전체"] : newRegistrationDate);
        break;
      case "배당여부":
        const newAssignmentStatus = assignmentStatus.filter(v => v !== value);
        setAssignmentStatus(newAssignmentStatus.length === 0 ? ["전체"] : newAssignmentStatus);
        break;
      case "공사유무":
        const newConstructionStatus = constructionStatus.filter(v => v !== value);
        setConstructionStatus(newConstructionStatus.length === 0 ? ["전체"] : newConstructionStatus);
        break;
      case "중복여부":
        const newDuplicateStatus = duplicateStatus.filter(v => v !== value);
        setDuplicateStatus(newDuplicateStatus.length === 0 ? ["전체"] : newDuplicateStatus);
        break;
      case "보험사":
        const newInsuranceCompanies = insuranceCompanies.filter(v => v !== value);
        setInsuranceCompanies(newInsuranceCompanies.length === 0 ? ["전체"] : newInsuranceCompanies);
        break;
      case "심사사":
        const newAssessors = assessors.filter(v => v !== value);
        setAssessors(newAssessors.length === 0 ? ["전체"] : newAssessors);
        break;
      case "조사사":
        const newInvestigators = investigators.filter(v => v !== value);
        setInvestigators(newInvestigators.length === 0 ? ["전체"] : newInvestigators);
        break;
      case "협력사":
        const newPartners = partners.filter(v => v !== value);
        setPartners(newPartners.length === 0 ? ["전체"] : newPartners);
        break;
      case "당사 담당자":
        const newSettlementManagers = settlementManagers.filter(v => v !== value);
        setSettlementManagers(newSettlementManagers.length === 0 ? ["전체"] : newSettlementManagers);
        break;
      case "자료처리(협력사) 기간":
        setRejectionCriteria("전체");
        setStartDate(undefined);
        setEndDate(undefined);
        break;
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setRegistrationDate(["전체"]);
    setAssignmentStatus(["전체"]);
    setConstructionStatus(["전체"]);
    setDuplicateStatus(["전체"]);
    setInsuranceCompanies(["전체"]);
    setAssessors(["전체"]);
    setInvestigators(["전체"]);
    setPartners(["전체"]);
    setSettlementManagers(["전체"]);
    setRejectionCriteria("전체");
    setStartDate(undefined);
    setEndDate(undefined);
    setDateRangeOpen(false);
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
          <div className="flex items-center gap-8 py-2">
            {/* 종결여부 */}
            <div className="flex flex-col gap-2">
              <label 
                className="text-sm font-medium"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#686A6E",
                }}
              >
                종결여부
              </label>
              <div className="flex gap-3">
                {["전체", "미결", "종결"].map((option) => (
                  <label key={option} className="flex items-center gap-1 cursor-pointer">
                    <Checkbox
                      checked={registrationDate.includes(option)}
                      onCheckedChange={() =>
                        handleCheckboxChange("종결여부", option, registrationDate, setRegistrationDate)
                      }
                      className="w-6 h-6"
                      data-testid={`checkbox-registration-${option}`}
                    />
                    <span 
                      className="text-sm"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: registrationDate.includes(option) ? "#008FED" : "#686A6E",
                      }}
                    >
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div 
              style={{
                width: "1px",
                height: "20px",
                background: "rgba(12, 12, 12, 0.12)",
              }}
            />

            {/* 배당여부 */}
            <div className="flex flex-col gap-2">
              <label 
                className="text-sm font-medium"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#686A6E",
                }}
              >
                배당여부
              </label>
              <div className="flex gap-3">
                {["전체", "배정", "미배정"].map((option) => (
                  <label key={option} className="flex items-center gap-1 cursor-pointer">
                    <Checkbox
                      checked={assignmentStatus.includes(option)}
                      onCheckedChange={() =>
                        handleCheckboxChange("배당여부", option, assignmentStatus, setAssignmentStatus)
                      }
                      className="w-6 h-6"
                      data-testid={`checkbox-assignment-${option}`}
                    />
                    <span 
                      className="text-sm"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: assignmentStatus.includes(option) ? "#008FED" : "#686A6E",
                      }}
                    >
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div 
              style={{
                width: "1px",
                height: "20px",
                background: "rgba(12, 12, 12, 0.12)",
              }}
            />

            {/* 공사유무 */}
            <div className="flex flex-col gap-2">
              <label 
                className="text-sm font-medium"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#686A6E",
                }}
              >
                공사유무
              </label>
              <div className="flex gap-3">
                {["전체", "수리", "비교건적", "공사", "무공사"].map((option) => (
                  <label key={option} className="flex items-center gap-1 cursor-pointer">
                    <Checkbox
                      checked={constructionStatus.includes(option)}
                      onCheckedChange={() =>
                        handleCheckboxChange("공사유무", option, constructionStatus, setConstructionStatus)
                      }
                      className="w-6 h-6"
                      data-testid={`checkbox-construction-${option}`}
                    />
                    <span 
                      className="text-sm"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: constructionStatus.includes(option) ? "#008FED" : "#686A6E",
                      }}
                    >
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div 
              style={{
                width: "1px",
                height: "20px",
                background: "rgba(12, 12, 12, 0.12)",
              }}
            />

            {/* 중복여부 */}
            <div className="flex flex-col gap-2">
              <label 
                className="text-sm font-medium"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#686A6E",
                }}
              >
                중복여부
              </label>
              <div className="flex gap-3">
                {["전체", "중복", "이주택"].map((option) => (
                  <label key={option} className="flex items-center gap-1 cursor-pointer">
                    <Checkbox
                      checked={duplicateStatus.includes(option)}
                      onCheckedChange={() =>
                        handleCheckboxChange("중복여부", option, duplicateStatus, setDuplicateStatus)
                      }
                      className="w-6 h-6"
                      data-testid={`checkbox-duplicate-${option}`}
                    />
                    <span 
                      className="text-sm"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: duplicateStatus.includes(option) ? "#008FED" : "#686A6E",
                      }}
                    >
                      {option}
                    </span>
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
                {/* 보험사 */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="h-10 px-4 rounded-lg flex items-center justify-between gap-2 min-w-[140px]"
                      style={{
                        background: "#F5F5F5",
                        border: insuranceCompanies.length > 1 || !insuranceCompanies.includes("전체") 
                          ? "2px solid #00A3FF" 
                          : "2px solid #0C0C0C",
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#0C0C0C",
                      }}
                      data-testid="button-insurance-company"
                    >
                      <span>보험사</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-4" align="start">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={insuranceCompanies.includes("전체")}
                          onCheckedChange={() => handleCheckboxChange("보험사", "전체", insuranceCompanies, setInsuranceCompanies)}
                          style={{
                            backgroundColor: insuranceCompanies.includes("전체") ? "#00A3FF" : "#D9D9D9",
                            borderColor: insuranceCompanies.includes("전체") ? "#00A3FF" : "#D9D9D9",
                          }}
                          data-testid="checkbox-insurance-all"
                        />
                        <span className="text-sm font-medium" style={{ color: insuranceCompanies.includes("전체") ? "#00A3FF" : "#686A6E" }}>
                          전체
                        </span>
                      </label>
                      {isLoadingFilters ? (
                        <div className="col-span-2 text-sm text-gray-500">로딩 중...</div>
                      ) : (
                        filterData?.insuranceCompanies.map((company) => (
                          <label key={company} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={insuranceCompanies.includes(company)}
                              onCheckedChange={() => handleCheckboxChange("보험사", company, insuranceCompanies, setInsuranceCompanies)}
                              style={{
                                backgroundColor: insuranceCompanies.includes(company) ? "#00A3FF" : "#D9D9D9",
                                borderColor: insuranceCompanies.includes(company) ? "#00A3FF" : "#D9D9D9",
                              }}
                              data-testid={`checkbox-insurance-${company}`}
                            />
                            <span className="text-sm" style={{ color: insuranceCompanies.includes(company) ? "#00A3FF" : "#686A6E" }}>
                              {company}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* 심사사 */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="h-10 px-4 rounded-lg flex items-center justify-between gap-2 min-w-[140px]"
                      style={{
                        background: "#F5F5F5",
                        border: assessors.length > 1 || !assessors.includes("전체") 
                          ? "2px solid #00A3FF" 
                          : "2px solid #0C0C0C",
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#0C0C0C",
                      }}
                      data-testid="button-assessor"
                    >
                      <span>심사사</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-4" align="start">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={assessors.includes("전체")}
                          onCheckedChange={() => handleCheckboxChange("심사사", "전체", assessors, setAssessors)}
                          style={{
                            backgroundColor: assessors.includes("전체") ? "#00A3FF" : "#D9D9D9",
                            borderColor: assessors.includes("전체") ? "#00A3FF" : "#D9D9D9",
                          }}
                          data-testid="checkbox-assessor-all"
                        />
                        <span className="text-sm font-medium" style={{ color: assessors.includes("전체") ? "#00A3FF" : "#686A6E" }}>
                          전체
                        </span>
                      </label>
                      {isLoadingFilters ? (
                        <div className="col-span-2 text-sm text-gray-500">로딩 중...</div>
                      ) : (
                        filterData?.assessors.map((assessorCompany) => (
                          <label key={assessorCompany} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={assessors.includes(assessorCompany)}
                              onCheckedChange={() => handleCheckboxChange("심사사", assessorCompany, assessors, setAssessors)}
                              style={{
                                backgroundColor: assessors.includes(assessorCompany) ? "#00A3FF" : "#D9D9D9",
                                borderColor: assessors.includes(assessorCompany) ? "#00A3FF" : "#D9D9D9",
                              }}
                              data-testid={`checkbox-assessor-${assessorCompany}`}
                            />
                            <span className="text-sm" style={{ color: assessors.includes(assessorCompany) ? "#00A3FF" : "#686A6E" }}>
                              {assessorCompany}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* 조사사 */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="h-10 px-4 rounded-lg flex items-center justify-between gap-2 min-w-[140px]"
                      style={{
                        background: "#F5F5F5",
                        border: investigators.length > 1 || !investigators.includes("전체") 
                          ? "2px solid #00A3FF" 
                          : "2px solid #0C0C0C",
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#0C0C0C",
                      }}
                      data-testid="button-investigator"
                    >
                      <span>조사사</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-4" align="start">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={investigators.includes("전체")}
                          onCheckedChange={() => handleCheckboxChange("조사사", "전체", investigators, setInvestigators)}
                          style={{
                            backgroundColor: investigators.includes("전체") ? "#00A3FF" : "#D9D9D9",
                            borderColor: investigators.includes("전체") ? "#00A3FF" : "#D9D9D9",
                          }}
                          data-testid="checkbox-investigator-all"
                        />
                        <span className="text-sm font-medium" style={{ color: investigators.includes("전체") ? "#00A3FF" : "#686A6E" }}>
                          전체
                        </span>
                      </label>
                      {isLoadingFilters ? (
                        <div className="col-span-2 text-sm text-gray-500">로딩 중...</div>
                      ) : (
                        filterData?.investigators.map((investigatorCompany) => (
                          <label key={investigatorCompany} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={investigators.includes(investigatorCompany)}
                              onCheckedChange={() => handleCheckboxChange("조사사", investigatorCompany, investigators, setInvestigators)}
                              style={{
                                backgroundColor: investigators.includes(investigatorCompany) ? "#00A3FF" : "#D9D9D9",
                                borderColor: investigators.includes(investigatorCompany) ? "#00A3FF" : "#D9D9D9",
                              }}
                              data-testid={`checkbox-investigator-${investigatorCompany}`}
                            />
                            <span className="text-sm" style={{ color: investigators.includes(investigatorCompany) ? "#00A3FF" : "#686A6E" }}>
                              {investigatorCompany}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* 협력사 */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="h-10 px-4 rounded-lg flex items-center justify-between gap-2 min-w-[140px]"
                      style={{
                        background: "#F5F5F5",
                        border: partners.length > 1 || !partners.includes("전체") 
                          ? "2px solid #00A3FF" 
                          : "2px solid #0C0C0C",
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#0C0C0C",
                      }}
                      data-testid="button-partner"
                    >
                      <span>협력사</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-4" align="start">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={partners.includes("전체")}
                          onCheckedChange={() => handleCheckboxChange("협력사", "전체", partners, setPartners)}
                          style={{
                            backgroundColor: partners.includes("전체") ? "#00A3FF" : "#D9D9D9",
                            borderColor: partners.includes("전체") ? "#00A3FF" : "#D9D9D9",
                          }}
                          data-testid="checkbox-partner-all"
                        />
                        <span className="text-sm font-medium" style={{ color: partners.includes("전체") ? "#00A3FF" : "#686A6E" }}>
                          전체
                        </span>
                      </label>
                      {isLoadingFilters ? (
                        <div className="col-span-2 text-sm text-gray-500">로딩 중...</div>
                      ) : (
                        filterData?.partners.map((partnerCompany) => (
                          <label key={partnerCompany} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={partners.includes(partnerCompany)}
                              onCheckedChange={() => handleCheckboxChange("협력사", partnerCompany, partners, setPartners)}
                              style={{
                                backgroundColor: partners.includes(partnerCompany) ? "#00A3FF" : "#D9D9D9",
                                borderColor: partners.includes(partnerCompany) ? "#00A3FF" : "#D9D9D9",
                              }}
                              data-testid={`checkbox-partner-${partnerCompany}`}
                            />
                            <span className="text-sm" style={{ color: partners.includes(partnerCompany) ? "#00A3FF" : "#686A6E" }}>
                              {partnerCompany}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* 당사 담당자 */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="h-10 px-4 rounded-lg flex items-center justify-between gap-2 min-w-[140px]"
                      style={{
                        background: "#F5F5F5",
                        border: settlementManagers.length > 1 || !settlementManagers.includes("전체") 
                          ? "2px solid #00A3FF" 
                          : "2px solid #0C0C0C",
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#0C0C0C",
                      }}
                      data-testid="button-settlement-manager"
                    >
                      <span>당사 담당자</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-4" align="start">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={settlementManagers.includes("전체")}
                          onCheckedChange={() => handleCheckboxChange("당사 담당자", "전체", settlementManagers, setSettlementManagers)}
                          style={{
                            backgroundColor: settlementManagers.includes("전체") ? "#00A3FF" : "#D9D9D9",
                            borderColor: settlementManagers.includes("전체") ? "#00A3FF" : "#D9D9D9",
                          }}
                          data-testid="checkbox-settlement-all"
                        />
                        <span className="text-sm font-medium" style={{ color: settlementManagers.includes("전체") ? "#00A3FF" : "#686A6E" }}>
                          전체
                        </span>
                      </label>
                      {isLoadingFilters ? (
                        <div className="col-span-2 text-sm text-gray-500">로딩 중...</div>
                      ) : (
                        filterData?.settlementManagers.map((manager) => (
                          <label key={manager} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={settlementManagers.includes(manager)}
                              onCheckedChange={() => handleCheckboxChange("당사 담당자", manager, settlementManagers, setSettlementManagers)}
                              style={{
                                backgroundColor: settlementManagers.includes(manager) ? "#00A3FF" : "#D9D9D9",
                                borderColor: settlementManagers.includes(manager) ? "#00A3FF" : "#D9D9D9",
                              }}
                              data-testid={`checkbox-settlement-${manager}`}
                            />
                            <span className="text-sm" style={{ color: settlementManagers.includes(manager) ? "#00A3FF" : "#686A6E" }}>
                              {manager}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* 자료처리(협력사) 기간 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[rgba(12,12,12,0.7)]">
                자료처리(협력사) 기간
              </label>
              <div className="flex gap-2 items-center">
                {["전체", "당월"].map((option) => (
                  <button
                    key={option}
                    onClick={() => handleRejectionChange(option)}
                    className="h-10 px-6 rounded-lg transition-colors"
                    style={{
                      background: rejectionCriteria === option ? "#E3F2FD" : "white",
                      border: rejectionCriteria === option 
                        ? "1px solid #0C0C0C" 
                        : "1px solid #0C0C0C",
                      color: rejectionCriteria === option ? "#0C0C0C" : "#0C0C0C",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                    }}
                    data-testid={`button-period-${option}`}
                  >
                    {option}
                  </button>
                ))}
                
                {/* 직접입력 버튼 with Popover */}
                <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className="h-10 px-6 rounded-lg transition-colors"
                      style={{
                        background: rejectionCriteria === "직접입력" ? "#E3F2FD" : "white",
                        border: "1px solid #0C0C0C",
                        color: "#0C0C0C",
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 500,
                      }}
                      data-testid="button-period-직접입력"
                    >
                      직접입력
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="start">
                    <div className="space-y-4">
                      {/* 날짜 범위 입력 */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white">
                          <CalendarIcon className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">
                            {startDate ? format(startDate, "yyyy.MM.dd") : "2025.10.21"}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">-</span>
                        <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white">
                          <CalendarIcon className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">
                            {endDate ? format(endDate, "yyyy.MM.dd") : "2025.10.21"}
                          </span>
                        </div>
                      </div>
                      
                      {/* 안내 문구 */}
                      <p className="text-xs text-gray-500">최대 1년까지 조회할 수 있어요</p>
                      
                      {/* 캘린더 */}
                      <div className="border-t pt-4">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          locale={ko}
                          className="rounded-md border"
                        />
                      </div>
                      
                      <div className="border-t pt-4">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          locale={ko}
                          className="rounded-md border"
                          disabled={(date) => startDate ? date < startDate : false}
                        />
                      </div>
                      
                      {/* 버튼 */}
                      <div className="flex gap-2 pt-4">
                        <button
                          onClick={handleDateRangeReset}
                          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          data-testid="button-date-reset"
                        >
                          초기화
                        </button>
                        <button
                          onClick={handleDateRangeApply}
                          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white"
                          style={{ background: "#00A3FF" }}
                          data-testid="button-date-apply"
                        >
                          적용
                        </button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
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
