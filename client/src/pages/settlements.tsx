import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Search } from "lucide-react";

type SubMenuType = "statistics" | "settlements";

interface Settlement {
  id: string;
  insuranceCompany: string;
  caseNumber: string;
  damsa: string; // 담사서
  assessor: string; // 심사담당자
  assessorContact: string; // 심사담당자 연락처
  partnerManager: string; // 업체 담당자
  item: string; // 품목사
  constructionCost: string; // 공사법금
  damageCost: string; // 손해보상금
  included: string; // 포함
  status: string; // 상태 (진행/완료/미납 - 필터링용)
}

export default function Settlements() {
  const [activeMenu, setActiveMenu] = useState("통계 및 정산");
  const [activeSubMenu, setActiveSubMenu] = useState<SubMenuType>("settlements");
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // 필터 상태
  const [filterAll, setFilterAll] = useState(false);
  const [filterThisMonth, setFilterThisMonth] = useState(false);
  const [filterUnpaid, setFilterUnpaid] = useState(false);
  const [filterInstallment, setFilterInstallment] = useState(false);
  const [periodCondition, setPeriodCondition] = useState<string>("");
  const [paymentPlace, setPaymentPlace] = useState<string>("");
  const [company, setCompany] = useState<string>("");

  // 선택된 필터 태그
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 전체 임시 데이터 풀
  const allMockData: Settlement[] = [
    {
      id: "1",
      insuranceCompany: "인수태삼",
      caseNumber: "26145107",
      damsa: "옥",
      assessor: "김광석",
      assessorContact: "010-0000-0000",
      partnerManager: "김광석",
      item: "양양",
      constructionCost: "비교교적",
      damageCost: "511,695원",
      included: "양양",
      status: "진행",
    },
    {
      id: "2",
      insuranceCompany: "한화손해보험",
      caseNumber: "26145108",
      damsa: "옥",
      assessor: "이영희",
      assessorContact: "010-1111-1111",
      partnerManager: "이영희",
      item: "서울",
      constructionCost: "고급",
      damageCost: "750,000원",
      included: "서울",
      status: "완료",
    },
    {
      id: "3",
      insuranceCompany: "삼성화재",
      caseNumber: "26145109",
      damsa: "옥",
      assessor: "박철수",
      assessorContact: "010-2222-2222",
      partnerManager: "박철수",
      item: "부산",
      constructionCost: "일반",
      damageCost: "320,000원",
      included: "부산",
      status: "진행",
    },
    {
      id: "4",
      insuranceCompany: "현대해상",
      caseNumber: "26145110",
      damsa: "옥",
      assessor: "최수진",
      assessorContact: "010-3333-3333",
      partnerManager: "최수진",
      item: "대구",
      constructionCost: "저가",
      damageCost: "180,000원",
      included: "대구",
      status: "미납",
    },
    {
      id: "5",
      insuranceCompany: "DB손해보험",
      caseNumber: "26145111",
      damsa: "옥",
      assessor: "정민호",
      assessorContact: "010-4444-4444",
      partnerManager: "정민호",
      item: "인천",
      constructionCost: "비교교적",
      damageCost: "450,000원",
      included: "인천",
      status: "진행",
    },
    {
      id: "6",
      insuranceCompany: "메리츠화재",
      caseNumber: "26145112",
      damsa: "옥",
      assessor: "강은정",
      assessorContact: "010-5555-5555",
      partnerManager: "강은정",
      item: "광주",
      constructionCost: "고급",
      damageCost: "890,000원",
      included: "광주",
      status: "완료",
    },
    {
      id: "7",
      insuranceCompany: "KB손해보험",
      caseNumber: "26145113",
      damsa: "옥",
      assessor: "윤서준",
      assessorContact: "010-6666-6666",
      partnerManager: "윤서준",
      item: "대전",
      constructionCost: "일반",
      damageCost: "560,000원",
      included: "대전",
      status: "진행",
    },
  ];

  // 검색 결과 상태 (초기값: 전체 데이터)
  const [searchResults, setSearchResults] = useState<Settlement[]>(allMockData);

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: cases } = useQuery<any[]>({
    queryKey: ["/api/cases"],
  });

  const menuItems = [
    { name: "홈" },
    { name: "접수" },
    { name: "종합 진행 관리" },
    { name: "통계 및 정산" },
    { name: "관리자 설정" },
  ];

  const handleMenuClick = (menuName: string) => {
    setActiveMenu(menuName);
    if (menuName === "홈") setLocation("/dashboard");
    else if (menuName === "접수") setLocation("/intake");
    else if (menuName === "종합 진행 관리") setLocation("/comprehensive-progress");
    else if (menuName === "통계 및 정산") setLocation("/settlements");
    else if (menuName === "관리자 설정") setLocation("/admin-settings");
  };

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout", {});
      setLocation("/");
    } catch (error) {
      toast({
        title: "로그아웃 실패",
        variant: "dark",
      });
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "검색어를 입력해주세요",
        variant: "dark",
      });
      return;
    }

    // 검색어로 필터링
    const query = searchQuery.trim().toLowerCase();
    const filtered = allMockData.filter((item) =>
      item.insuranceCompany.toLowerCase().includes(query) ||
      item.caseNumber.toLowerCase().includes(query) ||
      item.assessor.toLowerCase().includes(query) ||
      item.partnerManager.toLowerCase().includes(query) ||
      item.item.toLowerCase().includes(query)
    );

    setSearchResults(filtered);
    toast({
      title: "검색 완료",
      description: `${filtered.length}개의 정산 내역을 찾았습니다.`,
      variant: "snackbar",
    });
  };

  const handleConditionSearch = () => {
    const hasCondition = filterAll || filterThisMonth || filterUnpaid || filterInstallment || 
                        periodCondition || paymentPlace || company || selectedTags.length > 0;

    if (!hasCondition) {
      setSearchResults([]);
      toast({
        title: "조건을 선택해주세요",
        variant: "dark",
      });
      return;
    }

    // 필터 적용 로직
    let filtered = [...allMockData];

    // 전체 필터 (모든 데이터 표시)
    if (filterAll) {
      filtered = [...allMockData];
    }

    // 이번 달 필터 (현재는 모든 데이터 표시)
    if (filterThisMonth) {
      // 실제로는 날짜 필터링 로직 필요
      filtered = filtered;
    }

    // 미납금 필터
    if (filterUnpaid) {
      filtered = filtered.filter(item => item.status === "미납");
    }

    // 할부대상 필터 (임시: status가 "진행"인 것)
    if (filterInstallment) {
      filtered = filtered.filter(item => item.status === "진행");
    }

    // 기간조건 필터
    if (periodCondition) {
      // 실제로는 날짜 범위 필터링 로직 필요
      filtered = filtered;
    }

    // 납부처 필터
    if (paymentPlace) {
      // 실제로는 납부처 데이터와 매칭 필요
      filtered = filtered;
    }

    // 업체사 필터
    if (company) {
      // 실제로는 업체사 데이터와 매칭 필요
      filtered = filtered;
    }

    // 선택된 태그 필터
    if (selectedTags.length > 0) {
      // 태그에 따라 필터링 (예: 보험사명, 심사사명 등)
      filtered = filtered.filter(item =>
        selectedTags.some(tag =>
          item.insuranceCompany.includes(tag) ||
          item.assessor.includes(tag) ||
          item.partnerManager.includes(tag)
        )
      );
    }

    setSearchResults(filtered);
    toast({
      title: "검색 완료",
      description: `${filtered.length}개의 정산 내역을 찾았습니다.`,
      variant: "snackbar",
    });
  };

  const handleReset = () => {
    setFilterAll(false);
    setFilterThisMonth(false);
    setFilterUnpaid(false);
    setFilterInstallment(false);
    setPeriodCondition("");
    setPaymentPlace("");
    setCompany("");
    setSelectedTags([]);
    setSearchResults(allMockData);
  };

  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const displayData = searchResults;
  const totalAmount = displayData.reduce((sum, item) => {
    // "511,695원" 형식에서 숫자만 추출
    const amount = parseInt(item.damageCost.replace(/[^0-9]/g, ''), 10) || 0;
    return sum + amount;
  }, 0);

  if (userLoading || !user) {
    return null;
  }

  return (
    <div className="relative" style={{ minHeight: '100vh', background: 'linear-gradient(0deg, #E7EDFE, #E7EDFE)' }}>
      {/* Blur Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[5%] w-[800px] h-[800px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255, 198, 153, 0.3) 0%, rgba(255, 198, 153, 0) 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div className="absolute bottom-[-15%] left-[10%] w-[900px] h-[900px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(189, 178, 255, 0.25) 0%, rgba(189, 178, 255, 0) 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      {/* Desktop Header (lg and above) */}
      <header className="hidden lg:block sticky top-0 z-50 w-full px-8 py-5"
        style={{
          height: '89px',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        }}>
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-2" data-testid="link-home">
              <div className="w-[30px] h-[30px] bg-[#0C0C0C] rounded-[6.67px]" />
              <span className="text-[22px] font-bold text-[#0C0C0C] tracking-[-0.02em] leading-[128%]">
                FLOXN
              </span>
            </div>

            <nav className="flex gap-8">
              {menuItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleMenuClick(item.name)}
                  className={`text-base font-semibold leading-[128%] tracking-[-0.02em] transition-colors ${
                    activeMenu === item.name
                      ? "text-[#0C0C0C]"
                      : "text-[rgba(12,12,12,0.4)]"
                  }`}
                  data-testid={`button-nav-${item.name}`}
                >
                  {item.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-5 py-[10px] rounded-[10px]"
              style={{
                background: 'rgba(255, 255, 255, 0.4)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}>
              <div className="w-6 h-6 rounded-full bg-[#008FED]" />
              <span className="text-base font-bold text-[#0C0C0C] leading-[128%] tracking-[-0.02em]">
                {user?.name || "사용자"}
              </span>
              <span className="px-2 py-1 rounded-md bg-[rgba(0,143,237,0.1)] text-xs font-medium text-[#008FED]">
                {user?.role || "관리자"}
              </span>
            </div>

            <Button
              onClick={handleLogout}
              variant="ghost"
              className="h-11 px-6 text-base font-semibold"
              data-testid="button-logout"
            >
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 w-full px-4 py-3"
        style={{
          height: '58px',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        }}>
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-2" data-testid="link-home-mobile">
            <div className="w-6 h-6 bg-[#0C0C0C] rounded-[5px]" />
            <span className="text-lg font-bold text-[#0C0C0C] tracking-[-0.02em] leading-[128%]">
              FLOXN
            </span>
          </div>

          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="h-9 px-4 text-sm font-semibold"
            data-testid="button-logout-mobile"
          >
            로그아웃
          </Button>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex relative z-10 px-4 lg:px-8 pb-8 gap-8">
        {/* Sidebar - Desktop only */}
        <aside className="hidden lg:block sticky top-[105px] h-fit w-[280px] flex-shrink-0 p-6 rounded-[20px]"
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
          }}>
          <div className="mb-5 px-4 py-2 rounded-lg text-lg font-semibold text-[rgba(12,12,12,0.6)] leading-[128%] tracking-[-0.02em]"
            style={{
              background: 'rgba(12, 12, 12, 0.03)',
            }}>
            통계 및 정산
          </div>

          <div className="flex flex-col px-3 gap-[7px]">
            <button
              onClick={() => {
                setActiveSubMenu("statistics");
                setLocation("/statistics");
              }}
              className={`flex items-center gap-2 px-5 py-[10px] h-12 rounded-[10px] text-base font-bold leading-[128%] tracking-[-0.02em] transition-all ${
                activeSubMenu === "statistics"
                  ? "bg-[rgba(12,12,12,0.08)] text-[#008FED]"
                  : "text-[rgba(12,12,12,0.4)] hover:bg-[rgba(12,12,12,0.03)]"
              }`}
              data-testid="button-submenu-statistics"
            >
              통계 및 정산
            </button>

            <button
              onClick={() => setActiveSubMenu("settlements")}
              className={`flex items-center gap-2 px-5 py-[10px] h-12 rounded-[10px] text-base font-bold leading-[128%] tracking-[-0.02em] transition-all ${
                activeSubMenu === "settlements"
                  ? "bg-[rgba(12,12,12,0.08)] text-[#008FED]"
                  : "text-[rgba(12,12,12,0.4)] hover:bg-[rgba(12,12,12,0.03)]"
              }`}
              data-testid="button-submenu-settlements"
            >
              정산조회
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <div className="p-6 lg:p-8 rounded-[20px]"
            style={{
              background: 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
            }}>
            
            {/* Title */}
            <div className="flex items-center gap-2 mb-6">
              <h1 className="text-2xl lg:text-[28px] font-bold text-[#0C0C0C] leading-[128%] tracking-[-0.02em]">
                정산 조회
              </h1>
              <div className="w-2 h-2 rounded-full bg-[#008FED]" />
            </div>

            {/* 조회하기 Section */}
            <div className="mb-8 p-6 rounded-[16px] bg-white/60">
              <h2 className="text-lg font-bold text-[#0C0C0C] mb-4">조회하기</h2>
              
              <div className="space-y-3">
                <label className="block text-sm font-medium text-[rgba(12,12,12,0.6)]">검색</label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgba(12,12,12,0.4)]" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="광범위한 직접 검색"
                      className="pl-12 h-12 bg-white border-[rgba(12,12,12,0.1)]"
                      data-testid="input-search-settlements"
                    />
                  </div>
                  <Button
                    onClick={handleSearch}
                    className="h-12 px-8 bg-[#008FED] hover:bg-[#0077CC] text-white font-bold"
                    data-testid="button-search"
                  >
                    검색
                  </Button>
                </div>
              </div>
            </div>

            {/* 정산내역 Section */}
            <div className="mb-8 p-6 rounded-[16px] bg-white/60">
              <h2 className="text-lg font-bold text-[#0C0C0C] mb-4">정산내역</h2>
              
              {/* 체크박스 필터 */}
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-all"
                    checked={filterAll}
                    onCheckedChange={(checked) => setFilterAll(checked as boolean)}
                    data-testid="checkbox-filter-all"
                  />
                  <label htmlFor="filter-all" className="text-sm font-medium cursor-pointer">
                    전체
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-month"
                    checked={filterThisMonth}
                    onCheckedChange={(checked) => setFilterThisMonth(checked as boolean)}
                    data-testid="checkbox-filter-month"
                  />
                  <label htmlFor="filter-month" className="text-sm font-medium cursor-pointer">
                    이번 달
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-unpaid"
                    checked={filterUnpaid}
                    onCheckedChange={(checked) => setFilterUnpaid(checked as boolean)}
                    data-testid="checkbox-filter-unpaid"
                  />
                  <label htmlFor="filter-unpaid" className="text-sm font-medium cursor-pointer">
                    미납금
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-installment"
                    checked={filterInstallment}
                    onCheckedChange={(checked) => setFilterInstallment(checked as boolean)}
                    data-testid="checkbox-filter-installment"
                  />
                  <label htmlFor="filter-installment" className="text-sm font-medium cursor-pointer">
                    할부대상
                  </label>
                </div>
              </div>

              {/* 날짜필터 드롭다운 */}
              <div className="flex flex-wrap gap-3 mb-4">
                <Select value={periodCondition} onValueChange={setPeriodCondition}>
                  <SelectTrigger className="w-[180px] h-10 bg-white" data-testid="select-period">
                    <SelectValue placeholder="기간조건" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="option1">옵션 1</SelectItem>
                    <SelectItem value="option2">옵션 2</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={paymentPlace} onValueChange={setPaymentPlace}>
                  <SelectTrigger className="w-[180px] h-10 bg-white" data-testid="select-payment">
                    <SelectValue placeholder="납부처" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="place1">납부처 1</SelectItem>
                    <SelectItem value="place2">납부처 2</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={company} onValueChange={setCompany}>
                  <SelectTrigger className="w-[180px] h-10 bg-white" data-testid="select-company">
                    <SelectValue placeholder="업체사" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company1">업체사 1</SelectItem>
                    <SelectItem value="company2">업체사 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 선택된 필터 태그 */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedTags.map((tag) => (
                    <div
                      key={tag}
                      className="flex items-center gap-2 px-3 py-1 rounded-md bg-[#008FED]/10 text-[#008FED] text-sm font-medium"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:bg-[#008FED]/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 하단 버튼 */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleReset}
                  className="text-sm text-[rgba(12,12,12,0.4)] hover:text-[rgba(12,12,12,0.6)] underline"
                  data-testid="button-reset"
                >
                  초기화
                </button>
                <Button
                  onClick={handleConditionSearch}
                  className="h-10 px-6 bg-[#008FED] hover:bg-[#0077CC] text-white font-bold"
                  data-testid="button-condition-search"
                >
                  납부된 조건 검색하기
                </Button>
              </div>
            </div>

            {/* 결과 */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg font-bold text-[#0C0C0C]">결과</span>
                <span className="text-lg font-bold text-[#008FED]" data-testid="text-total-count">
                  {displayData.length}
                </span>
              </div>

              {/* Results Table */}
              <div className="overflow-x-auto rounded-[12px] border border-[rgba(12,12,12,0.1)]">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[rgba(12,12,12,0.03)]">
                      <th className="px-4 py-3 text-left text-sm font-bold text-[rgba(12,12,12,0.6)] whitespace-nowrap">보험사</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-[rgba(12,12,12,0.6)] whitespace-nowrap">사건번호</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-[rgba(12,12,12,0.6)] whitespace-nowrap">담사서</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-[rgba(12,12,12,0.6)] whitespace-nowrap">심사담당자</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-[rgba(12,12,12,0.6)] whitespace-nowrap">심사담당자 연락처</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-[rgba(12,12,12,0.6)] whitespace-nowrap">업체 담당자</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-[rgba(12,12,12,0.6)] whitespace-nowrap">품목사</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-[rgba(12,12,12,0.6)] whitespace-nowrap">공사법금</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-[rgba(12,12,12,0.6)] whitespace-nowrap">손해보상금</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-[rgba(12,12,12,0.6)] whitespace-nowrap">포함</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-[rgba(12,12,12,0.6)] whitespace-nowrap">조회</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {displayData.length > 0 ? (
                      displayData.map((item, index) => (
                        <tr key={item.id} className="border-t border-[rgba(12,12,12,0.05)]">
                          <td className="px-4 py-3 text-sm text-[#0C0C0C]">{item.insuranceCompany}</td>
                          <td className="px-4 py-3 text-sm text-[#0C0C0C]">{item.caseNumber}</td>
                          <td className="px-4 py-3 text-sm text-[#0C0C0C]">{item.damsa}</td>
                          <td className="px-4 py-3 text-sm text-[#0C0C0C]">{item.assessor}</td>
                          <td className="px-4 py-3 text-sm text-[#0C0C0C]">{item.assessorContact}</td>
                          <td className="px-4 py-3 text-sm text-[#0C0C0C]">{item.partnerManager}</td>
                          <td className="px-4 py-3 text-sm text-[#0C0C0C]">{item.item}</td>
                          <td className="px-4 py-3 text-sm text-[#0C0C0C]">{item.constructionCost}</td>
                          <td className="px-4 py-3 text-sm text-[#0C0C0C]">{item.damageCost}</td>
                          <td className="px-4 py-3 text-sm text-[#0C0C0C]">{item.included}</td>
                          <td className="px-4 py-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 text-xs"
                              data-testid={`button-view-${index}`}
                            >
                              조회
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={11} className="px-4 py-12 text-center text-sm text-[rgba(12,12,12,0.4)]">
                          조건을 선택하고 검색해주세요
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 합계 */}
            {displayData.length > 0 && (
              <div className="flex justify-end items-center gap-3 p-4 rounded-[12px] bg-[rgba(12,12,12,0.03)]">
                <span className="text-base font-bold text-[#0C0C0C]">합계</span>
                <span className="text-lg font-bold text-[#008FED]" data-testid="text-total-amount">
                  {totalAmount.toLocaleString()}원
                </span>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
