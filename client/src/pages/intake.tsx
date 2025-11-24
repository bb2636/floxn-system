import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
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

export default function Intake() {
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
  
  // 협력사 검색 팝업 상태
  const [isPartnerSearchOpen, setIsPartnerSearchOpen] = useState(false);
  const [partnerSearchQuery, setPartnerSearchQuery] = useState("");
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [tempSelectedPartner, setTempSelectedPartner] = useState<any>(null);
  
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
    
    // 검색어가 없으면 피보험자 주소 기반으로 지역 협력사만 표시
    const city = extractCityFromAddress(formData.insuredAddress);
    if (!city) return []; // 주소가 없으면 빈 배열
    
    return partnersWithStats.filter(p => {
      // 협력사의 서비스 지역에 해당 키워드가 포함되어 있는지 확인
      return p.region.includes(city);
    });
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

  useEffect(() => {
    if (!userLoading && !user) {
      setLocation("/");
    }
  }, [user, userLoading, setLocation]);

  // 임시 저장 건 불러오기
  useEffect(() => {
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
          
          // 폼 데이터 채우기
          setFormData({
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
            damagePreventionCost: caseData.damagePreventionCost === "true",
            victimIncidentAssistance: caseData.victimIncidentAssistance === "true",
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
    const cleaned: any = {};
    Object.entries(data).forEach(([key, value]) => {
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
    // sameAsPolicyHolder 체크박스 상태 추가
    cleaned.sameAsPolicyHolder = sameAsPolicyHolder ? "true" : "false";
    // additionalVictims 배열을 JSON 문자열로 변환
    if (additionalVictims.length > 0) {
      cleaned.additionalVictims = JSON.stringify(additionalVictims);
    }
    return cleaned;
  };

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // 저장 버튼은 항상 "배당대기" 상태로 저장
      const status = "배당대기";
      
      console.log("💾 저장 상태 결정:", {
        assignedPartner: data.assignedPartner,
        assignedPartnerManager: data.assignedPartnerManager,
        status
      });
      
      // 임시저장 시: caseNumber 없이 전송 (서버에서 DRAFT-{timestamp} 자동 생성)
      const cleanedData = { ...cleanFormData(data), status };
      
      // 임시저장: 기존 케이스가 있으면 업데이트, 없으면 생성
      if (editCaseId) {
        return await apiRequest("PATCH", `/api/cases/${editCaseId}`, cleanedData);
      } else {
        const result = await apiRequest("POST", "/api/cases", cleanedData);
        // 새로 생성한 경우 editCaseId 설정
        if (result && typeof result === 'object' && 'case' in result) {
          const newCaseId = (result as any).case.id;
          setEditCaseId(newCaseId);
          // localStorage에도 저장하여 "이어서 작성하기" 가능하도록
          localStorage.setItem('editCaseId', newCaseId);
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
    mutationFn: async (data: typeof formData) => {
      const cleanedData = cleanFormData(data);
      
      // 1. 접수일자 가져오기 (formData에서 또는 오늘 날짜)
      const receptionDate = data.accidentDate || getTodayDate();
      
      // 2. API로 다음 순번 조회
      const sequenceResponse = await apiRequest("GET", `/api/cases/next-sequence?date=${receptionDate}`);
      const sequenceData = await sequenceResponse.json();
      const sequence = sequenceData.sequence as number;
      
      // 3. 기본 접수번호 생성: yyyymmddxxx
      const datePrefix = receptionDate.replace(/-/g, ''); // YYYYMMDD
      const sequenceStr = String(sequence).padStart(3, '0'); // 001, 002, ...
      const baseCaseNumber = `${datePrefix}${sequenceStr}`;
      
      console.log("📋 접수 데이터:", {
        receptionDate,
        sequence,
        baseCaseNumber,
        damagePreventionCost: data.damagePreventionCost,
        victimIncidentAssistance: data.victimIncidentAssistance,
        editCaseId: editCaseId
      });
      
      // 4. 기존 임시 저장 건 삭제
      if (editCaseId) {
        try {
          console.log("🗑️ 기존 임시 저장 건 삭제:", editCaseId);
          await apiRequest("DELETE", `/api/cases/${editCaseId}`);
          console.log("✅ 임시 저장 건 삭제 완료");
        } catch (error) {
          console.error("❌ 임시 저장 건 삭제 실패:", error);
          // 삭제 실패해도 계속 진행
        }
      }
      
      // 5. Suffix 규칙에 따라 케이스 생성
      if (data.damagePreventionCost && data.victimIncidentAssistance) {
        // 둘 다 선택: -0 (손해방지) + -1 (피해세대복구) 2건 생성
        console.log("🔵 손해방지 + 피해세대복구 → 2건 생성 모드");
        
        const case1 = {
          ...cleanedData,
          caseNumber: `${baseCaseNumber}-0`,
          damagePreventionCost: "true",
          victimIncidentAssistance: "false",
          status: "접수완료"
        };
        
        const case2 = {
          ...cleanedData,
          caseNumber: `${baseCaseNumber}-1`,
          damagePreventionCost: "false",
          victimIncidentAssistance: "true",
          status: "접수완료"
        };
        
        console.log("📌 케이스 1 (손해방지):", case1.caseNumber);
        console.log("📌 케이스 2 (피해세대복구):", case2.caseNumber);
        
        await apiRequest("POST", "/api/cases", case1);
        console.log("✅ 케이스 1 생성 완료");
        await apiRequest("POST", "/api/cases", case2);
        console.log("✅ 케이스 2 생성 완료");
        
        return { count: 2, caseNumber1: case1.caseNumber, caseNumber2: case2.caseNumber };
      } else if (data.damagePreventionCost) {
        // 손해방지만: -0
        console.log("🟡 손해방지만 → 1건 생성 (-0)");
        const singleCase = {
          ...cleanedData,
          caseNumber: `${baseCaseNumber}-0`,
          status: "접수완료"
        };
        return await apiRequest("POST", "/api/cases", singleCase);
      } else {
        // 피해세대복구만 또는 둘 다 선택 안 됨: -1
        console.log("🟢 피해세대복구 → 1건 생성 (-1)");
        const singleCase = {
          ...cleanedData,
          caseNumber: `${baseCaseNumber}-1`,
          status: "접수완료"
        };
        return await apiRequest("POST", "/api/cases", singleCase);
      }
    },
    onSuccess: (result) => {
      const count = (result && typeof result === 'object' && 'count' in result) ? result.count : 1;
      const case1 = (result && typeof result === 'object' && 'caseNumber1' in result) ? result.caseNumber1 : null;
      const case2 = (result && typeof result === 'object' && 'caseNumber2' in result) ? result.caseNumber2 : null;
      
      toast({ 
        description: count === 2 && case1 && case2
          ? `접수가 완료되었습니다. (2건 생성: ${case1}, ${case2})` 
          : "접수가 완료되었습니다. (상태: 접수완료)",
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      // 접수완료 성공 후 localStorage에서 임시 데이터 및 editCaseId 삭제
      localStorage.removeItem('intakeFormDraft');
      localStorage.removeItem('editCaseId');
      setEditCaseId(null);
      setTimeout(() => {
        setLocation("/dashboard");
      }, 1000);
    },
    onError: (error: Error) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      // 의뢰자를 선택하면 해당 직원의 연락처를 자동으로 설정
      if (field === "clientName" && value) {
        const selectedEmployee = filteredClientEmployees.find(emp => emp.name === value);
        if (selectedEmployee) {
          updated.clientContact = selectedEmployee.phone || "";
        }
      }
      
      // 심사자를 선택하면 해당 심사자의 연락처를 자동으로 설정
      if (field === "assessorTeam" && value) {
        const selectedAssessor = filteredAssessorEmployees.find(assessor => assessor.name === value);
        if (selectedAssessor) {
          updated.assessorContact = selectedAssessor.phone || "";
        }
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
    saveMutation.mutate(formData);
  };

  // 초기화
  const handleReset = () => {
    const initialFormData = {
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
    
    submitMutation.mutate(formData);
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
    <div className="relative" style={{ minHeight: '100vh', background: 'linear-gradient(0deg, #E7EDFE, #E7EDFE)' }}>
      {/* Blur Background Orbs */}
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

      <GlobalHeader />

      {/* Main Content */}
      <main className="relative flex items-center justify-center px-4 md:px-6 lg:px-8 pb-10">
        {/* Responsive Container */}
        <div className="w-full max-w-[1660px]">
          {/* Page Title */}
          <div 
            className="flex items-center gap-3 md:gap-4 px-4 md:px-8 py-6 md:py-9"
          >
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
                              color: '#686A6E',
                            }}
                            data-testid="text-case-number"
                          >
                            접수 후 자동생성
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
                        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen} modal={false}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full h-14 md:h-[68px] px-4 md:px-5 text-sm md:text-base rounded-lg"
                              style={{
                                justifyContent: 'flex-start',
                                background: '#FDFDFD',
                                border: '2px solid rgba(12, 12, 12, 0.08)',
                                fontFamily: 'Pretendard',
                                fontWeight: 600,
                                letterSpacing: '-0.02em',
                                color: '#0C0C0C',
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
                        보험사 증권번호, 보험사 사고번호 중 한 가지는 반드시 기입해야 합니다.
                      </p>
                    </div>

                    {/* 보험 정보 3-column on desktop, 1-column on mobile */}
                    <div className="flex flex-col md:flex-row gap-4 md:gap-5 px-4 md:px-5 mb-6 md:mb-8">
                      <div className="flex-1 flex flex-col gap-2">
                        <label className="text-sm" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>보험사</label>
                        <Select value={formData.insuranceCompany} onValueChange={(value) => handleInputChange("insuranceCompany", value)}>
                          <SelectTrigger className="h-14 md:h-[68px] px-4 md:px-5 rounded-lg text-sm md:text-base" style={{background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em'}} data-testid="select-insurance-company">
                            <SelectValue placeholder="보험사 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {["삼성화재", "현대해상", "DB손해보험", "KB손해보험", "메리츠화재"].map((company) => (
                              <SelectItem key={company} value={company} data-testid={`select-option-insurance-company-${company}`}>{company}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 flex flex-col gap-2">
                        <label className="text-sm" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>보험사 증권번호</label>
                        <input type="text" placeholder="증권번호 입력" value={formData.insurancePolicyNo} onChange={(e) => handleInputChange("insurancePolicyNo", e.target.value)} className="h-14 md:h-[68px] px-4 md:px-5 rounded-lg text-sm md:text-base" style={{background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-insurance-policy-no" />
                      </div>
                      <div className="flex-1 flex flex-col gap-2">
                        <label className="text-sm" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>보험사 사고번호</label>
                        <input type="text" placeholder="사고번호 입력" value={formData.insuranceAccidentNo} onChange={(e) => handleInputChange("insuranceAccidentNo", e.target.value)} className="h-14 md:h-[68px] px-4 md:px-5 rounded-lg text-sm md:text-base" style={{background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-insurance-accident-no" />
                      </div>
                    </div>

                    {/* Subsection: 의뢰자 정보 */}
                    <div className="px-4 md:px-5 py-4 md:py-6 pb-3">
                      <h3 className="text-lg md:text-xl" style={{fontFamily: 'Pretendard',fontWeight: 600,lineHeight: '128%',letterSpacing: '-0.02em',color: 'rgba(12, 12, 12, 0.8)'}}>의뢰자 정보</h3>
                    </div>

                    {/* 의뢰자 정보 - responsive grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 px-4 md:px-5 mb-6 md:mb-8">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>의뢰사</label>
                        <Select value={formData.clientResidence} onValueChange={(value) => handleInputChange("clientResidence", value)}>
                          <SelectTrigger className="h-14 md:h-[68px] px-4 md:px-5 rounded-lg text-sm md:text-base" style={{background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em'}} data-testid="select-client-company">
                            <SelectValue placeholder="의뢰사 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {allCompanies.map((company) => (
                              <SelectItem key={company} value={company} data-testid={`select-option-client-${company}`}>
                                {company}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>소속/시설</label>
                        <input type="text" placeholder="소속/시설" value={formData.clientDepartment} onChange={(e) => handleInputChange("clientDepartment", e.target.value)} className="h-14 md:h-[68px] px-4 md:px-5 rounded-lg text-sm md:text-base" style={{background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-client-department" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>의뢰자</label>
                        <Select 
                          value={formData.clientName} 
                          onValueChange={(value) => handleInputChange("clientName", value)}
                          disabled={!formData.clientResidence}
                        >
                          <SelectTrigger className="h-14 md:h-[68px] px-4 md:px-5 rounded-lg text-sm md:text-base" style={{background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em'}} data-testid="select-client-name">
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
                      <div className="flex flex-col gap-2">
                        <label className="text-sm" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>의뢰자 담당자 연락처</label>
                        <input type="text" placeholder="의뢰자를 선택하면 자동으로 입력됩니다" value={formData.clientContact} readOnly className="h-14 md:h-[68px] px-4 md:px-5 rounded-lg text-sm md:text-base" style={{background: 'rgba(12, 12, 12, 0.04)',border: 'none',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-client-contact" />
                      </div>
                    </div>

                    {/* Subsection: 심사자 정보 */}
                    <div className="px-4 md:px-5 py-4 md:py-6 pb-3">
                      <h3 className="text-lg md:text-xl" style={{fontFamily: 'Pretendard',fontWeight: 600,lineHeight: '128%',letterSpacing: '-0.02em',color: 'rgba(12, 12, 12, 0.8)'}}>심사자 정보</h3>
                    </div>

                    {/* 심사자 정보 - responsive grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 px-4 md:px-5 mb-6 md:mb-8">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>심사사</label>
                        <Select value={formData.assessorId} onValueChange={(value) => handleInputChange("assessorId", value)}>
                          <SelectTrigger className="h-14 md:h-[68px] px-4 md:px-5 rounded-lg text-sm md:text-base" style={{background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em'}} data-testid="select-assessor-company">
                            <SelectValue placeholder="심사사 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="한국손해사정" data-testid="select-option-assessor-korea">한국손해사정</SelectItem>
                            <SelectItem value="코리아손해사정" data-testid="select-option-assessor-corea">코리아손해사정</SelectItem>
                            <SelectItem value="대한손해사정" data-testid="select-option-assessor-daehan">대한손해사정</SelectItem>
                            <SelectItem value="글로벌손해사정" data-testid="select-option-assessor-global">글로벌손해사정</SelectItem>
                            <SelectItem value="한빛손해사정" data-testid="select-option-assessor-hanbit">한빛손해사정</SelectItem>
                            <SelectItem value="우리손해사정" data-testid="select-option-assessor-woori">우리손해사정</SelectItem>
                            <SelectItem value="서울손해사정" data-testid="select-option-assessor-seoul">서울손해사정</SelectItem>
                            <SelectItem value="현대손해사정" data-testid="select-option-assessor-hyundai">현대손해사정</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-2" style={{ flex: 1 }}>
                        <label className="text-sm" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>소속/시설</label>
                        <input type="text" placeholder="입력해주세요" value={formData.assessorDepartment} onChange={(e) => handleInputChange("assessorDepartment", e.target.value)} className="h-14 md:h-[68px] px-4 md:px-5 rounded-lg text-sm md:text-base" style={{background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-assessor-department" />
                      </div>
                      <div className="flex flex-col gap-2" style={{ flex: 1 }}>
                        <label className="text-sm" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>심사자</label>
                        <Select 
                          value={formData.assessorTeam} 
                          onValueChange={(value) => handleInputChange("assessorTeam", value)}
                          disabled={!formData.assessorId}
                        >
                          <SelectTrigger className="h-14 md:h-[68px] px-4 md:px-5 rounded-lg text-sm md:text-base" style={{background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em'}} data-testid="select-assessor-name">
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
                      <div className="flex flex-col gap-2" style={{ flex: 1 }}>
                        <label className="text-sm" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>심사자 연락처</label>
                        <input type="text" placeholder="심사자를 선택하면 자동으로 입력됩니다" value={formData.assessorContact} readOnly className="h-14 md:h-[68px] px-4 md:px-5 rounded-lg text-sm md:text-base" style={{background: 'rgba(12, 12, 12, 0.04)',border: 'none',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-assessor-contact" />
                      </div>
                    </div>

                    {/* Subsection: 조사자 정보 */}
                    <div className="px-4 md:px-5 py-4 md:py-6 pb-3">
                      <h3 className="text-lg md:text-xl" style={{fontFamily: 'Pretendard',fontWeight: 600,lineHeight: '128%',letterSpacing: '-0.02em',color: 'rgba(12, 12, 12, 0.8)'}}>조사자 정보</h3>
                    </div>

                    {/* 조사자 정보 4-column */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 px-4 md:px-5 mb-6 md:mb-8">
                      <div className="flex flex-col gap-2" style={{ flex: 1 }}>
                        <label className="text-sm" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>손사명</label>
                        <Select value={formData.investigatorTeam} onValueChange={(value) => handleInputChange("investigatorTeam", value)}>
                          <SelectTrigger className="h-14 md:h-[68px] px-4 md:px-5 rounded-lg text-sm md:text-base" style={{background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em'}} data-testid="select-investigator-team">
                            <SelectValue placeholder="선택해주세요" />
                          </SelectTrigger>
                          <SelectContent>
                            {investigatorCompanies.map((company) => (
                              <SelectItem key={company} value={company} data-testid={`select-option-investigator-team-${company}`}>
                                {company}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-2" style={{ flex: 1 }}>
                        <label className="text-sm" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>소속/부서</label>
                        <input type="text" placeholder="입력해주세요" value={formData.investigatorDepartment} onChange={(e) => handleInputChange("investigatorDepartment", e.target.value)} className="h-14 md:h-[68px] px-4 md:px-5 rounded-lg text-sm md:text-base" style={{background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-investigator-department" />
                      </div>
                      <div className="flex flex-col gap-2" style={{ flex: 1 }}>
                        <label className="text-sm" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>조사자</label>
                        <Select 
                          value={formData.investigatorTeamName} 
                          onValueChange={(value) => handleInputChange("investigatorTeamName", value)}
                          disabled={!formData.investigatorTeam}
                        >
                          <SelectTrigger className="h-14 md:h-[68px] px-4 md:px-5 rounded-lg text-sm md:text-base" style={{background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em'}} data-testid="select-investigator">
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
                      <div className="flex flex-col gap-2" style={{ flex: 1 }}>
                        <label className="text-sm" style={{fontFamily: 'Pretendard',fontWeight: 500,lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>조사자 연락처</label>
                        <input type="text" placeholder="조사자를 선택하면 자동으로 입력됩니다" value={formData.investigatorContact} readOnly className="h-14 md:h-[68px] px-4 md:px-5 rounded-lg text-sm md:text-base" style={{background: 'rgba(12, 12, 12, 0.04)',border: 'none',fontFamily: 'Pretendard',fontWeight: 600,letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-investigator-contact" />
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
                          placeholder="도로명 주소, 동/호 포함"
                          value={formData.insuredAddress}
                          onChange={(e) => handleInputChange("insuredAddress", e.target.value)}
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
                          data-testid="input-insured-address"
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

                        {/* Row 2: 4-column Dropdowns */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 w-full">
                          {/* Column 1 */}
                          <div className="flex flex-col gap-2">
                            <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              사고 유형
                            </label>
                            <Select 
                              value={formData.accidentType} 
                              onValueChange={(value) => handleInputChange("accidentType", value)}
                            >
                              <SelectTrigger 
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
                                }}
                                data-testid="select-accident-type"
                              >
                                <SelectValue placeholder="사고 유형 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="누수">누수</SelectItem>
                                <SelectItem value="급배수">급배수</SelectItem>
                                <SelectItem value="화재">화재</SelectItem>
                                <SelectItem value="기타">기타</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Column 2 */}
                          <div className="flex flex-col gap-2">
                            <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              사고 원인
                            </label>
                            <Select 
                              value={formData.accidentCause} 
                              onValueChange={(value) => handleInputChange("accidentCause", value)}
                            >
                              <SelectTrigger 
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
                                }}
                                data-testid="select-accident-cause"
                              >
                                <SelectValue placeholder="사고 원인 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="배관">배관</SelectItem>
                                <SelectItem value="방수">방수</SelectItem>
                                <SelectItem value="코킹">코킹</SelectItem>
                                <SelectItem value="공용부">공용부</SelectItem>
                                <SelectItem value="복합">복합</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Column 3 */}
                          <div className="flex flex-col gap-2">
                            <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              복구 방식
                            </label>
                            <Select 
                              value={formData.restorationMethod} 
                              onValueChange={(value) => handleInputChange("restorationMethod", value)}
                            >
                              <SelectTrigger 
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
                                }}
                                data-testid="select-restoration-method"
                              >
                                <SelectValue placeholder="복구 유형 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="없음">없음</SelectItem>
                                <SelectItem value="직접복구">직접복구</SelectItem>
                                <SelectItem value="선견적요청">선견적요청</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Column 4 */}
                          <div className="flex flex-col gap-2">
                            <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              타업체 견적 여부
                            </label>
                            <Select 
                              value={formData.otherVendorEstimate} 
                              onValueChange={(value) => handleInputChange("otherVendorEstimate", value)}
                            >
                              <SelectTrigger 
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
                                }}
                                data-testid="select-other-vendor-estimate"
                              >
                                <SelectValue placeholder="타업체 견적 여부 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="유">유</SelectItem>
                                <SelectItem value="무">무</SelectItem>
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
                            <Select value={formData.damageItem} onValueChange={(value) => handleInputChange("damageItem", value)}>
                              <SelectTrigger 
                                style={{ height: '68px', padding: '10px 20px', background: '#FDFDFD', border: '2px solid rgba(12, 12, 12, 0.08)', borderRadius: '8px', fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', letterSpacing: '-0.02em' }}
                                data-testid="select-damage-item"
                              >
                                <SelectValue placeholder="선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="장판">장판</SelectItem>
                                <SelectItem value="벽지">벽지</SelectItem>
                                <SelectItem value="가구">가구</SelectItem>
                                <SelectItem value="전자제품">전자제품</SelectItem>
                                <SelectItem value="기타">기타</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* 피해 유형 */}
                          <div style={{ width: '413.33px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              피해 유형
                            </label>
                            <Select value={formData.damageType} onValueChange={(value) => handleInputChange("damageType", value)}>
                              <SelectTrigger 
                                style={{ height: '68px', padding: '10px 20px', background: '#FDFDFD', border: '2px solid rgba(12, 12, 12, 0.08)', borderRadius: '8px', fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', letterSpacing: '-0.02em' }}
                                data-testid="select-damage-type"
                              >
                                <SelectValue placeholder="선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="교체">교체</SelectItem>
                                <SelectItem value="수리">수리</SelectItem>
                                <SelectItem value="청소">청소</SelectItem>
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
                                  onClick={() => handleInputChange("damageQuantity", String(Math.max(0, Number(formData.damageQuantity || 0) + 1)))}
                                  style={{
                                    width: '48px',
                                    height: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(12, 12, 12, 0.06)',
                                    borderRadius: '4px',
                                    border: 'none',
                                    cursor: 'pointer',
                                  }}
                                  data-testid="button-quantity-increment"
                                >
                                  <ChevronUp style={{ width: '12px', height: '12px', color: '#008FED' }} />
                                </button>
                                <button
                                  onClick={() => handleInputChange("damageQuantity", String(Math.max(0, Number(formData.damageQuantity || 0) - 1)))}
                                  style={{
                                    width: '48px',
                                    height: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(12, 12, 12, 0.06)',
                                    borderRadius: '4px',
                                    border: 'none',
                                    cursor: 'pointer',
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
                              style={{ height: '68px', padding: '10px 20px', background: '#FDFDFD', border: '2px solid rgba(12, 12, 12, 0.08)', borderRadius: '8px', fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', letterSpacing: '-0.02em', color: '#0C0C0C' }}
                              data-testid="input-damage-details"
                            />
                          </div>
                        </div>

                        {/* 입력 Button */}
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '26px 0px 0px', gap: '10px', width: '100px', height: '94px' }}>
                          <button
                            onClick={handleAddDamageItem}
                            disabled={!formData.damageItem || !formData.damageType || !formData.damageQuantity}
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              justifyContent: 'center',
                              alignItems: 'center',
                              padding: '0px 24px',
                              width: '100px',
                              height: '68px',
                              background: (formData.damageItem && formData.damageType && formData.damageQuantity) 
                                ? '#008FED' 
                                : 'rgba(12, 12, 12, 0.08)',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: (formData.damageItem && formData.damageType && formData.damageQuantity) 
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
                              color: (formData.damageItem && formData.damageType && formData.damageQuantity) 
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
                                onClick={() => handleRemoveDamageItem(index)}
                                style={{ width: '24px', height: '24px', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
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
                                  setTempSelectedPartner(selectedPartner);
                                  setPartnerSearchQuery("");
                                  setIsPartnerSearchOpen(true);
                                }}
                                style={{ 
                                  display: 'flex', 
                                  flexDirection: 'row', 
                                  justifyContent: 'center', 
                                  alignItems: 'center', 
                                  padding: '16px 24px',
                                  height: '56px', 
                                  background: '#008FED', 
                                  borderRadius: '8px', 
                                  border: 'none', 
                                  cursor: 'pointer',
                                  fontFamily: 'Pretendard',
                                  fontWeight: 600,
                                  fontSize: '14px',
                                  letterSpacing: '-0.01em',
                                  color: '#FFFFFF',
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
                              disabled={!selectedPartner || partnerManagers.length === 0}
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

          {/* Bottom Action Buttons */}
          <div 
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end w-full px-4 md:px-6 lg:px-8 mt-6 md:mt-8 gap-3"
          >
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
          </div>
        </div>
      </main>

      {/* 협력사 검색 팝업 */}
      {isPartnerSearchOpen && (
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
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={() => setIsPartnerSearchOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
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
                  <div className="flex flex-col items-center w-full pb-14 gap-32">
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
                          : formData.insuredAddress
                            ? "해당 지역에 서비스 가능한 협력사가 없습니다.\n검색을 이용해주세요"
                            : "피보험자 주소를 입력하면 해당 지역의 협력사를 볼 수 있습니다"}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Table with Data */
                  <div className="flex flex-col items-start w-full" style={{ maxHeight: '373px', minWidth: '700px' }}>
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
                        <div key={partner.name} className="flex flex-row items-center w-full h-[61px]">
                          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '155px', height: '39px' }}>
                            <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
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
                            onClick={() => setTempSelectedPartner(partner)}
                            style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '49px', height: '38px', cursor: 'pointer' }}
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
                  </div>
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
        </div>
      )}
    </div>
  );
}
