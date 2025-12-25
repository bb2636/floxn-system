import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { User, MasterData, Case } from "@shared/schema";
import { formatCaseNumber } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Star, Minus, HelpCircle, ChevronDown, ChevronUp, X, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import logoIcon from "@assets/Frame 2_1762217940686.png";
import { GlobalHeader } from "@/components/global-header";
import { SmsNotificationDialog } from "@/components/sms-notification-dialog";

// 피보험자 주소에서 지역 키워드 추출
const extractCityFromAddress = (address: string): string => {
  if (!address) return "";
  
  // 1. 광역시/특별시 패턴
  const specialCityMatch = address.match(/(서울|부산|대구|인천|광주|대전|울산|세종)/);
  if (specialCityMatch) return specialCityMatch[1];
  
  // 2. XXX시 패턴 (예: "경기도 성남시" -> "성남")
  const cityMatch = address.match(/([가-힣]+)시/);
  if (cityMatch) return cityMatch[1];
  
  // 3. XXX구 패턴 (예: "강남구" -> "강남")
  const guMatch = address.match(/([가-힣]+)구/);
  if (guMatch) return guMatch[1];
  
  // 4. 공백이나 슬래시로 분리된 마지막 단어 (예: "경기 일산" -> "일산", "경기/분당" -> "분당")
  const parts = address.trim().split(/[\s/]+/).filter(p => p.length > 0);
  if (parts.length > 1) {
    // "도"로 끝나는 단어는 제외 (예: "경기도" 제외)
    const lastPart = parts[parts.length - 1];
    if (!lastPart.endsWith("도")) {
      return lastPart;
    }
    // 마지막에서 두 번째 단어 시도
    if (parts.length > 2) {
      return parts[parts.length - 2];
    }
  }
  
  return address.trim();
};

interface IntakeProps {
  isModal?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  initialCaseId?: string | null;
  readOnly?: boolean;
}

export default function Intake({ isModal = false, onClose, onSuccess, initialCaseId = null, readOnly = false }: IntakeProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeMenu, setActiveMenu] = useState("접수하기");
  
  // Collapsible states - 3 main sections
  const [basicInfoOpen, setBasicInfoOpen] = useState(true);
  const [insuredVictimInfoOpen, setInsuredVictimInfoOpen] = useState(true);
  const [accidentDamageInfoOpen, setAccidentDamageInfoOpen] = useState(true);
  
  const [sameAsPolicyHolder, setSameAsPolicyHolder] = useState(false);
  const [additionalVictims, setAdditionalVictims] = useState<Array<{name: string, phone: string, address: string}>>([]);
  
  // 접수일자 캘린더 관련 상태
  const [accidentDate, setAccidentDate] = useState<Date | undefined>(() => new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  // 접수번호 예측을 위한 상태
  const [predictedPrefix, setPredictedPrefix] = useState<string>("");
  const [predictedSuffix, setPredictedSuffix] = useState<number>(0);
  
  // 기존 케이스 편집 시 실제 접수번호 저장
  const [loadedCaseNumber, setLoadedCaseNumber] = useState<string | null>(null);
  
  // 협력사 검색 팝업 상태
  const [isPartnerSearchOpen, setIsPartnerSearchOpen] = useState(false);
  const [partnerSearchQuery, setPartnerSearchQuery] = useState("");
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [tempSelectedPartner, setTempSelectedPartner] = useState<any>(null);
  
  // 의뢰사 검색 팝업 상태
  const [isClientSearchOpen, setIsClientSearchOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [tempSelectedClient, setTempSelectedClient] = useState<any>(null);
  
  // 심사사 검색 팝업 상태
  const [isAssessorSearchOpen, setIsAssessorSearchOpen] = useState(false);
  const [assessorSearchQuery, setAssessorSearchQuery] = useState("");
  const [tempSelectedAssessor, setTempSelectedAssessor] = useState<any>(null);
  
  // 조사사(손사명) 검색 팝업 상태
  const [isInvestigatorSearchOpen, setIsInvestigatorSearchOpen] = useState(false);
  const [investigatorSearchQuery, setInvestigatorSearchQuery] = useState("");
  const [tempSelectedInvestigator, setTempSelectedInvestigator] = useState<any>(null);
  
  // 다음 포스트코드 상태 (피보험자 주소)
  const [showInsuredAddressSearch, setShowInsuredAddressSearch] = useState(false);
  
  // SMS 발송 상태
  const [isSendingSms, setIsSendingSms] = useState(false);
  
  // SMS 알림 다이얼로그 상태
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [completedCase, setCompletedCase] = useState<Case | null>(null);
  
  // 협력사 통계 가져오기
  const { data: partnerStats } = useQuery<Array<{
    partnerName: string;
    dailyCount: number;
    monthlyCount: number;
    inProgressCount: number;
    pendingCount: number;
  }>>({
    queryKey: ["/api/partner-stats"],
  });
  
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // 마스터 데이터 조회 (드롭다운 연동용)
  const { data: masterDataList = [] } = useQuery<MasterData[]>({
    queryKey: ["/api/master-data"],
  });

  // 마스터 데이터에서 카테고리별 항목 추출 함수
  const getMasterDataOptions = (category: string) => {
    return masterDataList
      .filter(item => item.category === category && item.isActive === "true")
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(item => item.value);
  };

  // 즐겨찾기 목록 가져오기
  const { data: favorites = [] } = useQuery<Array<{ id: string; userId: string; menuName: string }>>({
    queryKey: ["/api/favorites"],
  });

  // 현재 페이지가 즐겨찾기에 있는지 확인
  const isFavorite = favorites.some(f => f.menuName === "접수하기");

  // 즐겨찾기 추가
  const addFavoriteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/favorites", { menuName: "접수하기" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        description: "즐겨찾기에 추가되었습니다.",
        duration: 2000,
      });
    },
    onError: () => {
      toast({
        description: "즐겨찾기 추가에 실패했습니다.",
        variant: "destructive",
        duration: 2000,
      });
    },
  });

  // 즐겨찾기 제거
  const removeFavoriteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", "/api/favorites/접수하기");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        description: "즐겨찾기에서 제거되었습니다.",
        duration: 2000,
      });
    },
    onError: () => {
      toast({
        description: "즐겨찾기 제거에 실패했습니다.",
        variant: "destructive",
        duration: 2000,
      });
    },
  });

  // 즐겨찾기 토글
  const handleToggleFavorite = () => {
    if (isFavorite) {
      removeFavoriteMutation.mutate();
    } else {
      addFavoriteMutation.mutate();
    }
  };

  const { data: assessors } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(u => u.role === "심사사"),
  });

  // 조사사 목록 가져오기
  const { data: investigators } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(u => u.role === "조사사"),
  });

  // 보험사 직원 목록 가져오기
  const { data: insuranceEmployees } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(u => u.role === "보험사"),
  });

  // 모든 사용자 가져오기 (의뢰사 회사 목록 추출용)
  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // 협력사 목록 가져오기 (회사별로 그룹화)
  const { data: partners } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(u => u.role === "협력사"),
  });

  // 관리자 목록 가져오기
  const { data: administrators } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(u => u.role === "관리자"),
  });

  // 보험사 목록 가져오기 (DB에서 동적으로)
  const { data: insuranceCompanies = [] } = useQuery<string[]>({
    queryKey: ["/api/insurance-companies"],
  });

  // 협력사 회사 목록 (중복 제거)
  const partnerCompanies = useMemo(() => {
    if (!partners) return [];
    const companies = new Set(partners.map(p => p.company));
    return Array.from(companies);
  }, [partners]);

  // 협력사와 통계 결합
  const partnersWithStats = useMemo(() => {
    if (!partners || !partnerStats) return [];
    
    const uniqueCompanies = Array.from(new Set(partners.map(p => p.company)));
    
    return uniqueCompanies.map(companyName => {
      const stats = partnerStats.find(s => s.partnerName === companyName);
      const partnerUser = partners.find(p => p.company === companyName);
      
      return {
        name: companyName,
        dailyCount: stats?.dailyCount || 0,
        monthlyCount: stats?.monthlyCount || 0,
        inProgressCount: stats?.inProgressCount || 0,
        pendingCount: stats?.pendingCount || 0,
        region: partnerUser?.serviceRegions?.join(", ") || "",
      };
    });
  }, [partners, partnerStats]);

  // 선택된 협력사의 담당자 목록
  const partnerManagers = useMemo(() => {
    if (!selectedPartner || !partners) return [];
    return partners.filter(p => p.company === selectedPartner.name);
  }, [selectedPartner, partners]);

  // 오늘 날짜를 YYYY-MM-DD 형식으로 반환
  const getTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [editCaseId, setEditCaseId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    // 담당자 정보
    managerId: "",
    managerDepartment: "",
    managerPosition: "",
    managerContact: "",
    // 기본 정보
    accidentDate: getTodayDate(),
    insuranceCompany: "",
    insurancePolicyNo: "",
    insuranceAccidentNo: "",
    clientResidence: "",
    clientDepartment: "",
    clientName: "",
    clientContact: "",
    assessorId: "",
    assessorDepartment: "",
    assessorTeam: "",
    assessorContact: "",
    investigatorTeam: "",
    investigatorDepartment: "",
    investigatorTeamName: "",
    investigatorContact: "",
    policyHolderName: "",
    policyHolderIdNumber: "",
    policyHolderAddress: "",
    insuredName: "",
    insuredIdNumber: "",
    insuredContact: "",
    insuredAddress: "",
    insuredAddressDetail: "",
    victimName: "",
    victimContact: "",
    victimAddress: "",
    accompaniedPerson: "",
    // 사고 및 피해사항
    accidentType: "",
    accidentCause: "",
    restorationMethod: "",
    otherVendorEstimate: "",
    accidentDescription: "",
    damageItem: "",
    damageType: "",
    damageQuantity: "1",
    damageDetails: "",
    damageItems: [] as Array<{
      item: string;
      type: string;
      quantity: string;
      details: string;
    }>,
    damagePreventionCost: false,
    victimIncidentAssistance: false,
    assignedPartner: "",
    assignedPartnerManager: "",
    assignedPartnerContact: "",
    urgency: "",
    specialRequests: "",
  });

  // 검색어로 필터링된 협력사 목록
  const filteredPartners = useMemo(() => {
    // 검색어가 있으면 모든 협력사에서 검색
    if (partnerSearchQuery) {
      return partnersWithStats.filter(p => 
        p.name.toLowerCase().includes(partnerSearchQuery.toLowerCase())
      );
    }
    
    // 피보험자 주소가 있으면 지역 협력사 표시
    const city = extractCityFromAddress(formData.insuredAddress);
    if (city) {
      const regionFiltered = partnersWithStats.filter(p => {
        // 협력사의 서비스 지역에 해당 키워드가 포함되어 있는지 확인
        return p.region.includes(city);
      });
      // 지역 협력사가 있으면 반환, 없으면 전체 협력사 반환
      if (regionFiltered.length > 0) {
        return regionFiltered;
      }
    }
    
    // 주소가 없거나 해당 지역 협력사가 없으면 전체 협력사 리스트 반환
    return partnersWithStats;
  }, [partnerSearchQuery, partnersWithStats, formData.insuredAddress]);

  // 모든 회사 목록 (중복 제거)
  const allCompanies = useMemo(() => {
    if (!allUsers) return [];
    const companies = new Set(allUsers.map(u => u.company));
    return Array.from(companies).sort();
  }, [allUsers]);

  // 선택된 의뢰사에 해당하는 직원 필터링
  const filteredClientEmployees = useMemo(() => {
    if (!formData.clientResidence || !allUsers) {
      return [];
    }
    return allUsers.filter(
      emp => emp.company === formData.clientResidence
    );
  }, [formData.clientResidence, allUsers]);

  // 선택된 심사사에 해당하는 심사자(직원) 필터링
  const filteredAssessorEmployees = useMemo(() => {
    if (!formData.assessorId || !assessors) {
      return [];
    }
    return assessors.filter(
      emp => emp.company === formData.assessorId
    );
  }, [formData.assessorId, assessors]);

  // 선택된 손사명(조사사)에 해당하는 조사자 필터링
  const filteredInvestigatorEmployees = useMemo(() => {
    if (!formData.investigatorTeam || !investigators) {
      return [];
    }
    return investigators.filter(
      emp => (emp.company === formData.investigatorTeam)
    );
  }, [formData.investigatorTeam, investigators]);

  // 조사사 회사명 목록 (중복 제거)
  const investigatorCompanies = useMemo(() => {
    if (!investigators) {
      return [];
    }
    const companies = investigators
      .map(inv => inv.company)
      .filter((company): company is string => !!company);
    return Array.from(new Set(companies));
  }, [investigators]);

  // 의뢰사 회사명 목록 (중복 제거) - 관리자와 협력사 제외
  const clientCompanies = useMemo(() => {
    if (!allUsers) {
      return [];
    }
    const companies = allUsers
      .filter(u => u.role !== "관리자" && u.role !== "협력사")
      .map(u => u.company)
      .filter((company): company is string => !!company);
    return Array.from(new Set(companies));
  }, [allUsers]);

  // 심사사 회사명 목록 (중복 제거)
  const assessorCompanies = useMemo(() => {
    if (!assessors) {
      return [];
    }
    const companies = assessors
      .map(a => a.company)
      .filter((company): company is string => !!company);
    return Array.from(new Set(companies));
  }, [assessors]);

  // 의뢰사 검색 필터링
  const filteredClients = useMemo(() => {
    if (!clientCompanies) return [];
    if (!clientSearchQuery) return clientCompanies.map(name => ({ name }));
    return clientCompanies
      .filter(name => name.toLowerCase().includes(clientSearchQuery.toLowerCase()))
      .map(name => ({ name }));
  }, [clientCompanies, clientSearchQuery]);

  // 심사사 검색 필터링
  const filteredAssessors = useMemo(() => {
    if (!assessorCompanies) return [];
    if (!assessorSearchQuery) return assessorCompanies.map(name => ({ name }));
    return assessorCompanies
      .filter(name => name.toLowerCase().includes(assessorSearchQuery.toLowerCase()))
      .map(name => ({ name }));
  }, [assessorCompanies, assessorSearchQuery]);

  // 조사사 검색 필터링
  const filteredInvestigators = useMemo(() => {
    if (!investigatorCompanies) return [];
    if (!investigatorSearchQuery) return investigatorCompanies.map(name => ({ name }));
    return investigatorCompanies
      .filter(name => name.toLowerCase().includes(investigatorSearchQuery.toLowerCase()))
      .map(name => ({ name }));
  }, [investigatorCompanies, investigatorSearchQuery]);

  // 예상 접수번호 계산 - 처리구분 선택에 따라 실시간 반영
  const displayCaseNumber = useMemo(() => {
    const hasDamagePrevention = formData.damagePreventionCost === true || (formData.damagePreventionCost as unknown) === "true";
    const hasVictimRecovery = formData.victimIncidentAssistance === true || (formData.victimIncidentAssistance as unknown) === "true";
    
    // 기존 케이스의 prefix 추출 또는 predictedPrefix 사용
    let basePrefix = "";
    if (loadedCaseNumber && loadedCaseNumber !== "-") {
      // 기존 케이스에서 prefix 추출
      if (loadedCaseNumber.includes('-')) {
        basePrefix = loadedCaseNumber.split('-')[0];
      } else {
        basePrefix = loadedCaseNumber;
      }
    } else if (predictedPrefix) {
      basePrefix = predictedPrefix;
    }
    
    // prefix가 없으면 안내 메시지
    if (!basePrefix) {
      return "-";
    }
    
    // 처리구분에 따른 접수번호 결정
    if (!hasDamagePrevention && !hasVictimRecovery) {
      // 아무것도 선택 안함 → "-"
      return "-";
    }
    
    if (hasDamagePrevention && hasVictimRecovery) {
      // 둘 다 선택 → -0, -1
      return `${basePrefix}-0, ${basePrefix}-1`;
    }
    
    if (hasDamagePrevention && !hasVictimRecovery) {
      // 손해방지만 선택 → -0
      return `${basePrefix}-0`;
    }
    
    // 피해세대복구만 선택 → -1 (또는 기존 suffix 유지)
    if (loadedCaseNumber && loadedCaseNumber.includes('-')) {
      const existingSuffix = loadedCaseNumber.split('-')[1];
      if (existingSuffix && existingSuffix !== '0' && parseInt(existingSuffix) >= 1) {
        return loadedCaseNumber; // 기존 피해세대 번호 유지
      }
    }
    const victimSuffix = predictedSuffix === 0 ? 1 : predictedSuffix;
    return `${basePrefix}-${victimSuffix}`;
  }, [loadedCaseNumber, predictedPrefix, predictedSuffix, formData.damagePreventionCost, formData.victimIncidentAssistance]);

  useEffect(() => {
    // 모달 모드에서는 리다이렉트하지 않음 (모달을 닫으면 됨)
    if (!isModal && !userLoading && !user) {
      setLocation("/");
    }
  }, [user, userLoading, setLocation, isModal]);

  // 다음 포스트코드 스크립트 로드
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // 접수번호 예측 - 날짜 또는 보험사고번호 변경 시
  useEffect(() => {
    const fetchPredictedCaseNumber = async () => {
      if (!formData.accidentDate) return;

      try {
        const params = new URLSearchParams({ date: formData.accidentDate });
        if (formData.insuranceAccidentNo) {
          params.append('insuranceAccidentNo', formData.insuranceAccidentNo);
        }
        
        const response = await apiRequest("GET", `/api/cases/next-sequence?${params.toString()}`);
        const data = await response.json();
        
        setPredictedPrefix(data.prefix);
        setPredictedSuffix(data.suffix);
      } catch (error) {
        console.error("Failed to fetch predicted case number:", error);
      }
    };

    fetchPredictedCaseNumber();
  }, [formData.accidentDate, formData.insuranceAccidentNo]);

  // initialCaseId prop으로 케이스 로드 (접수건 상세보기용)
  useEffect(() => {
    if (!initialCaseId) return;
    
    console.log("📥 Loading case from initialCaseId:", initialCaseId);
    setEditCaseId(initialCaseId);
    
    apiRequest("GET", `/api/cases/${initialCaseId}`)
      .then((res) => res.json())
      .then((caseData: any) => {
        console.log("✅ Case loaded from initialCaseId:", caseData);
        
        if (caseData.caseNumber) {
          setLoadedCaseNumber(caseData.caseNumber);
        }
        
        const manager = administrators?.find(a => a.id === caseData.managerId);
        
        setFormData({
          managerId: caseData.managerId || "",
          managerDepartment: manager?.department || "",
          managerPosition: manager?.position || "",
          managerContact: manager?.phone || "",
          accidentDate: caseData.accidentDate || getTodayDate(),
          insuranceCompany: caseData.insuranceCompany || "",
          insurancePolicyNo: caseData.insurancePolicyNo || "",
          insuranceAccidentNo: caseData.insuranceAccidentNo || "",
          clientResidence: caseData.clientResidence || "",
          clientDepartment: caseData.clientDepartment || "",
          clientName: caseData.clientName || "",
          clientContact: caseData.clientContact || "",
          assessorId: caseData.assessorId || "",
          assessorDepartment: caseData.assessorDepartment || "",
          assessorTeam: caseData.assessorTeam || "",
          assessorContact: caseData.assessorContact || "",
          investigatorTeam: caseData.investigatorTeam || "",
          investigatorDepartment: caseData.investigatorDepartment || "",
          investigatorTeamName: caseData.investigatorTeamName || "",
          investigatorContact: caseData.investigatorContact || "",
          policyHolderName: caseData.policyHolderName || "",
          policyHolderIdNumber: caseData.policyHolderIdNumber || "",
          policyHolderAddress: caseData.policyHolderAddress || "",
          insuredName: caseData.insuredName || "",
          insuredIdNumber: caseData.insuredIdNumber || "",
          insuredContact: caseData.insuredContact || "",
          insuredAddress: caseData.insuredAddress || "",
          insuredAddressDetail: caseData.insuredAddressDetail || "",
          victimName: caseData.victimName || "",
          victimContact: caseData.victimContact || "",
          victimAddress: caseData.victimAddress || "",
          accompaniedPerson: caseData.accompaniedPerson || "",
          accidentType: caseData.accidentType || "",
          accidentCause: caseData.accidentCause || "",
          restorationMethod: caseData.restorationMethod || "",
          otherVendorEstimate: caseData.otherVendorEstimate || "",
          accidentDescription: caseData.accidentDescription || "",
          damageItem: "",
          damageType: "",
          damageQuantity: "1",
          damageDetails: "",
          damageItems: caseData.damageItems ? JSON.parse(caseData.damageItems) : [],
          damagePreventionCost: caseData.damagePreventionCost === "true" || 
            (!caseData.damagePreventionCost && caseData.caseNumber && !caseData.caseNumber.includes('-')),
          victimIncidentAssistance: caseData.victimIncidentAssistance === "true" || 
            (!caseData.victimIncidentAssistance && caseData.caseNumber && caseData.caseNumber.includes('-')),
          assignedPartner: caseData.assignedPartner || "",
          assignedPartnerManager: caseData.assignedPartnerManager || "",
          assignedPartnerContact: caseData.assignedPartnerContact || "",
          urgency: caseData.urgency || "",
          specialRequests: caseData.specialRequests || "",
        });

        if (caseData.sameAsPolicyHolder === "true") {
          setSameAsPolicyHolder(true);
        }

        if (caseData.additionalVictims) {
          try {
            setAdditionalVictims(JSON.parse(caseData.additionalVictims));
          } catch (e) {
            console.error("Failed to parse additionalVictims:", e);
          }
        }

        if (caseData.assignedPartner) {
          setSelectedPartner({
            name: caseData.assignedPartner,
            dailyCount: 0,
            monthlyCount: 0,
            inProgressCount: 0,
            pendingCount: 0,
            region: "",
          });
        }

        if (caseData.accidentDate) {
          const dateParts = caseData.accidentDate.split('-');
          if (dateParts.length === 3) {
            const parsedDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
            setAccidentDate(parsedDate);
          }
        }
      })
      .catch((error) => {
        console.error("❌ Failed to load case:", error);
        toast({
          description: `케이스 정보를 불러오는 데 실패했습니다.`,
          variant: "destructive",
        });
      });
  }, [initialCaseId, administrators]);

  // 임시 저장 건 불러오기
  useEffect(() => {
    // initialCaseId가 있으면 localStorage 로드 건너뛰기
    if (initialCaseId) return;
    
    const storedEditCaseId = localStorage.getItem('editCaseId');
    console.log("🔍 Checking for draft case, editCaseId:", storedEditCaseId);
    
    if (storedEditCaseId) {
      // editCaseId 상태 설정
      setEditCaseId(storedEditCaseId);
      
      console.log("📥 Loading draft case:", storedEditCaseId);
      
      // 케이스 데이터 불러오기
      apiRequest("GET", `/api/cases/${storedEditCaseId}`)
        .then((res) => res.json())
        .then((caseData: any) => {
          console.log("✅ Draft case loaded successfully:", caseData);
          
          // 기존 케이스의 실제 접수번호 저장
          if (caseData.caseNumber) {
            console.log("✓ Setting loadedCaseNumber:", caseData.caseNumber);
            setLoadedCaseNumber(caseData.caseNumber);
          }
          
          // 담당자 정보 로드 (관리자)
          const manager = administrators?.find(a => a.id === caseData.managerId);
          
          // 폼 데이터 채우기
          setFormData({
            // 담당자 정보
            managerId: caseData.managerId || "",
            managerDepartment: manager?.department || "",
            managerPosition: manager?.position || "",
            managerContact: manager?.phone || "",
            // 기본 정보
            accidentDate: caseData.accidentDate || getTodayDate(),
            insuranceCompany: caseData.insuranceCompany || "",
            insurancePolicyNo: caseData.insurancePolicyNo || "",
            insuranceAccidentNo: caseData.insuranceAccidentNo || "",
            clientResidence: caseData.clientResidence || "",
            clientDepartment: caseData.clientDepartment || "",
            clientName: caseData.clientName || "",
            clientContact: caseData.clientContact || "",
            assessorId: caseData.assessorId || "",
            assessorDepartment: caseData.assessorDepartment || "",
            assessorTeam: caseData.assessorTeam || "",
            assessorContact: caseData.assessorContact || "",
            investigatorTeam: caseData.investigatorTeam || "",
            investigatorDepartment: caseData.investigatorDepartment || "",
            investigatorTeamName: caseData.investigatorTeamName || "",
            investigatorContact: caseData.investigatorContact || "",
            policyHolderName: caseData.policyHolderName || "",
            policyHolderIdNumber: caseData.policyHolderIdNumber || "",
            policyHolderAddress: caseData.policyHolderAddress || "",
            insuredName: caseData.insuredName || "",
            insuredIdNumber: caseData.insuredIdNumber || "",
            insuredContact: caseData.insuredContact || "",
            insuredAddress: caseData.insuredAddress || "",
            insuredAddressDetail: caseData.insuredAddressDetail || "",
            victimName: caseData.victimName || "",
            victimContact: caseData.victimContact || "",
            victimAddress: caseData.victimAddress || "",
            accompaniedPerson: caseData.accompaniedPerson || "",
            accidentType: caseData.accidentType || "",
            accidentCause: caseData.accidentCause || "",
            restorationMethod: caseData.restorationMethod || "",
            otherVendorEstimate: caseData.otherVendorEstimate || "",
            accidentDescription: caseData.accidentDescription || "",
            damageItem: "",
            damageType: "",
            damageQuantity: "1",
            damageDetails: "",
            damageItems: caseData.damageItems ? JSON.parse(caseData.damageItems) : [],
            // 처리구분: DB 값이 있으면 사용, 없으면 케이스 번호로 추론
            damagePreventionCost: caseData.damagePreventionCost === "true" || 
              (!caseData.damagePreventionCost && caseData.caseNumber && !caseData.caseNumber.includes('-')),
            victimIncidentAssistance: caseData.victimIncidentAssistance === "true" || 
              (!caseData.victimIncidentAssistance && caseData.caseNumber && caseData.caseNumber.includes('-')),
            assignedPartner: caseData.assignedPartner || "",
            assignedPartnerManager: caseData.assignedPartnerManager || "",
            assignedPartnerContact: caseData.assignedPartnerContact || "",
            urgency: caseData.urgency || "",
            specialRequests: caseData.specialRequests || "",
          });

          // sameAsPolicyHolder 상태 설정
          if (caseData.sameAsPolicyHolder === "true") {
            console.log("✓ Setting sameAsPolicyHolder to true");
            setSameAsPolicyHolder(true);
          }

          // additionalVictims 설정
          if (caseData.additionalVictims) {
            console.log("✓ Setting additionalVictims:", caseData.additionalVictims);
            try {
              setAdditionalVictims(JSON.parse(caseData.additionalVictims));
            } catch (e) {
              console.error("Failed to parse additionalVictims:", e);
            }
          }

          // 협력사 정보가 있으면 설정
          if (caseData.assignedPartner) {
            console.log("✓ Setting selectedPartner:", caseData.assignedPartner);
            setSelectedPartner({
              name: caseData.assignedPartner,
              dailyCount: 0,
              monthlyCount: 0,
              inProgressCount: 0,
              pendingCount: 0,
              region: "",
            });
          }

          // accidentDate 설정
          if (caseData.accidentDate) {
            const dateParts = caseData.accidentDate.split('-');
            if (dateParts.length === 3) {
              const parsedDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
              console.log("✓ Setting accidentDate:", parsedDate);
              setAccidentDate(parsedDate);
            }
          }

          toast({
            description: "임시 저장 건을 불러왔습니다. 이어서 작성해주세요.",
            duration: 3000,
          });

          // localStorage에서 editCaseId 제거 (성공 시에만)
          console.log("🧹 Removing editCaseId from localStorage");
          localStorage.removeItem('editCaseId');
        })
        .catch((error) => {
          console.error("❌ Failed to load draft case:", error);
          toast({
            description: `임시 저장 건을 불러오는 데 실패했습니다: ${error.message}`,
            variant: "destructive",
            duration: 5000,
          });
          // 에러 시에도 제거하여 무한 재시도 방지
          localStorage.removeItem('editCaseId');
        });
    }
  }, []);

  useEffect(() => {
    if (sameAsPolicyHolder) {
      setFormData((prev) => ({
        ...prev,
        insuredName: prev.policyHolderName,
        insuredIdNumber: prev.policyHolderIdNumber,
        insuredAddress: prev.policyHolderAddress,
        // insuredContact는 보험계약자에 연락처 필드가 없으므로 복사하지 않음
      }));
    }
  }, [sameAsPolicyHolder, formData.policyHolderName, formData.policyHolderIdNumber, formData.policyHolderAddress]);

  const cleanFormData = (data: typeof formData) => {
    console.log("🧹 cleanFormData - 입력 데이터 managerId:", data.managerId);
    const cleaned: any = {};
    // 스키마에 없는 필드 (users 테이블에서 조인하는 필드, 임시 입력 필드 등)
    const excludeFields = [
      'managerDepartment', 'managerPosition', 'managerContact',
      // 피해물품 추가를 위한 임시 입력 필드 (damageItems 배열에 저장됨)
      'damageItem', 'damageType', 'damageQuantity', 'damageDetails'
    ];
    
    Object.entries(data).forEach(([key, value]) => {
      // 제외 필드는 스킵
      if (excludeFields.includes(key)) return;
      
      if (value !== "" && value !== null && value !== undefined) {
        // damageItems 배열을 JSON 문자열로 변환
        if (key === "damageItems") {
          if (Array.isArray(value) && value.length > 0) {
            cleaned[key] = JSON.stringify(value);
          }
        } 
        // boolean 값을 "true"/"false" 문자열로 변환
        else if (key === "damagePreventionCost" || key === "victimIncidentAssistance") {
          cleaned[key] = value ? "true" : "false";
        } 
        else {
          cleaned[key] = value;
        }
      }
    });
    // sameAsPolicyHolder 체크박스 상태 추가 (명시적 문자열 변환)
    const sameAsPolicyHolderValue = sameAsPolicyHolder === true ? "true" : "false";
    cleaned.sameAsPolicyHolder = sameAsPolicyHolderValue;
    console.log("📌 cleanFormData - sameAsPolicyHolder state:", sameAsPolicyHolder, "(type:", typeof sameAsPolicyHolder, ") -> cleaned value:", sameAsPolicyHolderValue, "(type:", typeof sameAsPolicyHolderValue, ")");
    // additionalVictims 배열을 JSON 문자열로 변환
    if (additionalVictims.length > 0) {
      cleaned.additionalVictims = JSON.stringify(additionalVictims);
    }
    console.log("🧹 cleanFormData - 출력 데이터 managerId:", cleaned.managerId);
    return cleaned;
  };

  const saveMutation = useMutation({
    mutationFn: async (variables: { data: typeof formData; sameAsPolicyHolderValue: boolean }) => {
      const { data, sameAsPolicyHolderValue } = variables;
      // 저장 버튼은 항상 "배당대기" 상태로 저장
      const status = "배당대기";
      
      console.log("💾 저장 상태 결정:", {
        assignedPartner: data.assignedPartner,
        assignedPartnerManager: data.assignedPartnerManager,
        status,
        sameAsPolicyHolder: sameAsPolicyHolderValue
      });
      
      // 임시저장 시: caseNumber 없이 전송 (서버에서 DRAFT-{timestamp} 자동 생성)
      const cleanedData = { 
        ...cleanFormData(data), 
        status,
        // editCaseId를 포함하여 백엔드에서 draft 삭제 가능하도록
        ...(editCaseId ? { id: editCaseId } : {})
      };
      
      // sameAsPolicyHolder를 명시적으로 설정 (클로저 문제 해결)
      cleanedData.sameAsPolicyHolder = sameAsPolicyHolderValue ? "true" : "false";
      
      // 임시저장: 기존 케이스가 있으면 업데이트, 없으면 생성
      if (editCaseId) {
        return await apiRequest("PATCH", `/api/cases/${editCaseId}`, cleanedData);
      } else {
        const result = await apiRequest("POST", "/api/cases", cleanedData);
        // 새로 생성한 경우 editCaseId 설정 (응답 형식: { success: true, cases: [...] })
        if (result && typeof result === 'object' && 'cases' in result) {
          const cases = (result as any).cases;
          if (cases && cases.length > 0) {
            const newCaseId = cases[0].id;
            setEditCaseId(newCaseId);
            // localStorage에도 저장하여 "이어서 작성하기" 가능하도록
            localStorage.setItem('editCaseId', newCaseId);
          }
        }
        return result;
      }
    },
    onSuccess: () => {
      toast({ 
        description: `임시저장되었습니다. (상태: 배당대기)`, 
        duration: 2000 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      // 임시저장 성공 후 localStorage에서 임시 데이터 삭제
      localStorage.removeItem('intakeFormDraft');
    },
    onError: (error: Error) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (variables: { data: typeof formData; sameAsPolicyHolderValue: boolean }) => {
      const { data, sameAsPolicyHolderValue } = variables;
      const cleanedData = cleanFormData(data);
      
      // sameAsPolicyHolder를 명시적으로 설정 (클로저 문제 해결)
      cleanedData.sameAsPolicyHolder = sameAsPolicyHolderValue ? "true" : "false";
      console.log("📋 submitMutation - sameAsPolicyHolder:", sameAsPolicyHolderValue, "-> cleanedData:", cleanedData.sameAsPolicyHolder);
      
      console.log("📋 접수 데이터:", {
        receptionDate: data.accidentDate || getTodayDate(),
        damagePreventionCost: data.damagePreventionCost,
        victimIncidentAssistance: data.victimIncidentAssistance,
        editCaseId: editCaseId,
        sameAsPolicyHolder: cleanedData.sameAsPolicyHolder,
        managerId_from_formData: data.managerId,
        managerId_in_cleanedData: cleanedData.managerId,
        // 협력사 정보 디버그
        assignedPartner: cleanedData.assignedPartner,
        assignedPartnerManager: cleanedData.assignedPartnerManager,
        assignedPartnerContact: cleanedData.assignedPartnerContact,
      });
      
      // 백엔드가 자동으로 다중 케이스 생성 및 접수번호 생성 처리
      // editCaseId를 포함하여 백엔드에서 draft 삭제 가능하도록
      // assignedTo: 현재 로그인한 사용자
      // managerId: 드롭다운에서 선택한 당사 담당자 (선택 안하면 null)
      const payload = {
        ...cleanedData,
        status: "접수완료",
        receptionDate: data.accidentDate || getTodayDate(),
        assignedTo: user?.id || null,
        ...(editCaseId ? { id: editCaseId } : {})
      };
      
      const result = await apiRequest("POST", "/api/cases", payload);
      return result;
    },
    onSuccess: async (result, variables) => {
      // 응답 형식: { success: true, cases: [...] }
      const cases = (result && typeof result === 'object' && 'cases' in result) 
        ? (result as any).cases 
        : [];
      
      const count = cases.length;
      const caseNumbers = cases.map((c: any) => formatCaseNumber(c.caseNumber)).join(', ');
      
      toast({ 
        description: count > 1
          ? `접수가 완료되었습니다. (${count}건 생성: ${caseNumbers})` 
          : `접수가 완료되었습니다. (${caseNumbers})`,
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      // 접수완료 성공 후 localStorage에서 임시 데이터 및 editCaseId 삭제
      localStorage.removeItem('intakeFormDraft');
      localStorage.removeItem('editCaseId');
      setEditCaseId(null);
      
      // 접수완료 시 자동으로 SMS 발송 (variables.data 사용하여 클로저 문제 해결)
      const submittedData = variables.data;
      console.log("📱 SMS 자동 발송 시도 - submittedData:", {
        assignedPartnerContact: submittedData.assignedPartnerContact,
        assignedPartner: submittedData.assignedPartner,
        assignedPartnerManager: submittedData.assignedPartnerManager,
        damagePreventionCost: submittedData.damagePreventionCost,
        victimIncidentAssistance: submittedData.victimIncidentAssistance,
      });
      if (cases.length > 0) {
        const firstCase = cases[0];
        const rawPartnerContact = submittedData.assignedPartnerContact?.trim() || "";
        const partnerContact = rawPartnerContact.replace(/[^0-9]/g, "");
        console.log("📱 SMS 연락처 확인:", { rawPartnerContact, partnerContact, length: partnerContact.length });
        
        if (partnerContact.length >= 10 && partnerContact.length <= 11) {
          // 의뢰범위 생성
          const requestScopeItems = [];
          if (submittedData.damagePreventionCost === true || (submittedData.damagePreventionCost as unknown) === "true") requestScopeItems.push("손방");
          if (submittedData.victimIncidentAssistance === true || (submittedData.victimIncidentAssistance as unknown) === "true") requestScopeItems.push("대물");
          if (requestScopeItems.length === 0) requestScopeItems.push("기타");
          const requestScope = requestScopeItems.join(", ");
          
          // 담당자 이름 조회
          const managerName = submittedData.managerId 
            ? allUsers?.find(u => u.id === submittedData.managerId)?.name || user?.name || "-"
            : user?.name || "-";
          
          const smsPayload = {
            to: partnerContact,
            caseNumber: formatCaseNumber(firstCase.caseNumber),
            insuranceCompany: submittedData.insuranceCompany || "-",
            managerName: managerName,
            insurancePolicyNo: submittedData.insurancePolicyNo || "-",
            insuranceAccidentNo: submittedData.insuranceAccidentNo || "-",
            insuredName: submittedData.insuredName || "-",
            insuredContact: submittedData.insuredContact || "-",
            victimName: submittedData.victimName || "-",
            victimContact: submittedData.victimContact || "-",
            investigatorTeamName: submittedData.investigatorTeamName || "-",
            investigatorContact: submittedData.investigatorContact || "-",
            accidentLocation: submittedData.insuredAddress || "-",
            requestScope: requestScope,
          };
          
          try {
            console.log("📱 Sending SMS automatically on submit:", smsPayload);
            await apiRequest("POST", "/api/send-sms", smsPayload);
            toast({ 
              description: "접수 완료 문자가 전송되었습니다.",
              duration: 3000,
            });
          } catch (error) {
            console.error("📱 Auto SMS send failed:", error);
            toast({ 
              description: "문자 전송에 실패했습니다. 수동으로 전송해주세요.",
              variant: "destructive",
              duration: 3000,
            });
          }
        } else {
          console.log("📱 SMS not sent - invalid partner contact:", rawPartnerContact);
        }
      }
      
      // 모달 모드인 경우 onSuccess 콜백 호출
      if (isModal && onSuccess) {
        onSuccess();
      } else {
        setTimeout(() => {
          setLocation("/dashboard");
        }, 1000);
      }
    },
    onError: (error: Error) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  // 기존 케이스 수정 mutation (PATCH)
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!initialCaseId) {
        throw new Error("케이스 ID가 필요합니다");
      }
      const cleanedData = cleanFormData(data);
      cleanedData.sameAsPolicyHolder = sameAsPolicyHolder ? "true" : "false";
      
      console.log("📝 updateMutation - Updating case:", initialCaseId, cleanedData);
      
      const result = await apiRequest("PATCH", `/api/cases/${initialCaseId}`, cleanedData);
      return result;
    },
    onSuccess: () => {
      toast({ 
        description: "수정이 완료되었습니다.",
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      
      // 모달 모드인 경우 onSuccess 콜백 호출
      if (isModal && onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  // 수정하기 핸들러 (기존 케이스 업데이트)
  const handleUpdateCase = () => {
    updateMutation.mutate(formData);
  };

  // 문자전송 핸들러 (폼 데이터로 SMS 발송)
  const handleSendSms = async () => {
    // 협력사 담당자 연락처 확인
    const rawPartnerContact = formData.assignedPartnerContact?.trim() || "";
    const partnerContact = rawPartnerContact.replace(/[^0-9]/g, "");
    
    if (partnerContact.length < 10 || partnerContact.length > 11) {
      toast({
        description: "협력사 담당자 연락처가 유효하지 않습니다. 10-11자리 전화번호를 입력해주세요.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    // 의뢰범위 생성 (formData의 값은 string "true"/"false" 또는 boolean일 수 있음)
    const requestScopeItems = [];
    if (formData.damagePreventionCost === true || (formData.damagePreventionCost as unknown) === "true") requestScopeItems.push("손방");
    if (formData.victimIncidentAssistance === true || (formData.victimIncidentAssistance as unknown) === "true") requestScopeItems.push("대물");
    if (requestScopeItems.length === 0) requestScopeItems.push("기타");
    const requestScope = requestScopeItems.join(", ");
    
    // 담당자 이름 조회
    const managerName = formData.managerId 
      ? allUsers?.find(u => u.id === formData.managerId)?.name || user?.name || "-"
      : user?.name || "-";
    
    // 접수번호 (예측된 번호 또는 로드된 번호)
    const displayCaseNumber = loadedCaseNumber 
      ? formatCaseNumber(loadedCaseNumber) 
      : (predictedPrefix && predictedSuffix > 0 
          ? formatCaseNumber(`${predictedPrefix}-${String(predictedSuffix).padStart(4, '0')}`)
          : "(미생성)");
    
    const smsPayload = {
      to: partnerContact,
      caseNumber: displayCaseNumber,
      insuranceCompany: formData.insuranceCompany || "-",
      managerName: managerName,
      insurancePolicyNo: formData.insurancePolicyNo || "-",
      insuranceAccidentNo: formData.insuranceAccidentNo || "-",
      insuredName: formData.insuredName || "-",
      insuredContact: formData.insuredContact || "-",
      victimName: formData.victimName || "-",
      victimContact: formData.victimContact || "-",
      investigatorTeamName: formData.investigatorTeamName || "-",
      investigatorContact: formData.investigatorContact || "-",
      accidentLocation: formData.insuredAddress || "-",
      requestScope: requestScope,
    };
    
    setIsSendingSms(true);
    try {
      console.log("📱 Sending SMS manually:", smsPayload);
      await apiRequest("POST", "/api/send-sms", smsPayload);
      toast({ 
        description: "문자가 전송되었습니다.",
        duration: 3000,
      });
    } catch (error) {
      console.error("📱 SMS send failed:", error);
      toast({ 
        description: "문자 전송에 실패했습니다.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      // 의뢰사를 선택하면 해당 회사 사용자의 소속부서를 자동으로 설정
      if (field === "clientResidence" && value && allUsers) {
        const companyUser = allUsers.find(u => u.company === value);
        if (companyUser?.department) {
          updated.clientDepartment = companyUser.department;
        } else {
          updated.clientDepartment = "";
        }
        // 의뢰사 변경 시 의뢰자, 연락처 초기화
        updated.clientName = "";
        updated.clientContact = "";
      }
      
      // 의뢰자를 선택하면 해당 직원의 연락처를 자동으로 설정
      if (field === "clientName" && value) {
        const selectedEmployee = filteredClientEmployees.find(emp => emp.name === value);
        if (selectedEmployee) {
          updated.clientContact = selectedEmployee.phone || "";
        }
      }
      
      // 심사사를 선택하면 해당 회사 사용자의 소속부서를 자동으로 설정
      if (field === "assessorId" && value && allUsers) {
        const companyUser = allUsers.find(u => u.company === value && u.role === "심사사");
        if (companyUser?.department) {
          updated.assessorDepartment = companyUser.department;
        } else {
          updated.assessorDepartment = "";
        }
        // 심사사 변경 시 심사자, 연락처 초기화
        updated.assessorTeam = "";
        updated.assessorContact = "";
      }
      
      // 심사자를 선택하면 해당 심사자의 연락처를 자동으로 설정
      if (field === "assessorTeam" && value) {
        const selectedAssessor = filteredAssessorEmployees.find(assessor => assessor.name === value);
        if (selectedAssessor) {
          updated.assessorContact = selectedAssessor.phone || "";
        }
      }
      
      // 손사명(조사사 회사)을 선택하면 해당 회사 사용자의 소속부서를 자동으로 설정
      if (field === "investigatorTeam" && value && allUsers) {
        const companyUser = allUsers.find(u => u.company === value && u.role === "조사사");
        if (companyUser?.department) {
          updated.investigatorDepartment = companyUser.department;
        } else {
          updated.investigatorDepartment = "";
        }
        // 손사명 변경 시 조사자, 연락처 초기화
        updated.investigatorTeamName = "";
        updated.investigatorContact = "";
      }
      
      // 조사자를 선택하면 해당 조사자의 연락처를 자동으로 설정
      if (field === "investigatorTeamName" && value) {
        const selectedInvestigator = filteredInvestigatorEmployees.find(inv => inv.name === value);
        if (selectedInvestigator) {
          updated.investigatorContact = selectedInvestigator.phone || "";
        }
      }
      
      // 협력사 담당자를 선택하면 해당 담당자의 연락처를 자동으로 설정
      if (field === "assignedPartnerManager" && value) {
        const selectedManager = partnerManagers.find(manager => manager.name === value);
        if (selectedManager) {
          updated.assignedPartnerContact = selectedManager.phone || "";
        }
      }
      
      return updated;
    });
  };

  // 저장 - 서버에 "배당대기" 상태로 저장
  const handleSave = () => {
    // saveMutation을 호출하여 서버에 저장 (상태: 배당대기)
    // sameAsPolicyHolder 값을 명시적으로 전달 (클로저 문제 해결)
    saveMutation.mutate({ data: formData, sameAsPolicyHolderValue: sameAsPolicyHolder });
  };

  // 초기화
  const handleReset = () => {
    const initialFormData = {
      // 담당자 정보
      managerId: "",
      managerDepartment: "",
      managerPosition: "",
      managerContact: "",
      // 기본 정보
      accidentDate: getTodayDate(),
      insuranceCompany: "",
      insurancePolicyNo: "",
      insuranceAccidentNo: "",
      clientResidence: "",
      clientDepartment: "",
      clientName: "",
      clientContact: "",
      assessorId: "",
      assessorDepartment: "",
      assessorTeam: "",
      assessorContact: "",
      investigatorTeam: "",
      investigatorDepartment: "",
      investigatorTeamName: "",
      investigatorContact: "",
      policyHolderName: "",
      policyHolderIdNumber: "",
      policyHolderAddress: "",
      insuredName: "",
      insuredIdNumber: "",
      insuredContact: "",
      insuredAddress: "",
      insuredAddressDetail: "",
      victimName: "",
      victimContact: "",
      victimAddress: "",
      accompaniedPerson: "",
      accidentType: "",
      accidentCause: "",
      restorationMethod: "",
      otherVendorEstimate: "",
      accidentDescription: "",
      damageItem: "",
      damageType: "",
      damageQuantity: "",
      damageDetails: "",
      damageItems: [] as Array<{
        item: string;
        type: string;
        quantity: string;
        details: string;
      }>,
      damagePreventionCost: false,
      victimIncidentAssistance: false,
      assignedPartner: "",
      assignedPartnerManager: "",
      assignedPartnerContact: "",
      urgency: "",
      specialRequests: "",
    };
    
    setFormData(initialFormData);
    setAccidentDate(new Date());
    setSelectedPartner(null);
    setSameAsPolicyHolder(false);
    setAdditionalVictims([]);
    localStorage.removeItem('intakeFormDraft');
    localStorage.removeItem('editCaseId');
    setEditCaseId(null);
    
    toast({
      description: "입력 내용이 초기화되었습니다.",
      duration: 2000,
    });
  };

  // 필수 필드 검증 함수 (피해사항은 선택사항)
  const isFormValid = useMemo(() => {
    // 1. 기본 정보
    if (!formData.accidentDate) return false;
    if (!formData.insuranceCompany) return false;
    if (!formData.insuranceAccidentNo && !formData.insurancePolicyNo) return false;
    if (!formData.clientResidence) return false;
    if (!formData.clientName) return false;
    
    // 2. 피보험자 및 피해자 정보
    if (!formData.policyHolderName && !formData.insuredName) return false;
    if (!formData.victimName) return false;
    if (!formData.victimContact) return false;
    // victimAddress는 입력 필드가 없으므로 필수 체크에서 제외
    
    // 3. 사고 및 피해 현황
    if (!formData.assignedPartner) return false;
    if (!formData.assignedPartnerManager) return false;
    // 피해사항은 선택사항이므로 체크 제외
    
    return true;
  }, [formData]);

  // 접수완료 - 필수 항목 검증 후 제출
  const handleSubmit = () => {
    // Validation: 접수일자 필수
    if (!formData.accidentDate) {
      toast({
        description: "접수일자를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    // Validation: 보험사명 필수
    if (!formData.insuranceCompany) {
      toast({
        description: "보험사명을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    // Validation: 보험사 증권번호 또는 사고번호 중 하나 필수
    if (!formData.insuranceAccidentNo && !formData.insurancePolicyNo) {
      toast({
        description: "보험사 증권번호 또는 보험사 사고번호 중 하나는 반드시 입력해야 합니다.",
        variant: "destructive",
      });
      return;
    }
    
    // Validation: 의뢰사 필수
    if (!formData.clientResidence) {
      toast({
        description: "의뢰사를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    // Validation: 의뢰자 필수
    if (!formData.clientName) {
      toast({
        description: "의뢰자를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    // Validation: 보험계약자 또는 피보험자 중 하나의 성명 필수
    if (!formData.policyHolderName && !formData.insuredName) {
      toast({
        description: "보험계약자 성명 또는 피보험자 성명 중 하나는 반드시 입력해야 합니다.",
        variant: "destructive",
      });
      return;
    }
    
    // Validation: 당사 담당자 필수
    if (!formData.managerId) {
      toast({
        description: "당사 담당자를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    // Validation: 피해자 성명 필수
    if (!formData.victimName) {
      toast({
        description: "피해자 성명을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    // Validation: 피해자 연락처 필수
    if (!formData.victimContact) {
      toast({
        description: "피해자 연락처를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    // victimAddress는 입력 필드가 없으므로 검증 제외
    
    // Validation: 협력사 필수
    if (!formData.assignedPartner) {
      toast({
        description: "협력사를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    // Validation: 협력사 담당자 필수
    if (!formData.assignedPartnerManager) {
      toast({
        description: "협력사 담당자를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    // 피해사항은 선택사항이므로 필수 검증에서 제외
    
    // sameAsPolicyHolder 값을 명시적으로 전달 (클로저 문제 해결)
    submitMutation.mutate({ data: formData, sameAsPolicyHolderValue: sameAsPolicyHolder });
  };

  const handleAddDamageItem = () => {
    if (formData.damageItem && formData.damageType) {
      setFormData(prev => ({
        ...prev,
        damageItems: [...prev.damageItems, {
          item: prev.damageItem,
          type: prev.damageType,
          quantity: prev.damageQuantity || '0',
          details: prev.damageDetails,
        }],
        damageItem: '',
        damageType: '',
        damageQuantity: '',
        damageDetails: '',
      }));
    }
  };

  const handleRemoveDamageItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      damageItems: prev.damageItems.filter((_, i) => i !== index),
    }));
  };

  const menuItems = [
    { name: "홈" },
    { name: "접수하기" },
    { name: "현장조사" },
    { name: "종합진행관리" },
    { name: "통계 및 정산" },
    { name: "관리자 설정" },
  ];

  if (userLoading || !user) {
    return null;
  }

  return (
    <div className="relative" style={{ minHeight: isModal ? 'auto' : '100vh', background: isModal ? '#F5F7FA' : 'linear-gradient(0deg, #E7EDFE, #E7EDFE)' }}>
      {/* Blur Background Orbs - Only show in page mode */}
      {!isModal && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Ellipse 3 - Orange/Cream */}
          <div 
            className="absolute"
            style={{
              width: '1095px',
              height: '777px',
              left: '97px',
              bottom: '1169px',
              background: 'rgba(254, 240, 230, 0.4)',
              borderRadius: '9999px',
              filter: 'blur(212px)',
              transform: 'rotate(-35.25deg)',
            }}
          />
          {/* Ellipse 2 - Purple */}
          <div 
            className="absolute"
            style={{
              width: '1335px',
              height: '1323px',
              right: '0px',
              bottom: '0px',
              background: 'rgba(234, 230, 254, 0.5)',
              borderRadius: '9999px',
              filter: 'blur(212px)',
            }}
          />
          {/* Ellipse 4 - Purple Left */}
          <div 
            className="absolute"
            style={{
              width: '348px',
              height: '1323px',
              left: '0px',
              bottom: '189px',
              background: 'rgba(234, 230, 254, 0.5)',
              borderRadius: '9999px',
              filter: 'blur(212px)',
            }}
          />
        </div>
      )}
      {!isModal && <GlobalHeader />}
      {/* Main Content */}
      <main className={`relative flex items-center justify-center ${isModal ? 'px-0' : 'px-4 md:px-6 lg:px-8'} pb-10`}>
        {/* Responsive Container */}
        <div className={`w-full ${isModal ? 'max-w-full' : 'max-w-[1660px]'}`}>
          {/* Page Title */}
          <div 
            className={`flex items-center gap-3 md:gap-4 ${isModal ? 'px-4 py-4' : 'px-4 md:px-8 py-6 md:py-9'}`}
          >
            {isModal && onClose && (
              <button
                onClick={onClose}
                className="mr-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                data-testid="button-close-intake-modal"
              >
                <X size={24} color="#686A6E" />
              </button>
            )}
            <h1 
              className="text-xl md:text-2xl lg:text-[26px]"
              style={{
                fontFamily: 'Pretendard',
                fontWeight: 600,
                lineHeight: '128%',
                letterSpacing: '-0.02em',
                color: '#0C0C0C',
              }}
            >
              새로운 접수
            </h1>
            <button
              onClick={handleToggleFavorite}
              className="hover:opacity-70 transition-opacity cursor-pointer"
              data-testid="button-favorite"
            >
              <Star 
                className="w-5 h-5" 
                style={{ 
                  color: isFavorite ? '#FFD700' : 'rgba(12, 12, 12, 0.24)',
                  fill: isFavorite ? '#FFD700' : 'none',
                }} 
              />
            </button>
          </div>

          {/* Form Sections Container */}
          <div className="flex flex-col gap-6 md:gap-8 w-full px-0 md:px-4 lg:px-8">
            
            {/* 담당자 정보 */}
            <div 
              style={{
                background: '#FFFFFF',
                boxShadow: '0px 0px 20px #DBE9F5',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <div 
                className="flex items-center justify-between px-4 md:px-6 py-5 md:py-6 border-b-2"
                style={{
                  borderBottomColor: 'rgba(12, 12, 12, 0.1)',
                }}
              >
                <h2 
                  className="text-lg md:text-xl lg:text-2xl"
                  style={{
                    fontFamily: 'Pretendard',
                    fontWeight: 600,
                    lineHeight: '128%',
                    letterSpacing: '-0.02em',
                    color: '#0C0C0C',
                  }}
                >
                  담당자 정보
                </h2>
              </div>
              
              <div className="py-4 md:py-6 lg:py-8">
                {/* 담당자, 소속부서, 직급, 연락처 - flex wrap for responsive */}
                <div className="flex flex-wrap gap-4 md:gap-5 px-4 md:px-5">
                  {/* 담당자 */}
                  <div className="flex flex-col gap-2 flex-1 min-w-[120px]">
                    <label 
                      className="text-sm whitespace-nowrap"
                      style={{
                        fontFamily: 'Pretendard',
                        fontWeight: 500,
                        lineHeight: '128%',
                        letterSpacing: '-0.01em',
                        color: '#686A6E',
                      }}
                    >
                      담당자
                    </label>
                    <Select
                      value={formData.managerId}
                      onValueChange={(value) => {
                        console.log("👤 담당자 선택:", value);
                        const selectedAdmin = administrators?.find(a => a.id === value);
                        console.log("👤 선택된 관리자:", selectedAdmin);
                        setFormData(prev => ({
                          ...prev,
                          managerId: value,
                          managerDepartment: selectedAdmin?.department || "",
                          managerPosition: selectedAdmin?.position || "",
                          managerContact: selectedAdmin?.phone || "",
                        }));
                      }}
                      disabled={readOnly}
                    >
                      <SelectTrigger 
                        className="w-full h-14 md:h-[68px] px-3 md:px-5 rounded-lg border-0"
                        style={{
                          background: 'rgba(12, 12, 12, 0.04)',
                        }}
                        data-testid="select-manager"
                      >
                        <SelectValue placeholder="담당자명" />
                      </SelectTrigger>
                      <SelectContent>
                        {administrators?.map((admin) => (
                          <SelectItem key={admin.id} value={admin.id}>
                            {admin.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 소속부서 */}
                  <div className="flex flex-col gap-2 flex-1 min-w-[120px]">
                    <label 
                      className="text-sm whitespace-nowrap"
                      style={{
                        fontFamily: 'Pretendard',
                        fontWeight: 500,
                        lineHeight: '128%',
                        letterSpacing: '-0.01em',
                        color: '#686A6E',
                      }}
                    >
                      소속부서
                    </label>
                    <Input
                      value={formData.managerDepartment}
                      readOnly
                      className="w-full h-14 md:h-[68px] px-3 md:px-5 rounded-lg border-0"
                      style={{
                        background: 'rgba(12, 12, 12, 0.04)',
                      }}
                      placeholder="소속부서"
                      data-testid="input-manager-department"
                    />
                  </div>

                  {/* 직급 */}
                  <div className="flex flex-col gap-2 flex-1 min-w-[80px]">
                    <label 
                      className="text-sm whitespace-nowrap"
                      style={{
                        fontFamily: 'Pretendard',
                        fontWeight: 500,
                        lineHeight: '128%',
                        letterSpacing: '-0.01em',
                        color: '#686A6E',
                      }}
                    >
                      직급
                    </label>
                    <Input
                      value={formData.managerPosition}
                      readOnly
                      className="w-full h-14 md:h-[68px] px-3 md:px-5 rounded-lg border-0"
                      style={{
                        background: 'rgba(12, 12, 12, 0.04)',
                      }}
                      placeholder="직급"
                      data-testid="input-manager-position"
                    />
                  </div>

                  {/* 연락처 */}
                  <div className="flex flex-col gap-2 flex-1 min-w-[120px]">
                    <label 
                      className="text-sm whitespace-nowrap"
                      style={{
                        fontFamily: 'Pretendard',
                        fontWeight: 500,
                        lineHeight: '128%',
                        letterSpacing: '-0.01em',
                        color: '#686A6E',
                      }}
                    >
                      연락처
                    </label>
                    <Input
                      value={formData.managerContact}
                      readOnly
                      className="w-full h-14 md:h-[68px] px-3 md:px-5 rounded-lg border-0"
                      style={{
                        background: 'rgba(12, 12, 12, 0.04)',
                      }}
                      placeholder="연락처"
                      data-testid="input-manager-contact"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 1. 기본 정보 */}
            <div 
              style={{
                background: '#FFFFFF',
                boxShadow: '0px 0px 20px #DBE9F5',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <Collapsible open={basicInfoOpen} onOpenChange={setBasicInfoOpen}>
                <div 
                  className="flex items-center justify-between px-4 md:px-6 py-5 md:py-6 border-b-2"
                  style={{
                    borderBottomColor: 'rgba(12, 12, 12, 0.1)',
                  }}
                >
                  <h2 
                    className="text-lg md:text-xl lg:text-2xl"
                    style={{
                      fontFamily: 'Pretendard',
                      fontWeight: 600,
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: '#0C0C0C',
                    }}
                  >
                    기본 정보
                  </h2>
                  <CollapsibleTrigger asChild>
                    <button 
                      className="w-[34px] h-[34px] flex items-center justify-center"
                      data-testid="button-toggle-basic-info"
                    >
                      <Minus className="w-4 h-4" style={{ color: '#008FED' }} />
                    </button>
                  </CollapsibleTrigger>
                </div>
                
                <CollapsibleContent>
                  <div className="py-4 md:py-6 lg:py-8">
                    {/* Row 1: 접수번호, 접수일자 (2-column on desktop, 1-column on mobile) */}
                    <div className="flex flex-col md:flex-row gap-4 md:gap-5 px-4 md:px-5 mb-6 md:mb-8">
                      {/* Column 1 - 접수번호 */}
                      <div className="flex-1 flex flex-col gap-2">
                        <label 
                          className="text-sm"
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          접수번호
                        </label>
                        <div 
                          className="flex items-center px-4 md:px-5 h-14 md:h-[68px] rounded-lg"
                          style={{
                            background: 'rgba(12, 12, 12, 0.04)',
                          }}
                        >
                          <span 
                            className="text-sm md:text-base"
                            style={{
                              fontFamily: 'Pretendard',
                              fontWeight: 600,
                              lineHeight: '128%',
                              letterSpacing: '-0.02em',
                              color: displayCaseNumber.includes("입력 정보") || displayCaseNumber.includes("기존 사고") ? '#DC2626' : '#0C0C0C',
                            }}
                            data-testid="text-case-number"
                          >
                            {displayCaseNumber}
                          </span>
                        </div>
                      </div>

                      {/* Column 2 - 접수일자 */}
                      <div className="flex-1 flex flex-col gap-2">
                        <label 
                          className="text-sm"
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          접수일자
                        </label>
                        <Popover open={datePickerOpen && !readOnly} onOpenChange={(open) => !readOnly && setDatePickerOpen(open)} modal={false}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={readOnly}
                              className="w-full h-14 md:h-[68px] px-4 md:px-5 text-sm md:text-base rounded-lg"
                              style={{
                                justifyContent: 'flex-start',
                                background: '#FDFDFD',
                                border: '2px solid rgba(12, 12, 12, 0.08)',
                                fontFamily: 'Pretendard',
                                fontWeight: 600,
                                letterSpacing: '-0.02em',
                                color: '#0C0C0C',
                                cursor: readOnly ? 'not-allowed' : 'pointer',
                                opacity: readOnly ? 0.6 : 1,
                              }}
                              data-testid="button-accident-date"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {accidentDate ? format(accidentDate, "yyyy.MM.dd", { locale: ko }) : <span>날짜 선택</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent 
                            className="w-auto p-0"
                            onOpenAutoFocus={(e) => {
                              e.preventDefault();
                            }}
                            onCloseAutoFocus={(e) => {
                              e.preventDefault();
                            }}
                          >
                            <Calendar
                              mode="single"
                              selected={accidentDate}
                              onSelect={(date) => {
                                setAccidentDate(date);
                                if (date) {
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  const day = String(date.getDate()).padStart(2, '0');
                                  handleInputChange("accidentDate", `${year}-${month}-${day}`);
                                }
                                setDatePickerOpen(false);
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* Subsection: 보험 정보 */}
                    <div className="px-4 md:px-5 py-4 md:py-6">
                      <h3 
                        className="text-lg md:text-xl mb-2"
                        style={{
                          fontFamily: 'Pretendard',
                          fontWeight: 600,
                          lineHeight: '128%',
                          letterSpacing: '-0.02em',
                          color: 'rgba(12, 12, 12, 0.8)',
                        }}
                      >
                        보험 정보
                      </h3>
                      <p 
                        className="text-sm"
                        style={{
                          fontFamily: 'Pretendard',
                          fontWeight: 500,
                          lineHeight: '128%',
                          letterSpacing: '-0.01em',
                          color: 'rgba(12, 12, 12, 0.5)',
                        }}
                      >
                        보험사 증권번호, 보험사 사고번호 중 하나 이상 입력해주세요. (둘 다 입력 가능)
                      </p>
                    </div>

                    {/* 보험 정보 - flex wrap for responsive */}
                    <div className="flex flex-wrap gap-4 md:gap-5 px-4 md:px-5 mb-6 md:mb-8">
                      <div className="flex flex-col gap-2 flex-1 min-w-[120px]">
                        <label className="text-sm whitespace-nowrap" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>보험사</label>
                        <Select value={formData.insuranceCompany} onValueChange={(value) => handleInputChange("insuranceCompany", value)} disabled={readOnly}>
                          <SelectTrigger className="w-full h-14 md:h-[68px] px-3 md:px-5 rounded-lg text-sm md:text-base" style={{background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em'}} data-testid="select-insurance-company">
                            <SelectValue placeholder="보험사 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {insuranceCompanies.map((company) => (
                              <SelectItem key={company} value={company} data-testid={`select-option-insurance-company-${company}`}>{company}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-2 flex-1 min-w-[120px]">
                        <label className="text-sm whitespace-nowrap" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>보험사 증권번호</label>
                        <input 
                          type="text" 
                          placeholder="증권번호 입력" 
                          value={formData.insurancePolicyNo} 
                          onChange={(e) => handleInputChange("insurancePolicyNo", e.target.value)}
                          readOnly={readOnly || !!editCaseId}
                          className="w-full h-14 md:h-[68px] px-3 md:px-5 rounded-lg text-sm md:text-base" 
                          style={{
                            background: (readOnly || !!editCaseId) ? 'rgba(12, 12, 12, 0.04)' : '#FDFDFD',
                            border: (readOnly || !!editCaseId) ? 'none' : '2px solid rgba(12, 12, 12, 0.08)',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C'
                          }} 
                          data-testid="input-insurance-policy-no" 
                        />
                      </div>
                      <div className="flex flex-col gap-2 flex-1 min-w-[120px]">
                        <label className="text-sm whitespace-nowrap" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>보험사 사고번호</label>
                        <input 
                          type="text" 
                          placeholder="사고번호 입력" 
                          value={formData.insuranceAccidentNo} 
                          onChange={(e) => handleInputChange("insuranceAccidentNo", e.target.value)}
                          readOnly={readOnly || !!editCaseId}
                          className="w-full h-14 md:h-[68px] px-3 md:px-5 rounded-lg text-sm md:text-base" 
                          style={{
                            background: (readOnly || !!editCaseId) ? 'rgba(12, 12, 12, 0.04)' : '#FDFDFD',
                            border: (readOnly || !!editCaseId) ? 'none' : '2px solid rgba(12, 12, 12, 0.08)',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C'
                          }} 
                          data-testid="input-insurance-accident-no" 
                        />
                      </div>
                    </div>

                    {/* Subsection: 의뢰자 정보 */}
                    <div className="px-4 md:px-5 py-4 md:py-6 pb-3">
                      <h3 className="text-lg md:text-xl" style={{fontFamily: 'Pretendard',fontWeight: 600,lineHeight: '128%',letterSpacing: '-0.02em',color: 'rgba(12, 12, 12, 0.8)'}}>의뢰자 정보</h3>
                    </div>

                    {/* 의뢰자 정보 - flex wrap for responsive */}
                    <div className="flex flex-wrap gap-4 md:gap-5 px-4 md:px-5 mb-6 md:mb-8">
                      <div className="flex flex-col gap-2 flex-1 min-w-[100px]">
                        <label className="text-sm whitespace-nowrap" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>의뢰사</label>
                        <div
                          onClick={() => !readOnly && setIsClientSearchOpen(true)}
                          className="w-full h-14 md:h-[68px] px-3 md:px-5 rounded-lg text-sm md:text-base flex items-center cursor-pointer"
                          style={{background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em', color: formData.clientResidence ? '#0C0C0C' : '#A0A0A0', opacity: readOnly ? 0.6 : 1, cursor: readOnly ? 'not-allowed' : 'pointer'}}
                          data-testid="button-client-search"
                        >
                          {formData.clientResidence || "의뢰사 선택"}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-1 min-w-[100px]">
                        <label className="text-sm whitespace-nowrap" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>소속부서</label>
                        <input type="text" placeholder="의뢰사를 선택하면 자동으로 입력됩니다" value={formData.clientDepartment} readOnly className="w-full h-14 md:h-[68px] px-3 md:px-5 rounded-lg text-sm md:text-base" style={{background: 'rgba(12, 12, 12, 0.04)',border: 'none',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-client-department" />
                      </div>
                      <div className="flex flex-col gap-2 flex-1 min-w-[80px]">
                        <label className="text-sm whitespace-nowrap" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>의뢰자</label>
                        <Select 
                          value={formData.clientName} 
                          onValueChange={(value) => handleInputChange("clientName", value)}
                          disabled={readOnly || !formData.clientResidence}
                        >
                          <SelectTrigger className="w-full h-14 md:h-[68px] px-3 md:px-5 rounded-lg text-sm md:text-base" style={{background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em'}} data-testid="select-client-name">
                            <SelectValue placeholder={formData.clientResidence ? "담당자 선택" : "의뢰사를 먼저 선택해주세요"} />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredClientEmployees.length > 0 ? (
                              filteredClientEmployees.map((employee) => (
                                <SelectItem key={employee.id} value={employee.name} data-testid={`select-option-client-${employee.id}`}>
                                  {employee.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-employees" disabled data-testid="select-option-no-employees">
                                해당 보험사에 등록된 직원이 없습니다
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-2 flex-1 min-w-[120px]">
                        <label className="text-sm whitespace-nowrap" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>의뢰자 담당자 연락처</label>
                        <input type="text" placeholder="의뢰자를 선택하면 자동으로 입력됩니다" value={formData.clientContact} readOnly className="w-full h-14 md:h-[68px] px-3 md:px-5 rounded-lg text-sm md:text-base" style={{background: 'rgba(12, 12, 12, 0.04)',border: 'none',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-client-contact" />
                      </div>
                    </div>

                    {/* Subsection: 심사자 정보 */}
                    <div className="px-4 md:px-5 py-4 md:py-6 pb-3">
                      <h3 className="text-lg md:text-xl" style={{fontFamily: 'Pretendard',fontWeight: 600,lineHeight: '128%',letterSpacing: '-0.02em',color: 'rgba(12, 12, 12, 0.8)'}}>심사자 정보</h3>
                    </div>

                    {/* 심사자 정보 - flex wrap for responsive */}
                    <div className="flex flex-wrap gap-4 md:gap-5 px-4 md:px-5 mb-6 md:mb-8">
                      <div className="flex flex-col gap-2 flex-1 min-w-[100px]">
                        <label className="text-sm whitespace-nowrap" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>심사사</label>
                        <div
                          onClick={() => !readOnly && setIsAssessorSearchOpen(true)}
                          className="w-full h-14 md:h-[68px] px-3 md:px-5 rounded-lg text-sm md:text-base flex items-center cursor-pointer"
                          style={{background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em', color: formData.assessorId ? '#0C0C0C' : '#A0A0A0', opacity: readOnly ? 0.6 : 1, cursor: readOnly ? 'not-allowed' : 'pointer'}}
                          data-testid="button-assessor-search"
                        >
                          {formData.assessorId || "심사사 선택"}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-1 min-w-[100px]">
                        <label className="text-sm whitespace-nowrap" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>소속부서</label>
                        <input type="text" placeholder="심사사를 선택하면 자동으로 입력됩니다" value={formData.assessorDepartment} readOnly className="w-full h-14 md:h-[68px] px-3 md:px-5 rounded-lg text-sm md:text-base" style={{background: 'rgba(12, 12, 12, 0.04)',border: 'none',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-assessor-department" />
                      </div>
                      <div className="flex flex-col gap-2 flex-1 min-w-[80px]">
                        <label className="text-sm whitespace-nowrap" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>심사자</label>
                        <Select 
                          value={formData.assessorTeam} 
                          onValueChange={(value) => handleInputChange("assessorTeam", value)}
                          disabled={readOnly || !formData.assessorId}
                        >
                          <SelectTrigger className="w-full h-14 md:h-[68px] px-3 md:px-5 rounded-lg text-sm md:text-base" style={{background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em'}} data-testid="select-assessor-name">
                            <SelectValue placeholder={formData.assessorId ? "심사자 선택" : "심사사를 먼저 선택해주세요"} />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredAssessorEmployees.length > 0 ? (
                              filteredAssessorEmployees.map((employee) => (
                                <SelectItem key={employee.id} value={employee.name} data-testid={`select-option-assessor-${employee.id}`}>
                                  {employee.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-employees" disabled data-testid="select-option-no-assessors">
                                해당 심사사에 등록된 직원이 없습니다
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-2 flex-1 min-w-[120px]">
                        <label className="text-sm whitespace-nowrap" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>심사자 연락처</label>
                        <input type="text" placeholder="심사자를 선택하면 자동으로 입력됩니다" value={formData.assessorContact} readOnly className="w-full h-14 md:h-[68px] px-3 md:px-5 rounded-lg text-sm md:text-base" style={{background: 'rgba(12, 12, 12, 0.04)',border: 'none',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-assessor-contact" />
                      </div>
                    </div>

                    {/* Subsection: 조사자 정보 */}
                    <div className="px-4 md:px-5 py-4 md:py-6 pb-3">
                      <h3 className="text-lg md:text-xl" style={{fontFamily: 'Pretendard',fontWeight: 600,lineHeight: '128%',letterSpacing: '-0.02em',color: 'rgba(12, 12, 12, 0.8)'}}>조사자 정보</h3>
                    </div>

                    {/* 조사자 정보 - flex wrap for responsive */}
                    <div className="flex flex-wrap gap-4 md:gap-5 px-4 md:px-5 mb-6 md:mb-8">
                      <div className="flex flex-col gap-2 flex-1 min-w-[80px]">
                        <label className="text-sm whitespace-nowrap" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>손사명</label>
                        <div
                          onClick={() => !readOnly && setIsInvestigatorSearchOpen(true)}
                          className="w-full h-14 md:h-[68px] px-3 md:px-5 rounded-lg text-sm md:text-base flex items-center cursor-pointer"
                          style={{background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em', color: formData.investigatorTeam ? '#0C0C0C' : '#A0A0A0', opacity: readOnly ? 0.6 : 1, cursor: readOnly ? 'not-allowed' : 'pointer'}}
                          data-testid="button-investigator-search"
                        >
                          {formData.investigatorTeam || "선택해주세요"}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-1 min-w-[100px]">
                        <label className="text-sm whitespace-nowrap" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>소속부서</label>
                        <input type="text" placeholder="손사명을 선택하면 자동으로 입력됩니다" value={formData.investigatorDepartment} readOnly className="w-full h-14 md:h-[68px] px-3 md:px-5 rounded-lg text-sm md:text-base" style={{background: 'rgba(12, 12, 12, 0.04)',border: 'none',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-investigator-department" />
                      </div>
                      <div className="flex flex-col gap-2 flex-1 min-w-[80px]">
                        <label className="text-sm whitespace-nowrap" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>조사자</label>
                        <Select 
                          value={formData.investigatorTeamName} 
                          onValueChange={(value) => handleInputChange("investigatorTeamName", value)}
                          disabled={readOnly || !formData.investigatorTeam}
                        >
                          <SelectTrigger className="w-full h-14 md:h-[68px] px-3 md:px-5 rounded-lg text-sm md:text-base" style={{background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em'}} data-testid="select-investigator">
                            <SelectValue placeholder={formData.investigatorTeam ? "조사자 선택" : "손사명을 먼저 선택해주세요"} />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredInvestigatorEmployees.length > 0 ? (
                              filteredInvestigatorEmployees.map((investigator) => (
                                <SelectItem key={investigator.id} value={investigator.name} data-testid={`select-option-investigator-${investigator.id}`}>
                                  {investigator.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-investigators" disabled data-testid="select-option-no-investigators">
                                해당 손사명에 등록된 조사자가 없습니다
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-2 flex-1 min-w-[120px]">
                        <label className="text-sm whitespace-nowrap" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>조사자 연락처</label>
                        <input type="text" placeholder="조사자를 선택하면 자동으로 입력됩니다" value={formData.investigatorContact} readOnly className="w-full h-14 md:h-[68px] px-3 md:px-5 rounded-lg text-sm md:text-base" style={{background: 'rgba(12, 12, 12, 0.04)',border: 'none',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-investigator-contact" />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* 2. 피보험자 및 피해자 정보 */}
            <div 
              style={{
                background: '#FFFFFF',
                boxShadow: '0px 0px 20px #DBE9F5',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <Collapsible open={insuredVictimInfoOpen} onOpenChange={setInsuredVictimInfoOpen}>
                <div 
                  className="flex items-center justify-between"
                  style={{
                    padding: '24px',
                    height: '82px',
                    borderBottom: '2px solid rgba(12, 12, 12, 0.1)',
                  }}
                >
                  <h2 
                    style={{
                      fontFamily: 'Pretendard',
                      fontWeight: 600,
                      fontSize: '24px',
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: '#0C0C0C',
                    }}
                  >
                    피보험자 및 피해자 정보
                  </h2>
                  <CollapsibleTrigger asChild>
                    <button 
                      className="w-[34px] h-[34px] flex items-center justify-center"
                      data-testid="button-toggle-insured-victim-info"
                    >
                      <Minus className="w-4 h-4" style={{ color: '#008FED' }} />
                    </button>
                  </CollapsibleTrigger>
                </div>
                
                <CollapsibleContent>
                  <div style={{ padding: '0px 0 32px 0' }}>
                    {/* First Row: Title + Note + Checkbox (space-between) */}
                    <div 
                      style={{ 
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '24px 20px',
                        gap: '10px',
                      }}
                    >
                      {/* Left: Title + Note */}
                      <div 
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <h3 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '20px',
                            lineHeight: '128%',
                            letterSpacing: '-0.02em',
                            color: 'rgba(12, 12, 12, 0.8)',
                          }}
                        >
                          보험계약자 및 피보험자 정보
                        </h3>
                        <p 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: 'rgba(12, 12, 12, 0.5)',
                          }}
                        >
                          보험 계약자, 피보험자 중 한 가지는 반드시 기입해야 합니다.
                        </p>
                      </div>

                      {/* Right: Checkbox */}
                      <div 
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Checkbox 
                          id="same-as-policy-holder"
                          checked={sameAsPolicyHolder}
                          onCheckedChange={(checked) => setSameAsPolicyHolder(checked as boolean)}
                          disabled={readOnly}
                          data-testid="checkbox-same-as-policy-holder"
                          className="w-6 h-6"
                        />
                        <label 
                          htmlFor="same-as-policy-holder"
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                            cursor: 'pointer',
                          }}
                        >
                          보험계약자 = 피보험자
                        </label>
                      </div>
                    </div>

                    {/* Second Row: 3-column - 보험계약자, 피보험자, 피보험자 연락처 */}
                    <div style={{ padding: '0 20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', gap: '20px' }}>
                        {/* Column 1: 보험계약자 */}
                        <div className="flex flex-col gap-2" style={{ flex: 1 }}>
                          <label 
                            style={{
                              fontFamily: 'Pretendard',
                              fontWeight: 500,
                              fontSize: '14px',
                              lineHeight: '128%',
                              letterSpacing: '-0.01em',
                              color: '#686A6E',
                            }}
                          >
                            보험계약자
                          </label>
                          <input
                            type="text"
                            placeholder="보험자 성명"
                            value={formData.policyHolderName}
                            onChange={(e) => handleInputChange("policyHolderName", e.target.value)}
                            disabled={readOnly}
                            style={{
                              height: '68px',
                              padding: '10px 20px',
                              background: '#FDFDFD',
                              border: '2px solid rgba(12, 12, 12, 0.08)',
                              borderRadius: '8px',
                              fontFamily: 'Pretendard',
                              fontWeight: 600,
                              fontSize: '16px',
                              letterSpacing: '-0.02em',
                              color: '#0C0C0C',
                            }}
                            data-testid="input-policy-holder-name"
                          />
                        </div>

                        {/* Column 2: 피보험자 */}
                        <div className="flex flex-col gap-2" style={{ flex: 1 }}>
                          <label 
                            style={{
                              fontFamily: 'Pretendard',
                              fontWeight: 500,
                              fontSize: '14px',
                              lineHeight: '128%',
                              letterSpacing: '-0.01em',
                              color: '#686A6E',
                            }}
                          >
                            피보험자
                          </label>
                          <input
                            type="text"
                            placeholder="피보험자 성명"
                            value={formData.insuredName}
                            onChange={(e) => handleInputChange("insuredName", e.target.value)}
                            disabled={readOnly}
                            style={{
                              height: '68px',
                              padding: '10px 20px',
                              background: '#FDFDFD',
                              border: '2px solid rgba(12, 12, 12, 0.08)',
                              borderRadius: '8px',
                              fontFamily: 'Pretendard',
                              fontWeight: 600,
                              fontSize: '16px',
                              letterSpacing: '-0.02em',
                              color: '#0C0C0C',
                            }}
                            data-testid="input-insured-name"
                          />
                        </div>

                        {/* Column 3: 피보험자 연락처 (필수) */}
                        <div className="flex flex-col gap-2" style={{ flex: 1 }}>
                          <label 
                            style={{
                              fontFamily: 'Pretendard',
                              fontWeight: 500,
                              fontSize: '14px',
                              lineHeight: '128%',
                              letterSpacing: '-0.01em',
                              color: '#686A6E',
                            }}
                          >
                            피보험자 연락처 <span style={{ color: '#FF0000' }}>*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="피보험자 연락처"
                            value={formData.insuredContact}
                            onChange={(e) => handleInputChange("insuredContact", e.target.value)}
                            disabled={readOnly}
                            style={{
                              height: '68px',
                              padding: '10px 20px',
                              background: '#FDFDFD',
                              border: '2px solid rgba(12, 12, 12, 0.08)',
                              borderRadius: '8px',
                              fontFamily: 'Pretendard',
                              fontWeight: 600,
                              fontSize: '16px',
                              letterSpacing: '-0.02em',
                              color: '#0C0C0C',
                            }}
                            data-testid="input-insured-contact"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Third Row: Full width - 피보험자 주소 (필수) */}
                    <div style={{ padding: '0 20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          피보험자 주소 <span style={{ color: '#FF0000' }}>*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="클릭하여 주소 검색"
                          value={formData.insuredAddress}
                          onClick={() => !readOnly && setShowInsuredAddressSearch(true)}
                          readOnly
                          disabled={readOnly}
                          style={{
                            height: '68px',
                            padding: '10px 20px',
                            background: '#FDFDFD',
                            border: showInsuredAddressSearch ? '2px solid #4A90D9' : '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                            cursor: readOnly ? 'not-allowed' : 'pointer',
                          }}
                          data-testid="input-insured-address"
                        />
                        {/* 다음 포스트코드 주소 검색 */}
                        {showInsuredAddressSearch && (
                          <div 
                            style={{
                              marginTop: '8px',
                              border: '1px solid rgba(12, 12, 12, 0.12)',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                            }}
                          >
                            <div 
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px 16px',
                                background: '#f5f5f5',
                                borderBottom: '1px solid rgba(12, 12, 12, 0.08)',
                              }}
                            >
                              <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '14px' }}>
                                주소 검색
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowInsuredAddressSearch(false)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <X size={18} color="#686A6E" />
                              </button>
                            </div>
                            <div
                              id="insured-address-postcode"
                              ref={(el) => {
                                if (el && showInsuredAddressSearch && (window as any).daum?.Postcode) {
                                  el.innerHTML = '';
                                  new (window as any).daum.Postcode({
                                    oncomplete: (data: any) => {
                                      let fullAddress = data.roadAddress || data.jibunAddress;
                                      if (data.buildingName) {
                                        fullAddress += ` (${data.buildingName})`;
                                      }
                                      handleInputChange("insuredAddress", fullAddress);
                                      setShowInsuredAddressSearch(false);
                                    },
                                    width: '100%',
                                    height: '400px',
                                  }).embed(el);
                                }
                              }}
                              style={{ width: '100%', height: '400px' }}
                            />
                          </div>
                        )}
                        {/* 상세주소 입력 */}
                        <input
                          type="text"
                          placeholder="상세주소 입력 (동/호수 등)"
                          value={formData.insuredAddressDetail}
                          onChange={(e) => handleInputChange("insuredAddressDetail", e.target.value)}
                          disabled={readOnly}
                          style={{
                            marginTop: '8px',
                            height: '68px',
                            padding: '10px 20px',
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                            width: '100%',
                          }}
                          data-testid="input-insured-address-detail"
                        />
                      </div>
                    </div>

                    {/* Fourth Section: 피해자 정보 */}
                    <div className="px-4 md:px-5 py-4 md:py-6 pb-3">
                      <h3 
                        style={{
                          fontFamily: 'Pretendard',
                          fontWeight: 600,
                          fontSize: '20px',
                          lineHeight: '128%',
                          letterSpacing: '-0.02em',
                          color: 'rgba(12, 12, 12, 0.8)',
                        }}
                      >
                        피해자 정보
                      </h3>
                    </div>

                    {/* Fifth Row: 2-column - 피해자, 피해자 연락처 */}
                    <div style={{ padding: '0 20px' }}>
                      <div style={{ display: 'flex', gap: '20px' }}>
                        <div className="flex flex-col gap-2" style={{ flex: 1 }}>
                          <label 
                            style={{
                              fontFamily: 'Pretendard',
                              fontWeight: 500,
                              fontSize: '14px',
                              lineHeight: '128%',
                              letterSpacing: '-0.01em',
                              color: '#686A6E',
                            }}
                          >
                            피해자
                          </label>
                          <input
                            type="text"
                            placeholder="피해자 성명"
                            value={formData.victimName}
                            onChange={(e) => handleInputChange("victimName", e.target.value)}
                            disabled={readOnly}
                            style={{
                            height: '68px',
                            padding: '10px 20px',
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                          }}
                          data-testid="input-victim-name"
                        />
                        </div>

                        {/* Column 2: 피해자 연락처 */}
                        <div className="flex flex-col gap-2" style={{ flex: 1 }}>
                          <label 
                            style={{
                              fontFamily: 'Pretendard',
                              fontWeight: 500,
                              fontSize: '14px',
                              lineHeight: '128%',
                              letterSpacing: '-0.01em',
                              color: '#686A6E',
                            }}
                          >
                            피해자 연락처
                          </label>
                          <input
                            type="text"
                            placeholder="피해자 연락처"
                            value={formData.victimContact}
                            onChange={(e) => handleInputChange("victimContact", e.target.value)}
                            disabled={readOnly}
                            style={{
                              height: '68px',
                              padding: '10px 20px',
                              background: '#FDFDFD',
                              border: '2px solid rgba(12, 12, 12, 0.08)',
                              borderRadius: '8px',
                              fontFamily: 'Pretendard',
                              fontWeight: 600,
                              fontSize: '16px',
                              letterSpacing: '-0.02em',
                              color: '#0C0C0C',
                            }}
                            data-testid="input-victim-contact"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* 3. 사고 및 피해사항 (Accident & Damage Information) */}
              <div 
                style={{
                  background: '#FFFFFF',
                  boxShadow: '0px 0px 20px #DBE9F5',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                <Collapsible open={accidentDamageInfoOpen} onOpenChange={setAccidentDamageInfoOpen}>
                  <div 
                    className="flex items-center justify-between"
                    style={{
                      padding: '24px',
                      height: '82px',
                      borderBottom: '2px solid rgba(12, 12, 12, 0.1)',
                    }}
                  >
                    <h2 
                      style={{
                        fontFamily: 'Pretendard',
                        fontWeight: 600,
                        fontSize: '24px',
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: '#0C0C0C',
                      }}
                    >
                      사고 및 피해사항
                    </h2>
                    <CollapsibleTrigger asChild>
                      <button 
                        className="w-[34px] h-[34px] flex items-center justify-center"
                        data-testid="button-toggle-accident-damage-info"
                      >
                        <Minus className="w-4 h-4" style={{ color: '#008FED' }} />
                      </button>
                    </CollapsibleTrigger>
                  </div>
                  
                  <CollapsibleContent>
                  <div 
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: '0px 0px 32px 0px',
                      gap: '32px',
                      width: '1596px',
                      height: 'auto',
                    }}
                  >
                    {/* Section 1: 사고 원인 · 규모 */}
                    <div 
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '0px',
                        width: '1596px',
                        height: 'auto',
                      }}
                    >
                      {/* Subsection Header */}
                      <div 
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: '24px 10px',
                          gap: '10px',
                          width: '1596px',
                          height: '74px',
                        }}
                      >
                        <h3 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '20px',
                            lineHeight: '128%',
                            letterSpacing: '-0.02em',
                            color: 'rgba(12, 12, 12, 0.8)',
                          }}
                        >
                          사고 원인 · 규모
                        </h3>
                      </div>

                      {/* Content */}
                      <div 
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          padding: '0px 10px',
                          gap: '12px',
                          width: '1596px',
                          height: 'auto',
                        }}
                      >
                        {/* Row 1: Checkboxes with Label */}
                        <div 
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: '8px',
                            width: '1556px',
                          }}
                        >
                          <label 
                            style={{
                              fontFamily: 'Pretendard',
                              fontWeight: 500,
                              fontSize: '14px',
                              lineHeight: '128%',
                              letterSpacing: '-0.01em',
                              color: '#686A6E',
                            }}
                          >
                            손방 및 대물 선택(중복 가능)
                          </label>
                          <div 
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '12px',
                              height: '68px',
                            }}
                          >
                            <div 
                              style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Checkbox
                                checked={formData.damagePreventionCost}
                                onCheckedChange={(checked) => handleInputChange("damagePreventionCost", checked as boolean)}
                                disabled={readOnly}
                                className="w-6 h-6"
                                data-testid="checkbox-damage-prevention"
                              />
                              <span 
                                style={{
                                  fontFamily: 'Pretendard',
                                  fontWeight: 500,
                                  fontSize: '14px',
                                  lineHeight: '128%',
                                  letterSpacing: '-0.01em',
                                  color: formData.damagePreventionCost ? '#008FED' : '#686A6E',
                                }}
                              >
                                손해방지
                              </span>
                            </div>
                            <div 
                              style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Checkbox
                                checked={formData.victimIncidentAssistance}
                                onCheckedChange={(checked) => handleInputChange("victimIncidentAssistance", checked as boolean)}
                                disabled={readOnly}
                                className="w-6 h-6"
                                data-testid="checkbox-victim-incident"
                              />
                              <span 
                                style={{
                                  fontFamily: 'Pretendard',
                                  fontWeight: 500,
                                  fontSize: '14px',
                                  lineHeight: '128%',
                                  letterSpacing: '-0.01em',
                                  color: formData.victimIncidentAssistance ? '#008FED' : '#686A6E',
                                }}
                              >
                                피해세대복구
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Row 2: 4-column Dropdowns - Responsive */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-5 w-full">
                          {/* Column 1 */}
                          <div className="flex flex-col gap-2">
                            <label className="text-xs md:text-sm" style={{ fontFamily: 'Pretendard', fontWeight: 500, lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              사고 유형
                            </label>
                            <Select 
                              value={formData.accidentType} 
                              onValueChange={(value) => handleInputChange("accidentType", value)}
                              disabled={readOnly}
                            >
                              <SelectTrigger 
                                className="h-12 md:h-14 lg:h-[68px] px-3 md:px-4 lg:px-5 text-sm md:text-base"
                                style={{
                                  background: '#FDFDFD',
                                  border: '2px solid rgba(12, 12, 12, 0.08)',
                                  borderRadius: '8px',
                                  fontFamily: 'Pretendard',
                                  fontWeight: 600,
                                  letterSpacing: '-0.02em',
                                }}
                                data-testid="select-accident-type"
                              >
                                <SelectValue placeholder="사고 유형 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {getMasterDataOptions("accident_type").length > 0 ? (
                                  getMasterDataOptions("accident_type").map((option) => (
                                    <SelectItem key={option} value={option}>{option}</SelectItem>
                                  ))
                                ) : (
                                  <>
                                    <SelectItem value="누수">누수</SelectItem>
                                    <SelectItem value="급배수">급배수</SelectItem>
                                    <SelectItem value="화재">화재</SelectItem>
                                    <SelectItem value="기타">기타</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Column 2 */}
                          <div className="flex flex-col gap-2">
                            <label className="text-xs md:text-sm" style={{ fontFamily: 'Pretendard', fontWeight: 500, lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              사고 원인
                            </label>
                            <Select 
                              value={formData.accidentCause} 
                              onValueChange={(value) => handleInputChange("accidentCause", value)}
                              disabled={readOnly}
                            >
                              <SelectTrigger 
                                className="h-12 md:h-14 lg:h-[68px] px-3 md:px-4 lg:px-5 text-sm md:text-base"
                                style={{
                                  background: '#FDFDFD',
                                  border: '2px solid rgba(12, 12, 12, 0.08)',
                                  borderRadius: '8px',
                                  fontFamily: 'Pretendard',
                                  fontWeight: 600,
                                  letterSpacing: '-0.02em',
                                }}
                                data-testid="select-accident-cause"
                              >
                                <SelectValue placeholder="사고 원인 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {getMasterDataOptions("accident_cause").length > 0 ? (
                                  getMasterDataOptions("accident_cause").map((option) => (
                                    <SelectItem key={option} value={option}>{option}</SelectItem>
                                  ))
                                ) : (
                                  <>
                                    <SelectItem value="배관">배관</SelectItem>
                                    <SelectItem value="방수">방수</SelectItem>
                                    <SelectItem value="코킹">코킹</SelectItem>
                                    <SelectItem value="공용부">공용부</SelectItem>
                                    <SelectItem value="복합">복합</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Column 3 */}
                          <div className="flex flex-col gap-2">
                            <label className="text-xs md:text-sm" style={{ fontFamily: 'Pretendard', fontWeight: 500, lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              복구 방식
                            </label>
                            <Select 
                              value={formData.restorationMethod} 
                              onValueChange={(value) => handleInputChange("restorationMethod", value)}
                              disabled={readOnly}
                            >
                              <SelectTrigger 
                                className="h-12 md:h-14 lg:h-[68px] px-3 md:px-4 lg:px-5 text-sm md:text-base"
                                style={{
                                  background: '#FDFDFD',
                                  border: '2px solid rgba(12, 12, 12, 0.08)',
                                  borderRadius: '8px',
                                  fontFamily: 'Pretendard',
                                  fontWeight: 600,
                                  letterSpacing: '-0.02em',
                                }}
                                data-testid="select-restoration-method"
                              >
                                <SelectValue placeholder="복구 유형 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {getMasterDataOptions("recovery_type").length > 0 ? (
                                  getMasterDataOptions("recovery_type").map((option) => (
                                    <SelectItem key={option} value={option}>{option}</SelectItem>
                                  ))
                                ) : (
                                  <>
                                    <SelectItem value="없음">없음</SelectItem>
                                    <SelectItem value="직접복구">직접복구</SelectItem>
                                    <SelectItem value="선견적요청">선견적요청</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Column 4 */}
                          <div className="flex flex-col gap-2">
                            <label className="text-xs md:text-sm whitespace-nowrap" style={{ fontFamily: 'Pretendard', fontWeight: 500, lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              타업체 견적
                            </label>
                            <Select 
                              value={formData.otherVendorEstimate} 
                              onValueChange={(value) => handleInputChange("otherVendorEstimate", value)}
                              disabled={readOnly}
                            >
                              <SelectTrigger 
                                className="h-12 md:h-14 lg:h-[68px] px-3 md:px-4 lg:px-5 text-sm md:text-base"
                                style={{
                                  background: '#FDFDFD',
                                  border: '2px solid rgba(12, 12, 12, 0.08)',
                                  borderRadius: '8px',
                                  fontFamily: 'Pretendard',
                                  fontWeight: 600,
                                  letterSpacing: '-0.02em',
                                }}
                                data-testid="select-other-vendor-estimate"
                              >
                                <SelectValue placeholder="선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {getMasterDataOptions("other_company_estimate").length > 0 ? (
                                  getMasterDataOptions("other_company_estimate").map((option) => (
                                    <SelectItem key={option} value={option}>{option}</SelectItem>
                                  ))
                                ) : (
                                  <>
                                    <SelectItem value="유">유</SelectItem>
                                    <SelectItem value="무">무</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Row 3: 사고내용 Textarea */}
                        <div className="flex flex-col gap-2 w-full">
                          <label 
                            style={{
                              fontFamily: 'Pretendard',
                              fontWeight: 500,
                              fontSize: '14px',
                              lineHeight: '128%',
                              letterSpacing: '-0.01em',
                              color: '#686A6E',
                            }}
                          >
                            사고내용
                          </label>
                          <div style={{ position: 'relative' }}>
                            <textarea
                              placeholder="사고내용을 입력해 주세요"
                              value={formData.accidentDescription}
                              onChange={(e) => handleInputChange("accidentDescription", e.target.value)}
                              disabled={readOnly}
                              maxLength={800}
                              style={{
                                width: '100%',
                                height: '120px',
                                padding: '16px 20px',
                                background: '#FDFDFD',
                                border: '2px solid rgba(12, 12, 12, 0.08)',
                                borderRadius: '8px',
                                fontFamily: 'Pretendard',
                                fontWeight: 400,
                                fontSize: '14px',
                                lineHeight: '150%',
                                letterSpacing: '-0.01em',
                                color: '#0C0C0C',
                                resize: 'none',
                              }}
                              data-testid="textarea-accident-description"
                            />
                            <span 
                              style={{
                                position: 'absolute',
                                bottom: '12px',
                                right: '20px',
                                fontFamily: 'Pretendard',
                                fontSize: '12px',
                                color: '#686A6E',
                              }}
                            >
                              {formData.accidentDescription.length}/800
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: 피해사항(선택) */}
                    <div 
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '0px',
                        width: '1596px',
                        height: 'auto',
                      }}
                    >
                      {/* Subsection Header */}
                      <div 
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: '24px 10px',
                          gap: '10px',
                          width: '1596px',
                          height: '74px',
                        }}
                      >
                        <h3 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '20px',
                            lineHeight: '128%',
                            letterSpacing: '-0.02em',
                            color: 'rgba(12, 12, 12, 0.8)',
                          }}
                        >
                          피해사항(선택)
                        </h3>
                      </div>

                      {/* Input Row */}
                      <div 
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: '0px 10px',
                          gap: '20px',
                          width: '1596px',
                          height: '94px',
                        }}
                      >
                        {/* Input Fields Container */}
                        <div 
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: '12px',
                            flex: 1,
                          }}
                        >
                          {/* 피해 품목 */}
                          <div style={{ width: '413.33px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              피해 품목
                            </label>
                            <Select value={formData.damageItem} onValueChange={(value) => handleInputChange("damageItem", value)} disabled={readOnly}>
                              <SelectTrigger 
                                style={{ height: '68px', padding: '10px 20px', background: '#FDFDFD', border: '2px solid rgba(12, 12, 12, 0.08)', borderRadius: '8px', fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', letterSpacing: '-0.02em' }}
                                data-testid="select-damage-item"
                              >
                                <SelectValue placeholder="선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {getMasterDataOptions("damage_item").length > 0 ? (
                                  getMasterDataOptions("damage_item").map((option) => (
                                    <SelectItem key={option} value={option}>{option}</SelectItem>
                                  ))
                                ) : (
                                  <>
                                    <SelectItem value="장판">장판</SelectItem>
                                    <SelectItem value="벽지">벽지</SelectItem>
                                    <SelectItem value="가구">가구</SelectItem>
                                    <SelectItem value="전자제품">전자제품</SelectItem>
                                    <SelectItem value="기타">기타</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* 피해 유형 */}
                          <div style={{ width: '413.33px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              피해 유형
                            </label>
                            <Select value={formData.damageType} onValueChange={(value) => handleInputChange("damageType", value)} disabled={readOnly}>
                              <SelectTrigger 
                                style={{ height: '68px', padding: '10px 20px', background: '#FDFDFD', border: '2px solid rgba(12, 12, 12, 0.08)', borderRadius: '8px', fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', letterSpacing: '-0.02em' }}
                                data-testid="select-damage-type"
                              >
                                <SelectValue placeholder="선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {getMasterDataOptions("damage_type").length > 0 ? (
                                  getMasterDataOptions("damage_type").map((option) => (
                                    <SelectItem key={option} value={option}>{option}</SelectItem>
                                  ))
                                ) : (
                                  <>
                                    <SelectItem value="교체">교체</SelectItem>
                                    <SelectItem value="수리">수리</SelectItem>
                                    <SelectItem value="청소">청소</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* 수량 with increment/decrement buttons */}
                          <div style={{ width: '187px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              수량
                            </label>
                            <div style={{ position: 'relative', height: '68px', display: 'flex', alignItems: 'center', padding: '10px 14px 10px 20px', background: '#FDFDFD', border: '2px solid rgba(12, 12, 12, 0.08)', borderRadius: '8px' }}>
                              <input
                                type="number"
                                value={formData.damageQuantity}
                                onChange={(e) => handleInputChange("damageQuantity", e.target.value)}
                                disabled={readOnly}
                                style={{
                                  width: '100%',
                                  border: 'none',
                                  background: 'transparent',
                                  fontFamily: 'Pretendard',
                                  fontWeight: 600,
                                  fontSize: '16px',
                                  letterSpacing: '-0.02em',
                                  color: '#0C0C0C',
                                  outline: 'none',
                                }}
                                data-testid="input-damage-quantity"
                              />
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <button
                                  onClick={() => !readOnly && handleInputChange("damageQuantity", String(Math.max(0, Number(formData.damageQuantity || 0) + 1)))}
                                  disabled={readOnly}
                                  style={{
                                    width: '48px',
                                    height: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(12, 12, 12, 0.06)',
                                    borderRadius: '4px',
                                    border: 'none',
                                    cursor: readOnly ? 'not-allowed' : 'pointer',
                                    opacity: readOnly ? 0.6 : 1,
                                  }}
                                  data-testid="button-quantity-increment"
                                >
                                  <ChevronUp style={{ width: '12px', height: '12px', color: '#008FED' }} />
                                </button>
                                <button
                                  onClick={() => !readOnly && handleInputChange("damageQuantity", String(Math.max(0, Number(formData.damageQuantity || 0) - 1)))}
                                  disabled={readOnly}
                                  style={{
                                    width: '48px',
                                    height: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(12, 12, 12, 0.06)',
                                    borderRadius: '4px',
                                    border: 'none',
                                    cursor: readOnly ? 'not-allowed' : 'pointer',
                                    opacity: readOnly ? 0.6 : 1,
                                  }}
                                  data-testid="button-quantity-decrement"
                                >
                                  <ChevronDown style={{ width: '12px', height: '12px', color: 'rgba(12, 12, 12, 0.4)' }} />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* 피해 내용 */}
                          <div style={{ width: '413.33px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              피해 내용
                            </label>
                            <input
                              type="text"
                              placeholder="피해 내용 입력"
                              value={formData.damageDetails}
                              onChange={(e) => handleInputChange("damageDetails", e.target.value)}
                              disabled={readOnly}
                              style={{ height: '68px', padding: '10px 20px', background: '#FDFDFD', border: '2px solid rgba(12, 12, 12, 0.08)', borderRadius: '8px', fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', letterSpacing: '-0.02em', color: '#0C0C0C' }}
                              data-testid="input-damage-details"
                            />
                          </div>
                        </div>

                        {/* 입력 Button */}
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '26px 0px 0px', gap: '10px', width: '100px', height: '94px' }}>
                          <button
                            onClick={handleAddDamageItem}
                            disabled={readOnly || !formData.damageItem || !formData.damageType || !formData.damageQuantity}
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              justifyContent: 'center',
                              alignItems: 'center',
                              padding: '0px 24px',
                              width: '100px',
                              height: '68px',
                              background: (!readOnly && formData.damageItem && formData.damageType && formData.damageQuantity) 
                                ? '#008FED' 
                                : 'rgba(12, 12, 12, 0.08)',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: (!readOnly && formData.damageItem && formData.damageType && formData.damageQuantity) 
                                ? 'pointer' 
                                : 'not-allowed',
                              whiteSpace: 'nowrap',
                            }}
                            data-testid="button-add-damage"
                          >
                            <span style={{ 
                              fontFamily: 'Pretendard', 
                              fontWeight: 600, 
                              fontSize: '15px', 
                              lineHeight: '128%', 
                              letterSpacing: '-0.02em', 
                              color: (!readOnly && formData.damageItem && formData.damageType && formData.damageQuantity) 
                                ? '#FDFDFD' 
                                : 'rgba(12, 12, 12, 0.4)'
                            }}>
                              입력
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* 등록된 피해사항 리스트 */}
                      <div 
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          padding: '16px 10px',
                          gap: '10px',
                          width: '1596px',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '2px', width: '1556px' }}>
                          <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                            총 {formData.damageItems.length}건의 피해
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '12px', width: '1556px', flexWrap: 'wrap' }}>
                          {formData.damageItems.map((item, index) => (
                            <div 
                              key={index}
                              style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: '20px',
                                gap: '16px',
                                width: '316px',
                                height: '64px',
                                background: 'rgba(12, 12, 12, 0.08)',
                                borderRadius: '12px',
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', flex: 1 }}>
                                <div style={{ width: '8px', height: '8px', background: '#008FED', borderRadius: '50%' }} />
                                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '20px' }}>
                                  <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: '#008FED' }}>
                                    {item.item}
                                  </span>
                                  <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(0, 143, 237, 0.7)' }}>
                                    {item.type}
                                  </span>
                                  <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(0, 143, 237, 0.7)' }}>
                                    {item.quantity}
                                  </span>
                                  <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(0, 143, 237, 0.7)' }}>
                                    {item.details}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => !readOnly && handleRemoveDamageItem(index)}
                                disabled={readOnly}
                                style={{ width: '24px', height: '24px', background: 'transparent', border: 'none', cursor: readOnly ? 'not-allowed' : 'pointer', padding: 0, opacity: readOnly ? 0.4 : 1 }}
                                data-testid={`button-remove-damage-${index}`}
                              >
                                <X style={{ width: '24px', height: '24px', color: 'rgba(12, 12, 12, 0.3)' }} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Section 3: 배당사항(협력사 배당) + 일정 · 우선순위 */}
                    <div 
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '32px 20px',
                        gap: '32px',
                        width: '1556px',
                        background: '#f7f7f7',
                        borderRadius: '12px',
                      }}
                    >
                      {/* Header */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <h3 style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '18px', lineHeight: '128%', letterSpacing: '-0.01em', color: 'rgba(12, 12, 12, 0.9)' }}>
                          배당사항(협력사 배당)
                        </h3>
                        <p style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: 'rgba(12, 12, 12, 0.5)' }}>
                          협조처는 입력하신 정보로 담당자를 찾을 수 없습니다.
                        </p>
                      </div>

                      {/* 배당 협력사 정보 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                        <h4 style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.01em', color: 'rgba(12, 12, 12, 0.9)' }}>
                          배당 협력사 정보
                        </h4>
                        
                        {/* 협력사, 담당자명, 담당자 연락처 - 반응형 그리드 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                          {/* Column 1: 협력사 with 검색 button */}
                          <div className="md:col-span-2 lg:col-span-1" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              협력사
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="text"
                                placeholder="협력사 선택"
                                value={selectedPartner?.name || ''}
                                readOnly
                                style={{ 
                                  flex: 1,
                                  height: '56px', 
                                  padding: '16px 20px', 
                                  background: '#FDFDFD', 
                                  border: '1px solid rgba(12, 12, 12, 0.1)', 
                                  borderRadius: '8px', 
                                  fontFamily: 'Pretendard', 
                                  fontWeight: 500, 
                                  fontSize: '14px', 
                                  letterSpacing: '-0.01em', 
                                  color: selectedPartner ? 'rgba(12, 12, 12, 0.9)' : 'rgba(12, 12, 12, 0.4)',
                                  cursor: 'default',
                                }}
                                data-testid="input-assigned-partner"
                              />
                              <button
                                onClick={() => {
                                  if (readOnly) return;
                                  setTempSelectedPartner(selectedPartner);
                                  setPartnerSearchQuery("");
                                  setIsPartnerSearchOpen(true);
                                }}
                                disabled={readOnly}
                                style={{ 
                                  display: 'flex', 
                                  flexDirection: 'row', 
                                  justifyContent: 'center', 
                                  alignItems: 'center', 
                                  padding: '16px 24px',
                                  height: '56px', 
                                  background: readOnly ? 'rgba(12, 12, 12, 0.1)' : '#008FED', 
                                  borderRadius: '8px', 
                                  border: 'none', 
                                  cursor: readOnly ? 'not-allowed' : 'pointer',
                                  fontFamily: 'Pretendard',
                                  fontWeight: 600,
                                  fontSize: '14px',
                                  letterSpacing: '-0.01em',
                                  color: readOnly ? 'rgba(12, 12, 12, 0.4)' : '#FFFFFF',
                                }}
                                data-testid="button-search-partner"
                              >
                                검색
                              </button>
                            </div>
                          </div>

                          {/* Column 2: 담당자명 */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              담당자명
                            </label>
                            <Select
                              value={formData.assignedPartnerManager}
                              onValueChange={(value) => handleInputChange("assignedPartnerManager", value)}
                              disabled={readOnly || !selectedPartner || partnerManagers.length === 0}
                            >
                              <SelectTrigger 
                                style={{ 
                                  height: '56px', 
                                  padding: '16px 20px', 
                                  background: !selectedPartner || partnerManagers.length === 0 ? 'rgba(12, 12, 12, 0.04)' : '#FDFDFD', 
                                  border: '1px solid rgba(12, 12, 12, 0.1)', 
                                  borderRadius: '8px', 
                                  fontFamily: 'Pretendard', 
                                  fontWeight: 500, 
                                  fontSize: '14px', 
                                  letterSpacing: '-0.01em', 
                                  color: formData.assignedPartnerManager ? 'rgba(12, 12, 12, 0.9)' : 'rgba(12, 12, 12, 0.4)',
                                }}
                                data-testid="select-partner-manager"
                              >
                                <SelectValue placeholder={!selectedPartner ? "협력사를 먼저 선택하세요" : partnerManagers.length === 0 ? "담당자가 없습니다" : "담당자 선택"} />
                              </SelectTrigger>
                              <SelectContent>
                                {partnerManagers.map((manager) => (
                                  <SelectItem key={manager.id} value={manager.name}>
                                    {manager.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Column 3: 담당자 연락처 */}
                          <div className="md:col-span-2 lg:col-span-1" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              담당자 연락처
                            </label>
                            <input
                              type="text"
                              placeholder="담당자를 선택하면 자동으로 입력됩니다"
                              value={formData.assignedPartnerContact}
                              readOnly
                              style={{ 
                                height: '56px', 
                                padding: '16px 20px', 
                                background: 'rgba(12, 12, 12, 0.04)', 
                                border: 'none', 
                                borderRadius: '8px', 
                                fontFamily: 'Pretendard', 
                                fontWeight: 500, 
                                fontSize: '14px', 
                                letterSpacing: '-0.01em', 
                                color: 'rgba(12, 12, 12, 0.9)',
                              }}
                              data-testid="input-partner-contact"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 일정 · 우선순위 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                        <h4 style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.01em', color: 'rgba(12, 12, 12, 0.9)' }}>
                          일정 · 우선순위
                        </h4>

                        {/* 긴급도 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '340px' }}>
                          <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                            긴급도
                          </label>
                          <Select
                            value={formData.urgency || ''}
                            onValueChange={(value) => handleInputChange("urgency", value)}
                            disabled={readOnly}
                          >
                            <SelectTrigger 
                              style={{ 
                                height: '56px', 
                                padding: '16px 20px', 
                                background: '#FDFDFD', 
                                border: '1px solid rgba(12, 12, 12, 0.1)', 
                                borderRadius: '8px', 
                                fontFamily: 'Pretendard', 
                                fontWeight: 500, 
                                fontSize: '14px', 
                                letterSpacing: '-0.01em', 
                                color: formData.urgency ? 'rgba(12, 12, 12, 0.9)' : 'rgba(12, 12, 12, 0.4)',
                              }}
                              data-testid="select-urgency"
                            >
                              <SelectValue placeholder="긴급도 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="긴급">긴급</SelectItem>
                              <SelectItem value="보통">보통</SelectItem>
                              <SelectItem value="낮음">낮음</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 특이사항 및 요청사항 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '12px' }}>
                          <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                            특이사항 및 요청사항
                          </label>
                          <div style={{ position: 'relative' }}>
                            <textarea
                              placeholder="협력 협이사명, 요청사항 등"
                              value={formData.specialRequests}
                              onChange={(e) => {
                                if (e.target.value.length <= 800) {
                                  handleInputChange("specialRequests", e.target.value);
                                }
                              }}
                              disabled={readOnly}
                              maxLength={800}
                              style={{ 
                                width: '100%', 
                                height: '120px', 
                                padding: '16px 20px', 
                                background: '#FDFDFD', 
                                border: '1px solid rgba(12, 12, 12, 0.1)', 
                                borderRadius: '8px', 
                                fontFamily: 'Pretendard', 
                                fontWeight: 500, 
                                fontSize: '14px', 
                                lineHeight: '150%', 
                                letterSpacing: '-0.01em', 
                                color: 'rgba(12, 12, 12, 0.9)', 
                                resize: 'none',
                              }}
                              data-testid="textarea-special-requests"
                            />
                            <div style={{ 
                              position: 'absolute', 
                              bottom: '12px', 
                              right: '20px',
                              fontFamily: 'Pretendard', 
                              fontWeight: 500, 
                              fontSize: '12px', 
                              lineHeight: '128%', 
                              letterSpacing: '-0.01em', 
                              color: '#686A6E',
                            }}>
                              {formData.specialRequests.length}/800
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>

          {/* Bottom Action Buttons - Hidden when readOnly */}
          {!readOnly && (
            <div 
              className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end w-full px-4 md:px-6 lg:px-8 mt-6 md:mt-8 gap-3"
            >
              {/* 모달에서 기존 케이스 수정 시: 수정하기 버튼만 표시 */}
              {isModal && initialCaseId ? (
                <button
                  onClick={handleUpdateCase}
                  disabled={updateMutation.isPending}
                  className="h-12 md:h-14 px-6 md:px-8 rounded-lg text-sm md:text-base"
                  style={{
                    fontFamily: 'Pretendard',
                    fontWeight: 600,
                    lineHeight: '128%',
                    letterSpacing: '-0.01em',
                    background: updateMutation.isPending ? 'rgba(0, 143, 237, 0.5)' : '#008FED',
                    border: 'none',
                    color: '#FFFFFF',
                    cursor: updateMutation.isPending ? 'not-allowed' : 'pointer',
                    opacity: updateMutation.isPending ? 0.6 : 1,
                  }}
                  data-testid="button-update-case"
                >
                  {updateMutation.isPending ? '수정 중...' : '수정하기'}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleReset}
                    className="h-12 md:h-14 px-6 md:px-8 rounded-lg text-sm md:text-base"
                    style={{
                      fontFamily: 'Pretendard',
                      fontWeight: 600,
                      lineHeight: '128%',
                      letterSpacing: '-0.01em',
                      background: 'transparent',
                      border: 'none',
                      color: '#EF4444',
                      cursor: 'pointer',
                    }}
                    data-testid="button-reset"
                  >
                    초기화
                  </button>
                  
                  <button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="h-12 md:h-14 px-6 md:px-8 rounded-lg text-sm md:text-base"
                    style={{
                      fontFamily: 'Pretendard',
                      fontWeight: 600,
                      lineHeight: '128%',
                      letterSpacing: '-0.01em',
                      background: saveMutation.isPending ? 'rgba(0, 143, 237, 0.5)' : '#008FED',
                      border: 'none',
                      color: '#FFFFFF',
                      cursor: saveMutation.isPending ? 'not-allowed' : 'pointer',
                      opacity: saveMutation.isPending ? 0.6 : 1,
                    }}
                    data-testid="button-save"
                  >
                    {saveMutation.isPending ? '저장 중...' : '저장'}
                  </button>
                  
                  <button
                    onClick={handleSubmit}
                    disabled={!isFormValid || submitMutation.isPending}
                    className="h-12 md:h-14 px-6 md:px-8 rounded-lg text-sm md:text-base"
                    style={{
                      fontFamily: 'Pretendard',
                      fontWeight: 600,
                      lineHeight: '128%',
                      letterSpacing: '-0.01em',
                      background: !isFormValid || submitMutation.isPending ? 'rgba(12, 12, 12, 0.2)' : '#008FED',
                      border: 'none',
                      color: '#FFFFFF',
                      cursor: !isFormValid || submitMutation.isPending ? 'not-allowed' : 'pointer',
                      opacity: !isFormValid || submitMutation.isPending ? 0.5 : 1,
                    }}
                    data-testid="button-submit"
                  >
                    {submitMutation.isPending ? '접수 중...' : '접수완료'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </main>
      {/* 협력사 검색 팝업 - Portal로 body에 직접 렌더링 */}
      {isPartnerSearchOpen && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '16px',
            pointerEvents: 'auto',
          }}
          onClick={() => setIsPartnerSearchOpen(false)}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="w-full max-w-[864px] max-h-[90vh] overflow-y-auto"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '0px 0px 20px',
              gap: '10px',
              isolation: 'isolate',
              background: '#FFFFFF',
              boxShadow: '0px -2px 70px rgba(179, 193, 205, 0.8)',
              borderRadius: '12px',
              pointerEvents: 'auto',
            }}
          >
            {/* Header */}
            <div className="flex flex-row justify-between items-center w-full px-5 h-[60px]">
              <h2 style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '18px', lineHeight: '128%', letterSpacing: '-0.02em', color: '#0C0C0C' }}>
                협력사 검색
              </h2>
              <button
                onClick={() => setIsPartnerSearchOpen(false)}
                style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '24px 20px', width: '60px', height: '60px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                data-testid="button-close-partner-search"
              >
                <X size={24} color="#1C1B1F" />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col items-center w-full px-5 gap-4">
              {/* Search Input */}
              <div className="flex flex-col items-start w-full gap-2">
                <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                  협력사 검색
                </label>
                <div className="flex flex-row items-center w-full h-[58px]">
                  <input
                    type="text"
                    placeholder="성함을 입력해주세요."
                    value={partnerSearchQuery}
                    onChange={(e) => setPartnerSearchQuery(e.target.value)}
                    className="flex-1"
                    style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', height: '58px', background: '#FDFDFD', border: '1px solid rgba(12, 12, 12, 0.08)', borderRadius: '6px 0px 0px 6px', fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#0C0C0C' }}
                    data-testid="input-partner-search"
                  />
                  <button
                    onClick={() => {}}
                    style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px 16px', height: '58px', background: '#008FED', borderRadius: '0px 6px 6px 0px', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                    data-testid="button-partner-search"
                  >
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.02em', color: '#FDFDFD' }}>
                      검색
                    </span>
                  </button>
                </div>
              </div>

              {/* Results */}
              <div className="flex flex-col items-start w-full gap-6 overflow-x-auto" style={{ maxHeight: '500px' }}>
                {filteredPartners.length === 0 ? (
                  /* Empty State */
                  (<div className="flex flex-col items-center w-full pb-14 gap-32">
                    <div className="flex flex-row items-center w-full h-[39px]" style={{ background: '#F5F5F5', minWidth: '700px' }}>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '155px', height: '39px' }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>업체명</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '93px', height: '39px' }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>일배당건수</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '93px', height: '39px' }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>월배당건수</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '93px', height: '39px' }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>진행건수</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '93px', height: '39px' }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>미결건수</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '248px', height: '39px', flexGrow: 1 }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>지역</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '49px', height: '39px' }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>선택</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center w-full mt-15">
                      <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', textAlign: 'center', letterSpacing: '-0.01em', color: '#686A6E', whiteSpace: 'pre-line' }}>
                        {partnerSearchQuery 
                          ? "검색 결과가 없습니다" 
                          : "등록된 협력사가 없습니다"}
                      </span>
                    </div>
                  </div>)
                ) : (
                  /* Table with Data */
                  (<div className="flex flex-col items-start w-full" style={{ maxHeight: '373px', minWidth: '700px' }}>
                    {/* Header */}
                    <div className="flex flex-row items-center w-full h-[39px]" style={{ background: '#F5F5F5' }}>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '155px', height: '39px' }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>업체명</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '93px', height: '39px' }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>일배당건수</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '93px', height: '39px' }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>월배당건수</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '93px', height: '39px' }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>진행건수</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '93px', height: '39px' }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>미결건수</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '248px', height: '39px', flexGrow: 1 }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>지역</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '49px', height: '39px' }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>선택</span>
                      </div>
                    </div>
                    {/* Data Rows */}
                    <div className="flex flex-col items-start w-full overflow-y-auto" style={{ maxHeight: '334px' }}>
                      {filteredPartners.map((partner) => (
                        <div 
                          key={partner.name} 
                          className="flex flex-row items-center w-full h-[61px]"
                          style={{ cursor: 'pointer', backgroundColor: tempSelectedPartner?.name === partner.name ? 'rgba(0, 143, 237, 0.08)' : 'transparent' }}
                          onClick={() => setTempSelectedPartner(partner)}
                          data-testid={`row-partner-${partner.name}`}
                        >
                          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '155px', height: '39px' }}>
                            <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: tempSelectedPartner?.name === partner.name ? '#008FED' : '#686A6E' }}>
                              {partner.name}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '93px', height: '39px' }}>
                            <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              {partner.dailyCount}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '93px', height: '39px' }}>
                            <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              {partner.monthlyCount}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '93px', height: '39px' }}>
                            <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              {partner.inProgressCount}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '93px', height: '39px' }}>
                            <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              {partner.pendingCount}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '248px', height: '61px', flexGrow: 1 }}>
                            <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              {partner.region}
                            </span>
                          </div>
                          <div 
                            style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '49px', height: '38px' }}
                            data-testid={`radio-partner-${partner.name}`}
                          >
                            <div style={{ position: 'relative', width: '18px', height: '18px' }}>
                              <div style={{ position: 'absolute', left: '0%', right: '0%', top: '0%', bottom: '0%', background: tempSelectedPartner?.name === partner.name ? '#008FED' : '#FDFDFD', border: tempSelectedPartner?.name === partner.name ? 'none' : '2px solid rgba(12, 12, 12, 0.2)', borderRadius: '50%' }}></div>
                              {tempSelectedPartner?.name === partner.name && (
                                <div style={{ position: 'absolute', left: '27.78%', right: '27.78%', top: '27.78%', bottom: '27.78%', background: '#FDFDFD', borderRadius: '50%' }}></div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>)
                )}

                {/* Selected Partner Card */}
                {tempSelectedPartner && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0px', gap: '8px', width: '824px', height: '103px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '16px', gap: '8px', width: '824px', height: '55px', background: '#F8F8F8', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0px', gap: '16px', width: '424px', height: '23px' }}>
                        <div style={{ width: '8px', height: '8px', background: '#008FED', borderRadius: '50%' }}></div>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0px', gap: '9px', width: '400px', height: '23px' }}>
                          <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '18px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.9)' }}>
                            {tempSelectedPartner.name}
                          </span>
                          <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.6)' }}>
                            {tempSelectedPartner.region}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px', gap: '8px', width: '824px', height: '40px' }}>
                      <button
                        onClick={() => setTempSelectedPartner(null)}
                        style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '10px', gap: '10px', margin: '0 auto', width: '88px', height: '40px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                        data-testid="button-reset-partner"
                      >
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.3)' }}>
                          초기화
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPartner(tempSelectedPartner);
                          handleInputChange("assignedPartner", tempSelectedPartner.name);
                          // 협력사가 변경되면 담당자명과 연락처 초기화
                          setFormData(prev => ({
                            ...prev,
                            assignedPartner: tempSelectedPartner.name,
                            assignedPartnerManager: "",
                            assignedPartnerContact: "",
                          }));
                          setIsPartnerSearchOpen(false);
                        }}
                        style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '10px', gap: '10px', margin: '0 auto', width: '88px', height: '40px', background: '#008FED', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                        data-testid="button-apply-partner"
                      >
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: '#FDFDFD' }}>
                          적용
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 의뢰사 검색 팝업 - Portal로 body에 직접 렌더링 */}
      {isClientSearchOpen && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '16px',
            pointerEvents: 'auto',
          }}
          onClick={() => setIsClientSearchOpen(false)}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="w-full max-w-[600px]"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '0px 0px 20px',
              gap: '10px',
              isolation: 'isolate',
              background: '#FFFFFF',
              boxShadow: '0px -2px 70px rgba(179, 193, 205, 0.8)',
              borderRadius: '12px',
              maxHeight: '90vh',
              pointerEvents: 'auto',
            }}
          >
            {/* Header */}
            <div className="flex flex-row justify-between items-center w-full px-5 h-[60px]" style={{ flexShrink: 0 }}>
              <h2 style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '18px', lineHeight: '128%', letterSpacing: '-0.02em', color: '#0C0C0C' }}>
                의뢰사 검색
              </h2>
              <button
                onClick={() => setIsClientSearchOpen(false)}
                style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '24px 20px', width: '60px', height: '60px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                data-testid="button-close-client-search"
              >
                <X size={24} color="#1C1B1F" />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col items-center w-full px-5 gap-4" style={{ flexShrink: 0 }}>
              {/* Search Input */}
              <div className="flex flex-col items-start w-full gap-2">
                <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                  의뢰사 검색
                </label>
                <div className="flex flex-row items-center w-full h-[58px]">
                  <input
                    type="text"
                    placeholder="의뢰사명을 입력해주세요."
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    className="flex-1"
                    style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', height: '58px', background: '#FDFDFD', border: '1px solid rgba(12, 12, 12, 0.08)', borderRadius: '6px 0px 0px 6px', fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#0C0C0C' }}
                    data-testid="input-client-search"
                  />
                  <button
                    onClick={() => {}}
                    style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px 16px', height: '58px', background: '#008FED', borderRadius: '0px 6px 6px 0px', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                    data-testid="button-client-search-submit"
                  >
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.02em', color: '#FDFDFD' }}>
                      검색
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Results - Scrollable */}
            <div className="flex flex-col items-start w-full px-5 overflow-y-auto" style={{ flex: 1, minHeight: 0, maxHeight: '300px' }}>
              {filteredClients.length === 0 ? (
                <div className="flex items-center justify-center w-full py-10">
                  <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', color: '#686A6E' }}>
                    {clientSearchQuery ? "검색 결과가 없습니다" : "등록된 의뢰사가 없습니다"}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-start w-full">
                  {/* Header */}
                  <div className="flex flex-row items-center w-full h-[39px]" style={{ background: '#F5F5F5' }}>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', flex: 1 }}>
                      <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>의뢰사명</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', width: '60px' }}>
                      <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>선택</span>
                    </div>
                  </div>
                  {/* Data Rows */}
                  {filteredClients.map((client) => (
                    <div 
                      key={client.name} 
                      className="flex flex-row items-center w-full h-[50px]"
                      style={{ borderBottom: '1px solid rgba(12, 12, 12, 0.08)', cursor: 'pointer', backgroundColor: tempSelectedClient?.name === client.name ? 'rgba(0, 143, 237, 0.08)' : 'transparent' }}
                      onClick={() => setTempSelectedClient(client)}
                      data-testid={`row-client-${client.name}`}
                    >
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', flex: 1 }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', color: tempSelectedClient?.name === client.name ? '#008FED' : '#686A6E' }}>
                          {client.name}
                        </span>
                      </div>
                      <div 
                        style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: '10px 12px', width: '60px' }}
                        data-testid={`radio-client-${client.name}`}
                      >
                        <div style={{ position: 'relative', width: '18px', height: '18px' }}>
                          <div style={{ position: 'absolute', left: '0%', right: '0%', top: '0%', bottom: '0%', background: tempSelectedClient?.name === client.name ? '#008FED' : '#FDFDFD', border: tempSelectedClient?.name === client.name ? 'none' : '2px solid rgba(12, 12, 12, 0.2)', borderRadius: '50%' }}></div>
                          {tempSelectedClient?.name === client.name && (
                            <div style={{ position: 'absolute', left: '27.78%', right: '27.78%', top: '27.78%', bottom: '27.78%', background: '#FDFDFD', borderRadius: '50%' }}></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Card - Fixed at bottom */}
            {tempSelectedClient && (
              <div className="w-full px-5" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0px', gap: '8px', flexShrink: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '16px', gap: '8px', width: '100%', background: '#F8F8F8', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0px', gap: '16px' }}>
                    <div style={{ width: '8px', height: '8px', background: '#008FED', borderRadius: '50%' }}></div>
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '18px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.9)' }}>
                      {tempSelectedClient.name}
                    </span>
                  </div>
                </div>
                
                {/* Buttons */}
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px', gap: '8px', width: '100%', height: '40px' }}>
                  <button
                    onClick={() => setTempSelectedClient(null)}
                    style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '10px', gap: '10px', width: '88px', height: '40px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                    data-testid="button-reset-client"
                  >
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.3)' }}>
                      초기화
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      handleInputChange("clientResidence", tempSelectedClient.name);
                      setIsClientSearchOpen(false);
                      setTempSelectedClient(null);
                      setClientSearchQuery("");
                    }}
                    style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '10px', gap: '10px', width: '88px', height: '40px', background: '#008FED', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                    data-testid="button-apply-client"
                  >
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: '#FDFDFD' }}>
                      적용
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* 심사사 검색 팝업 - Portal로 body에 직접 렌더링 */}
      {isAssessorSearchOpen && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '16px',
            pointerEvents: 'auto',
          }}
          onClick={() => setIsAssessorSearchOpen(false)}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="w-full max-w-[600px]"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '0px 0px 20px',
              gap: '10px',
              isolation: 'isolate',
              background: '#FFFFFF',
              boxShadow: '0px -2px 70px rgba(179, 193, 205, 0.8)',
              borderRadius: '12px',
              maxHeight: '90vh',
              pointerEvents: 'auto',
            }}
          >
            {/* Header */}
            <div className="flex flex-row justify-between items-center w-full px-5 h-[60px]" style={{ flexShrink: 0 }}>
              <h2 style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '18px', lineHeight: '128%', letterSpacing: '-0.02em', color: '#0C0C0C' }}>
                심사사 검색
              </h2>
              <button
                onClick={() => setIsAssessorSearchOpen(false)}
                style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '24px 20px', width: '60px', height: '60px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                data-testid="button-close-assessor-search"
              >
                <X size={24} color="#1C1B1F" />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col items-center w-full px-5 gap-4" style={{ flexShrink: 0 }}>
              {/* Search Input */}
              <div className="flex flex-col items-start w-full gap-2">
                <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                  심사사 검색
                </label>
                <div className="flex flex-row items-center w-full h-[58px]">
                  <input
                    type="text"
                    placeholder="심사사명을 입력해주세요."
                    value={assessorSearchQuery}
                    onChange={(e) => setAssessorSearchQuery(e.target.value)}
                    className="flex-1"
                    style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', height: '58px', background: '#FDFDFD', border: '1px solid rgba(12, 12, 12, 0.08)', borderRadius: '6px 0px 0px 6px', fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#0C0C0C' }}
                    data-testid="input-assessor-search"
                  />
                  <button
                    onClick={() => {}}
                    style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px 16px', height: '58px', background: '#008FED', borderRadius: '0px 6px 6px 0px', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                    data-testid="button-assessor-search-submit"
                  >
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.02em', color: '#FDFDFD' }}>
                      검색
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Results - Scrollable */}
            <div className="flex flex-col items-start w-full px-5 overflow-y-auto" style={{ flex: 1, minHeight: 0, maxHeight: '300px' }}>
              {filteredAssessors.length === 0 ? (
                <div className="flex items-center justify-center w-full py-10">
                  <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', color: '#686A6E' }}>
                    {assessorSearchQuery ? "검색 결과가 없습니다" : "등록된 심사사가 없습니다"}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-start w-full">
                  {/* Header */}
                  <div className="flex flex-row items-center w-full h-[39px]" style={{ background: '#F5F5F5' }}>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', flex: 1 }}>
                      <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>심사사명</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', width: '60px' }}>
                      <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>선택</span>
                    </div>
                  </div>
                  {/* Data Rows */}
                  {filteredAssessors.map((assessor) => (
                    <div 
                      key={assessor.name} 
                      className="flex flex-row items-center w-full h-[50px]"
                      style={{ borderBottom: '1px solid rgba(12, 12, 12, 0.08)', cursor: 'pointer', backgroundColor: tempSelectedAssessor?.name === assessor.name ? 'rgba(0, 143, 237, 0.08)' : 'transparent' }}
                      onClick={() => setTempSelectedAssessor(assessor)}
                      data-testid={`row-assessor-${assessor.name}`}
                    >
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', flex: 1 }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', color: tempSelectedAssessor?.name === assessor.name ? '#008FED' : '#686A6E' }}>
                          {assessor.name}
                        </span>
                      </div>
                      <div 
                        style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: '10px 12px', width: '60px' }}
                        data-testid={`radio-assessor-${assessor.name}`}
                      >
                        <div style={{ position: 'relative', width: '18px', height: '18px' }}>
                          <div style={{ position: 'absolute', left: '0%', right: '0%', top: '0%', bottom: '0%', background: tempSelectedAssessor?.name === assessor.name ? '#008FED' : '#FDFDFD', border: tempSelectedAssessor?.name === assessor.name ? 'none' : '2px solid rgba(12, 12, 12, 0.2)', borderRadius: '50%' }}></div>
                          {tempSelectedAssessor?.name === assessor.name && (
                            <div style={{ position: 'absolute', left: '27.78%', right: '27.78%', top: '27.78%', bottom: '27.78%', background: '#FDFDFD', borderRadius: '50%' }}></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Card - Fixed at bottom */}
            {tempSelectedAssessor && (
              <div className="w-full px-5" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0px', gap: '8px', flexShrink: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '16px', gap: '8px', width: '100%', background: '#F8F8F8', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0px', gap: '16px' }}>
                    <div style={{ width: '8px', height: '8px', background: '#008FED', borderRadius: '50%' }}></div>
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '18px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.9)' }}>
                      {tempSelectedAssessor.name}
                    </span>
                  </div>
                </div>
                
                {/* Buttons */}
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px', gap: '8px', width: '100%', height: '40px' }}>
                  <button
                    onClick={() => setTempSelectedAssessor(null)}
                    style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '10px', gap: '10px', width: '88px', height: '40px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                    data-testid="button-reset-assessor"
                  >
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.3)' }}>
                      초기화
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      handleInputChange("assessorId", tempSelectedAssessor.name);
                      setIsAssessorSearchOpen(false);
                      setTempSelectedAssessor(null);
                      setAssessorSearchQuery("");
                    }}
                    style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '10px', gap: '10px', width: '88px', height: '40px', background: '#008FED', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                    data-testid="button-apply-assessor"
                  >
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: '#FDFDFD' }}>
                      적용
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* 조사사(손사명) 검색 팝업 - Portal로 body에 직접 렌더링 */}
      {isInvestigatorSearchOpen && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '16px',
            pointerEvents: 'auto',
          }}
          onClick={() => setIsInvestigatorSearchOpen(false)}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="w-full max-w-[600px]"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '0px 0px 20px',
              gap: '10px',
              isolation: 'isolate',
              background: '#FFFFFF',
              boxShadow: '0px -2px 70px rgba(179, 193, 205, 0.8)',
              borderRadius: '12px',
              maxHeight: '90vh',
              pointerEvents: 'auto',
            }}
          >
            {/* Header */}
            <div className="flex flex-row justify-between items-center w-full px-5 h-[60px]" style={{ flexShrink: 0 }}>
              <h2 style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '18px', lineHeight: '128%', letterSpacing: '-0.02em', color: '#0C0C0C' }}>
                손사명 검색
              </h2>
              <button
                onClick={() => setIsInvestigatorSearchOpen(false)}
                style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '24px 20px', width: '60px', height: '60px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                data-testid="button-close-investigator-search"
              >
                <X size={24} color="#1C1B1F" />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col items-center w-full px-5 gap-4" style={{ flexShrink: 0 }}>
              {/* Search Input */}
              <div className="flex flex-col items-start w-full gap-2">
                <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                  손사명 검색
                </label>
                <div className="flex flex-row items-center w-full h-[58px]">
                  <input
                    type="text"
                    placeholder="손사명을 입력해주세요."
                    value={investigatorSearchQuery}
                    onChange={(e) => setInvestigatorSearchQuery(e.target.value)}
                    className="flex-1"
                    style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', height: '58px', background: '#FDFDFD', border: '1px solid rgba(12, 12, 12, 0.08)', borderRadius: '6px 0px 0px 6px', fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#0C0C0C' }}
                    data-testid="input-investigator-search"
                  />
                  <button
                    onClick={() => {}}
                    style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px 16px', height: '58px', background: '#008FED', borderRadius: '0px 6px 6px 0px', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                    data-testid="button-investigator-search-submit"
                  >
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.02em', color: '#FDFDFD' }}>
                      검색
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Results - Scrollable */}
            <div className="flex flex-col items-start w-full px-5 overflow-y-auto" style={{ flex: 1, minHeight: 0, maxHeight: '300px' }}>
              {filteredInvestigators.length === 0 ? (
                <div className="flex items-center justify-center w-full py-10">
                  <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', color: '#686A6E' }}>
                    {investigatorSearchQuery ? "검색 결과가 없습니다" : "등록된 손사명이 없습니다"}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-start w-full">
                  {/* Header */}
                  <div className="flex flex-row items-center w-full h-[39px]" style={{ background: '#F5F5F5' }}>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', flex: 1 }}>
                      <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>손사명</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', width: '60px' }}>
                      <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>선택</span>
                    </div>
                  </div>
                  {/* Data Rows */}
                  {filteredInvestigators.map((investigator) => (
                    <div 
                      key={investigator.name} 
                      className="flex flex-row items-center w-full h-[50px]"
                      style={{ borderBottom: '1px solid rgba(12, 12, 12, 0.08)', cursor: 'pointer', backgroundColor: tempSelectedInvestigator?.name === investigator.name ? 'rgba(0, 143, 237, 0.08)' : 'transparent' }}
                      onClick={() => setTempSelectedInvestigator(investigator)}
                      data-testid={`row-investigator-${investigator.name}`}
                    >
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', flex: 1 }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', color: tempSelectedInvestigator?.name === investigator.name ? '#008FED' : '#686A6E' }}>
                          {investigator.name}
                        </span>
                      </div>
                      <div 
                        style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: '10px 12px', width: '60px' }}
                        data-testid={`radio-investigator-${investigator.name}`}
                      >
                        <div style={{ position: 'relative', width: '18px', height: '18px' }}>
                          <div style={{ position: 'absolute', left: '0%', right: '0%', top: '0%', bottom: '0%', background: tempSelectedInvestigator?.name === investigator.name ? '#008FED' : '#FDFDFD', border: tempSelectedInvestigator?.name === investigator.name ? 'none' : '2px solid rgba(12, 12, 12, 0.2)', borderRadius: '50%' }}></div>
                          {tempSelectedInvestigator?.name === investigator.name && (
                            <div style={{ position: 'absolute', left: '27.78%', right: '27.78%', top: '27.78%', bottom: '27.78%', background: '#FDFDFD', borderRadius: '50%' }}></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Card - Fixed at bottom */}
            {tempSelectedInvestigator && (
              <div className="w-full px-5" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0px', gap: '8px', flexShrink: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '16px', gap: '8px', width: '100%', background: '#F8F8F8', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0px', gap: '16px' }}>
                    <div style={{ width: '8px', height: '8px', background: '#008FED', borderRadius: '50%' }}></div>
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '18px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.9)' }}>
                      {tempSelectedInvestigator.name}
                    </span>
                  </div>
                </div>
                
                {/* Buttons */}
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px', gap: '8px', width: '100%', height: '40px' }}>
                  <button
                    onClick={() => setTempSelectedInvestigator(null)}
                    style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '10px', gap: '10px', width: '88px', height: '40px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                    data-testid="button-reset-investigator"
                  >
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.3)' }}>
                      초기화
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      handleInputChange("investigatorTeam", tempSelectedInvestigator.name);
                      setIsInvestigatorSearchOpen(false);
                      setTempSelectedInvestigator(null);
                      setInvestigatorSearchQuery("");
                    }}
                    style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '10px', gap: '10px', width: '88px', height: '40px', background: '#008FED', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                    data-testid="button-apply-investigator"
                  >
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: '#FDFDFD' }}>
                      적용
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
      
    </div>
  );
}
