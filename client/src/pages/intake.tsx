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
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Star, X, Calendar as CalendarIcon, Search } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import logoIcon from "@assets/Frame 2_1762217940686.png";
import { GlobalHeader } from "@/components/global-header";
import { SmsNotificationDialog } from "@/components/sms-notification-dialog";

const extractCityFromAddress = (address: string): string => {
  if (!address) return "";
  const specialCityMatch = address.match(/(서울|부산|대구|인천|광주|대전|울산|세종)/);
  if (specialCityMatch) return specialCityMatch[1];
  const cityMatch = address.match(/([가-힣]+)시/);
  if (cityMatch) return cityMatch[1];
  const guMatch = address.match(/([가-힣]+)구/);
  if (guMatch) return guMatch[1];
  const parts = address.trim().split(/[\s/]+/).filter(p => p.length > 0);
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    if (!lastPart.endsWith("도")) return lastPart;
    if (parts.length > 2) return parts[parts.length - 2];
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

const tableBorderStyle = "1px solid rgba(12, 12, 12, 0.1)";
const labelStyle = { fontFamily: 'Pretendard', fontWeight: 500, fontSize: '13px', color: '#686A6E', whiteSpace: 'nowrap' as const };
const inputStyle = { height: '40px', padding: '8px 12px', background: '#FDFDFD', border: tableBorderStyle, borderRadius: '6px', fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', color: '#0C0C0C', width: '100%' };
const cellStyle = { padding: '8px 12px', borderRight: tableBorderStyle, borderBottom: tableBorderStyle };
const sectionTitleStyle = { 
  writingMode: 'vertical-rl' as const, 
  textOrientation: 'mixed' as const, 
  fontFamily: 'Pretendard', 
  fontWeight: 600, 
  fontSize: '14px', 
  color: '#0C0C0C',
  padding: '16px 12px',
  background: '#F8F9FA',
  borderRight: tableBorderStyle,
  borderBottom: tableBorderStyle,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '40px',
};

const RequiredMark = () => <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>;

export default function Intake({ isModal = false, onClose, onSuccess, initialCaseId = null, readOnly = false }: IntakeProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeMenu, setActiveMenu] = useState("접수하기");
  
  const [sameAsPolicyHolder, setSameAsPolicyHolder] = useState(false);
  const [additionalVictims, setAdditionalVictims] = useState<Array<{name: string, phone: string, address: string}>>([]);
  
  const [accidentDate, setAccidentDate] = useState<Date | undefined>(() => new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  const [predictedPrefix, setPredictedPrefix] = useState<string>("");
  const [predictedSuffix, setPredictedSuffix] = useState<number>(0);
  const [loadedCaseNumber, setLoadedCaseNumber] = useState<string | null>(null);
  
  const [isPartnerSearchOpen, setIsPartnerSearchOpen] = useState(false);
  const [partnerSearchQuery, setPartnerSearchQuery] = useState("");
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [tempSelectedPartner, setTempSelectedPartner] = useState<any>(null);
  
  const [isClientSearchOpen, setIsClientSearchOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [tempSelectedClient, setTempSelectedClient] = useState<any>(null);
  
  const [isAssessorSearchOpen, setIsAssessorSearchOpen] = useState(false);
  const [assessorSearchQuery, setAssessorSearchQuery] = useState("");
  const [tempSelectedAssessor, setTempSelectedAssessor] = useState<any>(null);
  
  const [isInvestigatorSearchOpen, setIsInvestigatorSearchOpen] = useState(false);
  const [investigatorSearchQuery, setInvestigatorSearchQuery] = useState("");
  const [tempSelectedInvestigator, setTempSelectedInvestigator] = useState<any>(null);
  
  const [showInsuredAddressSearch, setShowInsuredAddressSearch] = useState(false);
  
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [completedCase, setCompletedCase] = useState<Case | null>(null);
  
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

  const { data: masterDataList = [] } = useQuery<MasterData[]>({
    queryKey: ["/api/master-data"],
  });

  const getMasterDataOptions = (category: string) => {
    return masterDataList
      .filter(item => item.category === category && item.isActive === "true")
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(item => item.value);
  };

  const { data: favorites = [] } = useQuery<Array<{ id: string; userId: string; menuName: string }>>({
    queryKey: ["/api/favorites"],
  });

  const isFavorite = favorites.some(f => f.menuName === "접수하기");

  const addFavoriteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/favorites", { menuName: "접수하기" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({ description: "즐겨찾기에 추가되었습니다.", duration: 2000 });
    },
    onError: () => {
      toast({ description: "즐겨찾기 추가에 실패했습니다.", variant: "destructive", duration: 2000 });
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", "/api/favorites/접수하기");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({ description: "즐겨찾기에서 제거되었습니다.", duration: 2000 });
    },
    onError: () => {
      toast({ description: "즐겨찾기 제거에 실패했습니다.", variant: "destructive", duration: 2000 });
    },
  });

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

  const { data: investigators } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(u => u.role === "조사사"),
  });

  const { data: insuranceEmployees } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(u => u.role === "보험사"),
  });

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: partners } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(u => u.role === "협력사"),
  });

  const { data: administrators } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(u => u.role === "관리자"),
  });

  const { data: insuranceCompanies = [] } = useQuery<string[]>({
    queryKey: ["/api/insurance-companies"],
  });

  const partnerCompanies = useMemo(() => {
    if (!partners) return [];
    const companies = new Set(partners.map(p => p.company));
    return Array.from(companies);
  }, [partners]);

  const partnersWithStats = useMemo(() => {
    if (!partners) return [];
    const uniqueCompanies = Array.from(new Set(partners.map(p => p.company)));
    return uniqueCompanies.map(companyName => {
      const stats = partnerStats?.find(s => s.partnerName === companyName);
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

  const partnerManagers = useMemo(() => {
    if (!selectedPartner || !partners) return [];
    return partners.filter(p => p.company === selectedPartner.name);
  }, [selectedPartner, partners]);

  const getTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [editCaseId, setEditCaseId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    managerId: "",
    managerDepartment: "",
    managerPosition: "",
    managerContact: "",
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
    assessorEmail: "",
    investigatorTeam: "",
    investigatorDepartment: "",
    investigatorTeamName: "",
    investigatorContact: "",
    investigatorEmail: "",
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
    damageQuantity: "1",
    damageDetails: "",
    damageItems: [] as Array<{ item: string; type: string; quantity: string; details: string }>,
    damagePreventionCost: false,
    victimIncidentAssistance: false,
    assignedPartner: "",
    assignedPartnerManager: "",
    assignedPartnerContact: "",
    urgency: "",
    specialRequests: "",
  });

  const filteredPartners = useMemo(() => {
    if (partnerSearchQuery) {
      return partnersWithStats.filter(p => p.name.toLowerCase().includes(partnerSearchQuery.toLowerCase()));
    }
    const city = extractCityFromAddress(formData.insuredAddress);
    if (city) {
      const regionFiltered = partnersWithStats.filter(p => p.region.includes(city));
      if (regionFiltered.length > 0) return regionFiltered;
    }
    return partnersWithStats;
  }, [partnerSearchQuery, partnersWithStats, formData.insuredAddress]);

  const allCompanies = useMemo(() => {
    if (!allUsers) return [];
    const companies = new Set(allUsers.map(u => u.company));
    return Array.from(companies).sort();
  }, [allUsers]);

  const filteredClientEmployees = useMemo(() => {
    if (!formData.clientResidence || !allUsers) return [];
    return allUsers.filter(emp => emp.company === formData.clientResidence);
  }, [formData.clientResidence, allUsers]);

  const filteredAssessorEmployees = useMemo(() => {
    if (!formData.assessorId || !assessors) return [];
    return assessors.filter(emp => emp.company === formData.assessorId);
  }, [formData.assessorId, assessors]);

  const filteredInvestigatorEmployees = useMemo(() => {
    if (!formData.investigatorTeam || !investigators) return [];
    return investigators.filter(emp => emp.company === formData.investigatorTeam);
  }, [formData.investigatorTeam, investigators]);

  const investigatorCompanies = useMemo(() => {
    if (!investigators) return [];
    const companies = investigators.map(inv => inv.company).filter((company): company is string => !!company);
    return Array.from(new Set(companies));
  }, [investigators]);

  const clientCompanies = useMemo(() => {
    if (!allUsers) return [];
    const companies = allUsers
      .filter(u => u.role !== "관리자" && u.role !== "협력사")
      .map(u => u.company)
      .filter((company): company is string => !!company);
    return Array.from(new Set(companies));
  }, [allUsers]);

  const assessorCompanies = useMemo(() => {
    if (!assessors) return [];
    const companies = assessors.map(a => a.company).filter((company): company is string => !!company);
    return Array.from(new Set(companies));
  }, [assessors]);

  const filteredClients = useMemo(() => {
    if (!clientCompanies) return [];
    if (!clientSearchQuery) return clientCompanies.map(name => ({ name }));
    return clientCompanies.filter(name => name.toLowerCase().includes(clientSearchQuery.toLowerCase())).map(name => ({ name }));
  }, [clientCompanies, clientSearchQuery]);

  const filteredAssessors = useMemo(() => {
    if (!assessorCompanies) return [];
    if (!assessorSearchQuery) return assessorCompanies.map(name => ({ name }));
    return assessorCompanies.filter(name => name.toLowerCase().includes(assessorSearchQuery.toLowerCase())).map(name => ({ name }));
  }, [assessorCompanies, assessorSearchQuery]);

  const filteredInvestigators = useMemo(() => {
    if (!investigatorCompanies) return [];
    if (!investigatorSearchQuery) return investigatorCompanies.map(name => ({ name }));
    return investigatorCompanies.filter(name => name.toLowerCase().includes(investigatorSearchQuery.toLowerCase())).map(name => ({ name }));
  }, [investigatorCompanies, investigatorSearchQuery]);

  const displayCaseNumber = useMemo(() => {
    const hasDamagePrevention = formData.damagePreventionCost === true || (formData.damagePreventionCost as unknown) === "true";
    const hasVictimRecovery = formData.victimIncidentAssistance === true || (formData.victimIncidentAssistance as unknown) === "true";
    
    let basePrefix = "";
    if (loadedCaseNumber && loadedCaseNumber !== "-") {
      if (loadedCaseNumber.includes('-')) {
        basePrefix = loadedCaseNumber.split('-')[0];
      } else {
        basePrefix = loadedCaseNumber;
      }
    } else if (predictedPrefix) {
      basePrefix = predictedPrefix;
    }
    
    if (!basePrefix) return "-";
    if (!hasDamagePrevention && !hasVictimRecovery) return "-";
    if (hasDamagePrevention && hasVictimRecovery) return `${basePrefix}-0, ${basePrefix}-1`;
    if (hasDamagePrevention && !hasVictimRecovery) return `${basePrefix}-0`;
    
    if (loadedCaseNumber && loadedCaseNumber.includes('-')) {
      const existingSuffix = loadedCaseNumber.split('-')[1];
      if (existingSuffix && existingSuffix !== '0' && parseInt(existingSuffix) >= 1) {
        return loadedCaseNumber;
      }
    }
    const victimSuffix = predictedSuffix === 0 ? 1 : predictedSuffix;
    return `${basePrefix}-${victimSuffix}`;
  }, [loadedCaseNumber, predictedPrefix, predictedSuffix, formData.damagePreventionCost, formData.victimIncidentAssistance]);

  useEffect(() => {
    if (!isModal && !userLoading && !user) {
      setLocation("/");
    }
  }, [user, userLoading, setLocation, isModal]);

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

  useEffect(() => {
    if (!initialCaseId) return;
    setEditCaseId(initialCaseId);
    apiRequest("GET", `/api/cases/${initialCaseId}`)
      .then((res) => res.json())
      .then((caseData: any) => {
        if (caseData.caseNumber) setLoadedCaseNumber(caseData.caseNumber);
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
          assessorEmail: caseData.assessorEmail || "",
          investigatorTeam: caseData.investigatorTeam || "",
          investigatorDepartment: caseData.investigatorDepartment || "",
          investigatorTeamName: caseData.investigatorTeamName || "",
          investigatorContact: caseData.investigatorContact || "",
          investigatorEmail: caseData.investigatorEmail || "",
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
          damagePreventionCost: caseData.damagePreventionCost === "true" || (!caseData.damagePreventionCost && caseData.caseNumber && !caseData.caseNumber.includes('-')),
          victimIncidentAssistance: caseData.victimIncidentAssistance === "true" || (!caseData.victimIncidentAssistance && caseData.caseNumber && caseData.caseNumber.includes('-')),
          assignedPartner: caseData.assignedPartner || "",
          assignedPartnerManager: caseData.assignedPartnerManager || "",
          assignedPartnerContact: caseData.assignedPartnerContact || "",
          urgency: caseData.urgency || "",
          specialRequests: caseData.specialRequests || "",
        });
        if (caseData.sameAsPolicyHolder === "true") setSameAsPolicyHolder(true);
        if (caseData.additionalVictims) {
          try { setAdditionalVictims(JSON.parse(caseData.additionalVictims)); } catch (e) {}
        }
        if (caseData.assignedPartner) {
          setSelectedPartner({ name: caseData.assignedPartner, dailyCount: 0, monthlyCount: 0, inProgressCount: 0, pendingCount: 0, region: "" });
        }
        if (caseData.accidentDate) {
          const dateParts = caseData.accidentDate.split('-');
          if (dateParts.length === 3) {
            setAccidentDate(new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2])));
          }
        }
      })
      .catch((error) => {
        toast({ description: `케이스 정보를 불러오는 데 실패했습니다.`, variant: "destructive" });
      });
  }, [initialCaseId, administrators]);

  useEffect(() => {
    if (initialCaseId) return;
    const storedEditCaseId = localStorage.getItem('editCaseId');
    if (storedEditCaseId) {
      setEditCaseId(storedEditCaseId);
      apiRequest("GET", `/api/cases/${storedEditCaseId}`)
        .then((res) => res.json())
        .then((caseData: any) => {
          if (caseData.caseNumber) setLoadedCaseNumber(caseData.caseNumber);
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
            assessorEmail: caseData.assessorEmail || "",
            investigatorTeam: caseData.investigatorTeam || "",
            investigatorDepartment: caseData.investigatorDepartment || "",
            investigatorTeamName: caseData.investigatorTeamName || "",
            investigatorContact: caseData.investigatorContact || "",
            investigatorEmail: caseData.investigatorEmail || "",
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
            damagePreventionCost: caseData.damagePreventionCost === "true" || (!caseData.damagePreventionCost && caseData.caseNumber && !caseData.caseNumber.includes('-')),
            victimIncidentAssistance: caseData.victimIncidentAssistance === "true" || (!caseData.victimIncidentAssistance && caseData.caseNumber && caseData.caseNumber.includes('-')),
            assignedPartner: caseData.assignedPartner || "",
            assignedPartnerManager: caseData.assignedPartnerManager || "",
            assignedPartnerContact: caseData.assignedPartnerContact || "",
            urgency: caseData.urgency || "",
            specialRequests: caseData.specialRequests || "",
          });
          if (caseData.sameAsPolicyHolder === "true") setSameAsPolicyHolder(true);
          if (caseData.additionalVictims) {
            try { setAdditionalVictims(JSON.parse(caseData.additionalVictims)); } catch (e) {}
          }
          if (caseData.assignedPartner) {
            setSelectedPartner({ name: caseData.assignedPartner, dailyCount: 0, monthlyCount: 0, inProgressCount: 0, pendingCount: 0, region: "" });
          }
          if (caseData.accidentDate) {
            const dateParts = caseData.accidentDate.split('-');
            if (dateParts.length === 3) {
              setAccidentDate(new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2])));
            }
          }
        })
        .catch(() => {
          toast({ description: `케이스 정보를 불러오는 데 실패했습니다.`, variant: "destructive" });
        });
    }
  }, [initialCaseId, administrators]);

  const cleanFormData = (data: typeof formData) => {
    const cleaned: any = { ...data };
    cleaned.additionalVictims = JSON.stringify(additionalVictims);
    cleaned.damageItems = JSON.stringify(data.damageItems);
    cleaned.damagePreventionCost = String(data.damagePreventionCost);
    cleaned.victimIncidentAssistance = String(data.victimIncidentAssistance);
    return cleaned;
  };

  const saveMutation = useMutation({
    mutationFn: async ({ data, sameAsPolicyHolderValue }: { data: typeof formData; sameAsPolicyHolderValue: boolean }) => {
      const cleanedData = cleanFormData(data);
      cleanedData.sameAsPolicyHolder = sameAsPolicyHolderValue ? "true" : "false";
      const payload = {
        ...cleanedData,
        status: "배당대기",
        receptionDate: data.accidentDate || getTodayDate(),
        assignedTo: user?.id || null,
        ...(editCaseId ? { id: editCaseId } : {})
      };
      const response = await apiRequest("POST", "/api/cases", payload);
      return response.json();
    },
    onSuccess: (result) => {
      const cases = (result && typeof result === 'object' && 'cases' in result) ? (result as any).cases : [];
      const count = cases.length;
      const caseNumbers = cases.map((c: any) => formatCaseNumber(c.caseNumber)).join(', ');
      toast({ description: count > 1 ? `저장되었습니다. (${count}건: ${caseNumbers})` : `저장되었습니다. (${caseNumbers})`, duration: 3000 });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      localStorage.removeItem('intakeFormDraft');
      localStorage.removeItem('editCaseId');
      setEditCaseId(null);
      if (isModal && onSuccess) {
        onSuccess();
      } else {
        setTimeout(() => setLocation("/dashboard"), 1000);
      }
    },
    onError: (error: Error) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async ({ data, sameAsPolicyHolderValue }: { data: typeof formData; sameAsPolicyHolderValue: boolean }) => {
      const cleanedData = cleanFormData(data);
      cleanedData.sameAsPolicyHolder = sameAsPolicyHolderValue ? "true" : "false";
      const payload = {
        ...cleanedData,
        status: "접수완료",
        receptionDate: data.accidentDate || getTodayDate(),
        assignedTo: user?.id || null,
        ...(editCaseId ? { id: editCaseId } : {})
      };
      const response = await apiRequest("POST", "/api/cases", payload);
      return response.json();
    },
    onSuccess: async (result, variables) => {
      const cases = (result && typeof result === 'object' && 'cases' in result) ? (result as any).cases : [];
      const count = cases.length;
      const caseNumbers = cases.map((c: any) => formatCaseNumber(c.caseNumber)).join(', ');
      toast({ description: count > 1 ? `접수가 완료되었습니다. (${count}건 생성: ${caseNumbers})` : `접수가 완료되었습니다. (${caseNumbers})`, duration: 3000 });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      localStorage.removeItem('intakeFormDraft');
      localStorage.removeItem('editCaseId');
      setEditCaseId(null);

      const submittedData = variables.data;
      if (cases.length > 0) {
        const firstCase = cases[0];
        const validCaseNumbers = cases.map((c: any) => c.caseNumber).filter((num: string) => num && num !== "-" && !num.startsWith("DRAFT-") && num.trim() !== "");
        if (validCaseNumbers.length > 0) {
          const sortedCaseNumbers = validCaseNumbers.sort((a: string, b: string) => {
            const suffixA = parseInt(a.split('-')[1] || '0');
            const suffixB = parseInt(b.split('-')[1] || '0');
            return suffixA - suffixB;
          });
          const caseNumber = sortedCaseNumbers.map((n: string) => formatCaseNumber(n)).join(', ');
          const rawPartnerContact = submittedData.assignedPartnerContact?.trim() || "";
          const partnerContact = rawPartnerContact.replace(/[^0-9]/g, "");
          if (partnerContact.length >= 10 && partnerContact.length <= 11) {
            const requestScopeItems = [];
            if (submittedData.damagePreventionCost === true || (submittedData.damagePreventionCost as unknown) === "true") requestScopeItems.push("손방");
            if (submittedData.victimIncidentAssistance === true || (submittedData.victimIncidentAssistance as unknown) === "true") requestScopeItems.push("대물");
            if (requestScopeItems.length === 0) requestScopeItems.push("기타");
            const requestScope = requestScopeItems.join(", ");
            const managerName = submittedData.managerId ? allUsers?.find(u => u.id === submittedData.managerId)?.name || user?.name || "-" : user?.name || "-";
            const smsPayload = {
              to: partnerContact,
              caseNumber: caseNumber,
              insuranceCompany: firstCase.insuranceCompany || submittedData.insuranceCompany || "-",
              managerName: managerName,
              insurancePolicyNo: firstCase.insurancePolicyNo || submittedData.insurancePolicyNo || "-",
              insuranceAccidentNo: firstCase.insuranceAccidentNo || submittedData.insuranceAccidentNo || "-",
              insuredName: firstCase.insuredName || submittedData.insuredName || "-",
              insuredContact: firstCase.insuredContact || submittedData.insuredContact || "-",
              victimName: firstCase.victimName || submittedData.victimName || "-",
              victimContact: firstCase.victimContact || submittedData.victimContact || "-",
              investigatorTeamName: firstCase.investigatorTeamName || submittedData.investigatorTeamName || "-",
              investigatorContact: firstCase.investigatorContact || submittedData.investigatorContact || "-",
              accidentLocation: firstCase.insuredAddress || submittedData.insuredAddress || "-",
              accidentLocationDetail: firstCase.insuredAddressDetail || submittedData.insuredAddressDetail || "",
              requestScope: requestScope,
            };
            try {
              await apiRequest("POST", "/api/send-sms", smsPayload);
              toast({ description: "접수 완료 문자가 전송되었습니다.", duration: 3000 });
            } catch (error) {
              toast({ description: "문자 전송에 실패했습니다. 수동으로 전송해주세요.", variant: "destructive", duration: 3000 });
            }
          }
        }
      }

      if (isModal && onSuccess) {
        onSuccess();
      } else {
        setTimeout(() => setLocation("/dashboard"), 1000);
      }
    },
    onError: (error: Error) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!initialCaseId) throw new Error("케이스 ID가 필요합니다");
      const cleanedData = cleanFormData(data);
      cleanedData.sameAsPolicyHolder = sameAsPolicyHolder ? "true" : "false";
      return await apiRequest("PATCH", `/api/cases/${initialCaseId}`, cleanedData);
    },
    onSuccess: () => {
      toast({ description: "수정이 완료되었습니다.", duration: 3000 });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      if (isModal && onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const handleUpdateCase = () => updateMutation.mutate(formData);

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      if (field === "clientResidence" && value && allUsers) {
        const companyUser = allUsers.find(u => u.company === value);
        updated.clientDepartment = companyUser?.department || "";
        updated.clientName = "";
        updated.clientContact = "";
      }
      
      if (field === "clientName" && value && typeof value === 'string') {
        const [employeeName, employeeId] = value.split("::");
        updated.clientName = employeeName;
        const selectedEmployee = employeeId ? filteredClientEmployees.find(emp => emp.id === employeeId) : filteredClientEmployees.find(emp => emp.name === employeeName);
        if (selectedEmployee) updated.clientContact = selectedEmployee.phone || "";
      }
      
      if (field === "assessorId" && value && allUsers) {
        const companyUser = allUsers.find(u => u.company === value && u.role === "심사사");
        updated.assessorDepartment = companyUser?.department || "";
        updated.assessorTeam = "";
        updated.assessorContact = "";
        updated.assessorEmail = "";
      }
      
      if (field === "assessorTeam" && value) {
        const selectedAssessor = filteredAssessorEmployees.find(assessor => assessor.name === value);
        if (selectedAssessor) {
          updated.assessorContact = selectedAssessor.phone || "";
          updated.assessorEmail = selectedAssessor.email || "";
        }
      }
      
      if (field === "investigatorTeam" && value && allUsers) {
        const companyUser = allUsers.find(u => u.company === value && u.role === "조사사");
        updated.investigatorDepartment = companyUser?.department || "";
        updated.investigatorTeamName = "";
        updated.investigatorContact = "";
        updated.investigatorEmail = "";
      }
      
      if (field === "investigatorTeamName" && value) {
        const selectedInvestigator = filteredInvestigatorEmployees.find(inv => inv.name === value);
        if (selectedInvestigator) {
          updated.investigatorContact = selectedInvestigator.phone || "";
          updated.investigatorEmail = selectedInvestigator.email || "";
        }
      }
      
      if (field === "assignedPartnerManager" && value) {
        const selectedManager = partnerManagers.find(manager => manager.name === value);
        if (selectedManager) updated.assignedPartnerContact = selectedManager.phone || "";
      }
      
      return updated;
    });
  };

  const handleSave = () => saveMutation.mutate({ data: formData, sameAsPolicyHolderValue: sameAsPolicyHolder });

  const handleReset = () => {
    setFormData({
      managerId: "", managerDepartment: "", managerPosition: "", managerContact: "",
      accidentDate: getTodayDate(), insuranceCompany: "", insurancePolicyNo: "", insuranceAccidentNo: "",
      clientResidence: "", clientDepartment: "", clientName: "", clientContact: "",
      assessorId: "", assessorDepartment: "", assessorTeam: "", assessorContact: "", assessorEmail: "",
      investigatorTeam: "", investigatorDepartment: "", investigatorTeamName: "", investigatorContact: "", investigatorEmail: "",
      policyHolderName: "", policyHolderIdNumber: "", policyHolderAddress: "",
      insuredName: "", insuredIdNumber: "", insuredContact: "", insuredAddress: "", insuredAddressDetail: "",
      victimName: "", victimContact: "", victimAddress: "", accompaniedPerson: "",
      accidentType: "", accidentCause: "", restorationMethod: "", otherVendorEstimate: "", accidentDescription: "",
      damageItem: "", damageType: "", damageQuantity: "", damageDetails: "", damageItems: [],
      damagePreventionCost: false, victimIncidentAssistance: false,
      assignedPartner: "", assignedPartnerManager: "", assignedPartnerContact: "",
      urgency: "", specialRequests: "",
    });
    setAccidentDate(new Date());
    setSelectedPartner(null);
    setSameAsPolicyHolder(false);
    setAdditionalVictims([]);
    localStorage.removeItem('intakeFormDraft');
    localStorage.removeItem('editCaseId');
    setEditCaseId(null);
    toast({ description: "입력 내용이 초기화되었습니다.", duration: 2000 });
  };

  const isFormValid = useMemo(() => {
    if (!formData.accidentDate) return false;
    if (!formData.insuranceCompany) return false;
    if (!formData.insuranceAccidentNo && !formData.insurancePolicyNo) return false;
    if (!formData.clientResidence) return false;
    if (!formData.clientName) return false;
    if (!formData.policyHolderName && !formData.insuredName) return false;
    if (!formData.assignedPartner) return false;
    if (!formData.assignedPartnerManager) return false;
    return true;
  }, [formData]);

  const handleSubmit = () => {
    if (!formData.accidentDate) { toast({ description: "접수일자를 입력해주세요.", variant: "destructive" }); return; }
    if (!formData.insuranceCompany) { toast({ description: "보험사명을 입력해주세요.", variant: "destructive" }); return; }
    if (!formData.insuranceAccidentNo && !formData.insurancePolicyNo) { toast({ description: "보험사 증권번호 또는 보험사 사고번호 중 하나는 반드시 입력해야 합니다.", variant: "destructive" }); return; }
    if (!formData.clientResidence) { toast({ description: "의뢰사를 선택해주세요.", variant: "destructive" }); return; }
    if (!formData.clientName) { toast({ description: "의뢰자를 선택해주세요.", variant: "destructive" }); return; }
    if (!formData.policyHolderName && !formData.insuredName) { toast({ description: "보험계약자 성명 또는 피보험자 성명 중 하나는 반드시 입력해야 합니다.", variant: "destructive" }); return; }
    if (!formData.managerId) { toast({ description: "당사 담당자를 선택해주세요.", variant: "destructive" }); return; }
    if (!formData.assignedPartner) { toast({ description: "협력사를 선택해주세요.", variant: "destructive" }); return; }
    if (!formData.assignedPartnerManager) { toast({ description: "협력사 담당자를 선택해주세요.", variant: "destructive" }); return; }
    submitMutation.mutate({ data: formData, sameAsPolicyHolderValue: sameAsPolicyHolder });
  };

  const handleAddressSearch = () => {
    if (typeof window !== 'undefined' && (window as any).daum?.Postcode) {
      new (window as any).daum.Postcode({
        oncomplete: function(data: any) {
          handleInputChange("insuredAddress", data.address);
        }
      }).open();
    } else {
      toast({ description: "주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.", variant: "destructive" });
    }
  };

  if (userLoading || !user) return null;

  return (
    <div className="relative" style={{ minHeight: isModal ? 'auto' : '100vh', background: isModal ? '#F5F7FA' : 'linear-gradient(0deg, #E7EDFE, #E7EDFE)' }}>
      {!isModal && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute" style={{ width: '1095px', height: '777px', left: '97px', bottom: '1169px', background: 'rgba(254, 240, 230, 0.4)', borderRadius: '9999px', filter: 'blur(212px)', transform: 'rotate(-35.25deg)' }} />
          <div className="absolute" style={{ width: '1335px', height: '1323px', right: '0px', bottom: '0px', background: 'rgba(234, 230, 254, 0.5)', borderRadius: '9999px', filter: 'blur(212px)' }} />
          <div className="absolute" style={{ width: '348px', height: '1323px', left: '0px', bottom: '189px', background: 'rgba(234, 230, 254, 0.5)', borderRadius: '9999px', filter: 'blur(212px)' }} />
        </div>
      )}
      {!isModal && <GlobalHeader />}
      
      <main className={`relative flex items-center justify-center ${isModal ? 'px-0' : 'px-4 md:px-6 lg:px-8'} pb-10`}>
        <div className={`w-full ${isModal ? 'max-w-full' : 'max-w-[1660px]'}`}>
          <div className={`flex items-center gap-3 md:gap-4 ${isModal ? 'px-4 py-4' : 'px-4 md:px-8 py-6 md:py-9'}`}>
            {isModal && onClose && (
              <button onClick={onClose} className="mr-2 p-2 hover:bg-gray-100 rounded-lg transition-colors" data-testid="button-close-intake-modal">
                <X size={24} color="#686A6E" />
              </button>
            )}
            <h1 className="text-xl md:text-2xl lg:text-[26px]" style={{ fontFamily: 'Pretendard', fontWeight: 600, lineHeight: '128%', letterSpacing: '-0.02em', color: '#0C0C0C' }}>
              새로운 접수
            </h1>
            <button onClick={handleToggleFavorite} className="hover:opacity-70 transition-opacity cursor-pointer" data-testid="button-favorite">
              <Star className="w-5 h-5" style={{ color: isFavorite ? '#FFD700' : 'rgba(12, 12, 12, 0.24)', fill: isFavorite ? '#FFD700' : 'none' }} />
            </button>
          </div>

          <div className="flex flex-col gap-4 w-full px-0 md:px-4 lg:px-8">
            <div style={{ background: '#FFFFFF', boxShadow: '0px 0px 20px #DBE9F5', borderRadius: '12px', overflow: 'hidden', border: tableBorderStyle }}>
              
              {/* 기본정보 Section */}
              <div className="flex" style={{ borderBottom: tableBorderStyle }}>
                <div style={sectionTitleStyle}>[기본정보]</div>
                <div className="flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-4">
                    <div style={cellStyle} className="flex flex-col gap-1">
                      <label style={labelStyle}>접수번호</label>
                      <input type="text" value={displayCaseNumber} readOnly style={{ ...inputStyle, background: '#f5f5f5' }} data-testid="input-case-number" />
                    </div>
                    <div style={cellStyle} className="flex flex-col gap-1">
                      <label style={labelStyle}>접수일자</label>
                      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <button type="button" disabled={readOnly} style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: readOnly ? 'default' : 'pointer' }} data-testid="button-date-picker">
                            <span>{accidentDate ? format(accidentDate, 'yyyy-MM-dd', { locale: ko }) : '날짜 선택'}</span>
                            <CalendarIcon size={16} color="#686A6E" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={accidentDate} onSelect={(date) => { setAccidentDate(date); if (date) handleInputChange("accidentDate", format(date, 'yyyy-MM-dd')); setDatePickerOpen(false); }} locale={ko} />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div style={cellStyle} className="flex flex-col gap-1">
                      <label style={labelStyle}>본사담당자<RequiredMark /></label>
                      <Select value={formData.managerId} onValueChange={(value) => { handleInputChange("managerId", value); const mgr = administrators?.find(a => a.id === value); if (mgr) handleInputChange("managerContact", mgr.phone || ""); }} disabled={readOnly}>
                        <SelectTrigger style={inputStyle} data-testid="select-manager"><SelectValue placeholder="담당자 선택" /></SelectTrigger>
                        <SelectContent>{administrators?.map(admin => <SelectItem key={admin.id} value={admin.id}>{admin.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div style={{ ...cellStyle, borderRight: 'none' }} className="flex flex-col gap-1">
                      <label style={labelStyle}>연락처</label>
                      <input type="text" value={formData.managerContact} readOnly style={{ ...inputStyle, background: '#f5f5f5' }} data-testid="input-manager-contact" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 보험정보 Section */}
              <div className="flex" style={{ borderBottom: tableBorderStyle }}>
                <div style={sectionTitleStyle}>[보험정보]</div>
                <div className="flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-3">
                    <div style={cellStyle} className="flex flex-col gap-1">
                      <label style={labelStyle}>보험사<RequiredMark /></label>
                      <Select value={formData.insuranceCompany} onValueChange={(value) => handleInputChange("insuranceCompany", value)} disabled={readOnly}>
                        <SelectTrigger style={inputStyle} data-testid="select-insurance-company"><SelectValue placeholder="보험사 선택" /></SelectTrigger>
                        <SelectContent>{insuranceCompanies.map(company => <SelectItem key={company} value={company}>{company}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div style={cellStyle} className="flex flex-col gap-1">
                      <label style={labelStyle}>보험사 증권번호</label>
                      <input type="text" placeholder="증권번호 입력" value={formData.insurancePolicyNo} onChange={(e) => handleInputChange("insurancePolicyNo", e.target.value)} disabled={readOnly} style={inputStyle} data-testid="input-policy-no" />
                    </div>
                    <div style={{ ...cellStyle, borderRight: 'none' }} className="flex flex-col gap-1">
                      <label style={labelStyle}>보험사 사고번호</label>
                      <input type="text" placeholder="사고번호 입력" value={formData.insuranceAccidentNo} onChange={(e) => handleInputChange("insuranceAccidentNo", e.target.value)} disabled={readOnly} style={inputStyle} data-testid="input-accident-no" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 의뢰사 / 심사사 / 조사사 정보 Section */}
              <div className="flex" style={{ borderBottom: tableBorderStyle }}>
                <div style={sectionTitleStyle}>[의뢰사/심사사/조사사]</div>
                <div className="flex-1">
                  {/* 의뢰사 Row */}
                  <div className="grid grid-cols-1 md:grid-cols-4" style={{ borderBottom: tableBorderStyle }}>
                    <div style={cellStyle} className="flex flex-col gap-1">
                      <label style={labelStyle}>의뢰사<RequiredMark /></label>
                      <div className="flex gap-1">
                        <input type="text" value={formData.clientResidence} readOnly placeholder="의뢰사 선택" style={{ ...inputStyle, flex: 1 }} data-testid="input-client-residence" />
                        <button onClick={() => !readOnly && setIsClientSearchOpen(true)} disabled={readOnly} style={{ ...inputStyle, width: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: readOnly ? 'default' : 'pointer' }} data-testid="button-client-search"><Search size={16} /></button>
                      </div>
                    </div>
                    <div style={cellStyle} className="flex flex-col gap-1">
                      <label style={labelStyle}>소속부서</label>
                      <input type="text" value={formData.clientDepartment} readOnly style={{ ...inputStyle, background: '#f5f5f5' }} data-testid="input-client-department" />
                    </div>
                    <div style={cellStyle} className="flex flex-col gap-1">
                      <label style={labelStyle}>의뢰자<RequiredMark /></label>
                      <Select value={formData.clientName} onValueChange={(value) => handleInputChange("clientName", value)} disabled={readOnly || !formData.clientResidence}>
                        <SelectTrigger style={inputStyle} data-testid="select-client-name"><SelectValue placeholder="의뢰자 선택" /></SelectTrigger>
                        <SelectContent>{filteredClientEmployees.map(emp => <SelectItem key={emp.id} value={`${emp.name}::${emp.id}`}>{emp.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div style={{ ...cellStyle, borderRight: 'none' }} className="flex flex-col gap-1">
                      <label style={labelStyle}>의뢰자 연락처</label>
                      <input type="text" value={formData.clientContact} readOnly style={{ ...inputStyle, background: '#f5f5f5' }} data-testid="input-client-contact" />
                    </div>
                  </div>
                  {/* 심사사 Row */}
                  <div className="grid grid-cols-1 md:grid-cols-4" style={{ borderBottom: tableBorderStyle }}>
                    <div style={cellStyle} className="flex flex-col gap-1">
                      <label style={labelStyle}>심사사<RequiredMark /></label>
                      <div className="flex gap-1">
                        <input type="text" value={formData.assessorId} readOnly placeholder="심사사 선택" style={{ ...inputStyle, flex: 1 }} data-testid="input-assessor-id" />
                        <button onClick={() => !readOnly && setIsAssessorSearchOpen(true)} disabled={readOnly} style={{ ...inputStyle, width: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: readOnly ? 'default' : 'pointer' }} data-testid="button-assessor-search"><Search size={16} /></button>
                      </div>
                    </div>
                    <div style={cellStyle} className="flex flex-col gap-1">
                      <label style={labelStyle}>소속부서</label>
                      <input type="text" value={formData.assessorDepartment} readOnly style={{ ...inputStyle, background: '#f5f5f5' }} data-testid="input-assessor-department" />
                    </div>
                    <div style={cellStyle} className="flex flex-col gap-1">
                      <label style={labelStyle}>심사자<RequiredMark /></label>
                      <Select value={formData.assessorTeam} onValueChange={(value) => handleInputChange("assessorTeam", value)} disabled={readOnly || !formData.assessorId}>
                        <SelectTrigger style={inputStyle} data-testid="select-assessor-team"><SelectValue placeholder="심사자 선택" /></SelectTrigger>
                        <SelectContent>{filteredAssessorEmployees.map(emp => <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div style={{ ...cellStyle, borderRight: 'none' }} className="flex flex-col gap-1">
                      <label style={labelStyle}>심사자 연락처</label>
                      <input type="text" value={formData.assessorContact} readOnly style={{ ...inputStyle, background: '#f5f5f5' }} data-testid="input-assessor-contact" />
                    </div>
                  </div>
                  {/* 조사사 Row */}
                  <div className="grid grid-cols-1 md:grid-cols-4">
                    <div style={cellStyle} className="flex flex-col gap-1">
                      <label style={labelStyle}>조사사</label>
                      <div className="flex gap-1">
                        <input type="text" value={formData.investigatorTeam} readOnly placeholder="조사사 선택" style={{ ...inputStyle, flex: 1 }} data-testid="input-investigator-team" />
                        <button onClick={() => !readOnly && setIsInvestigatorSearchOpen(true)} disabled={readOnly} style={{ ...inputStyle, width: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: readOnly ? 'default' : 'pointer' }} data-testid="button-investigator-search"><Search size={16} /></button>
                      </div>
                    </div>
                    <div style={cellStyle} className="flex flex-col gap-1">
                      <label style={labelStyle}>소속부서</label>
                      <input type="text" value={formData.investigatorDepartment} readOnly style={{ ...inputStyle, background: '#f5f5f5' }} data-testid="input-investigator-department" />
                    </div>
                    <div style={cellStyle} className="flex flex-col gap-1">
                      <label style={labelStyle}>조사자</label>
                      <Select value={formData.investigatorTeamName} onValueChange={(value) => handleInputChange("investigatorTeamName", value)} disabled={readOnly || !formData.investigatorTeam}>
                        <SelectTrigger style={inputStyle} data-testid="select-investigator-name"><SelectValue placeholder="조사자 선택" /></SelectTrigger>
                        <SelectContent>{filteredInvestigatorEmployees.map(emp => <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div style={{ ...cellStyle, borderRight: 'none' }} className="flex flex-col gap-1">
                      <label style={labelStyle}>조사자 연락처</label>
                      <input type="text" value={formData.investigatorContact} readOnly style={{ ...inputStyle, background: '#f5f5f5' }} data-testid="input-investigator-contact" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 피보험자 및 피해자 정보 Section */}
              <div className="flex" style={{ borderBottom: tableBorderStyle }}>
                <div style={sectionTitleStyle}>[피보험자/피해자]</div>
                <div className="flex-1">
                  {/* Row 1: 보험계약자, 피보험자, 연락처 */}
                  <div className="grid grid-cols-1 md:grid-cols-3" style={{ borderBottom: tableBorderStyle }}>
                    <div style={cellStyle} className="flex flex-col gap-1">
                      <label style={labelStyle}>보험계약자</label>
                      <input type="text" placeholder="보험계약자 성명" value={formData.policyHolderName} onChange={(e) => handleInputChange("policyHolderName", e.target.value)} disabled={readOnly} style={inputStyle} data-testid="input-policy-holder-name" />
                    </div>
                    <div style={cellStyle} className="flex flex-col gap-1">
                      <label style={labelStyle}>피보험자<RequiredMark /></label>
                      <input type="text" placeholder="피보험자 성명" value={formData.insuredName} onChange={(e) => handleInputChange("insuredName", e.target.value)} disabled={readOnly} style={inputStyle} data-testid="input-insured-name" />
                    </div>
                    <div style={{ ...cellStyle, borderRight: 'none' }} className="flex flex-col gap-1">
                      <label style={labelStyle}>연락처</label>
                      <input type="text" placeholder="연락처" value={formData.insuredContact} onChange={(e) => handleInputChange("insuredContact", e.target.value)} disabled={readOnly} style={inputStyle} data-testid="input-insured-contact" />
                    </div>
                  </div>
                  {/* Row 2: 주소, 상세주소 */}
                  <div className="grid grid-cols-1 md:grid-cols-2" style={{ borderBottom: tableBorderStyle }}>
                    <div style={cellStyle} className="flex flex-col gap-1">
                      <label style={labelStyle}>주소<RequiredMark /></label>
                      <div className="flex gap-1">
                        <input type="text" placeholder="주소 검색" value={formData.insuredAddress} readOnly style={{ ...inputStyle, flex: 1 }} data-testid="input-insured-address" />
                        <button onClick={handleAddressSearch} disabled={readOnly} style={{ ...inputStyle, width: 'auto', padding: '8px 12px', cursor: readOnly ? 'default' : 'pointer', whiteSpace: 'nowrap' }} data-testid="button-address-search">주소검색</button>
                      </div>
                    </div>
                    <div style={{ ...cellStyle, borderRight: 'none' }} className="flex flex-col gap-1">
                      <label style={labelStyle}>상세주소</label>
                      <input type="text" placeholder="상세주소 입력" value={formData.insuredAddressDetail} onChange={(e) => handleInputChange("insuredAddressDetail", e.target.value)} disabled={readOnly} style={inputStyle} data-testid="input-insured-address-detail" />
                    </div>
                  </div>
                  {/* Row 3: 피해자, 연락처, 상세주소 */}
                  <div className="grid grid-cols-1 md:grid-cols-3">
                    <div style={cellStyle} className="flex flex-col gap-1">
                      <label style={labelStyle}>피해자</label>
                      <input type="text" placeholder="피해자 성명" value={formData.victimName} onChange={(e) => handleInputChange("victimName", e.target.value)} disabled={readOnly} style={inputStyle} data-testid="input-victim-name" />
                    </div>
                    <div style={cellStyle} className="flex flex-col gap-1">
                      <label style={labelStyle}>연락처</label>
                      <input type="text" placeholder="피해자 연락처" value={formData.victimContact} onChange={(e) => handleInputChange("victimContact", e.target.value)} disabled={readOnly} style={inputStyle} data-testid="input-victim-contact" />
                    </div>
                    <div style={{ ...cellStyle, borderRight: 'none' }} className="flex flex-col gap-1">
                      <label style={labelStyle}>상세주소</label>
                      <input type="text" placeholder="피해자 주소" value={formData.victimAddress} onChange={(e) => handleInputChange("victimAddress", e.target.value)} disabled={readOnly} style={inputStyle} data-testid="input-victim-address" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 배당 사항 Section */}
              <div className="flex">
                <div style={{ ...sectionTitleStyle, borderBottom: 'none' }}>[배당사항]</div>
                <div className="flex-1">
                  {/* Row 1: 손방 및 대물 선택 */}
                  <div style={{ ...cellStyle, borderRight: 'none', borderBottom: tableBorderStyle }}>
                    <label style={labelStyle}>순방 및 대물 선택<RequiredMark /> (중복 가능)</label>
                    <div className="flex items-center gap-4 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={formData.damagePreventionCost} onCheckedChange={(checked) => handleInputChange("damagePreventionCost", checked as boolean)} disabled={readOnly} data-testid="checkbox-damage-prevention" />
                        <span style={{ ...labelStyle, color: formData.damagePreventionCost ? '#008FED' : '#686A6E' }}>손해방지</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={formData.victimIncidentAssistance} onCheckedChange={(checked) => handleInputChange("victimIncidentAssistance", checked as boolean)} disabled={readOnly} data-testid="checkbox-victim-incident" />
                        <span style={{ ...labelStyle, color: formData.victimIncidentAssistance ? '#008FED' : '#686A6E' }}>피해세대복구</span>
                      </label>
                    </div>
                  </div>
                  {/* Row 2: 사고유형, 복구방식, 사고원인, 타업체결정 */}
                  <div className="grid grid-cols-1 md:grid-cols-4" style={{ borderBottom: tableBorderStyle }}>
                    <div style={cellStyle} className="flex flex-col gap-1">
                      <label style={labelStyle}>사고유형<RequiredMark /></label>
                      <Select value={formData.accidentType} onValueChange={(value) => handleInputChange("accidentType", value)} disabled={readOnly}>
                        <SelectTrigger style={inputStyle} data-testid="select-accident-type"><SelectValue placeholder="사고유형 선택" /></SelectTrigger>
                        <SelectContent>
                          {getMasterDataOptions("accident_type").length > 0 ? getMasterDataOptions("accident_type").map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>) : (<><SelectItem value="누수">누수</SelectItem><SelectItem value="급배수">급배수</SelectItem><SelectItem value="화재">화재</SelectItem><SelectItem value="기타">기타</SelectItem></>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div style={cellStyle} className="flex flex-col gap-1">
                      <label style={labelStyle}>복구방식<RequiredMark /></label>
                      <Select value={formData.restorationMethod} onValueChange={(value) => handleInputChange("restorationMethod", value)} disabled={readOnly}>
                        <SelectTrigger style={inputStyle} data-testid="select-restoration-method"><SelectValue placeholder="복구방식 선택" /></SelectTrigger>
                        <SelectContent>
                          {getMasterDataOptions("recovery_type").length > 0 ? getMasterDataOptions("recovery_type").map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>) : (<><SelectItem value="없음">없음</SelectItem><SelectItem value="직접복구">직접복구</SelectItem><SelectItem value="선견적요청">선견적요청</SelectItem></>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div style={cellStyle} className="flex flex-col gap-1">
                      <label style={labelStyle}>사고원인</label>
                      <Select value={formData.accidentCause} onValueChange={(value) => handleInputChange("accidentCause", value)} disabled={readOnly}>
                        <SelectTrigger style={inputStyle} data-testid="select-accident-cause"><SelectValue placeholder="사고원인 선택" /></SelectTrigger>
                        <SelectContent>
                          {getMasterDataOptions("accident_cause").length > 0 ? getMasterDataOptions("accident_cause").map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>) : (<><SelectItem value="배관">배관</SelectItem><SelectItem value="방수">방수</SelectItem><SelectItem value="코킹">코킹</SelectItem><SelectItem value="공용부">공용부</SelectItem><SelectItem value="복합">복합</SelectItem></>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div style={{ ...cellStyle, borderRight: 'none' }} className="flex flex-col gap-1">
                      <label style={labelStyle}>타업체결정</label>
                      <Select value={formData.otherVendorEstimate} onValueChange={(value) => handleInputChange("otherVendorEstimate", value)} disabled={readOnly}>
                        <SelectTrigger style={inputStyle} data-testid="select-other-vendor"><SelectValue placeholder="선택" /></SelectTrigger>
                        <SelectContent>
                          {getMasterDataOptions("other_company_estimate").length > 0 ? getMasterDataOptions("other_company_estimate").map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>) : (<><SelectItem value="유">유</SelectItem><SelectItem value="무">무</SelectItem></>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {/* Row 3: 협력사, 담당자명, 담당자 연락처 */}
                  <div className="grid grid-cols-1 md:grid-cols-3">
                    <div style={cellStyle} className="flex flex-col gap-1">
                      <label style={labelStyle}>협력사</label>
                      <div className="flex gap-1">
                        <input type="text" value={formData.assignedPartner} readOnly placeholder="협력사 선택" style={{ ...inputStyle, flex: 1 }} data-testid="input-partner" />
                        <button onClick={() => !readOnly && setIsPartnerSearchOpen(true)} disabled={readOnly} style={{ ...inputStyle, width: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: readOnly ? 'default' : 'pointer' }} data-testid="button-partner-search-open"><Search size={16} /></button>
                      </div>
                    </div>
                    <div style={cellStyle} className="flex flex-col gap-1">
                      <label style={labelStyle}>담당자명</label>
                      <Select value={formData.assignedPartnerManager} onValueChange={(value) => handleInputChange("assignedPartnerManager", value)} disabled={readOnly || !selectedPartner}>
                        <SelectTrigger style={inputStyle} data-testid="select-partner-manager"><SelectValue placeholder="담당자 선택" /></SelectTrigger>
                        <SelectContent>{partnerManagers.map(mgr => <SelectItem key={mgr.id} value={mgr.name}>{mgr.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div style={{ ...cellStyle, borderRight: 'none', borderBottom: 'none' }} className="flex flex-col gap-1">
                      <label style={labelStyle}>담당자 연락처</label>
                      <input type="text" value={formData.assignedPartnerContact} readOnly style={{ ...inputStyle, background: '#f5f5f5' }} data-testid="input-partner-contact" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 특이사항 및 요청사항 */}
            <div style={{ background: '#FFFFFF', boxShadow: '0px 0px 20px #DBE9F5', borderRadius: '12px', padding: '20px', border: tableBorderStyle }}>
              <label style={{ ...labelStyle, marginBottom: '8px', display: 'block' }}>특이사항 및 요청사항</label>
              <textarea
                placeholder="협력 업체명, 요청사항 등"
                value={formData.specialRequests}
                onChange={(e) => { if (e.target.value.length <= 800) handleInputChange("specialRequests", e.target.value); }}
                disabled={readOnly}
                maxLength={800}
                style={{ width: '100%', height: '100px', padding: '12px', background: '#FDFDFD', border: tableBorderStyle, borderRadius: '6px', fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', color: '#0C0C0C', resize: 'none' }}
                data-testid="textarea-special-requests"
              />
              <div style={{ textAlign: 'right', fontSize: '12px', color: '#686A6E', marginTop: '4px' }}>{formData.specialRequests.length}/800</div>
            </div>

            {/* Bottom Buttons */}
            {!readOnly && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end w-full mt-4 gap-3">
                {isModal && initialCaseId ? (
                  <button onClick={handleUpdateCase} disabled={updateMutation.isPending} className="h-12 px-8 rounded-lg" style={{ fontFamily: 'Pretendard', fontWeight: 600, background: updateMutation.isPending ? 'rgba(0, 143, 237, 0.5)' : '#008FED', border: 'none', color: '#FFFFFF', cursor: updateMutation.isPending ? 'not-allowed' : 'pointer' }} data-testid="button-update-case">
                    {updateMutation.isPending ? '수정 중...' : '수정하기'}
                  </button>
                ) : (
                  <>
                    <button onClick={handleReset} className="h-12 px-8 rounded-lg" style={{ fontFamily: 'Pretendard', fontWeight: 600, background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer' }} data-testid="button-reset">초기화</button>
                    <button onClick={handleSave} disabled={saveMutation.isPending} className="h-12 px-8 rounded-lg" style={{ fontFamily: 'Pretendard', fontWeight: 600, background: saveMutation.isPending ? 'rgba(0, 143, 237, 0.5)' : '#008FED', border: 'none', color: '#FFFFFF', cursor: saveMutation.isPending ? 'not-allowed' : 'pointer' }} data-testid="button-save">
                      {saveMutation.isPending ? '저장 중...' : '저장'}
                    </button>
                    <button onClick={handleSubmit} disabled={submitMutation.isPending || !isFormValid} className="h-12 px-8 rounded-lg" style={{ fontFamily: 'Pretendard', fontWeight: 600, background: (submitMutation.isPending || !isFormValid) ? 'rgba(12, 12, 12, 0.2)' : '#008FED', border: 'none', color: '#FFFFFF', cursor: (submitMutation.isPending || !isFormValid) ? 'not-allowed' : 'pointer' }} data-testid="button-submit">
                      {submitMutation.isPending ? '접수 중...' : '접수완료'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 협력사 검색 팝업 */}
      {isPartnerSearchOpen && ((() => {
        const modalContent = (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '16px' }} onClick={() => setIsPartnerSearchOpen(false)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[864px] max-h-[90vh] overflow-y-auto" style={{ display: 'flex', flexDirection: 'column', padding: '0px 0px 20px', background: '#FFFFFF', boxShadow: '0px -2px 70px rgba(179, 193, 205, 0.8)', borderRadius: '12px' }}>
              <div className="flex flex-row justify-between items-center w-full px-5 h-[60px]">
                <h2 style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '18px', color: '#0C0C0C' }}>협력사 검색</h2>
                <button onClick={() => setIsPartnerSearchOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }} data-testid="button-close-partner-search"><X size={24} color="#1C1B1F" /></button>
              </div>
              <div className="flex flex-col items-center w-full px-5 gap-4">
                <div className="flex flex-col items-start w-full gap-2">
                  <label style={labelStyle}>협력사 검색</label>
                  <div className="flex flex-row items-center w-full h-[58px]">
                    <input type="text" placeholder="업체명을 입력해주세요." value={partnerSearchQuery} onChange={(e) => setPartnerSearchQuery(e.target.value)} className="flex-1" style={{ ...inputStyle, height: '58px', borderRadius: '6px 0px 0px 6px' }} data-testid="input-partner-search" />
                    <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0px 16px', height: '58px', background: '#008FED', borderRadius: '0px 6px 6px 0px', border: 'none', cursor: 'pointer' }} data-testid="button-partner-search">
                      <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '15px', color: '#FDFDFD' }}>검색</span>
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-start w-full gap-6 overflow-x-auto" style={{ maxHeight: '500px' }}>
                  {filteredPartners.length === 0 ? (
                    <div className="flex items-center justify-center w-full py-10">
                      <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', color: '#686A6E' }}>{partnerSearchQuery ? "검색 결과가 없습니다" : "등록된 협력사가 없습니다"}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-start w-full" style={{ maxHeight: '373px', minWidth: '700px' }}>
                      <div className="flex flex-row items-center w-full h-[39px]" style={{ background: '#F5F5F5' }}>
                        <div style={{ padding: '10px 12px', width: '155px' }}><span style={{ ...labelStyle }}>업체명</span></div>
                        <div style={{ padding: '10px 12px', width: '93px' }}><span style={{ ...labelStyle }}>일배당건수</span></div>
                        <div style={{ padding: '10px 12px', width: '93px' }}><span style={{ ...labelStyle }}>월배당건수</span></div>
                        <div style={{ padding: '10px 12px', width: '93px' }}><span style={{ ...labelStyle }}>진행건수</span></div>
                        <div style={{ padding: '10px 12px', width: '93px' }}><span style={{ ...labelStyle }}>미결건수</span></div>
                        <div style={{ padding: '10px 12px', flex: 1 }}><span style={{ ...labelStyle }}>지역</span></div>
                        <div style={{ padding: '10px 12px', width: '49px' }}><span style={{ ...labelStyle }}>선택</span></div>
                      </div>
                      <div className="flex flex-col items-start w-full overflow-y-auto" style={{ maxHeight: '334px' }}>
                        {filteredPartners.map((partner) => (
                          <div key={partner.name} className="flex flex-row items-center w-full h-[61px]" style={{ cursor: 'pointer', backgroundColor: tempSelectedPartner?.name === partner.name ? 'rgba(0, 143, 237, 0.08)' : 'transparent' }} onClick={() => setTempSelectedPartner(partner)} data-testid={`row-partner-${partner.name}`}>
                            <div style={{ padding: '10px 12px', width: '155px' }}><span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', color: tempSelectedPartner?.name === partner.name ? '#008FED' : '#686A6E' }}>{partner.name}</span></div>
                            <div style={{ padding: '10px 12px', width: '93px' }}><span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', color: '#686A6E' }}>{partner.dailyCount}</span></div>
                            <div style={{ padding: '10px 12px', width: '93px' }}><span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', color: '#686A6E' }}>{partner.monthlyCount}</span></div>
                            <div style={{ padding: '10px 12px', width: '93px' }}><span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', color: '#686A6E' }}>{partner.inProgressCount}</span></div>
                            <div style={{ padding: '10px 12px', width: '93px' }}><span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', color: '#686A6E' }}>{partner.pendingCount}</span></div>
                            <div style={{ padding: '10px 12px', flex: 1 }}><span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', color: '#686A6E' }}>{partner.region}</span></div>
                            <div style={{ padding: '10px 12px', width: '49px', display: 'flex', justifyContent: 'center' }}>
                              <div style={{ width: '18px', height: '18px', background: tempSelectedPartner?.name === partner.name ? '#008FED' : '#FDFDFD', border: tempSelectedPartner?.name === partner.name ? 'none' : '2px solid rgba(12, 12, 12, 0.2)', borderRadius: '50%', position: 'relative' }}>
                                {tempSelectedPartner?.name === partner.name && <div style={{ position: 'absolute', left: '27.78%', right: '27.78%', top: '27.78%', bottom: '27.78%', background: '#FDFDFD', borderRadius: '50%' }} />}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {tempSelectedPartner && (
                  <div className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ padding: '16px', background: '#F8F8F8', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '8px', height: '8px', background: '#008FED', borderRadius: '50%' }} />
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '18px', color: 'rgba(12, 12, 12, 0.9)' }}>{tempSelectedPartner.name}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button onClick={() => setTempSelectedPartner(null)} style={{ padding: '10px', width: '88px', height: '40px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }} data-testid="button-reset-partner">
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '16px', color: 'rgba(12, 12, 12, 0.3)' }}>초기화</span>
                      </button>
                      <button onClick={() => { setSelectedPartner(tempSelectedPartner); handleInputChange("assignedPartner", tempSelectedPartner.name); handleInputChange("assignedPartnerManager", ""); handleInputChange("assignedPartnerContact", ""); setIsPartnerSearchOpen(false); setTempSelectedPartner(null); setPartnerSearchQuery(""); }} style={{ padding: '10px', width: '88px', height: '40px', background: '#008FED', borderRadius: '6px', border: 'none', cursor: 'pointer' }} data-testid="button-apply-partner">
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', color: '#FDFDFD' }}>적용</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        return isModal ? modalContent : createPortal(modalContent, document.body);
      })())}

      {/* 의뢰사 검색 팝업 */}
      {isClientSearchOpen && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '16px' }} onClick={() => setIsClientSearchOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[600px]" style={{ display: 'flex', flexDirection: 'column', padding: '0px 0px 20px', background: '#FFFFFF', boxShadow: '0px -2px 70px rgba(179, 193, 205, 0.8)', borderRadius: '12px', maxHeight: '90vh' }}>
            <div className="flex flex-row justify-between items-center w-full px-5 h-[60px]">
              <h2 style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '18px', color: '#0C0C0C' }}>의뢰사 검색</h2>
              <button onClick={() => setIsClientSearchOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }} data-testid="button-close-client-search"><X size={24} color="#1C1B1F" /></button>
            </div>
            <div className="flex flex-col items-center w-full px-5 gap-4">
              <div className="flex flex-col items-start w-full gap-2">
                <label style={labelStyle}>의뢰사 검색</label>
                <div className="flex flex-row items-center w-full h-[58px]">
                  <input type="text" placeholder="의뢰사명을 입력해주세요." value={clientSearchQuery} onChange={(e) => setClientSearchQuery(e.target.value)} className="flex-1" style={{ ...inputStyle, height: '58px', borderRadius: '6px 0px 0px 6px' }} data-testid="input-client-search" />
                  <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0px 16px', height: '58px', background: '#008FED', borderRadius: '0px 6px 6px 0px', border: 'none', cursor: 'pointer' }} data-testid="button-client-search-submit">
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '15px', color: '#FDFDFD' }}>검색</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start w-full px-5 overflow-y-auto" style={{ flex: 1, minHeight: 0, maxHeight: '300px' }}>
              {filteredClients.length === 0 ? (
                <div className="flex items-center justify-center w-full py-10">
                  <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', color: '#686A6E' }}>{clientSearchQuery ? "검색 결과가 없습니다" : "등록된 의뢰사가 없습니다"}</span>
                </div>
              ) : (
                <div className="flex flex-col items-start w-full">
                  <div className="flex flex-row items-center w-full h-[39px]" style={{ background: '#F5F5F5' }}>
                    <div style={{ padding: '10px 12px', flex: 1 }}><span style={{ ...labelStyle }}>의뢰사명</span></div>
                    <div style={{ padding: '10px 12px', width: '60px' }}><span style={{ ...labelStyle }}>선택</span></div>
                  </div>
                  {filteredClients.map((client) => (
                    <div key={client.name} className="flex flex-row items-center w-full h-[50px]" style={{ borderBottom: '1px solid rgba(12, 12, 12, 0.08)', cursor: 'pointer', backgroundColor: tempSelectedClient?.name === client.name ? 'rgba(0, 143, 237, 0.08)' : 'transparent' }} onClick={() => setTempSelectedClient(client)} data-testid={`row-client-${client.name}`}>
                      <div style={{ padding: '10px 12px', flex: 1 }}><span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', color: tempSelectedClient?.name === client.name ? '#008FED' : '#686A6E' }}>{client.name}</span></div>
                      <div style={{ padding: '10px 12px', width: '60px', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: '18px', height: '18px', background: tempSelectedClient?.name === client.name ? '#008FED' : '#FDFDFD', border: tempSelectedClient?.name === client.name ? 'none' : '2px solid rgba(12, 12, 12, 0.2)', borderRadius: '50%', position: 'relative' }}>
                          {tempSelectedClient?.name === client.name && <div style={{ position: 'absolute', left: '27.78%', right: '27.78%', top: '27.78%', bottom: '27.78%', background: '#FDFDFD', borderRadius: '50%' }} />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {tempSelectedClient && (
              <div className="w-full px-5" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ padding: '16px', background: '#F8F8F8', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '8px', height: '8px', background: '#008FED', borderRadius: '50%' }} />
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '18px', color: 'rgba(12, 12, 12, 0.9)' }}>{tempSelectedClient.name}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  <button onClick={() => setTempSelectedClient(null)} style={{ padding: '10px', width: '88px', height: '40px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }} data-testid="button-reset-client">
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '16px', color: 'rgba(12, 12, 12, 0.3)' }}>초기화</span>
                  </button>
                  <button onClick={() => { handleInputChange("clientResidence", tempSelectedClient.name); setIsClientSearchOpen(false); setTempSelectedClient(null); setClientSearchQuery(""); }} style={{ padding: '10px', width: '88px', height: '40px', background: '#008FED', borderRadius: '6px', border: 'none', cursor: 'pointer' }} data-testid="button-apply-client">
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', color: '#FDFDFD' }}>적용</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* 심사사 검색 팝업 */}
      {isAssessorSearchOpen && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '16px' }} onClick={() => setIsAssessorSearchOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[600px]" style={{ display: 'flex', flexDirection: 'column', padding: '0px 0px 20px', background: '#FFFFFF', boxShadow: '0px -2px 70px rgba(179, 193, 205, 0.8)', borderRadius: '12px', maxHeight: '90vh' }}>
            <div className="flex flex-row justify-between items-center w-full px-5 h-[60px]">
              <h2 style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '18px', color: '#0C0C0C' }}>심사사 검색</h2>
              <button onClick={() => setIsAssessorSearchOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }} data-testid="button-close-assessor-search"><X size={24} color="#1C1B1F" /></button>
            </div>
            <div className="flex flex-col items-center w-full px-5 gap-4">
              <div className="flex flex-col items-start w-full gap-2">
                <label style={labelStyle}>심사사 검색</label>
                <div className="flex flex-row items-center w-full h-[58px]">
                  <input type="text" placeholder="심사사명을 입력해주세요." value={assessorSearchQuery} onChange={(e) => setAssessorSearchQuery(e.target.value)} className="flex-1" style={{ ...inputStyle, height: '58px', borderRadius: '6px 0px 0px 6px' }} data-testid="input-assessor-search" />
                  <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0px 16px', height: '58px', background: '#008FED', borderRadius: '0px 6px 6px 0px', border: 'none', cursor: 'pointer' }} data-testid="button-assessor-search-submit">
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '15px', color: '#FDFDFD' }}>검색</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start w-full px-5 overflow-y-auto" style={{ flex: 1, minHeight: 0, maxHeight: '300px' }}>
              {filteredAssessors.length === 0 ? (
                <div className="flex items-center justify-center w-full py-10">
                  <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', color: '#686A6E' }}>{assessorSearchQuery ? "검색 결과가 없습니다" : "등록된 심사사가 없습니다"}</span>
                </div>
              ) : (
                <div className="flex flex-col items-start w-full">
                  <div className="flex flex-row items-center w-full h-[39px]" style={{ background: '#F5F5F5' }}>
                    <div style={{ padding: '10px 12px', flex: 1 }}><span style={{ ...labelStyle }}>심사사명</span></div>
                    <div style={{ padding: '10px 12px', width: '60px' }}><span style={{ ...labelStyle }}>선택</span></div>
                  </div>
                  {filteredAssessors.map((assessor) => (
                    <div key={assessor.name} className="flex flex-row items-center w-full h-[50px]" style={{ borderBottom: '1px solid rgba(12, 12, 12, 0.08)', cursor: 'pointer', backgroundColor: tempSelectedAssessor?.name === assessor.name ? 'rgba(0, 143, 237, 0.08)' : 'transparent' }} onClick={() => setTempSelectedAssessor(assessor)} data-testid={`row-assessor-${assessor.name}`}>
                      <div style={{ padding: '10px 12px', flex: 1 }}><span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', color: tempSelectedAssessor?.name === assessor.name ? '#008FED' : '#686A6E' }}>{assessor.name}</span></div>
                      <div style={{ padding: '10px 12px', width: '60px', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: '18px', height: '18px', background: tempSelectedAssessor?.name === assessor.name ? '#008FED' : '#FDFDFD', border: tempSelectedAssessor?.name === assessor.name ? 'none' : '2px solid rgba(12, 12, 12, 0.2)', borderRadius: '50%', position: 'relative' }}>
                          {tempSelectedAssessor?.name === assessor.name && <div style={{ position: 'absolute', left: '27.78%', right: '27.78%', top: '27.78%', bottom: '27.78%', background: '#FDFDFD', borderRadius: '50%' }} />}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-row items-center w-full h-[50px]" style={{ borderBottom: '1px solid rgba(12, 12, 12, 0.08)', cursor: 'pointer', backgroundColor: tempSelectedAssessor?.name === '__NONE__' ? 'rgba(0, 143, 237, 0.08)' : 'transparent' }} onClick={() => setTempSelectedAssessor({ name: '__NONE__', displayName: '없음' })} data-testid="row-assessor-none">
                    <div style={{ padding: '10px 12px', flex: 1 }}><span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', fontStyle: 'italic', color: tempSelectedAssessor?.name === '__NONE__' ? '#008FED' : '#999' }}>없음</span></div>
                    <div style={{ padding: '10px 12px', width: '60px', display: 'flex', justifyContent: 'center' }}>
                      <div style={{ width: '18px', height: '18px', background: tempSelectedAssessor?.name === '__NONE__' ? '#008FED' : '#FDFDFD', border: tempSelectedAssessor?.name === '__NONE__' ? 'none' : '2px solid rgba(12, 12, 12, 0.2)', borderRadius: '50%', position: 'relative' }}>
                        {tempSelectedAssessor?.name === '__NONE__' && <div style={{ position: 'absolute', left: '27.78%', right: '27.78%', top: '27.78%', bottom: '27.78%', background: '#FDFDFD', borderRadius: '50%' }} />}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {tempSelectedAssessor && (
              <div className="w-full px-5" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ padding: '16px', background: '#F8F8F8', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '8px', height: '8px', background: tempSelectedAssessor.name === '__NONE__' ? '#999' : '#008FED', borderRadius: '50%' }} />
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '18px', color: 'rgba(12, 12, 12, 0.9)', fontStyle: tempSelectedAssessor.name === '__NONE__' ? 'italic' : 'normal' }}>{tempSelectedAssessor.name === '__NONE__' ? '없음 (심사사 정보 삭제)' : tempSelectedAssessor.name}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  <button onClick={() => setTempSelectedAssessor(null)} style={{ padding: '10px', width: '88px', height: '40px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }} data-testid="button-reset-assessor">
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '16px', color: 'rgba(12, 12, 12, 0.3)' }}>초기화</span>
                  </button>
                  <button onClick={() => { if (tempSelectedAssessor.name === '__NONE__') { handleInputChange("assessorId", ""); handleInputChange("assessorTeam", ""); handleInputChange("assessorContact", ""); } else { handleInputChange("assessorId", tempSelectedAssessor.name); } setIsAssessorSearchOpen(false); setTempSelectedAssessor(null); setAssessorSearchQuery(""); }} style={{ padding: '10px', width: '88px', height: '40px', background: '#008FED', borderRadius: '6px', border: 'none', cursor: 'pointer' }} data-testid="button-apply-assessor">
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', color: '#FDFDFD' }}>적용</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* 조사사 검색 팝업 */}
      {isInvestigatorSearchOpen && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '16px' }} onClick={() => setIsInvestigatorSearchOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[600px]" style={{ display: 'flex', flexDirection: 'column', padding: '0px 0px 20px', background: '#FFFFFF', boxShadow: '0px -2px 70px rgba(179, 193, 205, 0.8)', borderRadius: '12px', maxHeight: '90vh' }}>
            <div className="flex flex-row justify-between items-center w-full px-5 h-[60px]">
              <h2 style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '18px', color: '#0C0C0C' }}>손사명 검색</h2>
              <button onClick={() => setIsInvestigatorSearchOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }} data-testid="button-close-investigator-search"><X size={24} color="#1C1B1F" /></button>
            </div>
            <div className="flex flex-col items-center w-full px-5 gap-4">
              <div className="flex flex-col items-start w-full gap-2">
                <label style={labelStyle}>손사명 검색</label>
                <div className="flex flex-row items-center w-full h-[58px]">
                  <input type="text" placeholder="손사명을 입력해주세요." value={investigatorSearchQuery} onChange={(e) => setInvestigatorSearchQuery(e.target.value)} className="flex-1" style={{ ...inputStyle, height: '58px', borderRadius: '6px 0px 0px 6px' }} data-testid="input-investigator-search" />
                  <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0px 16px', height: '58px', background: '#008FED', borderRadius: '0px 6px 6px 0px', border: 'none', cursor: 'pointer' }} data-testid="button-investigator-search-submit">
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '15px', color: '#FDFDFD' }}>검색</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start w-full px-5 overflow-y-auto" style={{ flex: 1, minHeight: 0, maxHeight: '300px' }}>
              {filteredInvestigators.length === 0 ? (
                <div className="flex items-center justify-center w-full py-10">
                  <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', color: '#686A6E' }}>{investigatorSearchQuery ? "검색 결과가 없습니다" : "등록된 손사가 없습니다"}</span>
                </div>
              ) : (
                <div className="flex flex-col items-start w-full">
                  <div className="flex flex-row items-center w-full h-[39px]" style={{ background: '#F5F5F5' }}>
                    <div style={{ padding: '10px 12px', flex: 1 }}><span style={{ ...labelStyle }}>손사명</span></div>
                    <div style={{ padding: '10px 12px', width: '60px' }}><span style={{ ...labelStyle }}>선택</span></div>
                  </div>
                  {filteredInvestigators.map((investigator) => (
                    <div key={investigator.name} className="flex flex-row items-center w-full h-[50px]" style={{ borderBottom: '1px solid rgba(12, 12, 12, 0.08)', cursor: 'pointer', backgroundColor: tempSelectedInvestigator?.name === investigator.name ? 'rgba(0, 143, 237, 0.08)' : 'transparent' }} onClick={() => setTempSelectedInvestigator(investigator)} data-testid={`row-investigator-${investigator.name}`}>
                      <div style={{ padding: '10px 12px', flex: 1 }}><span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', color: tempSelectedInvestigator?.name === investigator.name ? '#008FED' : '#686A6E' }}>{investigator.name}</span></div>
                      <div style={{ padding: '10px 12px', width: '60px', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: '18px', height: '18px', background: tempSelectedInvestigator?.name === investigator.name ? '#008FED' : '#FDFDFD', border: tempSelectedInvestigator?.name === investigator.name ? 'none' : '2px solid rgba(12, 12, 12, 0.2)', borderRadius: '50%', position: 'relative' }}>
                          {tempSelectedInvestigator?.name === investigator.name && <div style={{ position: 'absolute', left: '27.78%', right: '27.78%', top: '27.78%', bottom: '27.78%', background: '#FDFDFD', borderRadius: '50%' }} />}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-row items-center w-full h-[50px]" style={{ borderBottom: '1px solid rgba(12, 12, 12, 0.08)', cursor: 'pointer', backgroundColor: tempSelectedInvestigator?.name === '__NONE__' ? 'rgba(0, 143, 237, 0.08)' : 'transparent' }} onClick={() => setTempSelectedInvestigator({ name: '__NONE__', displayName: '없음' })} data-testid="row-investigator-none">
                    <div style={{ padding: '10px 12px', flex: 1 }}><span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', fontStyle: 'italic', color: tempSelectedInvestigator?.name === '__NONE__' ? '#008FED' : '#999' }}>없음</span></div>
                    <div style={{ padding: '10px 12px', width: '60px', display: 'flex', justifyContent: 'center' }}>
                      <div style={{ width: '18px', height: '18px', background: tempSelectedInvestigator?.name === '__NONE__' ? '#008FED' : '#FDFDFD', border: tempSelectedInvestigator?.name === '__NONE__' ? 'none' : '2px solid rgba(12, 12, 12, 0.2)', borderRadius: '50%', position: 'relative' }}>
                        {tempSelectedInvestigator?.name === '__NONE__' && <div style={{ position: 'absolute', left: '27.78%', right: '27.78%', top: '27.78%', bottom: '27.78%', background: '#FDFDFD', borderRadius: '50%' }} />}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {tempSelectedInvestigator && (
              <div className="w-full px-5" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ padding: '16px', background: '#F8F8F8', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '8px', height: '8px', background: tempSelectedInvestigator.name === '__NONE__' ? '#999' : '#008FED', borderRadius: '50%' }} />
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '18px', color: 'rgba(12, 12, 12, 0.9)', fontStyle: tempSelectedInvestigator.name === '__NONE__' ? 'italic' : 'normal' }}>{tempSelectedInvestigator.name === '__NONE__' ? '없음 (조사사 정보 삭제)' : tempSelectedInvestigator.name}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  <button onClick={() => setTempSelectedInvestigator(null)} style={{ padding: '10px', width: '88px', height: '40px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }} data-testid="button-reset-investigator">
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '16px', color: 'rgba(12, 12, 12, 0.3)' }}>초기화</span>
                  </button>
                  <button onClick={() => { if (tempSelectedInvestigator.name === '__NONE__') { handleInputChange("investigatorTeam", ""); handleInputChange("investigatorTeamName", ""); handleInputChange("investigatorContact", ""); } else { handleInputChange("investigatorTeam", tempSelectedInvestigator.name); } setIsInvestigatorSearchOpen(false); setTempSelectedInvestigator(null); setInvestigatorSearchQuery(""); }} style={{ padding: '10px', width: '88px', height: '40px', background: '#008FED', borderRadius: '6px', border: 'none', cursor: 'pointer' }} data-testid="button-apply-investigator">
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', color: '#FDFDFD' }}>적용</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {smsDialogOpen && completedCase && (
        <SmsNotificationDialog isOpen={smsDialogOpen} onClose={() => { setSmsDialogOpen(false); setCompletedCase(null); }} caseData={completedCase} />
      )}
    </div>
  );
}
