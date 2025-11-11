import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User, CaseWithLatestProgress } from "@shared/schema";
import { Search, Download, Settings2, AlertCircle } from "lucide-react";
import logoIcon from "@assets/Frame 2_1762217940686.png";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SubMenuType = "statistics" | "settlement-inquiry" | "settlement";

export default function Statistics() {
  const [activeMenu, setActiveMenu] = useState("통계 및 정산");
  const [activeSubMenu, setActiveSubMenu] = useState<SubMenuType>("statistics");
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // 필터 상태
  const [filters, setFilters] = useState({
    inquiryPeriod: false,
    assignmentWork: false,
    approvalManager: false,
    completionCompany: false,
  });

  const [workType, setWorkType] = useState("보험사");
  const [period, setPeriod] = useState("전체");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: cases, isLoading } = useQuery<CaseWithLatestProgress[]>({
    queryKey: ["/api/cases"],
  });

  useEffect(() => {
    if (!userLoading && !user) {
      setLocation("/");
    }
  }, [user, userLoading, setLocation]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const menuItems = [
    { name: "홈" },
    { name: "접수하기" },
    { name: "진행상황" },
    { name: "현장조사" },
    { name: "종합진행관리" },
    { name: "통계 및 정산" },
    { name: "관리자 설정" },
  ];

  const handleMenuClick = (menuName: string) => {
    setActiveMenu(menuName);
    if (menuName === "홈") setLocation("/dashboard");
    else if (menuName === "접수하기") setLocation("/intake");
    else if (menuName === "진행상황") setLocation("/progress");
    else if (menuName === "종합진행관리") setLocation("/comprehensive-progress");
    else if (menuName === "통계 및 정산") setLocation("/statistics");
    else if (menuName === "관리자 설정") setLocation("/admin-settings");
  };

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout", {});
      setLocation("/");
    } catch (error) {
      toast({
        title: "로그아웃 실패",
        description: "로그아웃 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleExcelDownload = () => {
    toast({
      title: "엑셀 다운로드",
      description: "통계 데이터를 엑셀로 다운로드합니다.",
    });
  };

  const handleConditionSearch = () => {
    const hasCondition = 
      Object.values(filters).some((value) => value === true) ||
      searchQuery.trim() !== "" ||
      period !== "전체";
    
    if (!hasCondition) {
      // 조건이 없으면 빈 상태로 리셋하고 토스트 표시
      setSearchResults(null);
      toast({
        title: "조건을 선택해주세요",
        variant: "dark",
      });
      return;
    }

    // 검색 실행 (현재는 모든 데이터를 반환, 추후 필터링 로직 추가 가능)
    const results = cases?.slice(0, 10).map((caseItem) => ({
      timeReception: caseItem.caseNumber,
      receptionNumber: caseItem.insuranceAccidentNo,
      insuranceCompany: caseItem.insuranceCompany,
      contractor: caseItem.clientName,
      approvalManager: user?.name || "",
      assignmentWork: caseItem.assignedPartner || "미배정",
      partner: caseItem.assignedPartnerManager || "-",
      assessor: "-",
      approvalAmount: "6,320,000원",
      completionDate: "2025-00-00",
      construction: "진행중",
    })) || [];

    setSearchResults(results);
  };

  // 검색 결과가 있으면 표시, 없으면 빈 상태
  const displayData = searchResults || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E7EDFE] to-white relative overflow-hidden">
      {/* Background blur effects */}
      <div className="absolute w-[1095px] h-[776.83px] left-[97.61px] bottom-[1169.19px] bg-[rgba(254,240,230,0.4)] blur-[212px] rotate-[-35.25deg] pointer-events-none" />
      <div className="absolute w-[1334.83px] h-[1322.98px] left-[811.58px] bottom-0 bg-[rgba(234,230,254,0.5)] blur-[212px] pointer-events-none" />
      <div className="absolute w-[348px] h-[1322.98px] left-0 bottom-[188.99px] bg-[rgba(234,230,254,0.5)] blur-[212px] pointer-events-none" />

      {/* 데스크톱 헤더 (>= 1024px) */}
      <header className="hidden lg:flex items-center justify-between px-8 h-[89px] bg-white/60 backdrop-blur-[7px] border-b border-[rgba(0,143,237,0.2)] relative z-10">
        <div className="flex items-center gap-8">
          <img
            src={logoIcon}
            alt="FLOXN 로고"
            className="h-8 cursor-pointer"
            onClick={() => setLocation("/dashboard")}
            data-testid="logo-header"
          />
          <nav className="flex items-center gap-2">
            {menuItems.map((item) => (
              <button
                key={item.name}
                onClick={() => handleMenuClick(item.name)}
                className={`px-4 py-2 text-[15px] font-medium leading-[128%] tracking-[-0.01em] rounded-[10px] transition-all ${
                  activeMenu === item.name
                    ? "text-[#008FED] bg-[rgba(12,12,12,0.08)]"
                    : "text-[rgba(12,12,12,0.5)] hover:text-[rgba(12,12,12,0.8)] hover:bg-[rgba(12,12,12,0.04)]"
                }`}
                data-testid={`nav-${item.name}`}
              >
                {item.name}
              </button>
            ))}
          </nav>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[rgba(12,12,12,0.04)] transition-colors"
              data-testid="user-menu-trigger"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#008FED] to-[#A855F7] flex items-center justify-center text-white font-semibold text-sm">
                {user.name.charAt(0)}
              </div>
              <div className="flex flex-col items-start">
                <div className="text-sm font-semibold text-[#0C0C0C]">
                  {user.name}
                </div>
                <div className="text-xs text-[rgba(12,12,12,0.5)]">
                  {user.role}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* 모바일 헤더 (< 1024px) */}
      <header className="lg:hidden flex items-center justify-between px-4 h-[58px] bg-white/60 backdrop-blur-[7px] border-b border-[rgba(0,143,237,0.2)] relative z-10">
        <img
          src={logoIcon}
          alt="FLOXN 로고"
          className="h-6 cursor-pointer"
          onClick={() => setLocation("/dashboard")}
          data-testid="logo-header-mobile"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          data-testid="button-logout-mobile"
        >
          로그아웃
        </Button>
      </header>

      {/* Main content with sidebar */}
      <div className="flex relative z-10">
        {/* Left sidebar */}
        <aside className="w-[260px] min-h-[calc(100vh-89px)] bg-white/6 border-r border-[rgba(0,143,237,0.2)] flex flex-col">
          {/* Sidebar header */}
          <div className="flex items-center gap-2 px-8 py-4 h-[51px]">
            <span className="text-[15px] font-medium leading-[128%] tracking-[-0.01em] text-[rgba(12,12,12,0.5)]">
              통계 및 정산
            </span>
          </div>

          {/* Sidebar menu */}
          <div className="flex flex-col px-3 gap-[7px]">
            <button
              onClick={() => setActiveSubMenu("statistics")}
              className={`flex items-center gap-2 px-5 py-[10px] h-12 rounded-[10px] text-base font-bold leading-[128%] tracking-[-0.02em] transition-all ${
                activeSubMenu === "statistics"
                  ? "bg-[rgba(12,12,12,0.08)] text-[#008FED]"
                  : "text-[rgba(12,12,12,0.8)] hover:bg-[rgba(12,12,12,0.04)]"
              }`}
              data-testid="submenu-statistics"
            >
              통계
            </button>
            <button
              onClick={() => setActiveSubMenu("settlement-inquiry")}
              className={`flex items-center gap-2 px-5 py-[10px] h-12 rounded-[10px] text-base font-medium leading-[128%] tracking-[-0.02em] transition-all ${
                activeSubMenu === "settlement-inquiry"
                  ? "bg-[rgba(12,12,12,0.08)] text-[#008FED]"
                  : "text-[rgba(12,12,12,0.8)] hover:bg-[rgba(12,12,12,0.04)]"
              }`}
              data-testid="submenu-settlement-inquiry"
            >
              정산 조회
            </button>
            <button
              onClick={() => setActiveSubMenu("settlement")}
              className={`flex items-center gap-2 px-5 py-[10px] h-12 rounded-[10px] text-base font-medium leading-[128%] tracking-[-0.02em] transition-all ${
                activeSubMenu === "settlement"
                  ? "bg-[rgba(12,12,12,0.08)] text-[#008FED]"
                  : "text-[rgba(12,12,12,0.8)] hover:bg-[rgba(12,12,12,0.04)]"
              }`}
              data-testid="submenu-settlement"
            >
              정산하기
            </button>
          </div>
        </aside>

        {/* Right content */}
        <main className="flex-1 p-8">
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
            <div className="flex flex-col gap-3 p-5">
              {/* Search section */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[rgba(12,12,12,0.7)]">
                  검색
                </label>
                <div className="flex gap-2 items-end">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(12,12,12,0.4)]" />
                    <Input
                      placeholder="접수번호 직접 입력"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-statistics"
                    />
                  </div>
                  <Button className="bg-[#008FED] hover:bg-[#0077D8] min-w-[80px]" data-testid="button-search">
                    검색
                  </Button>
                  <Button
                    onClick={handleConditionSearch}
                    className="bg-[#008FED] hover:bg-[#0077D8] whitespace-nowrap"
                    data-testid="button-condition-search"
                  >
                    선택된 조건 검색하기
                  </Button>
                </div>
              </div>

              {/* Filters checkboxes */}
              <div className="grid grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-inquiry-period"
                    checked={filters.inquiryPeriod}
                    onCheckedChange={(checked) =>
                      setFilters({ ...filters, inquiryPeriod: checked as boolean })
                    }
                    data-testid="checkbox-inquiry-period"
                  />
                  <label
                    htmlFor="filter-inquiry-period"
                    className="text-sm font-medium cursor-pointer"
                  >
                    조회기간
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-assignment-work"
                    checked={filters.assignmentWork}
                    onCheckedChange={(checked) =>
                      setFilters({ ...filters, assignmentWork: checked as boolean })
                    }
                    data-testid="checkbox-assignment-work"
                  />
                  <label
                    htmlFor="filter-assignment-work"
                    className="text-sm font-medium cursor-pointer"
                  >
                    배당업무
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-approval-manager"
                    checked={filters.approvalManager}
                    onCheckedChange={(checked) =>
                      setFilters({ ...filters, approvalManager: checked as boolean })
                    }
                    data-testid="checkbox-approval-manager"
                  />
                  <label
                    htmlFor="filter-approval-manager"
                    className="text-sm font-medium cursor-pointer"
                  >
                    결재담당
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-completion-company"
                    checked={filters.completionCompany}
                    onCheckedChange={(checked) =>
                      setFilters({ ...filters, completionCompany: checked as boolean })
                    }
                    data-testid="checkbox-completion-company"
                  />
                  <label
                    htmlFor="filter-completion-company"
                    className="text-sm font-medium cursor-pointer"
                  >
                    전수업체
                  </label>
                </div>
              </div>

              {/* Work type and period selectors */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-[rgba(12,12,12,0.7)] whitespace-nowrap">
                    업무구분
                  </label>
                  <div className="flex gap-2">
                    {["보험사", "심사사", "조사사", "협력사"].map((type) => (
                      <Button
                        key={type}
                        variant={workType === type ? "default" : "outline"}
                        size="sm"
                        onClick={() => setWorkType(type)}
                        data-testid={`button-work-type-${type}`}
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-[120px]" data-testid="select-period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="전체">전체</SelectItem>
                      <SelectItem value="당월">당월</SelectItem>
                      <SelectItem value="직접입력">직접입력</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button variant="outline" size="sm" data-testid="button-detailed-filter">
                  직접입력하기
                </Button>
              </div>
            </div>
          </div>

          {/* Results section */}
          <div className="bg-white rounded-xl shadow-[0px_0px_20px_#DBE9F5]">
            {/* Results header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(12,12,12,0.1)]">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-[#0C0C0C]">조회 결과</span>
                <span className="text-base font-semibold text-[#008FED]" data-testid="text-total-count">
                  {displayData.length}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExcelDownload}
                className="gap-2"
                data-testid="button-excel-download"
              >
                <Download className="w-4 h-4" />
                엑셀 다운로드
              </Button>
            </div>

            {/* Table or Empty State */}
            {searchResults === null ? (
              <div className="flex flex-col items-center justify-center py-20 px-8" data-testid="empty-state">
                <div className="w-16 h-16 rounded-full bg-[rgba(12,12,12,0.1)] flex items-center justify-center mb-6">
                  <AlertCircle className="w-8 h-8 text-[rgba(12,12,12,0.3)]" />
                </div>
                <h3 className="text-xl font-semibold text-[rgba(12,12,12,0.8)] mb-3">
                  아직게 검색해보세요
                </h3>
                <div className="text-center space-y-1">
                  <p className="text-sm text-[rgba(12,12,12,0.5)]">
                    검색어를 활용하여 데이터를 빠르게찾아보세요
                  </p>
                  <p className="text-sm text-[rgba(12,12,12,0.5)]">
                    필수 조건을 선택하여 장소나 조건를 통해요
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center whitespace-nowrap">시간접수</TableHead>
                      <TableHead className="text-center whitespace-nowrap">접수번호</TableHead>
                      <TableHead className="text-center whitespace-nowrap">보험사</TableHead>
                      <TableHead className="text-center whitespace-nowrap">계약자</TableHead>
                      <TableHead className="text-center whitespace-nowrap">결재담당</TableHead>
                      <TableHead className="text-center whitespace-nowrap">배당업무</TableHead>
                      <TableHead className="text-center whitespace-nowrap">협력사</TableHead>
                      <TableHead className="text-center whitespace-nowrap">심사사</TableHead>
                      <TableHead className="text-center whitespace-nowrap">승인액</TableHead>
                      <TableHead className="text-center whitespace-nowrap">전수일</TableHead>
                      <TableHead className="text-center whitespace-nowrap">공사</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-[rgba(12,12,12,0.5)]">
                          조회된 데이터가 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayData.map((row, index) => (
                        <TableRow key={index} data-testid={`table-row-${index}`}>
                          <TableCell className="text-center">{row.timeReception}</TableCell>
                          <TableCell className="text-center">{row.receptionNumber}</TableCell>
                          <TableCell className="text-center">{row.insuranceCompany}</TableCell>
                          <TableCell className="text-center">{row.contractor}</TableCell>
                          <TableCell className="text-center">{row.approvalManager}</TableCell>
                          <TableCell className="text-center">{row.assignmentWork}</TableCell>
                          <TableCell className="text-center">{row.partner}</TableCell>
                          <TableCell className="text-center">{row.assessor}</TableCell>
                          <TableCell className="text-center">{row.approvalAmount}</TableCell>
                          <TableCell className="text-center">{row.completionDate}</TableCell>
                          <TableCell className="text-center">{row.construction}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
