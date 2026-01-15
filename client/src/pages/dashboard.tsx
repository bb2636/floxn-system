import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User, Case, type UserFavorite, type Notice } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCaseNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Home, Star, LogOut, CalendarPlus, AlertCircle, Building2, Handshake, TrendingUp, TrendingDown, Calendar, ChevronDown, ChevronRight, X, Mail, Loader2 } from "lucide-react";
import logoIcon from "@assets/Vector_1762589710900.png";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth, startOfToday, subMonths, endOfToday, isWithinInterval, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { GlobalHeader } from "@/components/global-header";
import { DateRangeModal } from "@/components/DateRangeModal";

type PeriodType = 'all' | 'today' | 'thisMonth' | 'lastMonth' | 'custom';
type StaffTabType = 'reception' | 'pending' | 'insurance' | 'partner';

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'reception' | 'pending' | 'insurance' | 'partner'>('reception');
  const { toast } = useToast();
  const [activeMenu, setActiveMenu] = useState("홈");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const pdfContentRef = useRef<HTMLDivElement>(null);
  
  const [periodType, setPeriodType] = useState<PeriodType>('thisMonth');
  const [isPeriodSheetOpen, setIsPeriodSheetOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<{
    receivedCases: number;
    lastMonthReceivedCases: number;
    receivedCasesChange: number;
    receivedCasesChangeCount: number;
    pendingCases: number;
    lastMonthPendingCases: number;
    pendingCasesChange: number;
    pendingCasesChangeCount: number;
    insuranceUnsettledCases: number;
    insuranceUnsettledAmount: number;
    partnerUnsettledCases: number;
    partnerUnsettledAmount: number;
  }>({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!user,
  });

  const { data: allCases, isLoading: casesLoading } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
    enabled: !!user,
  });

  const { data: userFavorites = [] } = useQuery<UserFavorite[]>({
    queryKey: ["/api/favorites"],
    enabled: !!user,
  });

  const { data: notices = [] } = useQuery<Notice[]>({
    queryKey: ["/api/notices"],
    enabled: !!user && user.role === "협력사",
  });

  const { data: allUsers = [] } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/users"],
    enabled: !!user && user.role === "관리자",
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (menuName: string) => {
      await apiRequest("DELETE", `/api/favorites/${encodeURIComponent(menuName)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    },
    onError: () => {
      toast({
        title: "즐겨찾기 해제 실패",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/logout", {});
    },
    onSuccess: () => {
      queryClient.clear();
      localStorage.removeItem("rememberMe");
      
      toast({
        title: "로그아웃 완료",
        description: "안전하게 로그아웃되었습니다.",
      });

      setTimeout(() => {
        setLocation("/");
      }, 500);
    },
  });

  const filteredCasesByPeriod = useMemo(() => {
    if (!allCases) return [];
    
    const activeCases = allCases.filter(c => c.status !== '작성중');
    
    if (periodType === 'all') return activeCases;
    if (!dateRange?.from || !dateRange?.to) return activeCases;

    return activeCases.filter(c => {
      if (!c.accidentDate) return false;
      try {
        const caseDate = parseISO(c.accidentDate);
        return isWithinInterval(caseDate, { start: dateRange.from!, end: dateRange.to! });
      } catch {
        return false;
      }
    });
  }, [allCases, periodType, dateRange]);

  const filteredCasesByTab = useMemo(() => {
    if (!filteredCasesByPeriod) return [];

    switch (activeTab) {
      case 'reception':
        return filteredCasesByPeriod;
      case 'pending':
        return filteredCasesByPeriod.filter(c => 
          c.status !== '완료' && c.status !== '취소' && c.status !== '종결' && c.status !== '접수취소'
        );
      case 'insurance':
        return filteredCasesByPeriod.filter(c => c.status === '완료');
      case 'partner':
        return filteredCasesByPeriod.filter(c => c.status === '완료');
      default:
        return filteredCasesByPeriod;
    }
  }, [filteredCasesByPeriod, activeTab]);

  const staffSummary = useMemo(() => {
    if (!filteredCasesByTab || !user) return [];

    const userCaseCounts = new Map<string, { name: string; position: string; count: number; userId: string }>();

    if (user.role === '협력사') {
      filteredCasesByTab.forEach(c => {
        const managerName = c.assignedPartnerManager || '미배정';
        
        const existing = userCaseCounts.get(managerName);
        if (existing) {
          existing.count++;
        } else {
          userCaseCounts.set(managerName, {
            name: managerName,
            position: '협력사',
            count: 1,
            userId: managerName,
          });
        }
      });
    } else {
      filteredCasesByTab.forEach(c => {
        const managerName = (c as any).managerName || '미배정';

        const existing = userCaseCounts.get(managerName);
        if (existing) {
          existing.count++;
        } else {
          userCaseCounts.set(managerName, {
            name: managerName,
            position: managerName === '미배정' ? '-' : '관리자',
            count: 1,
            userId: managerName,
          });
        }
      });
    }

    return Array.from(userCaseCounts.values()).sort((a, b) => b.count - a.count);
  }, [filteredCasesByTab, user, allUsers]);

  const insuranceCompanySummary = useMemo(() => {
    if (!filteredCasesByPeriod) return [];

    const companyCounts = new Map<string, {
      name: string;
      reception: number;
      pending: number;
      insuranceUnsettled: number;
      partnerUnsettled: number;
    }>();

    filteredCasesByPeriod.forEach(c => {
      const companyName = c.insuranceCompany || '미지정';
      
      const existing = companyCounts.get(companyName);
      const isPending = c.status !== '완료' && c.status !== '취소' && c.status !== '종결' && c.status !== '접수취소';
      // 보험사 미정산: 완료 상태이면서 insuranceSettlementStatus가 '미정산'이거나 정산 전인 경우
      const insuranceStatus = (c as any).insuranceSettlementStatus;
      const partnerStatus = (c as any).partnerSettlementStatus;
      const isInsuranceUnsettled = c.status === '완료' && (!insuranceStatus || insuranceStatus === '미정산');
      // 협력사 미정산: 완료 상태이면서 partnerSettlementStatus가 '미정산'이거나 정산 전인 경우
      const isPartnerUnsettled = c.status === '완료' && (!partnerStatus || partnerStatus === '미정산');
      
      if (existing) {
        existing.reception++;
        if (isPending) existing.pending++;
        if (isInsuranceUnsettled) existing.insuranceUnsettled++;
        if (isPartnerUnsettled) existing.partnerUnsettled++;
      } else {
        companyCounts.set(companyName, {
          name: companyName,
          reception: 1,
          pending: isPending ? 1 : 0,
          insuranceUnsettled: isInsuranceUnsettled ? 1 : 0,
          partnerUnsettled: isPartnerUnsettled ? 1 : 0,
        });
      }
    });

    return Array.from(companyCounts.values()).sort((a, b) => b.reception - a.reception);
  }, [filteredCasesByPeriod]);

  const insuranceTotals = useMemo(() => {
    return insuranceCompanySummary.reduce((acc, company) => ({
      reception: acc.reception + company.reception,
      pending: acc.pending + company.pending,
      insuranceUnsettled: acc.insuranceUnsettled + company.insuranceUnsettled,
      partnerUnsettled: acc.partnerUnsettled + company.partnerUnsettled,
    }), { reception: 0, pending: 0, insuranceUnsettled: 0, partnerUnsettled: 0 });
  }, [insuranceCompanySummary]);

  const myTasks = useMemo(() => {
    if (!allCases || !user) return [];
    
    const isPartner = user.role === "협력사";
    
    const filteredCases = allCases.filter(c => {
      if (isPartner) {
        return c.assignedPartner === user.company || c.assignedTo === user.id;
      }
      return c.assignedTo === user.id;
    });
    
    return filteredCases
      .sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [allCases, user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case '작성중':
        return { text: '#0B6BFF', bg: '#E8F1FF' };
      case '제출':
        return { text: '#16A34A', bg: '#EAFBF0' };
      case '반려':
        return { text: '#EF4444', bg: '#FFECEC' };
      case '검토중':
        return { text: '#FFA500', bg: '#FFF4E5' };
      case '1차승인':
        return { text: '#9C27B0', bg: '#F3E5F5' };
      case '완료':
        return { text: '#16A34A', bg: '#EAFBF0' };
      default:
        return { text: '#808080', bg: '#F5F5F5' };
    }
  };

  const getTimeAgo = (updatedAt: string | null) => {
    if (!updatedAt) return '업데이트 시간 없음';
    
    const now = new Date();
    const updated = new Date(updatedAt);
    const diffMs = now.getTime() - updated.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `업데이트 ${diffMins}분 전`;
    } else if (diffHours < 24) {
      return `업데이트 ${diffHours}시간 전`;
    } else {
      return `업데이트 ${diffDays}일 전`;
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
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
    { name: "홈", active: true },
    { name: "접수하기", active: false },
    { name: "현장조사", active: false },
    { name: "종합진행관리", active: false },
    { name: "통계 및 정산", active: false },
    { name: "관리자 설정", active: false },
  ];

  const inquiries: { title: string; status: string }[] = [];

  const handleRemoveFavorite = (menuName: string) => {
    removeFavoriteMutation.mutate(menuName);
    toast({
      title: "즐겨찾기 해제",
      description: `"${menuName}"이(가) 즐겨찾기에서 제거되었습니다.`,
    });
  };

  const getMenuIcon = (menuName: string) => {
    switch (menuName) {
      case "홈":
        return <Home className="w-4 h-4" />;
      case "접수하기":
        return <CalendarPlus className="w-4 h-4" />;
      case "현장조사":
        return <AlertCircle className="w-4 h-4" />;
      case "종합진행관리":
        return <Building2 className="w-4 h-4" />;
      case "통계 및 정산":
        return <TrendingUp className="w-4 h-4" />;
      case "관리자 설정":
        return <Star className="w-4 h-4" />;
      default:
        return <Star className="w-4 h-4" />;
    }
  };

  const handleFavoriteClick = (menuName: string) => {
    switch (menuName) {
      case "홈":
        setLocation("/dashboard");
        break;
      case "접수하기":
        setLocation("/intake");
        break;
      case "현장조사":
        setLocation("/field-survey/management");
        break;
      case "종합진행관리":
        setLocation("/comprehensive-progress");
        break;
      case "통계 및 정산":
        setLocation("/statistics");
        break;
      case "관리자 설정":
        setLocation("/admin-settings");
        break;
    }
  };

  const getPeriodLabel = () => {
    switch (periodType) {
      case 'all':
        return '전체';
      case 'today':
        return '오늘';
      case 'thisMonth':
        return '이번 달';
      case 'lastMonth':
        return '지난 달';
      case 'custom':
        if (dateRange?.from && dateRange?.to) {
          return `${format(dateRange.from, 'M/d', { locale: ko })} - ${format(dateRange.to, 'M/d', { locale: ko })}`;
        }
        return '날짜 선택';
      default:
        return '이번 달';
    }
  };

  const handlePeriodSelect = (type: PeriodType) => {
    setPeriodType(type);
    
    const today = startOfToday();
    const lastMonth = subMonths(today, 1);
    
    switch (type) {
      case 'all':
        setDateRange(undefined);
        setIsPeriodSheetOpen(false);
        break;
      case 'today':
        setDateRange({ from: today, to: endOfToday() });
        setIsPeriodSheetOpen(false);
        break;
      case 'thisMonth':
        setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
        setIsPeriodSheetOpen(false);
        break;
      case 'lastMonth':
        setDateRange({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
        setIsPeriodSheetOpen(false);
        break;
      case 'custom':
        setIsPeriodSheetOpen(false);
        setIsDateRangeModalOpen(true);
        break;
    }
  };

  const handleDateRangeApply = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setDateRange(range);
      setPeriodType('custom');
      toast({
        title: "기간 설정 완료",
        description: `${format(range.from, 'yyyy-MM-dd')} ~ ${format(range.to, 'yyyy-MM-dd')}`,
      });
    }
  };

  const handlePdfTest = async () => {
    if (!pdfContentRef.current) {
      toast({
        title: "PDF 생성 실패",
        description: "변환할 홈 정보를 찾을 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPdf(true);

    try {
      const html2pdf = (await import("@/lib/html2pdf")).default;

      await html2pdf()
        .set({
          margin: 10,
          filename: "floxen-home.pdf",
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(pdfContentRef.current)
        .save();

      toast({
        title: "PDF 다운로드 완료",
        description: "홈 화면 정보를 PDF로 저장했습니다.",
      });
    } catch (error) {
      console.error("PDF 생성 중 오류 발생", error);
      toast({
        title: "PDF 생성 실패",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendPdfEmail = async () => {
    if (!pdfContentRef.current) {
      toast({
        title: "PDF 생성 실패",
        description: "변환할 홈 정보를 찾을 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);

    try {
      const jsPDF = (await import("jspdf")).default;
      const html2canvas = (await import("html2canvas")).default;

      const canvas = await html2canvas(pdfContentRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const usablePageHeight = pageHeight - (margin * 2);
      
      let heightLeft = imgHeight;
      let position = margin;
      let pageNumber = 0;

      while (heightLeft > 0) {
        if (pageNumber > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(
          imgData, 
          'PNG', 
          margin, 
          position - (pageNumber * usablePageHeight), 
          imgWidth, 
          imgHeight
        );
        
        heightLeft -= usablePageHeight;
        pageNumber++;
      }

      const pdfBase64 = pdf.output('datauristring').split(',')[1];

      const response = await fetch('/api/send-dashboard-pdf-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'qq8918@naver.com',
          pdfBase64,
          title: 'FLOXN 대시보드 현황',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "이메일 전송 완료",
          description: "qq8918@naver.com으로 대시보드 PDF가 전송되었습니다.",
        });
      } else {
        throw new Error(result.error || "이메일 전송에 실패했습니다");
      }
    } catch (error) {
      console.error("이메일 전송 중 오류 발생", error);
      toast({
        title: "이메일 전송 실패",
        description: error instanceof Error ? error.message : "다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <GlobalHeader />

      <main className="relative z-10 mx-auto max-w-[1400px] px-4 md:px-8 pb-14 pt-8" ref={pdfContentRef}>
        <div className="grid grid-cols-12 gap-6">
          <section className="col-span-12 lg:col-span-9 space-y-6">
            <div className="col-span-12">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold">현황 요약</h2>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="inline-flex items-center gap-2 rounded-lg border border-[#D8DEEF] bg-white/70 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-white"
                      type="button"
                      data-testid="button-period-selector-summary"
                    >
                      <span className="inline-block h-4 w-4 rounded bg-[#E7F0FF] ring-1 ring-[#CFE0FF]"></span>
                      {getPeriodLabel()}
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-28 bg-white p-1 shadow-lg rounded-lg border border-slate-200">
                    <DropdownMenuItem 
                      onClick={() => handlePeriodSelect('all')}
                      className={`text-sm py-2 px-3 cursor-pointer rounded ${periodType === 'all' ? 'bg-slate-100 font-medium' : ''}`}
                    >
                      전체
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handlePeriodSelect('today')}
                      className={`text-sm py-2 px-3 cursor-pointer rounded ${periodType === 'today' ? 'bg-slate-100 font-medium' : ''}`}
                    >
                      오늘
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handlePeriodSelect('thisMonth')}
                      className={`text-sm py-2 px-3 cursor-pointer rounded ${periodType === 'thisMonth' ? 'bg-slate-100 font-medium' : ''}`}
                    >
                      이번 달
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handlePeriodSelect('lastMonth')}
                      className={`text-sm py-2 px-3 cursor-pointer rounded ${periodType === 'lastMonth' ? 'bg-slate-100 font-medium' : ''}`}
                    >
                      지난달
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handlePeriodSelect('custom')}
                      className={`text-sm py-2 px-3 cursor-pointer rounded ${periodType === 'custom' ? 'bg-slate-100 font-medium' : ''}`}
                    >
                      날짜 선택
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="rounded-2xl bg-white/70 p-4 shadow-sm ring-1 ring-[#DDE3F3]">
                <div className="overflow-hidden rounded-xl ring-1 ring-[#E5E7EB]">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F6F7FB] text-slate-600">
                      <tr>
                        <th className="w-[120px] px-4 py-3 text-left font-semibold">분류</th>
                        <th className="px-4 py-3 text-center font-semibold">접수건</th>
                        <th className="px-4 py-3 text-center font-semibold">미결건</th>
                        <th className="px-4 py-3 text-center font-semibold">보험사 미정산</th>
                        <th className="px-4 py-3 text-center font-semibold">협력사 미정산</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEF1F7] bg-white">
                      {casesLoading ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                            로딩 중...
                          </td>
                        </tr>
                      ) : insuranceCompanySummary.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                            해당 기간에 케이스가 없습니다.
                          </td>
                        </tr>
                      ) : (
                        <>
                          {insuranceCompanySummary.map((company, index) => (
                            <tr key={index} data-testid={`summary-row-${index}`}>
                              <td className="px-4 py-4 text-left font-medium text-slate-700">
                                {company.name}
                              </td>
                              <td className="px-4 py-4 text-center font-semibold">{company.reception}</td>
                              <td className="px-4 py-4 text-center font-semibold">{company.pending}</td>
                              <td className="px-4 py-4 text-center font-semibold">{company.insuranceUnsettled}</td>
                              <td className="px-4 py-4 text-center font-semibold">
                                {company.partnerUnsettled > 0 ? company.partnerUnsettled : <span className="text-slate-400">-</span>}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-[#FBFCFF]">
                            <td className="px-4 py-4 text-left font-bold text-slate-900">전체</td>
                            <td className="px-4 py-4 text-center font-bold">{insuranceTotals.reception}</td>
                            <td className="px-4 py-4 text-center font-bold">{insuranceTotals.pending}</td>
                            <td className="px-4 py-4 text-center font-bold">{insuranceTotals.insuranceUnsettled}</td>
                            <td className="px-4 py-4 text-center font-bold">{insuranceTotals.partnerUnsettled}</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-8">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold">진행건 요약</h2>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="inline-flex items-center gap-2 rounded-lg border border-[#D8DEEF] bg-white/70 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-white"
                        type="button"
                        data-testid="button-period-selector-progress"
                      >
                        <span className="inline-block h-4 w-4 rounded bg-[#E7F0FF] ring-1 ring-[#CFE0FF]"></span>
                        {getPeriodLabel()}
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-28 bg-white p-1 shadow-lg rounded-lg border border-slate-200">
                      <DropdownMenuItem 
                        onClick={() => handlePeriodSelect('all')}
                        className={`text-sm py-2 px-3 cursor-pointer rounded ${periodType === 'all' ? 'bg-slate-100 font-medium' : ''}`}
                      >
                        전체
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handlePeriodSelect('today')}
                        className={`text-sm py-2 px-3 cursor-pointer rounded ${periodType === 'today' ? 'bg-slate-100 font-medium' : ''}`}
                      >
                        오늘
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handlePeriodSelect('thisMonth')}
                        className={`text-sm py-2 px-3 cursor-pointer rounded ${periodType === 'thisMonth' ? 'bg-slate-100 font-medium' : ''}`}
                      >
                        이번 달
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handlePeriodSelect('lastMonth')}
                        className={`text-sm py-2 px-3 cursor-pointer rounded ${periodType === 'lastMonth' ? 'bg-slate-100 font-medium' : ''}`}
                      >
                        지난달
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handlePeriodSelect('custom')}
                        className={`text-sm py-2 px-3 cursor-pointer rounded ${periodType === 'custom' ? 'bg-slate-100 font-medium' : ''}`}
                      >
                        날짜 선택
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-[#DDE3F3]">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setActiveTab('reception')}
                      className={activeTab === 'reception' 
                        ? "rounded-lg bg-[#0B6BFF] px-5 py-2 text-sm font-bold text-white shadow-sm"
                        : "rounded-lg bg-white px-5 py-2 text-sm font-semibold text-slate-600 ring-1 ring-[#E5E7EB] hover:bg-slate-50"
                      }
                      type="button"
                      data-testid="tab-reception"
                    >
                      접수
                    </button>
                    <button
                      onClick={() => setActiveTab('pending')}
                      className={activeTab === 'pending'
                        ? "rounded-lg bg-[#0B6BFF] px-5 py-2 text-sm font-bold text-white shadow-sm"
                        : "rounded-lg bg-white px-5 py-2 text-sm font-semibold text-slate-600 ring-1 ring-[#E5E7EB] hover:bg-slate-50"
                      }
                      type="button"
                      data-testid="tab-pending"
                    >
                      미결
                    </button>
                    <button
                      onClick={() => setActiveTab('insurance')}
                      className={activeTab === 'insurance'
                        ? "rounded-lg bg-[#0B6BFF] px-5 py-2 text-sm font-bold text-white shadow-sm"
                        : "rounded-lg bg-white px-5 py-2 text-sm font-semibold text-slate-600 ring-1 ring-[#E5E7EB] hover:bg-slate-50"
                      }
                      type="button"
                      data-testid="tab-insurance"
                    >
                      보험사 미정산
                    </button>
                    <button
                      onClick={() => setActiveTab('partner')}
                      className={activeTab === 'partner'
                        ? "rounded-lg bg-[#0B6BFF] px-5 py-2 text-sm font-bold text-white shadow-sm"
                        : "rounded-lg bg-white px-5 py-2 text-sm font-semibold text-slate-600 ring-1 ring-[#E5E7EB] hover:bg-slate-50"
                      }
                      type="button"
                      data-testid="tab-partner"
                    >
                      협력사 미정산
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-12 items-center rounded-xl bg-[#F6F7FB] px-4 py-3 text-sm font-semibold text-slate-600">
                    <div className="col-span-5">프로필</div>
                    <div className="col-span-3 text-center">성함</div>
                    <div className="col-span-2 text-center">직책</div>
                    <div className="col-span-2 text-center">건수</div>
                  </div>

                  <div className="mt-2 divide-y divide-[#EEF1F7] rounded-xl bg-white ring-1 ring-[#E5E7EB]">
                    {casesLoading ? (
                      <div className="px-4 py-8 text-center text-slate-500">
                        로딩 중...
                      </div>
                    ) : staffSummary.length === 0 ? (
                      <div className="px-4 py-8 text-center text-slate-500">
                        해당 기간에 케이스가 없습니다.
                      </div>
                    ) : (
                      staffSummary.slice(0, 5).map((staff, index) => (
                        <div 
                          key={index} 
                          className="grid grid-cols-12 items-center px-4 py-4 text-sm"
                          data-testid={`staff-row-${index}`}
                        >
                          <div className="col-span-5 flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-[#CFE2FF] flex items-center justify-center">
                              <span className="text-sm font-semibold text-[#0B6BFF]">
                                {staff.name.charAt(0)}
                              </span>
                            </div>
                            <div className="font-semibold text-slate-900">{staff.name}</div>
                          </div>
                          <div className="col-span-3 text-center text-slate-700">{staff.name}</div>
                          <div className="col-span-2 text-center text-slate-700">{staff.position}</div>
                          <div className="col-span-2 text-center font-semibold">{staff.count}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold">내 작업</h2>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="inline-flex items-center gap-2 rounded-lg border border-[#D8DEEF] bg-white/70 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-white"
                        type="button"
                        data-testid="button-period-selector-tasks"
                      >
                        <span className="inline-block h-4 w-4 rounded bg-[#E7F0FF] ring-1 ring-[#CFE0FF]"></span>
                        {getPeriodLabel()}
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-28 bg-white p-1 shadow-lg rounded-lg border border-slate-200">
                      <DropdownMenuItem 
                        onClick={() => handlePeriodSelect('all')}
                        className={`text-sm py-2 px-3 cursor-pointer rounded ${periodType === 'all' ? 'bg-slate-100 font-medium' : ''}`}
                      >
                        전체
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handlePeriodSelect('today')}
                        className={`text-sm py-2 px-3 cursor-pointer rounded ${periodType === 'today' ? 'bg-slate-100 font-medium' : ''}`}
                      >
                        오늘
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handlePeriodSelect('thisMonth')}
                        className={`text-sm py-2 px-3 cursor-pointer rounded ${periodType === 'thisMonth' ? 'bg-slate-100 font-medium' : ''}`}
                      >
                        이번 달
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handlePeriodSelect('lastMonth')}
                        className={`text-sm py-2 px-3 cursor-pointer rounded ${periodType === 'lastMonth' ? 'bg-slate-100 font-medium' : ''}`}
                      >
                        지난달
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handlePeriodSelect('custom')}
                        className={`text-sm py-2 px-3 cursor-pointer rounded ${periodType === 'custom' ? 'bg-slate-100 font-medium' : ''}`}
                      >
                        날짜 선택
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-[#DDE3F3]">
                  <div className="text-sm text-slate-700">
                    총 <span className="font-bold">{myTasks.length}건</span>의 업데이트
                  </div>

                  <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                    {myTasks.length === 0 ? (
                      <div className="text-center text-slate-500 py-8">
                        맡은 작업이 없습니다
                      </div>
                    ) : (
                      myTasks.map((task, index) => {
                        const statusStyle = getStatusColor(task.status || '작성중');
                        return (
                          <div
                            key={task.id}
                            className="flex items-start justify-between gap-3 rounded-xl bg-white p-4 ring-1 ring-[#E5E7EB] cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => {
                              localStorage.setItem('selectedFieldSurveyCaseId', task.id);
                              setLocation('/field-survey/management');
                            }}
                            data-testid={`task-item-${index}`}
                          >
                            <div className="min-w-0">
                              <span
                                className="inline-flex items-center rounded-full px-2 py-1 text-xs font-bold"
                                style={{ 
                                  backgroundColor: statusStyle.bg,
                                  color: statusStyle.text
                                }}
                              >
                                {task.status || '작성중'}
                              </span>
                              <div className="mt-2 font-bold text-slate-900">
                                {formatCaseNumber(task.caseNumber)}
                              </div>
                              <div className="mt-1 text-sm text-slate-500">
                                사고번호 : {task.insuranceAccidentNo || '미정'}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className="text-xs text-slate-400">
                                {getTimeAgo(task.updatedAt)}
                              </span>
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="col-span-12 lg:col-span-3 space-y-6">
            <div className="rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-[#D1DBF0]">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">내 프로필</h3>
                <button
                  onClick={() => logoutMutation.mutate()}
                  className="text-sm font-semibold text-[#0B6BFF]"
                  data-testid="button-logout"
                >
                  로그아웃
                </button>
              </div>

              <div className="mt-5 grid place-items-center">
                <div className="h-20 w-20 rounded-full bg-[#C5D6F5] flex items-center justify-center">
                  <span className="text-2xl font-semibold text-[#0B6BFF]">
                    {user.name?.charAt(0) || user.username?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="mt-3 text-center">
                  <div className="font-semibold">
                    {user.name || user.username} <span className="font-normal">{user.position || '사원'}</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    {user.email || `${user.username}@example.com`}
                  </div>
                </div>
              </div>
            </div>

            {user.role === "협력사" ? (
              <div className="rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-[#DDE3F3]">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">
                    공지사항 <span className="ml-1 text-xs font-bold text-[#EF4444]">필독</span>
                  </h3>
                  <button
                    className="rounded-lg bg-[#EAF2FF] px-3 py-2 text-sm font-semibold text-[#0B6BFF] hover:bg-[#DDEBFF]"
                    type="button"
                  >
                    더보기
                  </button>
                </div>

                <ul className="mt-4 space-y-3 text-sm text-slate-700">
                  {notices.length === 0 ? (
                    <>
                      <li className="leading-6">사고·개인정보 외부 전송 금지 (메일/메신저 포함)</li>
                      <li className="leading-6">승인 전 임의 공사 지시 금지</li>
                      <li className="leading-6">정산 데이터 수기 가공 금지 (검증 절차 필수)</li>
                    </>
                  ) : (
                    notices.slice(0, 3).map((notice) => (
                      <li key={notice.id} className="leading-6">{notice.title}</li>
                    ))
                  )}
                </ul>
              </div>
            ) : (
              <div className="rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-[#DDE3F3]">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">
                    공지사항 <span className="ml-1 text-xs font-bold text-[#EF4444]">필독</span>
                  </h3>
                  <button
                    className="rounded-lg bg-[#EAF2FF] px-3 py-2 text-sm font-semibold text-[#0B6BFF] hover:bg-[#DDEBFF]"
                    type="button"
                  >
                    더보기
                  </button>
                </div>

                <ul className="mt-4 space-y-3 text-sm text-slate-700">
                  <li className="leading-6">사고·개인정보 외부 전송 금지 (메일/메신저 포함)</li>
                  <li className="leading-6">승인 전 임의 공사 지시 금지</li>
                  <li className="leading-6">정산 데이터 수기 가공 금지 (검증 절차 필수)</li>
                </ul>
              </div>
            )}

            <div className="rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-[#DDE3F3]">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">1:1 문의</h3>
                <button
                  className="rounded-lg bg-[#EAF2FF] px-3 py-2 text-sm font-semibold text-[#0B6BFF] hover:bg-[#DDEBFF]"
                  type="button"
                >
                  새 문의
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-700">
                {inquiries.length === 0 ? (
                  <div className="text-center text-slate-500 py-4">
                    문의 내역이 없습니다
                  </div>
                ) : (
                  inquiries.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span>{item.title}</span>
                      <span className="text-slate-500">{item.status}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-[#DDE3F3]">
              <h3 className="font-bold mb-4">즐겨찾기</h3>
              
              <div className="space-y-2">
                {userFavorites.length === 0 ? (
                  <div className="text-center text-slate-500 py-4 text-sm">
                    즐겨찾기가 없습니다
                  </div>
                ) : (
                  userFavorites.map((favorite, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                      onClick={() => handleFavoriteClick(favorite.menuName)}
                    >
                      <div className="flex items-center gap-2">
                        {getMenuIcon(favorite.menuName)}
                        <span className="text-sm">{favorite.menuName}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFavorite(favorite.menuName);
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Sheet open={isPeriodSheetOpen} onOpenChange={setIsPeriodSheetOpen}>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader>
            <SheetTitle>기간 선택</SheetTitle>
          </SheetHeader>
          <div className="grid gap-2 py-4">
            <Button 
              variant={periodType === 'all' ? 'default' : 'outline'}
              onClick={() => handlePeriodSelect('all')}
              className="justify-start"
            >
              전체
            </Button>
            <Button 
              variant={periodType === 'today' ? 'default' : 'outline'}
              onClick={() => handlePeriodSelect('today')}
              className="justify-start"
            >
              오늘
            </Button>
            <Button 
              variant={periodType === 'thisMonth' ? 'default' : 'outline'}
              onClick={() => handlePeriodSelect('thisMonth')}
              className="justify-start"
            >
              이번 달
            </Button>
            <Button 
              variant={periodType === 'lastMonth' ? 'default' : 'outline'}
              onClick={() => handlePeriodSelect('lastMonth')}
              className="justify-start"
            >
              지난 달
            </Button>
            <Button 
              variant={periodType === 'custom' ? 'default' : 'outline'}
              onClick={() => handlePeriodSelect('custom')}
              className="justify-start"
            >
              날짜 선택
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <DateRangeModal
        isOpen={isDateRangeModalOpen}
        onClose={() => setIsDateRangeModalOpen(false)}
        dateRange={dateRange}
        onApply={handleDateRangeApply}
      />
    </div>
  );
}
