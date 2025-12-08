import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, X, ChevronDown, Upload, ChevronRight, Download, Printer, CheckCircle2, Star } from "lucide-react";
import logoIcon from "@assets/Frame 2_1762217940686.png";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, VALID_ROLES, type ExcelData, type Inquiry, type MasterData, type InsertMasterData, type Notice, type CaseChangeLog } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GlobalHeader } from "@/components/global-header";
import { AccessControlPanel } from "@/components/access-control-panel";
import * as XLSX from "xlsx";
import JSZip from "jszip";

// Fallback xlsx parser for files with XML namespace prefixes that xlsx library can't handle
async function parseXlsxFallback(file: File): Promise<{ headers: string[], data: any[][] }> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  // Get shared strings
  const sharedStringsFile = zip.file('xl/sharedStrings.xml');
  const sharedStrings: string[] = [];
  if (sharedStringsFile) {
    const ssXml = await sharedStringsFile.async('string');
    const siMatches = ssXml.match(/<(?:si|x:si)>[\s\S]*?<\/(?:si|x:si)>/g) || [];
    siMatches.forEach(si => {
      const tMatch = si.match(/<(?:t|x:t)[^>]*>([^<]*)<\/(?:t|x:t)>/);
      sharedStrings.push(tMatch ? tMatch[1] : '');
    });
  }
  
  // Get sheet data
  const sheetFile = zip.file('xl/worksheets/sheet1.xml');
  if (!sheetFile) {
    throw new Error('Sheet1 not found in xlsx file');
  }
  
  const sheetXml = await sheetFile.async('string');
  const rows: any[][] = [];
  const rowMatches = sheetXml.match(/<(?:row|x:row)[^>]*>[\s\S]*?<\/(?:row|x:row)>/g) || [];
  
  rowMatches.forEach(rowXml => {
    const cellMatches = rowXml.match(/<(?:c|x:c)[^>]*>[\s\S]*?<\/(?:c|x:c)>/g) || [];
    const row: any[] = new Array(20).fill(null);
    
    cellMatches.forEach(cellXml => {
      // Get cell reference
      const refMatch = cellXml.match(/r="([A-Z]+)\d+"/);
      if (!refMatch) return;
      
      const colLetter = refMatch[1];
      let colIdx = 0;
      for (let i = 0; i < colLetter.length; i++) {
        colIdx = colIdx * 26 + (colLetter.charCodeAt(i) - 64);
      }
      colIdx -= 1;
      
      // Get cell type
      const typeMatch = cellXml.match(/t="([^"]+)"/);
      const cellType = typeMatch ? typeMatch[1] : 'n';
      
      // Get value
      const valMatch = cellXml.match(/<(?:v|x:v)>([^<]*)<\/(?:v|x:v)>/);
      let value: any = valMatch ? valMatch[1] : null;
      
      if (cellType === 's' && value !== null) {
        const idx = parseInt(value);
        value = sharedStrings[idx] || '';
      } else if (value !== null) {
        const num = parseFloat(value);
        value = isNaN(num) ? value : num;
      }
      
      row[colIdx] = value;
    });
    
    // Trim trailing nulls
    while (row.length > 0 && row[row.length - 1] === null) row.pop();
    if (row.length > 0) rows.push(row);
  });
  
  if (rows.length === 0) {
    throw new Error('No data found in xlsx file');
  }
  
  const headers = rows[0].map((h: any) => h?.toString() || '');
  const data = rows.slice(1);
  
  return { headers, data };
}

// 한국 행정구역 데이터
const KOREA_REGIONS: Record<string, string[]> = {
  서울: [
    "강남구",
    "강동구",
    "강북구",
    "강서구",
    "관악구",
    "광진구",
    "구로구",
    "금천구",
    "노원구",
    "도봉구",
    "동대문구",
    "동작구",
    "마포구",
    "서대문구",
    "서초구",
    "성동구",
    "성북구",
    "송파구",
    "양천구",
    "영등포구",
    "용산구",
    "은평구",
    "종로구",
    "중구",
    "중랑구",
  ],
  경기: [
    "고양시",
    "과천시",
    "광명시",
    "광주시",
    "구리시",
    "군포시",
    "김포시",
    "남양주시",
    "동두천시",
    "부천시",
    "성남시",
    "수원시",
    "시흥시",
    "안산시",
    "안성시",
    "안양시",
    "양주시",
    "오산시",
    "용인시",
    "의왕시",
    "의정부시",
    "이천시",
    "파주시",
    "평택시",
    "포천시",
    "하남시",
    "화성시",
    "가평군",
    "양평군",
    "여주군",
    "연천군",
  ],
  인천: [
    "계양구",
    "남동구",
    "동구",
    "미추홀구",
    "부평구",
    "서구",
    "연수구",
    "중구",
    "강화군",
    "옹진군",
  ],
  대전: ["대덕구", "동구", "서구", "유성구", "중구"],
  세종: ["세종시"],
  충남: [
    "계룡시",
    "공주시",
    "논산시",
    "당진시",
    "보령시",
    "서산시",
    "아산시",
    "천안시",
    "금산군",
    "부여군",
    "서천군",
    "예산군",
    "청양군",
    "태안군",
    "홍성군",
  ],
  충북: [
    "제천시",
    "청주시",
    "충주시",
    "괴산군",
    "단양군",
    "보은군",
    "영동군",
    "옥천군",
    "음성군",
    "증평군",
    "진천군",
  ],
  광주: ["광산구", "남구", "동구", "북구", "서구"],
  전남: [
    "광양시",
    "나주시",
    "목포시",
    "순천시",
    "여수시",
    "강진군",
    "고흥군",
    "곡성군",
    "구례군",
    "담양군",
    "무안군",
    "보성군",
    "신안군",
    "영광군",
    "영암군",
    "완도군",
    "장성군",
    "장흥군",
    "진도군",
    "함평군",
    "해남군",
    "화순군",
  ],
  전북: [
    "군산시",
    "김제시",
    "남원시",
    "익산시",
    "전주시",
    "정읍시",
    "고창군",
    "무주군",
    "부안군",
    "순창군",
    "완주군",
    "임실군",
    "장수군",
    "진안군",
  ],
  대구: ["남구", "달서구", "동구", "북구", "서구", "수성구", "중구", "달성군"],
  경북: [
    "경산시",
    "경주시",
    "구미시",
    "김천시",
    "문경시",
    "상주시",
    "안동시",
    "영주시",
    "영천시",
    "포항시",
    "고령군",
    "군위군",
    "봉화군",
    "성주군",
    "영덕군",
    "영양군",
    "예천군",
    "울릉군",
    "울진군",
    "의성군",
    "청도군",
    "청송군",
    "칠곡군",
  ],
  부산: [
    "강서구",
    "금정구",
    "남구",
    "동구",
    "동래구",
    "부산진구",
    "북구",
    "사상구",
    "사하구",
    "서구",
    "수영구",
    "연제구",
    "영도구",
    "중구",
    "해운대구",
    "기장군",
  ],
  울산: ["남구", "동구", "북구", "중구", "울주군"],
  경남: [
    "거제시",
    "김해시",
    "밀양시",
    "사천시",
    "양산시",
    "진주시",
    "창원시",
    "통영시",
    "거창군",
    "고성군",
    "남해군",
    "산청군",
    "의령군",
    "창녕군",
    "하동군",
    "함안군",
    "함양군",
    "합천군",
  ],
  강원: [
    "강릉시",
    "동해시",
    "삼척시",
    "속초시",
    "원주시",
    "춘천시",
    "태백시",
    "고성군",
    "양구군",
    "양양군",
    "영월군",
    "인제군",
    "정선군",
    "철원군",
    "평창군",
    "홍천군",
    "화천군",
    "횡성군",
  ],
  제주: ["서귀포시", "제주시"],
};

export default function AdminSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeMenu, setActiveMenu] = useState("사용자 계정 관리");
  const [roleFilter, setRoleFilter] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedUser, setSelectedUser] = useState<Omit<
    User,
    "password"
  > | null>(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState("0000");
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  
  // DB 관리 states
  const [dbTab, setDbTab] = useState("노무비");
  const [uploadTitle, setUploadTitle] = useState("");
  const [selectedLaborVersionId, setSelectedLaborVersionId] = useState<string | null>(null);
  const [selectedMaterialVersionId, setSelectedMaterialVersionId] = useState<string | null>(null);
  // 노무비 데이터
  const [laborExcelData, setLaborExcelData] = useState<any[]>([]);
  const [laborExcelHeaders, setLaborExcelHeaders] = useState<string[]>([]);
  // 자재비 데이터
  const [materialExcelData, setMaterialExcelData] = useState<any[]>([]);
  const [materialExcelHeaders, setMaterialExcelHeaders] = useState<string[]>([]);
  
  // 기준정보 관리 states
  const [selectedCategory, setSelectedCategory] = useState("장소");
  const [categoryItems, setCategoryItems] = useState<Record<string, string[]>>({});
  const [newItemInput, setNewItemInput] = useState("");
  const [masterDataSearchQuery, setMasterDataSearchQuery] = useState("");
  const [selectedMasterDataIds, setSelectedMasterDataIds] = useState<Set<string>>(new Set());
  const [editingMasterData, setEditingMasterData] = useState<Record<string, { value: string; note: string }>>({}); // 인라인 편집용
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showAccountCreatedModal, setShowAccountCreatedModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [sendEmailNotification, setSendEmailNotification] = useState(false);
  const [sendSmsNotification, setSendSmsNotification] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("0000");
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [replyTitle, setReplyTitle] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState("전체");
  
  // Notice states
  const [showAddNoticeModal, setShowAddNoticeModal] = useState(false);
  const [showNoticeConfirmModal, setShowNoticeConfirmModal] = useState(false);
  const [showNoticeCancelConfirmModal, setShowNoticeCancelConfirmModal] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeContent, setNoticeContent] = useState("");
  const [createAccountForm, setCreateAccountForm] = useState({
    role: "보험사",
    name: "",
    company: "",
    department: "",
    position: "",
    email: "",
    username: "",
    password: "",
    phone: "",
    office: "",
    address: "",
    bankName: "",
    accountNumber: "",
    accountHolder: "",
    serviceRegions: [] as string[],
    attachments: [] as string[],
  });
  const [regionSearchTerm, setRegionSearchTerm] = useState("");
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState("서울");
  const [tempSelectedRegions, setTempSelectedRegions] = useState<string[]>([]);

  // Check authentication
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // 마스터 데이터 카테고리 매핑 (UI 표시명 → DB 카테고리명)
  const MASTER_DATA_CATEGORIES: Record<string, string> = {
    "장소": "room_category",
    "위치": "location",
    "공사내용": "work_name",
    "사고 유형": "accident_type",
    "사고 원인": "accident_cause",
    "복구 유형": "recovery_type",
    "타업체 견적 여부": "other_company_estimate",
    "피해품목": "damage_item",
    "피해유형": "damage_type",
  };

  // DB 연동 마스터 데이터 조회 (관리자용: 비활성 데이터 포함)
  const { data: masterDataList = [], refetch: refetchMasterData } = useQuery<MasterData[]>({
    queryKey: ["/api/master-data", { includeInactive: "true" }],
    queryFn: async () => {
      const response = await fetch("/api/master-data?includeInactive=true", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch master data");
      return response.json();
    },
    enabled: !!user && user.role === "관리자",
  });

  // 선택된 카테고리의 마스터 데이터 필터링
  const currentMasterData = masterDataList.filter(
    (item) => item.category === MASTER_DATA_CATEGORIES[selectedCategory]
  );

  // 전체 카테고리 목록 (DB 연동 + 메모리 state)
  const allCategories = [...Object.keys(MASTER_DATA_CATEGORIES), ...Object.keys(categoryItems)];

  // 카테고리가 DB 연동 카테고리인지 확인
  const isMasterDataCategory = (category: string) => category in MASTER_DATA_CATEGORIES;

  // 카테고리의 항목 개수 계산
  const getCategoryCount = (category: string) => {
    if (isMasterDataCategory(category)) {
      return masterDataList.filter(item => item.category === MASTER_DATA_CATEGORIES[category]).length;
    }
    return categoryItems[category]?.length || 0;
  };

  // 카테고리의 항목 목록 가져오기
  const getCategoryItems = (category: string) => {
    if (isMasterDataCategory(category)) {
      return masterDataList.filter(item => item.category === MASTER_DATA_CATEGORIES[category]);
    }
    return categoryItems[category] || [];
  };

  // 마스터 데이터 생성 mutation
  const createMasterDataMutation = useMutation({
    mutationFn: async (data: InsertMasterData) => {
      return await apiRequest("POST", "/api/master-data", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data"] });
      toast({
        title: "항목 추가 완료",
        description: "항목이 성공적으로 추가되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "추가 실패",
        description: error.message || "항목을 추가하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 마스터 데이터 삭제 mutation
  const deleteMasterDataMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/master-data/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data"] });
      toast({
        title: "삭제 완료",
        description: "항목이 삭제되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "삭제 실패",
        description: error.message || "항목을 삭제하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 마스터 데이터 수정 mutation
  const updateMasterDataMutation = useMutation({
    mutationFn: async (data: { id: string; value: string; note?: string }) => {
      return await apiRequest("PATCH", `/api/master-data/${data.id}`, { value: data.value, note: data.note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data"] });
      setEditingMasterData({});
      toast({
        title: "수정 완료",
        description: "항목이 수정되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "수정 실패",
        description: error.message || "항목을 수정하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 선택된 마스터 데이터 일괄 삭제
  const deleteSelectedMasterData = () => {
    if (selectedMasterDataIds.size === 0) {
      toast({
        title: "선택된 항목이 없습니다",
        description: "삭제할 항목을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    selectedMasterDataIds.forEach(id => {
      deleteMasterDataMutation.mutate(id);
    });
    setSelectedMasterDataIds(new Set());
  };

  // Fetch all users from server
  const { data: allUsers = [], isLoading: usersLoading } = useQuery<
    Omit<User, "password">[]
  >({
    queryKey: ["/api/users"],
    enabled: !!user,
  });

  // Fetch labor cost Excel versions
  const { data: laborVersions = [], isLoading: laborVersionsLoading } = useQuery<ExcelData[]>({
    queryKey: ["/api/excel-data/노무비/versions"],
    enabled: !!user && activeMenu === "DB 관리",
  });

  // Fetch material cost Excel versions
  const { data: materialVersions = [], isLoading: materialVersionsLoading } = useQuery<ExcelData[]>({
    queryKey: ["/api/excel-data/자재비/versions"],
    enabled: !!user && activeMenu === "DB 관리",
  });

  // Fetch selected labor version detail
  const { data: selectedLaborVersion } = useQuery<ExcelData | null>({
    queryKey: [`/api/excel-data/detail/${selectedLaborVersionId}`],
    enabled: !!selectedLaborVersionId && activeMenu === "DB 관리",
  });

  // Fetch selected material version detail
  const { data: selectedMaterialVersion } = useQuery<ExcelData | null>({
    queryKey: [`/api/excel-data/detail/${selectedMaterialVersionId}`],
    enabled: !!selectedMaterialVersionId && activeMenu === "DB 관리",
  });

  // Auto-select latest version when versions change (validates selection still exists)
  useEffect(() => {
    if (laborVersions.length > 0 && !laborVersions.find(v => v.id === selectedLaborVersionId)) {
      setSelectedLaborVersionId(laborVersions[0].id);
    } else if (laborVersions.length === 0 && selectedLaborVersionId !== null) {
      setSelectedLaborVersionId(null);
    }
  }, [laborVersions, selectedLaborVersionId]);

  useEffect(() => {
    if (materialVersions.length > 0 && !materialVersions.find(v => v.id === selectedMaterialVersionId)) {
      setSelectedMaterialVersionId(materialVersions[0].id);
    } else if (materialVersions.length === 0 && selectedMaterialVersionId !== null) {
      setSelectedMaterialVersionId(null);
    }
  }, [materialVersions, selectedMaterialVersionId]);

  // Sync selected version data to local state
  useEffect(() => {
    if (selectedLaborVersion) {
      setLaborExcelHeaders(selectedLaborVersion.headers);
      setLaborExcelData(selectedLaborVersion.data);
    } else {
      setLaborExcelHeaders([]);
      setLaborExcelData([]);
    }
  }, [selectedLaborVersion]);

  useEffect(() => {
    if (selectedMaterialVersion) {
      setMaterialExcelHeaders(selectedMaterialVersion.headers);
      setMaterialExcelData(selectedMaterialVersion.data);
    } else {
      setMaterialExcelHeaders([]);
      setMaterialExcelData([]);
    }
  }, [selectedMaterialVersion]);

  useEffect(() => {
    if (!userLoading && !user) {
      setLocation("/");
    }
  }, [user, userLoading, setLocation]);

  const sidebarMenus = [
    { name: "사용자 계정 관리", active: true },
    { name: "접근 권한 관리", active: false },
    { name: "1:1 문의 관리", active: false },
    { name: "공지사항 관리", active: false },
    { name: "DB 관리", active: false },
    { name: "기준정보 관리", active: false },
    { name: "변경 로그 관리", active: false },
  ];

  // Excel data mutations
  const saveExcelDataMutation = useMutation({
    mutationFn: async (data: { type: string; title: string; headers: string[]; data: any[][] }) => {
      const response = await apiRequest("POST", "/api/excel-data", data);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.error || "업로드 실패") as any;
        error.status = response.status;
        throw error;
      }
      return await response.json();
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/excel-data/${variables.type}/versions`] });
      // Auto-select newly created version
      if (result && result.id) {
        if (variables.type === "노무비") {
          setSelectedLaborVersionId(result.id);
        } else {
          setSelectedMaterialVersionId(result.id);
        }
      }
    },
  });

  const deleteVersionMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/excel-data/id/${id}`);
    },
    onSuccess: async (_, deletedId) => {
      const currentType = dbTab;
      
      // Clear selection if deleted version was selected
      if (currentType === "노무비" && selectedLaborVersionId === deletedId) {
        setSelectedLaborVersionId(null);
      } else if (currentType === "자재비" && selectedMaterialVersionId === deletedId) {
        setSelectedMaterialVersionId(null);
      }
      
      // Invalidate and refetch versions (useEffect will auto-select latest)
      await queryClient.invalidateQueries({ queryKey: [`/api/excel-data/${currentType}/versions`] });
    },
  });

  // Fetch inquiries
  const { data: inquiries = [], isLoading: inquiriesLoading } = useQuery<Inquiry[]>({
    queryKey: ["/api/inquiries"],
    enabled: !!user && activeMenu === "1:1 문의 관리",
  });

  // Fetch favorites for admin
  const { data: favorites = [] } = useQuery<{ id: string; menuName: string }[]>({
    queryKey: ["/api/favorites"],
    enabled: !!user,
  });

  // Check if pages are favorites
  const isInquiryManagementFavorite = favorites.some(fav => fav.menuName === "1:1 문의 관리");
  const isNoticeManagementFavorite = favorites.some(fav => fav.menuName === "공지사항 관리");
  const isDbManagementFavorite = favorites.some(fav => fav.menuName === "DB 관리");
  const isMasterDataManagementFavorite = favorites.some(fav => fav.menuName === "기준정보 관리");

  // Filter inquiries based on status
  const filteredInquiries = inquiries.filter((inquiry) => {
    if (inquiryStatusFilter === "전체") return true;
    if (inquiryStatusFilter === "완료") return inquiry.response !== null && inquiry.response !== "";
    if (inquiryStatusFilter === "대기") return inquiry.response === null || inquiry.response === "";
    return true;
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (menuName: string) => {
      const isFavorite = favorites.some(fav => fav.menuName === menuName);
      if (isFavorite) {
        return await apiRequest("DELETE", `/api/favorites/${encodeURIComponent(menuName)}`);
      } else {
        return await apiRequest("POST", "/api/favorites", { menuName });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        description: isInquiryManagementFavorite ? "즐겨찾기에서 해제되었습니다" : "즐겨찾기에 추가되었습니다",
      });
    },
  });

  // Inquiry mutations
  const updateInquiryMutation = useMutation({
    mutationFn: async ({ id, responseTitle, response }: { id: string; responseTitle: string; response: string }) => {
      return await apiRequest("PATCH", `/api/inquiries/${id}`, { responseTitle, response });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries"] });
    },
  });

  // Fetch notices
  const { data: notices = [], isLoading: noticesLoading } = useQuery<Notice[]>({
    queryKey: ["/api/notices"],
    enabled: !!user && activeMenu === "공지사항 관리",
  });

  // Change log state and query
  const [changeLogCaseNumberFilter, setChangeLogCaseNumberFilter] = useState("");
  const [changeLogDateFrom, setChangeLogDateFrom] = useState("");
  const [changeLogDateTo, setChangeLogDateTo] = useState("");

  // Fetch change logs (admin only)
  const { data: changeLogs = [], isLoading: changeLogsLoading } = useQuery<Array<CaseChangeLog & { caseNumber: string }>>({
    queryKey: ["/api/case-change-logs", changeLogCaseNumberFilter, changeLogDateFrom, changeLogDateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (changeLogCaseNumberFilter) params.append("caseNumber", changeLogCaseNumberFilter);
      if (changeLogDateFrom) params.append("dateFrom", changeLogDateFrom);
      if (changeLogDateTo) params.append("dateTo", changeLogDateTo);
      const res = await fetch(`/api/case-change-logs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch change logs");
      return res.json();
    },
    enabled: !!user && activeMenu === "변경 로그 관리",
  });

  // Notice mutations
  const createNoticeMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      return await apiRequest("POST", "/api/notices", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notices"] });
      setShowAddNoticeModal(false);
      setNoticeTitle("");
      setNoticeContent("");
      toast({
        description: (
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5" />
            <span>공지사항이 등록되었습니다</span>
          </div>
        ),
        action: (
          <button
            onClick={() => {}}
            style={{
              fontFamily: "Pretendard",
              fontSize: "14px",
              fontWeight: 600,
              color: "#FDFDFD",
              padding: "0 8px",
            }}
          >
            확인하기
          </button>
        ),
        className: "border-none shadow-lg",
        style: {
          background: "#008FED",
          color: "#FDFDFD",
          fontFamily: "Pretendard",
          fontSize: "14px",
          fontWeight: 500,
        } as React.CSSProperties,
      });
    },
    onError: (error: any) => {
      toast({
        title: "등록 실패",
        description: error.message || "공지사항을 등록하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Use VALID_ROLES from schema for role filter options
  const roleFilters = ["전체", ...VALID_ROLES];

  // Apply filtering and search
  const filteredUsers = allUsers.filter((u) => {
    // Role filter
    const matchesRole = roleFilter === "전체" || u.role === roleFilter;

    // Search filter - improved with trim and lowercase
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const normalizedName = u.name.toLowerCase();
    const matchesSearch =
      normalizedQuery === "" || normalizedName.includes(normalizedQuery);

    return matchesRole && matchesSearch;
  });

  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  if (userLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div
      className="relative flex flex-col h-screen overflow-hidden"
      style={{ background: "#E7EDFE" }}
    >
      {/* Blur Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute"
          style={{
            width: "1095px",
            height: "777px",
            left: "97px",
            bottom: "-200px",
            background: "rgba(254, 240, 230, 0.4)",
            borderRadius: "9999px",
            filter: "blur(212px)",
            transform: "rotate(-35.25deg)",
          }}
        />
        <div
          className="absolute"
          style={{
            width: "1335px",
            height: "1323px",
            left: "811px",
            bottom: "0px",
            background: "rgba(234, 230, 254, 0.5)",
            borderRadius: "9999px",
            filter: "blur(212px)",
          }}
        />
        <div
          className="absolute"
          style={{
            width: "348px",
            height: "1323px",
            left: "0px",
            bottom: "189px",
            background: "rgba(234, 230, 254, 0.5)",
            borderRadius: "9999px",
            filter: "blur(212px)",
          }}
        />
      </div>

      <GlobalHeader />

      {/* Main Content */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div
          className="flex flex-col"
          style={{
            width: "260px",
            background: "rgba(255, 255, 255, 0.06)",
            borderRight: "1px solid rgba(0, 143, 237, 0.2)",
          }}
        >
          {/* Section Header */}
          <div className="px-8 py-4">
            <span
              style={{
                fontFamily: "Pretendard",
                fontSize: "15px",
                fontWeight: 500,
                letterSpacing: "-0.01em",
                color: "rgba(12, 12, 12, 0.5)",
              }}
            >
              통계 및 정산
            </span>
          </div>

          {/* Menu Items */}
          <div className="flex flex-col px-3 gap-2">
            {sidebarMenus.map((menu) => (
              <button
                key={menu.name}
                onClick={() => setActiveMenu(menu.name)}
                className="flex items-center px-5 py-3 rounded-lg transition-colors"
                style={{
                  background:
                    activeMenu === menu.name
                      ? "rgba(12, 12, 12, 0.08)"
                      : "transparent",
                  fontFamily: "Pretendard",
                  fontSize: "16px",
                  fontWeight: activeMenu === menu.name ? 700 : 500,
                  letterSpacing: "-0.02em",
                  color:
                    activeMenu === menu.name
                      ? "#008FED"
                      : "rgba(12, 12, 12, 0.8)",
                }}
                data-testid={`sidebar-${menu.name}`}
              >
                {menu.name}
              </button>
            ))}
          </div>
        </div>

        {/* Main Section */}
        <div className="flex-1 px-8 py-6 h-full overflow-y-auto">
          {activeMenu === "접근 권한 관리" ? (
            <AccessControlPanel />
          ) : activeMenu === "1:1 문의 관리" ? (
            <>
              {/* Title with notification icon */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <h1
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "26px",
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: "#0C0C0C",
                    }}
                  >
                    1:1 문의 관리
                  </h1>
                  <button
                    onClick={() => toggleFavoriteMutation.mutate("1:1 문의 관리")}
                    className="hover:opacity-70 transition-opacity cursor-pointer"
                    data-testid="button-toggle-inquiry-favorite"
                  >
                    <Star 
                      className="w-5 h-5" 
                      style={{ 
                        color: isInquiryManagementFavorite ? '#FFD700' : 'rgba(12, 12, 12, 0.24)',
                        fill: isInquiryManagementFavorite ? '#FFD700' : 'none',
                      }} 
                    />
                  </button>
                </div>
              </div>

              {/* Inquiry Count and Filter */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      fontWeight: 500,
                      letterSpacing: "-0.01em",
                      color: "#686A6E",
                    }}
                  >
                    문의 목록
                  </span>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      color: "#008FED",
                    }}
                  >
                    {filteredInquiries.length}
                  </span>
                </div>
                <Select value={inquiryStatusFilter} onValueChange={setInquiryStatusFilter}>
                  <SelectTrigger
                    className="w-[120px]"
                    style={{
                      background: "#FDFDFD",
                      border: "2px solid rgba(12, 12, 12, 0.08)",
                      borderRadius: "8px",
                      height: "40px",
                    }}
                    data-testid="select-inquiry-filter"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="전체">전체</SelectItem>
                    <SelectItem value="완료">완료</SelectItem>
                    <SelectItem value="대기">대기</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Inquiry Table */}
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  background: "#FFFFFF",
                  boxShadow: "0px 0px 20px #DBE9F5",
                }}
              >
                <table className="w-full">
                  <thead>
                    <tr
                      style={{
                        background: "#F8F9FA",
                        borderBottom: "2px solid rgba(12, 12, 12, 0.1)",
                      }}
                    >
                      <th
                        className="px-4 py-4 text-left"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                          color: "#686A6E",
                        }}
                      >
                        날짜
                      </th>
                      <th
                        className="px-4 py-4 text-left"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                          color: "#686A6E",
                        }}
                      >
                        제목
                      </th>
                      <th
                        className="px-4 py-4 text-left"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                          color: "#686A6E",
                        }}
                      >
                        내용
                      </th>
                      <th
                        className="px-4 py-4 text-left"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                          color: "#686A6E",
                        }}
                      >
                        작성자
                      </th>
                      <th
                        className="px-4 py-4 text-left"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                          color: "#686A6E",
                        }}
                      >
                        역할
                      </th>
                      <th
                        className="px-4 py-4 text-left"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                          color: "#686A6E",
                        }}
                      >
                        아이디
                      </th>
                      <th
                        className="px-4 py-4 text-left"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                          color: "#686A6E",
                        }}
                      >
                        이메일 주소
                      </th>
                      <th
                        className="px-4 py-4 text-left"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                          color: "#686A6E",
                        }}
                      >
                        답변여부
                      </th>
                      <th
                        className="px-4 py-4 text-left"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                          color: "#686A6E",
                        }}
                      >
                        요청
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {inquiriesLoading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center">
                          <div className="text-sm text-gray-500">로딩 중...</div>
                        </td>
                      </tr>
                    ) : filteredInquiries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center">
                          <div className="text-sm text-gray-500">
                            {inquiryStatusFilter === "전체" ? "등록된 문의가 없습니다" : 
                             inquiryStatusFilter === "완료" ? "답변 완료된 문의가 없습니다" : 
                             "대기 중인 문의가 없습니다"}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredInquiries.map((inquiry) => {
                        const inquiryUser = allUsers.find(u => u.id === inquiry.userId);
                        const date = new Date(inquiry.createdAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        }).replace(/\. /g, '-').replace('.', '');
                        
                        return (
                          <tr
                            key={inquiry.id}
                            onClick={() => setSelectedInquiry(inquiry as any)}
                            className="cursor-pointer hover:bg-gray-50"
                            style={{
                              borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                            }}
                            data-testid={`row-inquiry-${inquiry.id}`}
                          >
                            <td
                              className="px-4 py-4"
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                fontWeight: 400,
                                color: "#0C0C0C",
                              }}
                            >
                              {date}
                            </td>
                            <td
                              className="px-4 py-4"
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                fontWeight: 500,
                                color: "#0C0C0C",
                              }}
                            >
                              {inquiry.title}
                            </td>
                            <td
                              className="px-4 py-4"
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                fontWeight: 400,
                                color: "#686A6E",
                                maxWidth: "200px",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {inquiry.content.substring(0, 30)}...
                            </td>
                            <td
                              className="px-4 py-4"
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                fontWeight: 400,
                                color: "#0C0C0C",
                              }}
                            >
                              {inquiryUser?.role || "-"}
                            </td>
                            <td
                              className="px-4 py-4"
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                fontWeight: 400,
                                color: "#686A6E",
                              }}
                            >
                              {inquiryUser?.name || "-"}
                            </td>
                            <td
                              className="px-4 py-4"
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                fontWeight: 400,
                                color: "#0C0C0C",
                              }}
                            >
                              {inquiryUser?.username || "-"}
                            </td>
                            <td
                              className="px-4 py-4"
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                fontWeight: 400,
                                color: "#0C0C0C",
                              }}
                            >
                              {inquiryUser?.email || "-"}
                            </td>
                            <td
                              className="px-4 py-4"
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                fontWeight: 400,
                                color: "#0C0C0C",
                              }}
                            >
                              {inquiry.status}
                            </td>
                            <td className="px-4 py-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedInquiry(inquiry as any);
                                }}
                                className="px-4 py-2"
                                style={{
                                  background: "rgba(0, 143, 237, 0.1)",
                                  borderRadius: "6px",
                                  fontFamily: "Pretendard",
                                  fontSize: "13px",
                                  fontWeight: 500,
                                  letterSpacing: "-0.01em",
                                  color: "#008FED",
                                }}
                                data-testid={`button-inquiry-detail-${inquiry.id}`}
                              >
                                자세히보기
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* 1:1 문의 상세보기 Modal */}
              {selectedInquiry && (() => {
                const inquiryUser = allUsers.find(u => u.id === selectedInquiry.userId);
                const inquiryDate = new Date(selectedInquiry.createdAt).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                }).replace(/\. /g, '-').replace('.', '');
                
                return (
                  <>
                    {/* Modal Overlay */}
                    <div
                      className="fixed inset-0 bg-black bg-opacity-50 z-40"
                      onClick={() => {
                        setSelectedInquiry(null);
                        setReplyTitle("");
                        setReplyContent("");
                      }}
                      data-testid="modal-overlay-inquiry"
                    />

                    {/* Modal Panel */}
                    <div
                      className="fixed right-0 top-0 h-screen w-[600px] bg-white z-50 shadow-2xl overflow-y-auto"
                      style={{
                        animation: "slideInRight 0.3s ease-out",
                      }}
                      data-testid="modal-inquiry-detail"
                    >
                      {/* Header */}
                      <div
                        className="sticky top-0 bg-white z-10 flex items-center justify-between px-8 py-6"
                        style={{
                          borderBottom: "2px solid rgba(12, 12, 12, 0.1)",
                        }}
                      >
                        <h2
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "24px",
                            fontWeight: 600,
                            letterSpacing: "-0.02em",
                            color: "#0C0C0C",
                          }}
                        >
                          1:1 문의 상세보기
                        </h2>
                        <button
                          onClick={() => {
                            setSelectedInquiry(null);
                            setReplyTitle("");
                            setReplyContent("");
                          }}
                          className="text-gray-400 hover:text-gray-600"
                          data-testid="button-close-inquiry-detail"
                        >
                          <X size={24} />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="px-8 py-6">
                        {/* Author Info */}
                        <div
                          className="flex items-center justify-between px-4 py-3 mb-6"
                          style={{
                            background: "rgba(12, 12, 12, 0.04)",
                            borderRadius: "8px",
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "16px",
                                fontWeight: 600,
                                color: "#0C0C0C",
                              }}
                            >
                              {inquiryUser?.name || "-"}
                            </span>
                            <span
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                fontWeight: 400,
                                color: "#686A6E",
                              }}
                            >
                              · {inquiryUser?.company || "-"}
                          </span>
                          <span
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "14px",
                              fontWeight: 500,
                              color: "#008FED",
                            }}
                          >
                            {inquiryUser?.role || "-"}
                          </span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <span
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 400,
                            color: "#686A6E",
                          }}
                        >
                          {inquiryUser?.email || selectedInquiry.userId}
                        </span>
                        <span className="mx-2">·</span>
                        <span
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 400,
                            color: "#686A6E",
                          }}
                        >
                          {inquiryUser?.phone || "-"}
                        </span>
                      </div>

                      {/* Date */}
                      <div className="mb-4">
                        <span
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 400,
                            color: "#686A6E",
                          }}
                        >
                          {inquiryDate} 작성
                        </span>
                      </div>

                      {/* Title */}
                      <h3
                        className="mb-6"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "20px",
                          fontWeight: 600,
                          letterSpacing: "-0.02em",
                          color: "#0C0C0C",
                        }}
                      >
                        {selectedInquiry.title}
                      </h3>

                      {/* Content */}
                      <div
                        className="p-4 mb-6"
                        style={{
                          background: "rgba(12, 12, 12, 0.04)",
                          borderRadius: "8px",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        <p
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 400,
                            lineHeight: "1.6",
                            color: "#0C0C0C",
                          }}
                        >
                          {selectedInquiry.content}
                        </p>
                      </div>

                      {/* Reply Section */}
                      <div
                        className="border-t-2 pt-6"
                        style={{
                          borderColor: "rgba(12, 12, 12, 0.1)",
                        }}
                      >
                        {selectedInquiry.status === "완료" && selectedInquiry.response ? (
                          <>
                            <h4
                              className="mb-4"
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "18px",
                                fontWeight: 600,
                                color: "#0C0C0C",
                              }}
                            >
                              등록된 답변
                            </h4>
                            
                            {/* 답변일 */}
                            {selectedInquiry.respondedAt && (
                              <div
                                className="mb-4"
                                style={{
                                  fontFamily: "Pretendard",
                                  fontSize: "12px",
                                  fontWeight: 400,
                                  color: "#686A6E",
                                }}
                              >
                                {new Date(selectedInquiry.respondedAt).toLocaleDateString('ko-KR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit'
                                }).replace(/\. /g, '-').replace('.', '')} 답변
                              </div>
                            )}
                            
                            {/* 답변 제목 */}
                            {selectedInquiry.responseTitle && (
                              <h5
                                className="mb-4"
                                style={{
                                  fontFamily: "Pretendard",
                                  fontSize: "16px",
                                  fontWeight: 600,
                                  letterSpacing: "-0.02em",
                                  color: "#0C0C0C",
                                }}
                              >
                                {selectedInquiry.responseTitle}
                              </h5>
                            )}
                            
                            {/* 답변 내용 */}
                            <div
                              className="p-4"
                              style={{
                                background: "rgba(0, 143, 237, 0.04)",
                                borderRadius: "8px",
                                border: "1px solid rgba(0, 143, 237, 0.2)",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              <p
                                style={{
                                  fontFamily: "Pretendard",
                                  fontSize: "14px",
                                  fontWeight: 400,
                                  lineHeight: "1.6",
                                  color: "#0C0C0C",
                                }}
                              >
                                {selectedInquiry.response}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <h4
                              className="mb-4"
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "18px",
                                fontWeight: 600,
                                color: "#0C0C0C",
                              }}
                            >
                              답변하기
                            </h4>

                            {/* Reply Title */}
                            <div className="mb-4">
                              <label
                                className="block mb-2"
                                style={{
                                  fontFamily: "Pretendard",
                                  fontSize: "14px",
                                  fontWeight: 500,
                                  color: "#686A6E",
                                }}
                              >
                                답변 제목
                              </label>
                              <input
                                type="text"
                                value={replyTitle}
                                onChange={(e) => setReplyTitle(e.target.value)}
                                placeholder="답변 제목을 입력하세요"
                                className="w-full px-4 py-3 outline-none"
                                style={{
                                  background: "#FDFDFD",
                                  border: "2px solid rgba(12, 12, 12, 0.08)",
                                  borderRadius: "8px",
                                  fontFamily: "Pretendard",
                                  fontSize: "14px",
                                }}
                                data-testid="input-reply-title"
                              />
                            </div>

                            {/* Reply Content */}
                            <div className="mb-2">
                              <label
                                className="block mb-2"
                                style={{
                                  fontFamily: "Pretendard",
                                  fontSize: "14px",
                                  fontWeight: 500,
                                  color: "#686A6E",
                                }}
                              >
                                답변 내용
                              </label>
                              <textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="문의 내용을 입력하세요"
                                className="w-full px-4 py-3 outline-none resize-none"
                                rows={10}
                                maxLength={800}
                                style={{
                                  background: "#FDFDFD",
                                  border: "2px solid rgba(12, 12, 12, 0.08)",
                                  borderRadius: "8px",
                                  fontFamily: "Pretendard",
                                  fontSize: "14px",
                                }}
                                data-testid="textarea-reply-content"
                              />
                            </div>

                            {/* Character Count */}
                            <div className="flex justify-end mb-6">
                              <span
                                style={{
                                  fontFamily: "Pretendard",
                                  fontSize: "12px",
                                  fontWeight: 400,
                                  color: "#686A6E",
                                }}
                              >
                                {replyContent.length} /800
                              </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                              <button
                                onClick={() => {
                                  setReplyTitle("");
                                  setReplyContent("");
                                }}
                                className="flex-1 py-3"
                                style={{
                                  background: "rgba(12, 12, 12, 0.08)",
                                  borderRadius: "8px",
                                  fontFamily: "Pretendard",
                                  fontSize: "16px",
                                  fontWeight: 600,
                                  color: "#686A6E",
                                }}
                                data-testid="button-reset-reply"
                              >
                                초기화
                              </button>
                              <button
                                onClick={async () => {
                                  if (!replyTitle.trim() || !replyContent.trim()) {
                                    toast({
                                      title: "입력 오류",
                                      description: "답변 제목과 내용을 모두 입력해주세요.",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  
                                  try {
                                    await apiRequest("PATCH", `/api/inquiries/${selectedInquiry.id}`, { 
                                      responseTitle: replyTitle,
                                      response: replyContent 
                                    });
                                    
                                    await queryClient.invalidateQueries({ queryKey: ["/api/inquiries"] });
                                    
                                    toast({
                                      title: "답변 완료",
                                      description: "답변이 등록되었습니다.",
                                    });
                                    
                                    setSelectedInquiry(null);
                                    setReplyTitle("");
                                    setReplyContent("");
                                  } catch (error) {
                                    toast({
                                      title: "답변 실패",
                                      description: "답변 등록에 실패했습니다.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                className="flex-1 py-3"
                                style={{
                                  background: "#008FED",
                                  borderRadius: "8px",
                                  fontFamily: "Pretendard",
                                  fontSize: "16px",
                                  fontWeight: 600,
                                  color: "#FDFDFD",
                                }}
                                data-testid="button-submit-reply"
                              >
                                확인
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </>
          ) : activeMenu === "공지사항 관리" ? (
            <>
              {/* Title with info icon */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <h1
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "26px",
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: "#0C0C0C",
                    }}
                  >
                    공지사항 관리
                  </h1>
                  <button
                    onClick={() => toggleFavoriteMutation.mutate("공지사항 관리")}
                    className="hover:opacity-70 transition-opacity cursor-pointer"
                    data-testid="button-toggle-notice-favorite"
                  >
                    <Star 
                      className="w-5 h-5" 
                      style={{ 
                        color: isNoticeManagementFavorite ? '#FFD700' : 'rgba(12, 12, 12, 0.24)',
                        fill: isNoticeManagementFavorite ? '#FFD700' : 'none',
                      }} 
                    />
                  </button>
                </div>
                <button
                  onClick={() => setShowAddNoticeModal(true)}
                  className="px-6 py-3"
                  style={{
                    background: "#008FED",
                    borderRadius: "8px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    color: "#FDFDFD",
                  }}
                  data-testid="button-add-notice"
                >
                  새 공지 추가
                </button>
              </div>

              {/* Notice Count */}
              <div className="flex items-center gap-2 mb-4">
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                    color: "#686A6E",
                  }}
                >
                  등록된 공지
                </span>
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: "#008FED",
                  }}
                >
                  {notices.length}
                </span>
              </div>

              {/* Notice Table */}
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  background: "#FFFFFF",
                  boxShadow: "0px 0px 20px #DBE9F5",
                }}
              >
                <table className="w-full">
                  <thead>
                    <tr
                      style={{
                        background: "#F8F9FA",
                        borderBottom: "2px solid rgba(12, 12, 12, 0.1)",
                      }}
                    >
                      <th
                        className="px-4 py-4 text-left"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                          color: "#686A6E",
                        }}
                      >
                        제목
                      </th>
                      <th
                        className="px-4 py-4 text-left"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                          color: "#686A6E",
                        }}
                      >
                        내용
                      </th>
                      <th
                        className="px-4 py-4 text-left"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                          color: "#686A6E",
                        }}
                      >
                        게시일
                      </th>
                      <th
                        className="px-4 py-4 text-left"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                          color: "#686A6E",
                        }}
                      >
                        수정일
                      </th>
                      <th
                        className="px-4 py-4 text-left"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                          color: "#686A6E",
                        }}
                      >
                        작성자
                      </th>
                      <th
                        className="px-4 py-4 text-left"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                          color: "#686A6E",
                        }}
                      >
                        조회
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {noticesLoading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center">
                          <div className="text-sm text-gray-500">로딩 중...</div>
                        </td>
                      </tr>
                    ) : notices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center">
                          <div className="text-sm text-gray-500">등록된 공지사항이 없습니다</div>
                        </td>
                      </tr>
                    ) : (
                      notices.map((notice, index) => {
                        const author = allUsers.find(u => u.id === notice.authorId);
                        const createdDate = new Date(notice.createdAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        }).replace(/\. /g, '-').replace('.', '');
                        
                        const updatedDate = notice.updatedAt && new Date(notice.createdAt).getTime() !== new Date(notice.updatedAt).getTime()
                          ? new Date(notice.updatedAt).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            }).replace(/\. /g, '-').replace('.', '')
                          : '-';

                        return (
                          <tr
                            key={notice.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            style={{
                              borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                            }}
                            data-testid={`row-notice-${index}`}
                          >
                            <td
                              className="px-4 py-4"
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                fontWeight: 500,
                                color: "#0C0C0C",
                              }}
                            >
                              {notice.title}
                            </td>
                            <td
                              className="px-4 py-4"
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                fontWeight: 400,
                                color: "#686A6E",
                                maxWidth: "200px",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {notice.content.substring(0, 30)}...
                            </td>
                            <td
                              className="px-4 py-4"
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                fontWeight: 400,
                                color: "#0C0C0C",
                              }}
                            >
                              {createdDate}
                            </td>
                            <td
                              className="px-4 py-4"
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                fontWeight: 400,
                                color: "#686A6E",
                              }}
                            >
                              {updatedDate}
                            </td>
                            <td
                              className="px-4 py-4"
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                fontWeight: 400,
                                color: "#0C0C0C",
                              }}
                            >
                              {author?.name || "-"}
                            </td>
                            <td className="px-4 py-4">
                              <button
                                className="px-4 py-2"
                                style={{
                                  background: "rgba(0, 143, 237, 0.1)",
                                  borderRadius: "6px",
                                  fontFamily: "Pretendard",
                                  fontSize: "13px",
                                  fontWeight: 500,
                                  letterSpacing: "-0.01em",
                                  color: "#008FED",
                                }}
                                data-testid={`button-notice-view-${index}`}
                              >
                                보기
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : activeMenu === "DB 관리" ? (
            <>
              {/* Title */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <h1
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "26px",
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: "#0C0C0C",
                    }}
                  >
                    DB 관리
                  </h1>
                  <button
                    onClick={() => toggleFavoriteMutation.mutate("DB 관리")}
                    className="hover:opacity-70 transition-opacity cursor-pointer"
                    data-testid="button-toggle-db-favorite"
                  >
                    <Star 
                      className="w-5 h-5" 
                      style={{ 
                        color: isDbManagementFavorite ? '#FFD700' : 'rgba(12, 12, 12, 0.24)',
                        fill: isDbManagementFavorite ? '#FFD700' : 'none',
                      }} 
                    />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="버전 제목 입력 (예: 2025-01 기준)"
                    className="px-4 py-2"
                    style={{
                      border: "1px solid rgba(12, 12, 12, 0.1)",
                      borderRadius: "6px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 400,
                      color: "#0C0C0C",
                      width: "240px",
                    }}
                    data-testid="input-excel-title"
                  />
                  <button
                  onClick={() => {
                    // Validate title
                    if (!uploadTitle.trim()) {
                      toast({
                        title: "버전 제목 필요",
                        description: "버전 제목을 입력해주세요.",
                        variant: "destructive",
                      });
                      return;
                    }

                    const currentTab = dbTab;
                    const setData = currentTab === "노무비" ? setLaborExcelData : setMaterialExcelData;
                    const setHeaders = currentTab === "노무비" ? setLaborExcelHeaders : setMaterialExcelHeaders;
                    
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.xlsx, .xls';
                    input.onchange = async (e: any) => {
                      const file = e.target.files[0];
                      if (file) {
                        try {
                          let headers: string[] = [];
                          let rows: any[][] = [];
                          
                          // Try xlsx library first
                          const arrayBuffer = await file.arrayBuffer();
                          const data = new Uint8Array(arrayBuffer);
                          const workbook = XLSX.read(data, { type: 'array' });
                          const sheetName = workbook.SheetNames[0];
                          const worksheet = workbook.Sheets[sheetName];
                          
                          // Check if xlsx library successfully parsed the data
                          if (worksheet && Object.keys(worksheet).length > 0) {
                            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                            if (jsonData.length > 0) {
                              headers = jsonData[0] as string[];
                              rows = (jsonData.slice(1) as any[]).map(row => 
                                Array.isArray(row) ? row.map(cell => {
                                  if (typeof cell === 'string' && (cell.includes('\n') || cell.includes('\r'))) {
                                    return cell.split(/\r?\n|\r/)[0].trim();
                                  }
                                  return cell;
                                }) : row
                              );
                            }
                          }
                          
                          // Fallback parser for files with XML namespace prefixes
                          if (headers.length === 0 || rows.length === 0) {
                            console.log('Using fallback xlsx parser...');
                            const parsed = await parseXlsxFallback(file);
                            headers = parsed.headers;
                            rows = parsed.data;
                          }
                          
                          if (headers.length > 0) {
                            setHeaders(headers);
                            setData(rows);
                            
                            // Save to database
                            await saveExcelDataMutation.mutateAsync({
                              type: currentTab,
                              title: uploadTitle.trim(),
                              headers,
                              data: rows,
                            });
                            
                            toast({
                              title: "업로드 완료",
                              description: `${currentTab} 엑셀 파일이 성공적으로 업로드되어 저장되었습니다.`,
                            });
                            
                            // Clear title input
                            setUploadTitle("");
                          } else {
                            toast({
                              title: "파싱 실패",
                              description: "엑셀 파일에서 데이터를 읽을 수 없습니다.",
                              variant: "destructive",
                            });
                          }
                        } catch (error: any) {
                          console.error('Excel upload error:', error);
                          // Check for duplicate title error (409)
                          if (error?.status === 409 || error?.response?.status === 409) {
                            toast({
                              title: "중복된 제목",
                              description: "이미 같은 제목의 버전이 존재합니다. 다른 제목을 사용해주세요.",
                              variant: "destructive",
                            });
                          } else {
                            toast({
                              title: "저장 실패",
                              description: error?.message || "데이터베이스 저장 중 오류가 발생했습니다.",
                              variant: "destructive",
                            });
                          }
                        }
                      }
                    };
                    input.click();
                  }}
                  className="flex items-center gap-2 px-4 py-2"
                  style={{
                    background: "#008FED",
                    borderRadius: "6px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#FFFFFF",
                  }}
                  data-testid="button-upload-excel"
                  disabled={saveExcelDataMutation.isPending}
                >
                  <Upload size={16} />
                  {saveExcelDataMutation.isPending ? "업로드 중..." : `${dbTab} 엑셀 업로드`}
                </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-4 mb-6 border-b-2" style={{ borderColor: "rgba(12, 12, 12, 0.1)" }}>
                <button
                  onClick={() => setDbTab("노무비")}
                  className="pb-3"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: dbTab === "노무비" ? "#008FED" : "#686A6E",
                    borderBottom: dbTab === "노무비" ? "3px solid #008FED" : "none",
                    marginBottom: dbTab === "노무비" ? "-2px" : "0",
                  }}
                  data-testid="tab-labor-cost"
                >
                  노무비
                </button>
                <button
                  onClick={() => setDbTab("자재비")}
                  className="pb-3"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: dbTab === "자재비" ? "#008FED" : "#686A6E",
                    borderBottom: dbTab === "자재비" ? "3px solid #008FED" : "none",
                    marginBottom: dbTab === "자재비" ? "-2px" : "0",
                  }}
                  data-testid="tab-material-cost"
                >
                  자재비
                </button>
              </div>

              {/* Version Selector */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1">
                  <label
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#686A6E",
                      marginBottom: "8px",
                      display: "block",
                    }}
                  >
                    버전 선택
                  </label>
                  <Select
                    value={dbTab === "노무비" ? (selectedLaborVersionId || "") : (selectedMaterialVersionId || "")}
                    onValueChange={(value) => {
                      if (dbTab === "노무비") {
                        setSelectedLaborVersionId(value);
                      } else {
                        setSelectedMaterialVersionId(value);
                      }
                    }}
                  >
                    <SelectTrigger
                      className="w-full"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        borderRadius: "6px",
                      }}
                      data-testid="select-excel-version"
                    >
                      <SelectValue placeholder="버전을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const versions = dbTab === "노무비" ? laborVersions : materialVersions;
                        const isLoading = dbTab === "노무비" ? laborVersionsLoading : materialVersionsLoading;
                        
                        if (isLoading) {
                          return (
                            <SelectItem value="loading" disabled>
                              로딩 중...
                            </SelectItem>
                          );
                        }
                        
                        if (versions.length === 0) {
                          return (
                            <SelectItem value="empty" disabled>
                              등록된 버전이 없습니다
                            </SelectItem>
                          );
                        }
                        
                        return versions.map((version, index) => (
                          <SelectItem key={version.id} value={version.id} data-testid={`select-version-${version.id}`}>
                            {version.title} · {new Date(version.uploadedAt).toLocaleString('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {index === 0 && " (최신)"}
                          </SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => {
                    const currentData = dbTab === "노무비" ? laborExcelData : materialExcelData;
                    const currentHeaders = dbTab === "노무비" ? laborExcelHeaders : materialExcelHeaders;
                    
                    if (currentData.length === 0) {
                      toast({
                        title: "데이터 없음",
                        description: "다운로드할 데이터가 없습니다.",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    const worksheet = XLSX.utils.aoa_to_sheet([currentHeaders, ...currentData]);
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, dbTab);
                    XLSX.writeFile(workbook, `${dbTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
                    
                    toast({
                      title: "다운로드 완료",
                      description: `${dbTab} 엑셀 파일이 다운로드되었습니다.`,
                    });
                  }}
                  className="flex items-center gap-2 px-4 py-2"
                  style={{
                    background: "#4CAF50",
                    borderRadius: "6px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#FFFFFF",
                  }}
                  data-testid="button-download-excel"
                >
                  <Download size={16} />
                  엑셀 다운로드
                </button>
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="flex items-center gap-2 px-4 py-2"
                  style={{
                    background: "rgba(12, 12, 12, 0.08)",
                    borderRadius: "6px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#0C0C0C",
                  }}
                  data-testid="button-print"
                >
                  <Printer size={16} />
                  인쇄
                </button>
                <button
                  onClick={async () => {
                    const selectedVersionId = dbTab === "노무비" ? selectedLaborVersionId : selectedMaterialVersionId;
                    const versions = dbTab === "노무비" ? laborVersions : materialVersions;
                    const selectedVersion = versions.find(v => v.id === selectedVersionId);
                    
                    if (!selectedVersionId || !selectedVersion) {
                      toast({
                        title: "버전 선택 필요",
                        description: "삭제할 버전을 선택해주세요.",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    if (confirm(`정말로 "${selectedVersion.title}" 버전을 삭제하시겠습니까?`)) {
                      try {
                        await deleteVersionMutation.mutateAsync(selectedVersionId);
                        
                        toast({
                          title: "버전 삭제 완료",
                          description: `"${selectedVersion.title}" 버전이 삭제되었습니다.`,
                        });
                      } catch (error) {
                        toast({
                          title: "삭제 실패",
                          description: "데이터베이스 삭제 중 오류가 발생했습니다.",
                          variant: "destructive",
                        });
                      }
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2"
                  style={{
                    background: "#EF4444",
                    borderRadius: "6px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#FFFFFF",
                  }}
                  data-testid="button-delete-version"
                  disabled={deleteVersionMutation.isPending}
                >
                  <X size={16} />
                  {deleteVersionMutation.isPending ? "삭제 중..." : "선택 버전 삭제"}
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto" style={{ background: "#FFFFFF", borderRadius: "8px", padding: "16px" }}>
                <table className="w-full">
                  <thead
                    style={{
                      background: "rgba(248, 248, 248, 1)",
                    }}
                  >
                    <tr>
                      {(() => {
                        const currentHeaders = dbTab === "노무비" ? laborExcelHeaders : materialExcelHeaders;
                        return currentHeaders.length > 0 ? (
                          currentHeaders.map((header: string, idx: number) => (
                            <th
                              key={idx}
                              className="px-4 py-4 text-left"
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                fontWeight: 600,
                                letterSpacing: "-0.01em",
                                color: "#686A6E",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {header}
                            </th>
                          ))
                        ) : (
                          <>
                            <th className="px-4 py-4 text-left" style={{ fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "#686A6E" }}>공종</th>
                            <th className="px-4 py-4 text-left" style={{ fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "#686A6E" }}>공사명</th>
                            <th className="px-4 py-4 text-left" style={{ fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "#686A6E" }}>규격</th>
                            <th className="px-4 py-4 text-left" style={{ fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "#686A6E" }}>세부공사</th>
                            <th className="px-4 py-4 text-left" style={{ fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "#686A6E" }}>유형</th>
                            <th className="px-4 py-4 text-left" style={{ fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "#686A6E" }}>단위</th>
                            <th className="px-4 py-4 text-left" style={{ fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "#686A6E" }}>직종명</th>
                            <th className="px-4 py-4 text-left" style={{ fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "#686A6E" }}>할상임(분)</th>
                            <th className="px-4 py-4 text-left" style={{ fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "#686A6E" }}>기준노임(원)</th>
                            <th className="px-4 py-4 text-left" style={{ fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "#686A6E" }}>제품주수</th>
                            <th className="px-4 py-4 text-left" style={{ fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "#686A6E" }}>산정단가(원)</th>
                            <th className="px-4 py-4 text-left" style={{ fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "#686A6E" }}>지역</th>
                          </>
                        );
                      })()}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const currentData = dbTab === "노무비" ? laborExcelData : materialExcelData;
                      return currentData.length > 0 ? (
                        currentData.map((row: any, rowIdx: number) => (
                          <tr
                            key={rowIdx}
                            style={{
                              borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                            }}
                          >
                            {Array.isArray(row) && row.map((cell: any, cellIdx: number) => {
                              // 숫자인 경우 반올림해서 표시
                              let displayValue = cell;
                              if (typeof cell === 'number' && !Number.isInteger(cell)) {
                                displayValue = Math.round(cell);
                              }
                              return (
                                <td
                                  key={cellIdx}
                                  className="px-4 py-4"
                                  style={{
                                    fontFamily: "Pretendard",
                                    fontSize: "14px",
                                    fontWeight: 400,
                                    color: "#0C0C0C",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {displayValue}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={12}
                            className="px-4 py-8 text-center"
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "14px",
                              fontWeight: 400,
                              color: "#686A6E",
                            }}
                          >
                            {dbTab} 엑셀 파일을 업로드하면 데이터가 표시됩니다.
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </>
          ) : activeMenu === "기준정보 관리" ? (
            <>
              {/* Title */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <h1
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "26px",
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: "#0C0C0C",
                    }}
                  >
                    기준정보 관리
                  </h1>
                  <button
                    onClick={() => toggleFavoriteMutation.mutate("기준정보 관리")}
                    className="hover:opacity-70 transition-opacity cursor-pointer"
                    data-testid="button-toggle-masterdata-favorite"
                  >
                    <Star 
                      className="w-5 h-5" 
                      style={{ 
                        color: isMasterDataManagementFavorite ? '#FFD700' : 'rgba(12, 12, 12, 0.24)',
                        fill: isMasterDataManagementFavorite ? '#FFD700' : 'none',
                      }} 
                    />
                  </button>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex gap-6">
                {/* Left Sidebar - Category List */}
                <div
                  className="w-80 rounded-xl p-6"
                  style={{
                    background: "#FFFFFF",
                    boxShadow: "0px 0px 20px #DBE9F5",
                  }}
                >
                  <h3
                    className="mb-4"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "18px",
                      fontWeight: 600,
                      color: "#0C0C0C",
                    }}
                  >
                    기준정보 목록
                  </h3>

                  {/* 검색 영역 */}
                  <div className="mb-4">
                    <label
                      className="block mb-2"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#686A6E",
                      }}
                    >
                      항목 검색
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={masterDataSearchQuery}
                        onChange={(e) => setMasterDataSearchQuery(e.target.value)}
                        placeholder="검색어를 입력하세요"
                        className="flex-1 px-3 py-2 outline-none"
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                          borderRadius: "6px",
                          fontFamily: "Pretendard",
                          fontSize: "13px",
                        }}
                        data-testid="input-master-search"
                      />
                      <button
                        className="px-4 py-2"
                        style={{
                          background: "#008FED",
                          borderRadius: "6px",
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#FFFFFF",
                        }}
                        data-testid="button-master-search"
                      >
                        검색
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2" style={{ maxHeight: "400px", overflowY: "auto" }}>
                    {allCategories
                      .filter(category => 
                        masterDataSearchQuery === "" || 
                        category.toLowerCase().includes(masterDataSearchQuery.toLowerCase())
                      )
                      .map((category) => (
                      <div key={category}>
                        <button
                          onClick={() => {
                            setSelectedCategory(category);
                            setSelectedMasterDataIds(new Set());
                          }}
                          className="w-full text-left px-4 py-3 rounded-lg transition-colors"
                          style={{
                            background: selectedCategory === category ? "rgba(0, 143, 237, 0.05)" : "transparent",
                            fontFamily: "Pretendard",
                            fontSize: "15px",
                            fontWeight: selectedCategory === category ? 600 : 400,
                            color: selectedCategory === category ? "#008FED" : "#0C0C0C",
                            border: selectedCategory === category ? "1px solid rgba(0, 143, 237, 0.2)" : "1px solid transparent",
                          }}
                          data-testid={`category-${category}`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{category}</span>
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              fontWeight: 400,
                              color: "#686A6E",
                              marginTop: "4px",
                            }}
                          >
                            {category} 목록
                          </div>
                          <div className="mt-2">
                            <span
                              className="inline-block px-2 py-1 rounded"
                              style={{
                                background: "rgba(0, 143, 237, 0.1)",
                                fontSize: "11px",
                                fontWeight: 500,
                                color: "#008FED",
                              }}
                            >
                              {["사고 유형", "사고 원인", "복구 유형", "타업체 견적 여부", "피해품목", "피해유형"].includes(category) ? "현장입력" : "복구면적 산출표"}
                            </span>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Content - Selected Category Management */}
                <div
                  className="flex-1 rounded-xl p-6"
                  style={{
                    background: "#FFFFFF",
                    boxShadow: "0px 0px 20px #DBE9F5",
                  }}
                >
                  <h3
                    className="mb-6"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "20px",
                      fontWeight: 600,
                      color: "#0C0C0C",
                    }}
                  >
                    선택된 항목
                  </h3>

                  {/* Selected Category Info */}
                  <div className="flex items-center gap-3 mb-6">
                    <span style={{ color: "#008FED", fontSize: "16px" }}>●</span>
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "#0C0C0C",
                      }}
                    >
                      {selectedCategory}
                    </span>
                    <span
                      className="px-2 py-1 rounded"
                      style={{
                        background: "rgba(0, 143, 237, 0.1)",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#008FED",
                      }}
                    >
                      {["사고 유형", "사고 원인", "복구 유형", "타업체 견적 여부", "피해품목", "피해유형"].includes(selectedCategory) ? "현장입력" : "복구면적 산출표"}
                    </span>
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 400,
                        color: "#686A6E",
                      }}
                    >
                      {selectedCategory} 목록
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mb-6">
                    <button
                      onClick={() => {
                        if (isMasterDataCategory(selectedCategory)) {
                          const categoryKey = MASTER_DATA_CATEGORIES[selectedCategory];
                          const currentCount = getCategoryCount(selectedCategory);
                          createMasterDataMutation.mutate({
                            category: categoryKey,
                            value: "",
                            isActive: "true",
                            displayOrder: currentCount,
                          });
                        }
                      }}
                      className="px-4 py-2"
                      style={{
                        background: "#008FED",
                        borderRadius: "6px",
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#FFFFFF",
                      }}
                      data-testid="button-add-row"
                    >
                      행 추가
                    </button>
                    <button
                      onClick={deleteSelectedMasterData}
                      className="px-4 py-2"
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid rgba(12, 12, 12, 0.1)",
                        borderRadius: "6px",
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#686A6E",
                      }}
                      data-testid="button-delete-selected"
                    >
                      선택 행 삭제
                    </button>
                  </div>

                  {/* Items Table */}
                  <div>
                    <table className="w-full">
                      <thead
                        style={{
                          background: "rgba(248, 248, 248, 1)",
                        }}
                      >
                        <tr>
                          <th
                            className="px-4 py-3 text-left"
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "14px",
                              fontWeight: 600,
                              color: "#686A6E",
                              width: "60px",
                            }}
                          >
                            정렬
                          </th>
                          <th
                            className="px-4 py-3 text-center"
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "14px",
                              fontWeight: 600,
                              color: "#686A6E",
                              width: "50px",
                            }}
                          >
                            <input
                              type="checkbox"
                              className="w-4 h-4"
                              style={{ accentColor: "#008FED" }}
                              checked={(() => {
                                const items = getCategoryItems(selectedCategory);
                                if (items.length === 0) return false;
                                const isMaster = isMasterDataCategory(selectedCategory);
                                if (!isMaster) return false;
                                return (items as MasterData[]).every(item => selectedMasterDataIds.has(item.id));
                              })()}
                              onChange={(e) => {
                                const items = getCategoryItems(selectedCategory);
                                const isMaster = isMasterDataCategory(selectedCategory);
                                if (!isMaster) return;
                                if (e.target.checked) {
                                  const newIds = new Set((items as MasterData[]).map(item => item.id));
                                  setSelectedMasterDataIds(newIds);
                                } else {
                                  setSelectedMasterDataIds(new Set());
                                }
                              }}
                              data-testid="checkbox-select-all"
                            />
                          </th>
                          <th
                            className="px-4 py-3 text-left"
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "14px",
                              fontWeight: 600,
                              color: "#686A6E",
                            }}
                          >
                            내용
                          </th>
                          <th
                            className="px-4 py-3 text-left"
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "14px",
                              fontWeight: 600,
                              color: "#686A6E",
                              width: "200px",
                            }}
                          >
                            메모
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const items = getCategoryItems(selectedCategory);
                          const isMasterCategory = isMasterDataCategory(selectedCategory);
                          
                          if (items.length === 0) {
                            return (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-4 py-8 text-center"
                                  style={{
                                    fontFamily: "Pretendard",
                                    fontSize: "14px",
                                    fontWeight: 400,
                                    color: "#686A6E",
                                  }}
                                >
                                  등록된 항목이 없습니다. 행 추가 버튼을 클릭해주세요.
                                </td>
                              </tr>
                            );
                          }
                          
                          return items.map((item, idx) => {
                            const itemValue = isMasterCategory ? (item as MasterData).value : (item as string);
                            const itemNote = isMasterCategory ? (item as MasterData).note || "" : "";
                            const itemId = isMasterCategory ? (item as MasterData).id : `mem-${idx}`;
                            const isEditing = editingMasterData[itemId];
                            
                            return (
                              <tr
                                key={itemId}
                                style={{
                                  borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                                }}
                              >
                                <td
                                  className="px-4 py-3"
                                  style={{
                                    fontFamily: "Pretendard",
                                    fontSize: "16px",
                                    color: "#686A6E",
                                    cursor: "grab",
                                  }}
                                >
                                  ≡
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4"
                                    style={{ accentColor: "#008FED" }}
                                    checked={selectedMasterDataIds.has(itemId)}
                                    onChange={(e) => {
                                      const newIds = new Set(selectedMasterDataIds);
                                      if (e.target.checked) {
                                        newIds.add(itemId);
                                      } else {
                                        newIds.delete(itemId);
                                      }
                                      setSelectedMasterDataIds(newIds);
                                    }}
                                    data-testid={`checkbox-item-${idx}`}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={isEditing.value}
                                      onChange={(e) => {
                                        setEditingMasterData(prev => ({
                                          ...prev,
                                          [itemId]: { ...prev[itemId], value: e.target.value }
                                        }));
                                      }}
                                      onBlur={() => {
                                        if (isMasterCategory && isEditing.value !== itemValue) {
                                          updateMasterDataMutation.mutate({
                                            id: itemId,
                                            value: isEditing.value,
                                            note: isEditing.note,
                                          });
                                        }
                                        setEditingMasterData(prev => {
                                          const newData = { ...prev };
                                          delete newData[itemId];
                                          return newData;
                                        });
                                      }}
                                      className="w-full px-3 py-2 outline-none"
                                      style={{
                                        background: "#FFFFFF",
                                        border: "1px solid #008FED",
                                        borderRadius: "4px",
                                        fontFamily: "Pretendard",
                                        fontSize: "14px",
                                      }}
                                      autoFocus
                                      data-testid={`input-value-${idx}`}
                                    />
                                  ) : (
                                    <div
                                      onClick={() => {
                                        setEditingMasterData(prev => ({
                                          ...prev,
                                          [itemId]: { value: itemValue, note: itemNote }
                                        }));
                                      }}
                                      className="px-3 py-2 cursor-text"
                                      style={{
                                        fontFamily: "Pretendard",
                                        fontSize: "14px",
                                        fontWeight: 400,
                                        color: itemValue ? "#0C0C0C" : "#ABABAB",
                                        background: "rgba(248, 248, 248, 0.5)",
                                        borderRadius: "4px",
                                      }}
                                      data-testid={`text-value-${idx}`}
                                    >
                                      {itemValue || "내용을 입력하세요"}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    style={{
                                      fontFamily: "Pretendard",
                                      fontSize: "14px",
                                      fontWeight: 400,
                                      color: itemNote ? "#0C0C0C" : "#ABABAB",
                                    }}
                                  >
                                    {itemNote || "-"}
                                  </span>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : activeMenu === "사용자 계정 관리" ? (
            <>
              {/* Title */}
              <div className="flex items-center mb-6">
                <h1
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "26px",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "#0C0C0C",
                  }}
                >
                  사용자 계정 관리
                </h1>
              </div>

          {/* Search Card */}
          <div
            className="mb-6 rounded-xl"
            style={{
              background: "#FFFFFF",
              boxShadow: "0px 0px 20px #DBE9F5",
            }}
          >
            {/* Card Header */}
            <div
              className="px-6 py-6"
              style={{
                borderBottom: "2px solid rgba(12, 12, 12, 0.1)",
              }}
            >
              <span
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "20px",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "#0C0C0C",
                }}
              >
                조회하기
              </span>
            </div>

            {/* Search Section */}
            <div className="px-5 py-6 flex flex-col gap-6">
              {/* Search Input */}
              <div>
                <label
                  className="mb-2 block"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                    color: "#686A6E",
                  }}
                >
                  검색
                </label>
                <div className="flex items-center">
                  <div
                    className="flex items-center flex-1 px-5 py-4 gap-3"
                    style={{
                      background: "#FDFDFD",
                      border: "2px solid rgba(12, 12, 12, 0.08)",
                      borderRadius: "8px 0px 0px 8px",
                    }}
                  >
                    <Search className="w-[30px] h-[30px] text-[#008FED]" />
                    <input
                      type="text"
                      placeholder="성함을 입력해주세요."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      className="flex-1 outline-none bg-transparent"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 600,
                        letterSpacing: "-0.02em",
                        color: searchInput
                          ? "rgba(12, 12, 12, 0.9)"
                          : "rgba(12, 12, 12, 0.4)",
                      }}
                      data-testid="input-search"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    className="px-5 py-4"
                    style={{
                      width: "155px",
                      height: "68px",
                      background: "#008FED",
                      border: "2px solid rgba(12, 12, 12, 0.08)",
                      borderRadius: "0px 8px 8px 0px",
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: "#FDFDFD",
                    }}
                    data-testid="button-search"
                  >
                    검색
                  </button>
                </div>
              </div>

              {/* Role Filter */}
              <div>
                <label
                  className="mb-2 block"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                    color: "#686A6E",
                  }}
                >
                  역할
                </label>
                <div className="flex items-center gap-2">
                  {roleFilters.map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setRoleFilter(filter)}
                      className="px-4 py-3 rounded-md"
                      style={{
                        background:
                          roleFilter === filter
                            ? "rgba(0, 143, 237, 0.1)"
                            : "transparent",
                        border:
                          roleFilter === filter
                            ? "2px solid rgba(255, 255, 255, 0.04)"
                            : "1px solid rgba(12, 12, 12, 0.3)",
                        boxShadow:
                          roleFilter === filter
                            ? "inset 0px -2px 4px rgba(0, 0, 0, 0.05), inset 0px 2px 4px rgba(0, 0, 0, 0.05)"
                            : "none",
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: roleFilter === filter ? 600 : 400,
                        letterSpacing: "-0.02em",
                        color:
                          roleFilter === filter
                            ? "#008FED"
                            : "rgba(12, 12, 12, 0.9)",
                      }}
                      data-testid={`filter-${filter}`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* User List Section */}
          <div>
            {/* Header with Count */}
            <div className="flex items-center justify-between px-5 py-6">
              <div className="flex items-center gap-4">
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "20px",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "#0C0C0C",
                  }}
                >
                  계정
                </span>
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "20px",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "#008FED",
                  }}
                  data-testid="text-user-count"
                >
                  {filteredUsers.length}
                </span>
              </div>
              <button
                className="flex items-center justify-center px-6 hover-elevate active-elevate-2"
                style={{
                  height: "48px",
                  background: "#008FED",
                  borderRadius: "6px",
                }}
                onClick={() => setShowCreateAccountModal(true)}
                data-testid="button-create-account"
              >
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "#FDFDFD",
                  }}
                >
                  계정 생성
                </span>
              </button>
            </div>

            {/* User Table */}
            <div className="flex flex-col gap-4">
              {/* Table Header */}
              <div
                className="flex items-center px-3 rounded-lg"
                style={{
                  height: "54px",
                  background: "rgba(12, 12, 12, 0.04)",
                }}
              >
                <div className="px-2" style={{ width: "122px" }}>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "15px",
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    역할
                  </span>
                </div>
                <div className="px-2" style={{ width: "155px" }}>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "15px",
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    회사명
                  </span>
                </div>
                <div className="px-2 flex-1">
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "15px",
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    성함
                  </span>
                </div>
                <div className="px-2" style={{ width: "134px" }}>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "15px",
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    소속부서
                  </span>
                </div>
                <div className="px-2 flex-1">
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "15px",
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    직급
                  </span>
                </div>
                <div className="px-2" style={{ width: "190px" }}>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "15px",
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    이메일 주소
                  </span>
                </div>
                <div className="px-2" style={{ width: "162px" }}>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "15px",
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    ID
                  </span>
                </div>
                <div className="px-2" style={{ width: "163px" }}>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "15px",
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    연락처
                  </span>
                </div>
                <div className="px-2" style={{ width: "163px" }}>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "15px",
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    사무실 전화
                  </span>
                </div>
                <div className="px-2" style={{ width: "163px" }}>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "15px",
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    계정 생성일
                  </span>
                </div>
                <div className="px-2 flex-1">
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "15px",
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    요청
                  </span>
                </div>
              </div>

              {/* Table Rows */}
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center px-3 hover:bg-black/5 transition-colors"
                  style={{
                    height: "44px",
                  }}
                  data-testid={`user-row-${user.id}`}
                >
                  <div
                    className="px-2 cursor-pointer"
                    style={{ width: "122px" }}
                    onClick={() => setSelectedUser(user)}
                  >
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.8)",
                      }}
                    >
                      {user.role}
                    </span>
                  </div>
                  <div
                    className="px-2 cursor-pointer"
                    style={{ width: "155px" }}
                    onClick={() => setSelectedUser(user)}
                  >
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.8)",
                      }}
                    >
                      {user.company}
                    </span>
                  </div>
                  <div
                    className="px-2 flex-1 cursor-pointer"
                    onClick={() => setSelectedUser(user)}
                  >
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.8)",
                      }}
                    >
                      {user.name}
                    </span>
                  </div>
                  <div
                    className="px-2 cursor-pointer"
                    style={{ width: "134px" }}
                    onClick={() => setSelectedUser(user)}
                  >
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.8)",
                      }}
                    >
                      {user.department}
                    </span>
                  </div>
                  <div
                    className="px-2 flex-1 cursor-pointer"
                    onClick={() => setSelectedUser(user)}
                  >
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.8)",
                      }}
                    >
                      {user.position}
                    </span>
                  </div>
                  <div
                    className="px-2 cursor-pointer"
                    style={{ width: "190px" }}
                    onClick={() => setSelectedUser(user)}
                  >
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.8)",
                      }}
                    >
                      {user.email}
                    </span>
                  </div>
                  <div
                    className="px-2 cursor-pointer"
                    style={{ width: "162px" }}
                    onClick={() => setSelectedUser(user)}
                  >
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.8)",
                      }}
                    >
                      {user.username}
                    </span>
                  </div>
                  <div
                    className="px-2 cursor-pointer"
                    style={{ width: "163px" }}
                    onClick={() => setSelectedUser(user)}
                  >
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.8)",
                      }}
                    >
                      {user.phone}
                    </span>
                  </div>
                  <div
                    className="px-2 cursor-pointer"
                    style={{ width: "163px" }}
                    onClick={() => setSelectedUser(user)}
                  >
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.8)",
                      }}
                    >
                      {user.office}
                    </span>
                  </div>
                  <div
                    className="px-2 cursor-pointer"
                    style={{ width: "163px" }}
                    onClick={() => setSelectedUser(user)}
                  >
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.8)",
                      }}
                    >
                      {user.createdAt}
                    </span>
                  </div>
                  <div className="px-2 flex-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUser(user);
                      }}
                      className="flex items-center justify-center"
                      style={{
                        width: "92px",
                        height: "28px",
                        background: "#FFFFFF",
                        border: "1px solid rgba(12, 12, 12, 0.2)",
                        borderRadius: "6px",
                      }}
                      data-testid={`button-view-detail-${user.id}`}
                    >
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 500,
                          letterSpacing: "-0.01em",
                          color: "rgba(12, 12, 12, 0.8)",
                        }}
                      >
                        자세히 보기
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </>
          ) : activeMenu === "변경 로그 관리" ? (
            <>
              {/* Title */}
              <div className="flex items-center justify-between mb-6">
                <h1
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "26px",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "#0C0C0C",
                  }}
                >
                  변경 로그 관리
                </h1>
              </div>

              {/* Filters */}
              <div
                className="rounded-xl p-6 mb-6"
                style={{
                  background: "#FFFFFF",
                  boxShadow: "0px 0px 20px #DBE9F5",
                }}
              >
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label
                      className="block mb-2"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#686A6E",
                      }}
                    >
                      사고 번호 검색
                    </label>
                    <input
                      type="text"
                      value={changeLogCaseNumberFilter}
                      onChange={(e) => setChangeLogCaseNumberFilter(e.target.value)}
                      placeholder="사고번호를 입력해주세요"
                      className="w-full px-3 py-2 outline-none"
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid rgba(12, 12, 12, 0.08)",
                        borderRadius: "6px",
                        fontFamily: "Pretendard",
                        fontSize: "13px",
                      }}
                      data-testid="input-changelog-case-number"
                    />
                  </div>
                  <div>
                    <label
                      className="block mb-2"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#686A6E",
                      }}
                    >
                      시작일
                    </label>
                    <input
                      type="date"
                      value={changeLogDateFrom}
                      onChange={(e) => setChangeLogDateFrom(e.target.value)}
                      className="px-3 py-2 outline-none"
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid rgba(12, 12, 12, 0.08)",
                        borderRadius: "6px",
                        fontFamily: "Pretendard",
                        fontSize: "13px",
                      }}
                      data-testid="input-changelog-date-from"
                    />
                  </div>
                  <div>
                    <label
                      className="block mb-2"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#686A6E",
                      }}
                    >
                      종료일
                    </label>
                    <input
                      type="date"
                      value={changeLogDateTo}
                      onChange={(e) => setChangeLogDateTo(e.target.value)}
                      className="px-3 py-2 outline-none"
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid rgba(12, 12, 12, 0.08)",
                        borderRadius: "6px",
                        fontFamily: "Pretendard",
                        fontSize: "13px",
                      }}
                      data-testid="input-changelog-date-to"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setChangeLogCaseNumberFilter("");
                      setChangeLogDateFrom("");
                      setChangeLogDateTo("");
                    }}
                    className="px-4 py-2"
                    style={{
                      background: "rgba(12, 12, 12, 0.08)",
                      borderRadius: "6px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.8)",
                    }}
                    data-testid="button-changelog-reset"
                  >
                    초기화
                  </button>
                </div>
              </div>

              {/* Change Logs Table */}
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  background: "#FFFFFF",
                  boxShadow: "0px 0px 20px #DBE9F5",
                }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: "rgba(12, 12, 12, 0.04)" }}>
                        <th
                          className="px-4 py-3 text-left"
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#0C0C0C",
                          }}
                        >
                          사고번호
                        </th>
                        <th
                          className="px-4 py-3 text-left"
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#0C0C0C",
                          }}
                        >
                          변경자
                        </th>
                        <th
                          className="px-4 py-3 text-left"
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#0C0C0C",
                          }}
                        >
                          변경일시
                        </th>
                        <th
                          className="px-4 py-3 text-left"
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#0C0C0C",
                          }}
                        >
                          변경 항목
                        </th>
                        <th
                          className="px-4 py-3 text-left"
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#0C0C0C",
                          }}
                        >
                          변경 내용
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {changeLogsLoading ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center"
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "14px",
                              fontWeight: 400,
                              color: "#686A6E",
                            }}
                          >
                            로딩 중...
                          </td>
                        </tr>
                      ) : changeLogs.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center"
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "14px",
                              fontWeight: 400,
                              color: "#686A6E",
                            }}
                          >
                            변경 로그가 없습니다.
                          </td>
                        </tr>
                      ) : (
                        changeLogs.map((log) => (
                          <tr
                            key={log.id}
                            className="border-b hover:bg-gray-50 transition-colors"
                            style={{ borderColor: "rgba(12, 12, 12, 0.08)" }}
                            data-testid={`row-changelog-${log.id}`}
                          >
                            <td
                              className="px-4 py-3"
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                fontWeight: 500,
                                color: "#008FED",
                              }}
                            >
                              {log.caseNumber || "-"}
                            </td>
                            <td
                              className="px-4 py-3"
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                fontWeight: 400,
                                color: "rgba(12, 12, 12, 0.8)",
                              }}
                            >
                              {log.changedByName || "-"}
                            </td>
                            <td
                              className="px-4 py-3"
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                fontWeight: 400,
                                color: "rgba(12, 12, 12, 0.8)",
                              }}
                            >
                              {log.changedAt
                                ? new Date(log.changedAt).toLocaleString("ko-KR", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "-"}
                            </td>
                            <td
                              className="px-4 py-3"
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                fontWeight: 400,
                                color: "rgba(12, 12, 12, 0.8)",
                              }}
                            >
                              {log.changes && log.changes.length > 0
                                ? log.changes.map((c) => c.fieldLabel).join(", ")
                                : "-"}
                            </td>
                            <td
                              className="px-4 py-3"
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "13px",
                                fontWeight: 400,
                                color: "rgba(12, 12, 12, 0.7)",
                              }}
                            >
                              {log.changes && log.changes.length > 0 ? (
                                <div className="space-y-1">
                                  {log.changes.map((change, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <span className="font-medium">{change.fieldLabel}:</span>
                                      <span className="text-red-500 line-through">
                                        {change.before || "(없음)"}
                                      </span>
                                      <span>→</span>
                                      <span className="text-green-600">
                                        {change.after || "(없음)"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {activeMenu === "사용자 계정 관리" && (
        <>
      {/* Account Detail Modal */}
      {selectedUser && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            style={{
              background: "rgba(0, 0, 0, 0.7)",
              opacity: 0.4,
            }}
            onClick={() => setSelectedUser(null)}
            data-testid="modal-overlay"
          />

          {/* Modal Panel */}
          <div
            className="fixed right-0 top-0 z-50 bg-white flex flex-col"
            style={{
              width: "609px",
              height: "100vh",
            }}
            data-testid="modal-account-detail"
          >
            {/* Header */}
            <div
              className="flex items-center justify-center relative"
              style={{
                height: "128px",
                padding: "24px 20px",
              }}
            >
              <h2
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "22px",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "#0C0C0C",
                }}
              >
                계정 상세보기
              </h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="absolute right-5"
                style={{
                  width: "24px",
                  height: "24px",
                }}
                data-testid="button-close-modal"
              >
                <X className="w-6 h-6" color="#1C1B1F" />
              </button>
            </div>

            {/* Profile Card */}
            <div
              className="mx-5 flex flex-col gap-2.5 p-4"
              style={{
                background: "rgba(12, 12, 12, 0.04)",
                backdropFilter: "blur(7px)",
                borderRadius: "12px",
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "18px",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "rgba(12, 12, 12, 0.9)",
                  }}
                >
                  {selectedUser.name}
                </span>
                <div
                  className="w-1 h-1 rounded-full"
                  style={{ background: "rgba(0, 143, 237, 0.9)" }}
                />
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "18px",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "rgba(12, 12, 12, 0.9)",
                  }}
                >
                  {selectedUser.company}
                </span>
                <div
                  className="flex items-center justify-center px-2.5 py-1 rounded-full"
                  style={{
                    background: "rgba(12, 12, 12, 0.1)",
                    backdropFilter: "blur(7px)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 400,
                      letterSpacing: "-0.01em",
                      color: "rgba(12, 12, 12, 0.7)",
                    }}
                  >
                    {selectedUser.role}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 400,
                    letterSpacing: "-0.02em",
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  {selectedUser.username}
                </span>
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 400,
                    letterSpacing: "-0.02em",
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  {selectedUser.phone}
                </span>
              </div>
            </div>

            {/* Content Sections - Scrollable */}
            <div className="flex flex-col px-5 mt-8 flex-1 overflow-y-auto">
              {/* Basic Info Section */}
              <div
                className="flex flex-col pb-7"
                style={{ borderBottom: "1px solid rgba(12, 12, 12, 0.1)" }}
              >
                <div className="px-4 py-2.5">
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "15px",
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: "rgba(12, 12, 12, 0.9)",
                    }}
                  >
                    {selectedUser.role === "보험사"
                      ? "기본 정보"
                      : "사용자 정보"}
                  </span>
                </div>
                <div className="flex flex-col gap-4">
                  {/* Row 1 */}
                  <div className="flex gap-5">
                    <div className="flex-1 flex flex-col gap-2">
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 400,
                          letterSpacing: "-0.01em",
                          color: "rgba(12, 12, 12, 0.5)",
                        }}
                      >
                        성함
                      </span>
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          fontWeight: 400,
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.9)",
                        }}
                      >
                        {selectedUser.name}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 400,
                          letterSpacing: "-0.01em",
                          color: "rgba(12, 12, 12, 0.5)",
                        }}
                      >
                        ID
                      </span>
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          fontWeight: 400,
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.9)",
                        }}
                      >
                        {selectedUser.username}
                      </span>
                    </div>
                  </div>
                  {/* Row 2 */}
                  <div className="flex gap-5">
                    <div className="flex-1 flex flex-col gap-2">
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 400,
                          letterSpacing: "-0.01em",
                          color: "rgba(12, 12, 12, 0.5)",
                        }}
                      >
                        연락처
                      </span>
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          fontWeight: 400,
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.9)",
                        }}
                      >
                        {selectedUser.phone}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 400,
                          letterSpacing: "-0.01em",
                          color: "rgba(12, 12, 12, 0.5)",
                        }}
                      >
                        이메일 주소
                      </span>
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          fontWeight: 400,
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.9)",
                        }}
                      >
                        {selectedUser.email}
                      </span>
                    </div>
                  </div>
                  {/* Row 3 */}
                  <div className="flex gap-5">
                    <div className="flex-1 flex flex-col gap-2">
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 400,
                          letterSpacing: "-0.01em",
                          color: "rgba(12, 12, 12, 0.5)",
                        }}
                      >
                        계정 생성일
                      </span>
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          fontWeight: 400,
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.9)",
                        }}
                      >
                        {selectedUser.createdAt}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 400,
                          letterSpacing: "-0.01em",
                          color: "rgba(12, 12, 12, 0.5)",
                        }}
                      >
                        역할
                      </span>
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          fontWeight: 400,
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.9)",
                        }}
                      >
                        {selectedUser.role}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Company Info Section */}
              <div className="flex flex-col py-7">
                <div className="px-4 py-2.5">
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "15px",
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: "rgba(12, 12, 12, 0.9)",
                    }}
                  >
                    {selectedUser.role === "보험사"
                      ? "보험사 정보"
                      : selectedUser.role === "관리자"
                        ? "관리자 정보"
                        : selectedUser.role === "심사사"
                          ? "심사사 정보"
                          : selectedUser.role === "조사사"
                            ? "조사사 정보"
                            : selectedUser.role === "협력사"
                              ? "협력사 정보"
                              : "회사 정보"}
                  </span>
                </div>
                <div className="flex flex-col gap-4">
                  {/* Row 1 */}
                  <div className="flex gap-5">
                    <div className="flex-1 flex flex-col gap-2">
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 400,
                          letterSpacing: "-0.01em",
                          color: "rgba(12, 12, 12, 0.5)",
                        }}
                      >
                        회사명
                      </span>
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          fontWeight: 400,
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.9)",
                        }}
                      >
                        {selectedUser.company}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 400,
                          letterSpacing: "-0.01em",
                          color: "rgba(12, 12, 12, 0.5)",
                        }}
                      >
                        소속부서
                      </span>
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          fontWeight: 400,
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.9)",
                        }}
                      >
                        {selectedUser.department}
                      </span>
                    </div>
                  </div>
                  {/* Row 2 */}
                  <div className="flex gap-5">
                    <div className="flex-1 flex flex-col gap-2">
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 400,
                          letterSpacing: "-0.01em",
                          color: "rgba(12, 12, 12, 0.5)",
                        }}
                      >
                        직급
                      </span>
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          fontWeight: 400,
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.9)",
                        }}
                      >
                        {selectedUser.position}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 400,
                          letterSpacing: "-0.01em",
                          color: "rgba(12, 12, 12, 0.5)",
                        }}
                      >
                        사무실 전화
                      </span>
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          fontWeight: 400,
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.9)",
                        }}
                      >
                        {selectedUser.office}
                      </span>
                    </div>
                  </div>
                  {/* Row 3 */}
                  <div className="flex gap-5">
                    <div className="flex-1 flex flex-col gap-2">
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 400,
                          letterSpacing: "-0.01em",
                          color: "rgba(12, 12, 12, 0.5)",
                        }}
                      >
                        주소
                      </span>
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          fontWeight: 400,
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.9)",
                        }}
                      >
                        {selectedUser.address}
                      </span>
                    </div>
                  </div>

                  {/* Partner-specific fields */}
                  {selectedUser.role === "협력사" && (
                    <>
                      {/* Row 4: Bank Info */}
                      <div className="flex gap-5">
                        <div className="flex-1 flex flex-col gap-2">
                          <span
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "14px",
                              fontWeight: 400,
                              letterSpacing: "-0.01em",
                              color: "rgba(12, 12, 12, 0.5)",
                            }}
                          >
                            은행명
                          </span>
                          <span
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "16px",
                              fontWeight: 400,
                              letterSpacing: "-0.02em",
                              color: "rgba(12, 12, 12, 0.9)",
                            }}
                          >
                            {selectedUser.bankName || "-"}
                          </span>
                        </div>
                        <div className="flex-1 flex flex-col gap-2">
                          <span
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "14px",
                              fontWeight: 400,
                              letterSpacing: "-0.01em",
                              color: "rgba(12, 12, 12, 0.5)",
                            }}
                          >
                            계좌번호
                          </span>
                          <span
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "16px",
                              fontWeight: 400,
                              letterSpacing: "-0.02em",
                              color: "rgba(12, 12, 12, 0.9)",
                            }}
                          >
                            {selectedUser.accountNumber || "-"}
                          </span>
                        </div>
                      </div>

                      {/* Row 5: Account Holder */}
                      <div className="flex gap-5">
                        <div className="flex-1 flex flex-col gap-2">
                          <span
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "14px",
                              fontWeight: 400,
                              letterSpacing: "-0.01em",
                              color: "rgba(12, 12, 12, 0.5)",
                            }}
                          >
                            예금주
                          </span>
                          <span
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "16px",
                              fontWeight: 400,
                              letterSpacing: "-0.02em",
                              color: "rgba(12, 12, 12, 0.9)",
                            }}
                          >
                            {selectedUser.accountHolder || "-"}
                          </span>
                        </div>
                      </div>

                      {/* Row 6: Service Regions */}
                      {selectedUser.serviceRegions &&
                        selectedUser.serviceRegions.length > 0 && (
                          <div className="flex gap-5">
                            <div className="flex-1 flex flex-col gap-2">
                              <span
                                style={{
                                  fontFamily: "Pretendard",
                                  fontSize: "14px",
                                  fontWeight: 400,
                                  letterSpacing: "-0.01em",
                                  color: "rgba(12, 12, 12, 0.5)",
                                }}
                              >
                                출동가능지역
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {selectedUser.serviceRegions.map(
                                  (region, index) => (
                                    <div
                                      key={index}
                                      className="px-3 py-1.5"
                                      style={{
                                        background: "#E3F2FD",
                                        borderRadius: "6px",
                                      }}
                                      data-testid={`detail-region-${index}`}
                                    >
                                      <span
                                        style={{
                                          fontFamily: "Pretendard",
                                          fontSize: "13px",
                                          fontWeight: 400,
                                          color: "#008FED",
                                        }}
                                      >
                                        {region}
                                      </span>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                      {/* Row 7: Attachments */}
                      {selectedUser.attachments &&
                        selectedUser.attachments.length > 0 && (
                          <div className="flex gap-5">
                            <div className="flex-1 flex flex-col gap-2">
                              <span
                                style={{
                                  fontFamily: "Pretendard",
                                  fontSize: "14px",
                                  fontWeight: 400,
                                  letterSpacing: "-0.01em",
                                  color: "rgba(12, 12, 12, 0.5)",
                                }}
                              >
                                첨부파일
                              </span>
                              <div className="flex flex-col gap-1">
                                {selectedUser.attachments.map((file, index) => (
                                  <span
                                    key={index}
                                    style={{
                                      fontFamily: "Pretendard",
                                      fontSize: "14px",
                                      fontWeight: 400,
                                      color: "#008FED",
                                    }}
                                    data-testid={`detail-attachment-${index}`}
                                  >
                                    {file}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Buttons - Fixed at bottom */}
            <div
              className="flex gap-5 px-8 bg-white"
              style={{
                height: "84px",
                alignItems: "center",
                borderTop: "1px solid rgba(12, 12, 12, 0.08)",
                flexShrink: 0,
              }}
            >
              <button
                className="flex-1 flex items-center justify-center rounded-xl"
                style={{
                  height: "64px",
                  background: "#D02B20",
                  boxShadow: "2px 4px 30px #BDD1F0",
                }}
                onClick={() => {
                  setShowDeleteAccountModal(true);
                }}
                data-testid="button-delete-account"
              >
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "20px",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "#FDFDFD",
                  }}
                >
                  계정 삭제
                </span>
              </button>
              <button
                className="flex-1 flex items-center justify-center rounded-xl"
                style={{
                  height: "64px",
                  background: "transparent",
                  boxShadow: "2px 4px 30px #BDD1F0",
                }}
                onClick={() => {
                  setShowResetPasswordModal(true);
                }}
                data-testid="button-reset-password"
              >
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "20px",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "#D02B20",
                  }}
                >
                  비밀번호 초기화
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Password Reset Modal */}
      {showResetPasswordModal && selectedUser && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-50"
            style={{
              background: "rgba(0, 0, 0, 0.7)",
              opacity: 0.4,
            }}
            onClick={() => setShowResetPasswordModal(false)}
            data-testid="modal-overlay-reset"
          />

          {/* Modal */}
          <div
            className="fixed z-50 bg-white flex flex-col"
            style={{
              width: "747px",
              height: "516px",
              left: "calc(50% - 747px/2 + 0.5px)",
              top: "calc(50% - 516px/2 + 0.5px)",
              boxShadow: "0px -2px 70px rgba(179, 193, 205, 0.8)",
              borderRadius: "12px",
              gap: "32px",
            }}
            data-testid="modal-reset-password"
          >
            {/* Header */}
            <div
              className="flex flex-col items-center"
              style={{
                width: "747px",
                height: "396px",
                gap: "16px",
              }}
            >
              <div
                className="flex flex-row justify-center items-center"
                style={{
                  width: "747px",
                  height: "60px",
                  gap: "321px",
                }}
              >
                <h2
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "18px",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "#0C0C0C",
                  }}
                >
                  비밀번호 초기화
                </h2>
              </div>

              {/* Content */}
              <div
                className="flex flex-col"
                style={{
                  width: "707px",
                  height: "320px",
                  gap: "24px",
                }}
              >
                {/* Selected Account Section */}
                <div
                  className="flex flex-col"
                  style={{
                    width: "707px",
                    height: "244px",
                    gap: "20px",
                  }}
                >
                  {/* Section Title */}
                  <div
                    className="flex flex-col"
                    style={{ width: "707px", height: "114px", gap: "8px" }}
                  >
                    <div
                      className="flex flex-row"
                      style={{ width: "707px", height: "18px", gap: "2px" }}
                    >
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 500,
                          letterSpacing: "-0.01em",
                          color: "#686A6E",
                        }}
                      >
                        선택 계정
                      </span>
                    </div>

                    {/* Profile Card */}
                    <div
                      className="flex flex-col justify-center p-5"
                      style={{
                        width: "707px",
                        height: "88px",
                        background: "rgba(12, 12, 12, 0.04)",
                        backdropFilter: "blur(7px)",
                        borderRadius: "12px",
                        gap: "8px",
                      }}
                    >
                      <div
                        className="flex flex-row items-center"
                        style={{ width: "667px", height: "26px", gap: "16px" }}
                      >
                        <div
                          className="flex flex-row items-center"
                          style={{ width: "180px", height: "26px", gap: "9px" }}
                        >
                          <span
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "18px",
                              fontWeight: 600,
                              letterSpacing: "-0.02em",
                              color: "rgba(12, 12, 12, 0.9)",
                            }}
                          >
                            {selectedUser.name}
                          </span>
                          <div
                            style={{
                              width: "4px",
                              height: "4px",
                              background: "rgba(0, 143, 237, 0.9)",
                              borderRadius: "50%",
                            }}
                          />
                          <span
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "18px",
                              fontWeight: 600,
                              letterSpacing: "-0.02em",
                              color: "rgba(12, 12, 12, 0.9)",
                            }}
                          >
                            {selectedUser.company}
                          </span>
                          <div
                            className="flex items-center justify-center"
                            style={{
                              width: "57px",
                              height: "26px",
                              padding: "4px 10px",
                              background: "rgba(12, 12, 12, 0.1)",
                              backdropFilter: "blur(7px)",
                              borderRadius: "20px",
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                fontWeight: 400,
                                letterSpacing: "-0.01em",
                                color: "rgba(12, 12, 12, 0.7)",
                              }}
                            >
                              {selectedUser.role}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div
                        className="flex flex-row"
                        style={{ width: "400px", height: "20px", gap: "24px" }}
                      >
                        <span
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            fontWeight: 400,
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.7)",
                          }}
                        >
                          {selectedUser.username}
                        </span>
                        <span
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            fontWeight: 400,
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.7)",
                          }}
                        >
                          {selectedUser.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* New Password Section */}
                  <div
                    className="flex flex-col"
                    style={{
                      width: "707px",
                      height: "110px",
                      gap: "10px",
                    }}
                  >
                    <div
                      className="flex flex-col"
                      style={{ width: "432px", height: "76px", gap: "8px" }}
                    >
                      <div
                        className="flex flex-row"
                        style={{ width: "432px", height: "18px", gap: "2px" }}
                      >
                        <span
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 500,
                            letterSpacing: "-0.01em",
                            color: "#686A6E",
                          }}
                        >
                          새 비밀번호(자동)
                        </span>
                      </div>

                      {/* Input Field + Reset Button */}
                      <div
                        className="flex flex-row items-center"
                        style={{ width: "432px", height: "50px", gap: "8px" }}
                      >
                        <div
                          className="flex flex-row items-center"
                          style={{
                            width: "343px",
                            height: "50px",
                            padding: "10px 20px",
                            background: "#FDFDFD",
                            border: "2px solid rgba(12, 12, 12, 0.08)",
                            borderRadius: "8px",
                            gap: "10px",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "16px",
                              fontWeight: 600,
                              letterSpacing: "-0.02em",
                              color: "#0C0C0C",
                            }}
                          >
                            {resetPasswordValue}
                          </span>
                        </div>

                        <button
                          className="flex flex-row items-center justify-center"
                          style={{
                            width: "81px",
                            height: "50px",
                            padding: "10px 20px",
                            background: "rgba(208, 43, 32, 0.1)",
                            border: "1px solid #D02B20",
                            borderRadius: "8px",
                            gap: "10px",
                          }}
                          onClick={() => setResetPasswordValue("0000")}
                          data-testid="button-trigger-reset"
                        >
                          <span
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "16px",
                              fontWeight: 600,
                              letterSpacing: "-0.02em",
                              color: "#D02B20",
                            }}
                          >
                            초기화
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Warning Message */}
                    <div
                      className="flex flex-row justify-center items-center"
                      style={{
                        width: "707px",
                        height: "52px",
                        padding: "16px 12px",
                        background: "rgba(255, 226, 85, 0.2)",
                        backdropFilter: "blur(7px)",
                        borderRadius: "20px",
                        gap: "10px",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          fontWeight: 500,
                          letterSpacing: "-0.02em",
                          color: "#A16000",
                        }}
                      >
                        초기화 후 기존 세션은 로그아웃됩니다.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Buttons */}
            <div
              className="flex flex-col"
              style={{
                width: "747px",
                height: "88px",
                padding: "20px",
                background: "#FDFDFD",
                borderTop: "1px solid rgba(12, 12, 12, 0.08)",
                gap: "10px",
              }}
            >
              <div
                className="flex flex-row justify-between items-center"
                style={{
                  width: "707px",
                  height: "48px",
                }}
              >
                <button
                  className="flex flex-row justify-center items-center"
                  style={{
                    width: "353.5px",
                    height: "48px",
                    padding: "10px",
                    borderRadius: "6px",
                    gap: "10px",
                  }}
                  onClick={() => setShowResetPasswordModal(false)}
                  data-testid="button-cancel-reset"
                >
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      fontWeight: 500,
                      letterSpacing: "-0.02em",
                      color: "#D02B20",
                    }}
                  >
                    취소
                  </span>
                </button>

                <button
                  className="flex flex-row justify-center items-center"
                  style={{
                    width: "353.5px",
                    height: "48px",
                    padding: "10px",
                    background: "#008FED",
                    borderRadius: "6px",
                    gap: "10px",
                  }}
                  onClick={async () => {
                    if (!selectedUser) return;

                    try {
                      await apiRequest("POST", "/api/update-password", {
                        username: selectedUser.username,
                        newPassword: resetPasswordValue,
                      });

                      // Show success message
                      toast({
                        title: "비밀번호 초기화 완료",
                        description: `${selectedUser.name}님의 비밀번호가 ${resetPasswordValue}로 변경되었습니다.`,
                      });

                      // Close modals
                      setShowResetPasswordModal(false);
                      setSelectedUser(null);
                    } catch (error) {
                      console.error("Failed to reset password:", error);

                      // Show error message
                      toast({
                        variant: "destructive",
                        title: "비밀번호 초기화 실패",
                        description:
                          error instanceof Error
                            ? error.message
                            : "비밀번호 변경 중 오류가 발생했습니다.",
                      });
                    }
                  }}
                  data-testid="button-confirm-reset"
                >
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      color: "#FDFDFD",
                    }}
                  >
                    확인
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Account Modal */}
      {showDeleteAccountModal && selectedUser && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-50"
            style={{
              background: "rgba(0, 0, 0, 0.7)",
              opacity: 0.4,
            }}
            onClick={() => setShowDeleteAccountModal(false)}
            data-testid="modal-overlay-delete"
          />

          {/* Modal */}
          <div
            className="fixed z-50 bg-white flex flex-col"
            style={{
              width: "747px",
              height: "386px",
              left: "calc(50% - 747px/2 + 0.5px)",
              top: "calc(50% - 386px/2 + 0.5px)",
              boxShadow: "0px -2px 70px rgba(179, 193, 205, 0.8)",
              borderRadius: "12px",
              gap: "32px",
            }}
            data-testid="modal-delete-account"
          >
            {/* Content */}
            <div
              className="flex flex-col items-center"
              style={{
                width: "747px",
                height: "266px",
                gap: "16px",
              }}
            >
              {/* Header */}
              <div
                className="flex flex-row justify-center items-center"
                style={{
                  width: "747px",
                  height: "60px",
                  gap: "321px",
                }}
              >
                <h2
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "18px",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "#0C0C0C",
                  }}
                >
                  계정 삭제
                </h2>
              </div>

              {/* Body */}
              <div
                className="flex flex-col"
                style={{
                  width: "707px",
                  height: "190px",
                  gap: "24px",
                }}
              >
                {/* Selected Account Section */}
                <div
                  className="flex flex-col"
                  style={{
                    width: "707px",
                    height: "114px",
                    gap: "20px",
                  }}
                >
                  {/* Section Title */}
                  <div
                    className="flex flex-row"
                    style={{ width: "707px", height: "18px", gap: "2px" }}
                  >
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 500,
                        letterSpacing: "-0.01em",
                        color: "#686A6E",
                      }}
                    >
                      선택 계정
                    </span>
                  </div>

                  {/* Profile Card */}
                  <div
                    className="flex flex-col justify-center p-5"
                    style={{
                      width: "707px",
                      height: "88px",
                      background: "rgba(12, 12, 12, 0.04)",
                      backdropFilter: "blur(7px)",
                      borderRadius: "12px",
                      gap: "8px",
                    }}
                  >
                    {/* Top row: Name, Company, Role */}
                    <div
                      className="flex flex-row items-center"
                      style={{
                        width: "667px",
                        height: "26px",
                        gap: "16px",
                      }}
                    >
                      <div className="flex flex-row items-center gap-2.5">
                        <span
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "18px",
                            fontWeight: 600,
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}
                        >
                          {selectedUser.name}
                        </span>
                        <div
                          style={{
                            width: "4px",
                            height: "4px",
                            background: "rgba(0, 143, 237, 0.9)",
                            borderRadius: "50%",
                          }}
                        />
                        <span
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "18px",
                            fontWeight: 600,
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}
                        >
                          {selectedUser.company}
                        </span>
                      </div>
                      <div
                        className="flex items-center justify-center px-2.5"
                        style={{
                          height: "26px",
                          background: "rgba(12, 12, 12, 0.1)",
                          backdropFilter: "blur(7px)",
                          borderRadius: "20px",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 400,
                            letterSpacing: "-0.01em",
                            color: "rgba(12, 12, 12, 0.7)",
                          }}
                        >
                          {selectedUser.role}
                        </span>
                      </div>
                    </div>

                    {/* Bottom row: Username, Phone */}
                    <div
                      className="flex flex-row"
                      style={{
                        width: "400px",
                        height: "20px",
                        gap: "24px",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          fontWeight: 400,
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.7)",
                        }}
                      >
                        {selectedUser.username}
                      </span>
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          fontWeight: 400,
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.7)",
                        }}
                      >
                        {selectedUser.phone}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Warning Message */}
                <div
                  className="flex flex-row justify-center items-center"
                  style={{
                    width: "707px",
                    height: "52px",
                    padding: "16px 12px",
                    gap: "10px",
                    background: "rgba(208, 43, 32, 0.2)",
                    backdropFilter: "blur(7px)",
                    borderRadius: "20px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      fontWeight: 500,
                      letterSpacing: "-0.02em",
                      color: "#D02B20",
                    }}
                  >
                    계정 삭제 시 즉시 로그아웃됩니다. 활동 로그/정산 기록 등
                    이력 데이터는 보존됩니다.
                  </span>
                </div>
              </div>
            </div>

            {/* Footer with Buttons */}
            <div
              className="flex flex-col items-start p-5"
              style={{
                width: "747px",
                height: "88px",
                background: "#FDFDFD",
                borderTop: "1px solid rgba(12, 12, 12, 0.08)",
                gap: "10px",
              }}
            >
              <div
                className="flex flex-row justify-between items-center"
                style={{
                  width: "707px",
                  height: "48px",
                }}
              >
                {/* Cancel Button */}
                <button
                  className="flex-1 flex items-center justify-center"
                  style={{
                    height: "48px",
                    borderRadius: "6px",
                  }}
                  onClick={() => setShowDeleteAccountModal(false)}
                  data-testid="button-cancel-delete"
                >
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      fontWeight: 500,
                      letterSpacing: "-0.02em",
                      color: "#D02B20",
                    }}
                  >
                    취소
                  </span>
                </button>

                {/* Confirm Delete Button */}
                <button
                  className="flex-1 flex items-center justify-center"
                  style={{
                    height: "48px",
                    background: "#D02B20",
                    borderRadius: "6px",
                  }}
                  onClick={async () => {
                    try {
                      // Call delete account API
                      await apiRequest("POST", "/api/delete-account", {
                        username: selectedUser.username,
                      });

                      // Invalidate users query to refetch from server
                      await queryClient.invalidateQueries({
                        queryKey: ["/api/users"],
                      });

                      // Show success message
                      toast({
                        title: "계정 삭제 완료",
                        description: `${selectedUser.name}님의 계정이 삭제되었습니다. 활동 로그 및 정산 기록은 보존됩니다.`,
                      });

                      // Close modals
                      setShowDeleteAccountModal(false);
                      setSelectedUser(null);
                    } catch (error) {
                      console.error("Failed to delete account:", error);

                      // Show error message
                      toast({
                        variant: "destructive",
                        title: "계정 삭제 실패",
                        description:
                          error instanceof Error
                            ? error.message
                            : "계정 삭제 중 오류가 발생했습니다.",
                      });
                    }
                  }}
                  data-testid="button-confirm-delete"
                >
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      color: "#FDFDFD",
                    }}
                  >
                    영구 삭제
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create Account Modal */}
      {showCreateAccountModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 flex items-center justify-center"
            style={{
              background: "rgba(0, 0, 0, 0.28)",
              zIndex: 9999,
            }}
            onClick={() => setShowCancelConfirmModal(true)}
          />

          {/* Modal */}
          <div
            className="fixed flex flex-col"
            style={{
              width: "1016px",
              maxWidth: "90vw",
              maxHeight: "90vh",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              background: "#FFFFFF",
              boxShadow: "0px 0px 20px #DBE9F5",
              borderRadius: "12px",
              zIndex: 10000,
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid="modal-create-account"
          >
            {/* Header */}
            <div
              className="flex flex-row justify-between items-center px-6 py-6"
              style={{
                borderBottom: "2px solid rgba(12, 12, 12, 0.1)",
              }}
            >
              <div style={{ width: "28px" }} />
              <h2
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "22px",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "#0C0C0C",
                }}
              >
                새로운 계정 생성
              </h2>
              <button
                className="flex items-center justify-center hover-elevate active-elevate-2"
                style={{
                  width: "28px",
                  height: "28px",
                }}
                onClick={() => setShowCancelConfirmModal(true)}
                data-testid="button-close-create-modal"
              >
                <X size={20} style={{ color: "rgba(12, 12, 12, 0.8)" }} />
              </button>
            </div>

            {/* Form Content */}
            <div
              className="flex-1 flex flex-col px-6 py-6 gap-6 overflow-y-auto"
              style={{
                maxHeight: "calc(90vh - 170px)",
              }}
            >
              {/* Role Selection */}
              <div className="flex flex-col gap-2">
                <label
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                    color: "#686A6E",
                  }}
                >
                  역할
                </label>
                <div className="relative" style={{ width: "97px" }}>
                  <select
                    value={createAccountForm.role}
                    onChange={(e) =>
                      setCreateAccountForm({
                        ...createAccountForm,
                        role: e.target.value,
                      })
                    }
                    className="flex items-center justify-center px-4 pr-8 appearance-none cursor-pointer"
                    style={{
                      width: "100%",
                      height: "46px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(12, 12, 12, 0.3)",
                      boxShadow:
                        "inset 0px -2px 4px rgba(0, 0, 0, 0.05), inset 0px 2px 4px rgba(0, 0, 0, 0.05)",
                      backdropFilter: "blur(7px)",
                      borderRadius: "6px",
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      fontWeight: 500,
                      letterSpacing: "-0.02em",
                      color: "rgba(12, 12, 12, 0.9)",
                    }}
                    data-testid="select-role"
                  >
                    {VALID_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={22}
                    className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: "rgba(12, 12, 12, 0.6)" }}
                  />
                </div>
              </div>

              {/* Form Inputs */}
              <div className="flex flex-col gap-4">
                <h3
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "#0C0C0C",
                  }}
                >
                  기본 정보
                </h3>

                {/* 기본 정보: 성함, ID, 연락처, 이메일 주소 */}
                <div className="flex gap-3" style={{ width: "100%" }}>
                  <div className="flex-1">
                    <label
                      className="block mb-2"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 400,
                        letterSpacing: "-0.01em",
                        color: "#686A6E",
                      }}
                    >
                      성함
                    </label>
                    <input
                      type="text"
                      placeholder="성함"
                      value={createAccountForm.name}
                      onChange={(e) =>
                        setCreateAccountForm({
                          ...createAccountForm,
                          name: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 outline-none"
                      style={{
                        background: "#FDFDFD",
                        border: "2px solid rgba(12, 12, 12, 0.08)",
                        borderRadius: "8px",
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.9)",
                      }}
                      data-testid="input-name"
                    />
                  </div>
                  <div className="flex-1">
                    <label
                      className="block mb-2"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 400,
                        letterSpacing: "-0.01em",
                        color: "#686A6E",
                      }}
                    >
                      ID
                    </label>
                    <input
                      type="text"
                      placeholder="사용자 ID"
                      value={createAccountForm.username}
                      onChange={(e) =>
                        setCreateAccountForm({
                          ...createAccountForm,
                          username: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 outline-none"
                      style={{
                        background: "#FDFDFD",
                        border: "2px solid rgba(12, 12, 12, 0.08)",
                        borderRadius: "8px",
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.9)",
                      }}
                      data-testid="input-username"
                    />
                  </div>
                  <div className="flex-1">
                    <label
                      className="block mb-2"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 400,
                        letterSpacing: "-0.01em",
                        color: "#686A6E",
                      }}
                    >
                      연락처
                    </label>
                    <input
                      type="tel"
                      placeholder="- 빼고 입력"
                      value={createAccountForm.phone}
                      onChange={(e) =>
                        setCreateAccountForm({
                          ...createAccountForm,
                          phone: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 outline-none"
                      style={{
                        background: "#FDFDFD",
                        border: "2px solid rgba(12, 12, 12, 0.08)",
                        borderRadius: "8px",
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.9)",
                      }}
                      data-testid="input-phone"
                    />
                  </div>
                  <div className="flex-1">
                    <label
                      className="block mb-2"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 400,
                        letterSpacing: "-0.01em",
                        color: "#686A6E",
                      }}
                    >
                      이메일 주소
                    </label>
                    <input
                      type="email"
                      placeholder="이메일 주소"
                      value={createAccountForm.email}
                      onChange={(e) =>
                        setCreateAccountForm({
                          ...createAccountForm,
                          email: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 outline-none"
                      style={{
                        background: "#FDFDFD",
                        border: "2px solid rgba(12, 12, 12, 0.08)",
                        borderRadius: "8px",
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.9)",
                      }}
                      data-testid="input-email"
                    />
                  </div>
                </div>

                <h3
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "#0C0C0C",
                    marginTop: "12px",
                  }}
                >
                  {createAccountForm.role === "보험사"
                    ? "보험사 정보"
                    : createAccountForm.role === "관리자"
                      ? "관리자 정보"
                      : createAccountForm.role === "심사사"
                        ? "심사사 정보"
                        : createAccountForm.role === "조사사"
                          ? "조사사 정보"
                          : createAccountForm.role === "협력사"
                            ? "협력사 정보"
                            : "회사 정보"}
                </h3>

                {createAccountForm.role === "협력사" ? (
                  <>
                    {/* 협력사 정보: Row 1 - 회사명, 소속부서, 직급, 사무실 전화 */}
                    <div className="flex gap-3" style={{ width: "100%" }}>
                      <div className="flex-1">
                        <label
                          className="block mb-2"
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 400,
                            letterSpacing: "-0.01em",
                            color: "#686A6E",
                          }}
                        >
                          회사명
                        </label>
                        <input
                          type="text"
                          placeholder="회사명"
                          value={createAccountForm.company}
                          onChange={(e) =>
                            setCreateAccountForm({
                              ...createAccountForm,
                              company: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 outline-none"
                          style={{
                            background: "#FDFDFD",
                            border: "2px solid rgba(12, 12, 12, 0.08)",
                            borderRadius: "8px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 400,
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}
                          data-testid="input-company"
                        />
                      </div>
                      <div className="flex-1">
                        <label
                          className="block mb-2"
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 400,
                            letterSpacing: "-0.01em",
                            color: "#686A6E",
                          }}
                        >
                          소속부서
                        </label>
                        <input
                          type="text"
                          placeholder="소속부서"
                          value={createAccountForm.department}
                          onChange={(e) =>
                            setCreateAccountForm({
                              ...createAccountForm,
                              department: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 outline-none"
                          style={{
                            background: "#FDFDFD",
                            border: "2px solid rgba(12, 12, 12, 0.08)",
                            borderRadius: "8px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 400,
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}
                          data-testid="input-department"
                        />
                      </div>
                      <div className="flex-1">
                        <label
                          className="block mb-2"
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 400,
                            letterSpacing: "-0.01em",
                            color: "#686A6E",
                          }}
                        >
                          직급
                        </label>
                        <Select
                          value={createAccountForm.position}
                          onValueChange={(value) =>
                            setCreateAccountForm({
                              ...createAccountForm,
                              position: value,
                            })
                          }
                        >
                          <SelectTrigger
                            className="w-full px-4 py-3 outline-none"
                            style={{
                              background: "#FDFDFD",
                              border: "2px solid rgba(12, 12, 12, 0.08)",
                              borderRadius: "8px",
                              fontFamily: "Pretendard",
                              fontSize: "14px",
                              fontWeight: 400,
                              letterSpacing: "-0.02em",
                              color: "rgba(12, 12, 12, 0.9)",
                              height: "48px",
                            }}
                            data-testid="select-position"
                          >
                            <SelectValue placeholder="직급 선택" />
                          </SelectTrigger>
                          <SelectContent className="z-[10001]">
                            <SelectItem value="사원">사원</SelectItem>
                            <SelectItem value="주임">주임</SelectItem>
                            <SelectItem value="대리">대리</SelectItem>
                            <SelectItem value="과장">과장</SelectItem>
                            <SelectItem value="차장">차장</SelectItem>
                            <SelectItem value="부장">부장</SelectItem>
                            <SelectItem value="이사">이사</SelectItem>
                            <SelectItem value="상무">상무</SelectItem>
                            <SelectItem value="전무">전무</SelectItem>
                            <SelectItem value="부사장">부사장</SelectItem>
                            <SelectItem value="사장">사장</SelectItem>
                            <SelectItem value="대표이사">대표이사</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <label
                          className="block mb-2"
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 400,
                            letterSpacing: "-0.01em",
                            color: "#686A6E",
                          }}
                        >
                          사무실 전화
                        </label>
                        <input
                          type="tel"
                          placeholder="-빼고 입력"
                          value={createAccountForm.office}
                          onChange={(e) =>
                            setCreateAccountForm({
                              ...createAccountForm,
                              office: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 outline-none"
                          style={{
                            background: "#FDFDFD",
                            border: "2px solid rgba(12, 12, 12, 0.08)",
                            borderRadius: "8px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 400,
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}
                          data-testid="input-office"
                        />
                      </div>
                    </div>

                    {/* 협력사 정보: Row 2 - 은행 선택, 계좌번호, 예금주 */}
                    <div className="flex gap-3" style={{ width: "100%" }}>
                      <div className="flex-1">
                        <label
                          className="block mb-2"
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 400,
                            letterSpacing: "-0.01em",
                            color: "#686A6E",
                          }}
                        >
                          은행 선택
                        </label>
                        <div className="relative">
                          <select
                            value={createAccountForm.bankName}
                            onChange={(e) =>
                              setCreateAccountForm({
                                ...createAccountForm,
                                bankName: e.target.value,
                              })
                            }
                            className="w-full px-4 pr-8 appearance-none cursor-pointer outline-none"
                            style={{
                              height: "46px",
                              background: "#FDFDFD",
                              border: "2px solid rgba(12, 12, 12, 0.08)",
                              borderRadius: "8px",
                              fontFamily: "Pretendard",
                              fontSize: "14px",
                              fontWeight: 400,
                              letterSpacing: "-0.02em",
                              color: "rgba(12, 12, 12, 0.9)",
                            }}
                            data-testid="select-bank"
                          >
                            <option value="">은행명</option>
                            <option value="KB국민은행">KB국민은행</option>
                            <option value="신한은행">신한은행</option>
                            <option value="우리은행">우리은행</option>
                            <option value="하나은행">하나은행</option>
                            <option value="NH농협은행">NH농협은행</option>
                            <option value="IBK기업은행">IBK기업은행</option>
                            <option value="SC제일은행">SC제일은행</option>
                            <option value="카카오뱅크">카카오뱅크</option>
                            <option value="토스뱅크">토스뱅크</option>
                          </select>
                          <ChevronDown
                            size={22}
                            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ color: "rgba(12, 12, 12, 0.6)" }}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <label
                          className="block mb-2"
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 400,
                            letterSpacing: "-0.01em",
                            color: "#686A6E",
                          }}
                        >
                          계좌번호
                        </label>
                        <input
                          type="text"
                          placeholder="'-' 빼고 입력"
                          value={createAccountForm.accountNumber}
                          onChange={(e) =>
                            setCreateAccountForm({
                              ...createAccountForm,
                              accountNumber: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 outline-none"
                          style={{
                            background: "#FDFDFD",
                            border: "2px solid rgba(12, 12, 12, 0.08)",
                            borderRadius: "8px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 400,
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}
                          data-testid="input-account-number"
                        />
                      </div>
                      <div className="flex-1">
                        <label
                          className="block mb-2"
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 400,
                            letterSpacing: "-0.01em",
                            color: "#686A6E",
                          }}
                        >
                          예금주
                        </label>
                        <input
                          type="text"
                          placeholder="예금주"
                          value={createAccountForm.accountHolder}
                          onChange={(e) =>
                            setCreateAccountForm({
                              ...createAccountForm,
                              accountHolder: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 outline-none"
                          style={{
                            background: "#FDFDFD",
                            border: "2px solid rgba(12, 12, 12, 0.08)",
                            borderRadius: "8px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 400,
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}
                          data-testid="input-account-holder"
                        />
                      </div>
                    </div>

                    {/* 협력사 정보: Row 3 - 주소 (full width) */}
                    <div style={{ width: "100%" }}>
                      <label
                        className="block mb-2"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 400,
                          letterSpacing: "-0.01em",
                          color: "#686A6E",
                        }}
                      >
                        주소
                      </label>
                      <input
                        type="text"
                        placeholder="주소"
                        value={createAccountForm.address}
                        onChange={(e) =>
                          setCreateAccountForm({
                            ...createAccountForm,
                            address: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 outline-none"
                        style={{
                          background: "#FDFDFD",
                          border: "2px solid rgba(12, 12, 12, 0.08)",
                          borderRadius: "8px",
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 400,
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.9)",
                        }}
                        data-testid="input-address"
                      />
                    </div>

                    {/* 협력사 정보: Row 4 - 출동가능지역선택 */}
                    <div style={{ width: "100%" }}>
                      <label
                        className="block mb-2"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 400,
                          letterSpacing: "-0.01em",
                          color: "#686A6E",
                        }}
                      >
                        출동가능지역선택
                      </label>
                      <div
                        className="px-4 py-3 cursor-pointer flex flex-wrap gap-2 min-h-[46px]"
                        style={{
                          background: "#FDFDFD",
                          border: "2px solid rgba(12, 12, 12, 0.08)",
                          borderRadius: "8px",
                        }}
                        onClick={() => {
                          setTempSelectedRegions([
                            ...createAccountForm.serviceRegions,
                          ]);
                          setShowRegionModal(true);
                        }}
                        data-testid="button-region-selector"
                      >
                        {createAccountForm.serviceRegions.length === 0 ? (
                          <span
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "14px",
                              fontWeight: 400,
                              letterSpacing: "-0.02em",
                              color: "rgba(12, 12, 12, 0.4)",
                            }}
                          >
                            지역 선택
                          </span>
                        ) : (
                          createAccountForm.serviceRegions.map(
                            (region, idx) => (
                              <div
                                key={idx}
                                className="px-3 py-1"
                                style={{
                                  background: "#E3F2FD",
                                  borderRadius: "6px",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCreateAccountForm({
                                    ...createAccountForm,
                                    serviceRegions:
                                      createAccountForm.serviceRegions.filter(
                                        (_, i) => i !== idx,
                                      ),
                                  });
                                }}
                              >
                                <span
                                  style={{
                                    fontFamily: "Pretendard",
                                    fontSize: "13px",
                                    fontWeight: 400,
                                    color: "#008FED",
                                  }}
                                >
                                  {region} ×
                                </span>
                              </div>
                            ),
                          )
                        )}
                      </div>
                    </div>

                    {/* 협력사 정보: Row 5 - 첨부파일 */}
                    <div style={{ width: "100%" }}>
                      <label
                        className="block mb-2"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 400,
                          letterSpacing: "-0.01em",
                          color: "#686A6E",
                        }}
                      >
                        첨부파일
                      </label>
                      <input
                        type="file"
                        id="file-upload-input"
                        multiple
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            const newFileNames = files.map((f) => f.name);
                            setCreateAccountForm({
                              ...createAccountForm,
                              attachments: [
                                ...createAccountForm.attachments,
                                ...newFileNames,
                              ],
                            });
                          }
                          e.target.value = "";
                        }}
                        data-testid="input-file-upload"
                      />
                      <div
                        className="flex flex-col items-center justify-center cursor-pointer"
                        style={{
                          width: "100%",
                          minHeight: "120px",
                          background: "#F8FCFF",
                          border: "2px dashed rgba(0, 143, 237, 0.3)",
                          borderRadius: "8px",
                        }}
                        onClick={() => {
                          document.getElementById("file-upload-input")?.click();
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.currentTarget.style.background =
                            "rgba(0, 143, 237, 0.05)";
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.currentTarget.style.background = "#F8FCFF";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.currentTarget.style.background = "#F8FCFF";

                          const files = Array.from(e.dataTransfer.files || []);
                          if (files.length > 0) {
                            const newFileNames = files.map((f) => f.name);
                            setCreateAccountForm({
                              ...createAccountForm,
                              attachments: [
                                ...createAccountForm.attachments,
                                ...newFileNames,
                              ],
                            });
                          }
                        }}
                        data-testid="file-upload-area"
                      >
                        {createAccountForm.attachments.length === 0 ? (
                          <div className="flex flex-col items-center gap-2 py-4">
                            <div
                              className="flex items-center justify-center"
                              style={{
                                width: "48px",
                                height: "48px",
                                background: "rgba(0, 143, 237, 0.1)",
                                borderRadius: "50%",
                              }}
                            >
                              <Upload size={24} style={{ color: "#008FED" }} />
                            </div>
                            <span
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                fontWeight: 400,
                                color: "#686A6E",
                              }}
                            >
                              파일 또는 이미지를 이곳에 올려주세요
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 w-full p-4">
                            {createAccountForm.attachments.map(
                              (fileName, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between px-3 py-2"
                                  style={{
                                    background: "#FFFFFF",
                                    border: "1px solid rgba(0, 143, 237, 0.2)",
                                    borderRadius: "6px",
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  data-testid={`file-item-${idx}`}
                                >
                                  <span
                                    style={{
                                      fontFamily: "Pretendard",
                                      fontSize: "13px",
                                      fontWeight: 400,
                                      color: "#0C0C0C",
                                    }}
                                  >
                                    {fileName}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCreateAccountForm({
                                        ...createAccountForm,
                                        attachments:
                                          createAccountForm.attachments.filter(
                                            (_, i) => i !== idx,
                                          ),
                                      });
                                    }}
                                    data-testid={`button-remove-file-${idx}`}
                                  >
                                    <X size={16} style={{ color: "#686A6E" }} />
                                  </button>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  /* 다른 역할: 회사명, 소속부서, 직급, 사무실 전화 */
                  <div className="flex gap-3" style={{ width: "100%" }}>
                    <div className="flex-1">
                      <label
                        className="block mb-2"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 400,
                          letterSpacing: "-0.01em",
                          color: "#686A6E",
                        }}
                      >
                        회사명
                      </label>
                      <input
                        type="text"
                        placeholder="회사명"
                        value={createAccountForm.company}
                        onChange={(e) =>
                          setCreateAccountForm({
                            ...createAccountForm,
                            company: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 outline-none"
                        style={{
                          background: "#FDFDFD",
                          border: "2px solid rgba(12, 12, 12, 0.08)",
                          borderRadius: "8px",
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 400,
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.9)",
                        }}
                        data-testid="input-company"
                      />
                    </div>
                    <div className="flex-1">
                      <label
                        className="block mb-2"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 400,
                          letterSpacing: "-0.01em",
                          color: "#686A6E",
                        }}
                      >
                        소속부서
                      </label>
                      <input
                        type="text"
                        placeholder="소속부서"
                        value={createAccountForm.department}
                        onChange={(e) =>
                          setCreateAccountForm({
                            ...createAccountForm,
                            department: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 outline-none"
                        style={{
                          background: "#FDFDFD",
                          border: "2px solid rgba(12, 12, 12, 0.08)",
                          borderRadius: "8px",
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 400,
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.9)",
                        }}
                        data-testid="input-department"
                      />
                    </div>
                    <div className="flex-1">
                      <label
                        className="block mb-2"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 400,
                          letterSpacing: "-0.01em",
                          color: "#686A6E",
                        }}
                      >
                        직급
                      </label>
                      <Select
                        value={createAccountForm.position}
                        onValueChange={(value) =>
                          setCreateAccountForm({
                            ...createAccountForm,
                            position: value,
                          })
                        }
                      >
                        <SelectTrigger
                          className="w-full px-4 py-3 outline-none"
                          style={{
                            background: "#FDFDFD",
                            border: "2px solid rgba(12, 12, 12, 0.08)",
                            borderRadius: "8px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 400,
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                            height: "48px",
                          }}
                          data-testid="select-position"
                        >
                          <SelectValue placeholder="직급 선택" />
                        </SelectTrigger>
                        <SelectContent className="z-[10001]">
                          <SelectItem value="사원">사원</SelectItem>
                          <SelectItem value="주임">주임</SelectItem>
                          <SelectItem value="대리">대리</SelectItem>
                          <SelectItem value="과장">과장</SelectItem>
                          <SelectItem value="차장">차장</SelectItem>
                          <SelectItem value="부장">부장</SelectItem>
                          <SelectItem value="이사">이사</SelectItem>
                          <SelectItem value="상무">상무</SelectItem>
                          <SelectItem value="전무">전무</SelectItem>
                          <SelectItem value="부사장">부사장</SelectItem>
                          <SelectItem value="사장">사장</SelectItem>
                          <SelectItem value="대표이사">대표이사</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <label
                        className="block mb-2"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 400,
                          letterSpacing: "-0.01em",
                          color: "#686A6E",
                        }}
                      >
                        사무실 전화
                      </label>
                      <input
                        type="tel"
                        placeholder="-빼고 입력"
                        value={createAccountForm.office}
                        onChange={(e) =>
                          setCreateAccountForm({
                            ...createAccountForm,
                            office: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 outline-none"
                        style={{
                          background: "#FDFDFD",
                          border: "2px solid rgba(12, 12, 12, 0.08)",
                          borderRadius: "8px",
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 400,
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.9)",
                        }}
                        data-testid="input-office"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer with Buttons */}
            <div
              className="flex flex-row justify-between items-center px-6 py-4"
              style={{
                background: "#FDFDFD",
                borderTop: "1px solid rgba(12, 12, 12, 0.08)",
              }}
            >
              <button
                className="flex items-center justify-center hover-elevate active-elevate-2"
                style={{
                  height: "48px",
                  padding: "0 24px",
                  background: "transparent",
                  borderRadius: "6px",
                }}
                onClick={() => {
                  setCreateAccountForm({
                    role: "보험사",
                    name: "",
                    company: "",
                    department: "",
                    position: "",
                    email: "",
                    username: "",
                    password: "",
                    phone: "",
                    office: "",
                    address: "",
                    bankName: "",
                    accountNumber: "",
                    accountHolder: "",
                    serviceRegions: [] as string[],
                    attachments: [] as string[],
                  });
                  setRegionSearchTerm("");
                }}
                data-testid="button-reset-form"
              >
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 500,
                    letterSpacing: "-0.02em",
                    color: "#0C0C0C4D",
                  }}
                >
                  초기화
                </span>
              </button>

              <button
                type="button"
                className="flex items-center justify-center hover-elevate active-elevate-2"
                style={{
                  height: "48px",
                  padding: "0 32px",
                  background: "#008FED",
                  borderRadius: "6px",
                }}
                onClick={() => {
                  // Validate required fields
                  if (
                    !createAccountForm.name ||
                    !createAccountForm.company ||
                    !createAccountForm.username
                  ) {
                    toast({
                      variant: "destructive",
                      title: "입력 오류",
                      description: "필수 항목을 모두 입력해주세요.",
                    });
                    return;
                  }

                  // Set default password
                  setGeneratedPassword("0000");

                  // Close account creation modal and show password generation modal
                  setShowCreateAccountModal(false);
                  setShowAccountCreatedModal(true);
                }}
                data-testid="button-generate-password"
              >
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: "#FDFDFD",
                  }}
                >
                  비밀번호 생성
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Account Created Modal */}
      {showAccountCreatedModal && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-50"
            style={{
              background: "rgba(0, 0, 0, 0.7)",
              opacity: 0.4,
            }}
            onClick={() => setShowCancelConfirmModal(true)}
            data-testid="modal-overlay-account-created"
          />

          {/* Modal */}
          <div
            className="fixed z-50 bg-white flex flex-col"
            style={{
              width: "747px",
              height: "440px",
              left: "calc(50% - 747px/2 + 0.5px)",
              top: "calc(50% - 440px/2 + 0.5px)",
              boxShadow: "0px -2px 70px rgba(179, 193, 205, 0.8)",
              borderRadius: "12px",
              gap: "32px",
            }}
            data-testid="modal-account-created"
          >
            {/* Content */}
            <div
              className="flex flex-col items-center"
              style={{
                width: "747px",
                height: "320px",
                gap: "16px",
              }}
            >
              {/* Header */}
              <div
                className="flex flex-row justify-center items-center"
                style={{
                  width: "747px",
                  height: "60px",
                  gap: "321px",
                }}
              >
                <h2
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "18px",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "#0C0C0C",
                  }}
                >
                  비밀번호 생성
                </h2>
              </div>

              {/* Body */}
              <div
                className="flex flex-col"
                style={{
                  width: "707px",
                  height: "244px",
                  gap: "20px",
                }}
              >
                {/* Profile Card Section */}
                <div
                  className="flex flex-col"
                  style={{
                    width: "707px",
                    height: "114px",
                    gap: "20px",
                  }}
                >
                  {/* Section Title */}
                  <div
                    className="flex flex-row"
                    style={{ width: "707px", height: "18px", gap: "2px" }}
                  >
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 500,
                        letterSpacing: "-0.01em",
                        color: "#686A6E",
                      }}
                    >
                      생성 계정
                    </span>
                  </div>

                  {/* Profile Card */}
                  <div
                    className="flex flex-col justify-center p-5"
                    style={{
                      width: "707px",
                      height: "88px",
                      background: "rgba(12, 12, 12, 0.04)",
                      backdropFilter: "blur(7px)",
                      borderRadius: "12px",
                      gap: "8px",
                    }}
                  >
                    {/* Top row: Name, Company, Role */}
                    <div
                      className="flex flex-row items-center"
                      style={{
                        width: "667px",
                        height: "26px",
                        gap: "16px",
                      }}
                    >
                      <div className="flex flex-row items-center gap-2.5">
                        <span
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "18px",
                            fontWeight: 600,
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}
                        >
                          {createAccountForm.name}
                        </span>
                        <div
                          style={{
                            width: "4px",
                            height: "4px",
                            background: "rgba(0, 143, 237, 0.9)",
                            borderRadius: "50%",
                          }}
                        />
                        <span
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "18px",
                            fontWeight: 600,
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}
                        >
                          {createAccountForm.company}
                        </span>
                      </div>
                      <div
                        className="flex items-center justify-center px-2.5"
                        style={{
                          height: "26px",
                          background: "rgba(12, 12, 12, 0.1)",
                          backdropFilter: "blur(7px)",
                          borderRadius: "20px",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 400,
                            letterSpacing: "-0.01em",
                            color: "rgba(12, 12, 12, 0.7)",
                          }}
                        >
                          {createAccountForm.role}
                        </span>
                      </div>
                    </div>

                    {/* Bottom row: Username, Phone */}
                    <div
                      className="flex flex-row"
                      style={{
                        width: "400px",
                        height: "20px",
                        gap: "24px",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          fontWeight: 400,
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.7)",
                        }}
                      >
                        {createAccountForm.username}
                      </span>
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          fontWeight: 400,
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.7)",
                        }}
                      >
                        {createAccountForm.phone || "010-0000-0000"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Password Section */}
                <div
                  className="flex flex-col"
                  style={{
                    width: "707px",
                    height: "110px",
                    gap: "10px",
                  }}
                >
                  <div
                    className="flex flex-col"
                    style={{ width: "419px", height: "76px", gap: "8px" }}
                  >
                    <div
                      className="flex flex-row"
                      style={{ width: "419px", height: "18px", gap: "2px" }}
                    >
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 500,
                          letterSpacing: "-0.01em",
                          color: "#686A6E",
                        }}
                      >
                        비밀번호 생성(자동)
                      </span>
                    </div>

                    {/* Input Field */}
                    <div
                      className="flex flex-row items-center"
                      style={{ width: "419px", height: "50px" }}
                    >
                      <input
                        type="text"
                        value={generatedPassword}
                        onChange={(e) => setGeneratedPassword(e.target.value)}
                        className="flex flex-row items-center"
                        style={{
                          width: "100%",
                          height: "50px",
                          padding: "10px 20px",
                          background: "#FDFDFD",
                          border: "2px solid rgba(12, 12, 12, 0.08)",
                          borderRadius: "8px",
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          fontWeight: 600,
                          letterSpacing: "-0.02em",
                          color: "#0C0C0C",
                          outline: "none",
                        }}
                        data-testid="input-password"
                      />
                    </div>
                  </div>

                  {/* Notification Options */}
                  <div
                    className="flex flex-row items-center"
                    style={{
                      gap: "32px",
                    }}
                  >
                    {/* Email notification checkbox */}
                    <div
                      className="flex flex-row items-center cursor-pointer"
                      style={{ gap: "6px" }}
                      onClick={() =>
                        setSendEmailNotification(!sendEmailNotification)
                      }
                    >
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          border: "2px solid rgba(12, 12, 12, 0.24)",
                          borderRadius: "4px",
                          background: sendEmailNotification
                            ? "#008FED"
                            : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {sendEmailNotification && (
                          <span style={{ color: "white", fontSize: "16px" }}>
                            ✓
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 500,
                          letterSpacing: "-0.01em",
                          color: "rgba(12, 12, 12, 0.8)",
                        }}
                      >
                        이메일로 안내 발송
                      </span>
                    </div>

                    {/* SMS notification checkbox */}
                    <div
                      className="flex flex-row items-center cursor-pointer"
                      style={{ gap: "6px" }}
                      onClick={() =>
                        setSendSmsNotification(!sendSmsNotification)
                      }
                    >
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          border: "2px solid rgba(12, 12, 12, 0.24)",
                          borderRadius: "4px",
                          background: sendSmsNotification
                            ? "#008FED"
                            : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {sendSmsNotification && (
                          <span style={{ color: "white", fontSize: "16px" }}>
                            ✓
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 500,
                          letterSpacing: "-0.01em",
                          color: "rgba(12, 12, 12, 0.8)",
                        }}
                      >
                        문자로 안내 발송
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Buttons */}
            <div
              className="flex flex-col items-start p-5"
              style={{
                width: "747px",
                height: "88px",
                background: "#FDFDFD",
                borderTop: "1px solid rgba(12, 12, 12, 0.08)",
                gap: "10px",
              }}
            >
              <div
                className="flex flex-row justify-between items-center"
                style={{
                  width: "707px",
                  height: "48px",
                }}
              >
                {/* Cancel Button */}
                <button
                  className="flex-1 flex items-center justify-center"
                  style={{
                    height: "48px",
                    borderRadius: "6px",
                  }}
                  onClick={() => {
                    setShowAccountCreatedModal(false);
                    setSendEmailNotification(false);
                    setSendSmsNotification(false);
                    setGeneratedPassword("0000");
                  }}
                  data-testid="button-cancel-account-created"
                >
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      fontWeight: 500,
                      letterSpacing: "-0.02em",
                      color: "#D02B20",
                    }}
                  >
                    취소
                  </span>
                </button>

                {/* Confirm Button */}
                <button
                  className="flex-1 flex items-center justify-center"
                  style={{
                    height: "48px",
                    background: "#008FED",
                    borderRadius: "6px",
                  }}
                  onClick={async () => {
                    try {
                      // Call create account API with user-entered password
                      await apiRequest("POST", "/api/create-account", {
                        ...createAccountForm,
                        password: generatedPassword,
                      });

                      // Invalidate users query to refetch from server
                      await queryClient.invalidateQueries({
                        queryKey: ["/api/users"],
                      });

                      // Show success message
                      let description = `${createAccountForm.name}님의 계정이 생성되었습니다. 초기 비밀번호: ${generatedPassword}`;
                      if (sendEmailNotification && sendSmsNotification) {
                        description += "\n이메일과 문자로 안내가 발송됩니다.";
                      } else if (sendEmailNotification) {
                        description += "\n이메일로 안내가 발송됩니다.";
                      } else if (sendSmsNotification) {
                        description += "\n문자로 안내가 발송됩니다.";
                      }

                      toast({
                        title: "계정 생성 완료",
                        description,
                      });

                      // Close modals and reset form
                      setShowAccountCreatedModal(false);
                      setShowCreateAccountModal(false);
                      setSendEmailNotification(false);
                      setSendSmsNotification(false);
                      setGeneratedPassword("0000");
                      setCreateAccountForm({
                        role: "보험사",
                        name: "",
                        company: "",
                        department: "",
                        position: "",
                        email: "",
                        username: "",
                        password: "",
                        phone: "",
                        office: "",
                        address: "",
                        bankName: "",
                        accountNumber: "",
                        accountHolder: "",
                        serviceRegions: [] as string[],
                        attachments: [] as string[],
                      });
                      setRegionSearchTerm("");
                    } catch (error: any) {
                      console.error("Failed to create account:", error);

                      // Show error message
                      const errorMessage =
                        error?.error ||
                        error?.message ||
                        "계정 생성 중 오류가 발생했습니다.";
                      toast({
                        variant: "destructive",
                        title: "계정 생성 실패",
                        description: errorMessage,
                      });
                    }
                  }}
                  data-testid="button-confirm-account-created"
                >
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      color: "#FDFDFD",
                    }}
                  >
                    완료
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirmModal && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0"
            style={{
              background: "rgba(0, 0, 0, 0.7)",
              opacity: 0.4,
              zIndex: 10001,
            }}
            onClick={() => setShowCancelConfirmModal(false)}
            data-testid="modal-overlay-cancel-confirm"
          />

          {/* Modal */}
          <div
            className="fixed flex flex-col items-center"
            style={{
              width: "400px",
              height: "199px",
              left: "calc(50% - 400px/2)",
              top: "calc(50% - 199px/2)",
              background: "#FFFFFF",
              boxShadow: "0px -2px 70px rgba(179, 193, 205, 0.8)",
              borderRadius: "12px",
              padding: "32px 0px 0px",
              gap: "24px",
              zIndex: 10002,
              boxSizing: "border-box",
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid="modal-cancel-confirm"
          >
            {/* Content */}
            <div
              className="flex flex-col items-center"
              style={{
                width: "222px",
                height: "55px",
                gap: "8px",
              }}
            >
              <h2
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "18px",
                  fontWeight: 600,
                  lineHeight: "148%",
                  textAlign: "center",
                  letterSpacing: "-0.02em",
                  color: "#0C0C0C",
                }}
              >
                계정 생성을 그만두시겠습니까?
              </h2>
              <p
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "16px",
                  fontWeight: 500,
                  lineHeight: "128%",
                  textAlign: "center",
                  letterSpacing: "-0.02em",
                  color: "rgba(12, 12, 12, 0.8)",
                }}
              >
                지금 나가면 모든 입력이 사라집니다.
              </p>
            </div>

            {/* Footer with Buttons */}
            <div
              className="flex flex-col items-start p-5"
              style={{
                width: "400px",
                height: "88px",
                background: "#FDFDFD",
                borderTop: "1px solid rgba(12, 12, 12, 0.08)",
                gap: "10px",
              }}
            >
              <div
                className="flex flex-row justify-between items-center"
                style={{
                  width: "360px",
                  height: "48px",
                }}
              >
                {/* Cancel Button */}
                <button
                  className="flex-1 flex items-center justify-center"
                  style={{
                    height: "48px",
                    borderRadius: "6px",
                  }}
                  onClick={() => setShowCancelConfirmModal(false)}
                  data-testid="button-cancel-confirm-cancel"
                >
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      fontWeight: 500,
                      letterSpacing: "-0.02em",
                      color: "#D02B20",
                    }}
                  >
                    취소
                  </span>
                </button>

                {/* Confirm Exit Button */}
                <button
                  className="flex-1 flex items-center justify-center"
                  style={{
                    height: "48px",
                    background: "#008FED",
                    borderRadius: "6px",
                  }}
                  onClick={() => {
                    // Close all modals and reset form
                    setShowCancelConfirmModal(false);
                    setShowAccountCreatedModal(false);
                    setShowCreateAccountModal(false);
                    setSendEmailNotification(false);
                    setSendSmsNotification(false);
                    setGeneratedPassword("0000");
                    setCreateAccountForm({
                      role: "보험사",
                      name: "",
                      company: "",
                      department: "",
                      position: "",
                      email: "",
                      username: "",
                      password: "",
                      phone: "",
                      office: "",
                      address: "",
                      bankName: "",
                      accountNumber: "",
                      accountHolder: "",
                      serviceRegions: [] as string[],
                      attachments: [] as string[],
                    });
                    setRegionSearchTerm("");
                  }}
                  data-testid="button-cancel-confirm-exit"
                >
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      color: "#FDFDFD",
                    }}
                  >
                    나가기
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Region Selection Modal */}
      {showRegionModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 flex items-center justify-center"
            style={{
              background: "rgba(0, 0, 0, 0.28)",
              zIndex: 10001,
            }}
            onClick={() => setShowRegionModal(false)}
          />

          {/* Modal */}
          <div
            className="fixed flex flex-col"
            style={{
              width: "467px",
              height: "690px",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              background: "#FFFFFF",
              boxShadow: "0px -2px 70px rgba(179, 193, 205, 0.8)",
              borderRadius: "12px",
              zIndex: 10002,
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid="modal-region-selector"
          >
            {/* Header */}
            <div
              className="flex flex-row justify-between items-center px-5 py-4"
              style={{
                height: "60px",
              }}
            >
              <h2
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "18px",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "#0C0C0C",
                }}
              >
                출동가능지역 검색
              </h2>
              <button
                className="flex items-center justify-center hover-elevate active-elevate-2"
                style={{
                  width: "24px",
                  height: "24px",
                }}
                onClick={() => setShowRegionModal(false)}
                data-testid="button-close-region-modal"
              >
                <X size={20} style={{ color: "#1C1B1F" }} />
              </button>
            </div>

            {/* Tab Headers */}
            <div
              className="flex flex-row mx-5 mt-4"
              style={{
                height: "39px",
                background: "#F5F5F5",
              }}
            >
              <div
                className="flex items-center px-3"
                style={{
                  width: "114px",
                }}
              >
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "15px",
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                    color: "#686A6E",
                  }}
                >
                  시/도
                </span>
              </div>
              <div className="flex-1 flex items-center px-3">
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "15px",
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                    color: "#686A6E",
                  }}
                >
                  군/구
                </span>
              </div>
            </div>

            {/* Selection Area */}
            <div
              className="flex flex-row mx-5 mt-0"
              style={{
                height: "342px",
                paddingTop: "6px",
              }}
            >
              {/* Province List */}
              <div
                className="flex flex-col overflow-y-auto"
                style={{
                  width: "114px",
                  borderRight: "1px solid rgba(12, 12, 12, 0.1)",
                  paddingRight: "12px",
                }}
              >
                {Object.keys(KOREA_REGIONS).map((province) => (
                  <button
                    key={province}
                    className="flex flex-row justify-between items-center px-3 py-2.5"
                    style={{
                      height: "44px",
                      background:
                        selectedProvince === province
                          ? "rgba(0, 143, 237, 0.1)"
                          : "transparent",
                    }}
                    onClick={() => setSelectedProvince(province)}
                    data-testid={`province-${province}`}
                  >
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "15px",
                        fontWeight: selectedProvince === province ? 600 : 500,
                        letterSpacing:
                          selectedProvince === province ? "-0.02em" : "-0.01em",
                        color:
                          selectedProvince === province ? "#008FED" : "#686A6E",
                      }}
                    >
                      {province}
                    </span>
                    {selectedProvince === province && (
                      <ChevronRight size={20} style={{ color: "#008FED" }} />
                    )}
                  </button>
                ))}
              </div>

              {/* District List */}
              <div className="flex-1 flex flex-col overflow-y-auto px-3">
                {KOREA_REGIONS[selectedProvince]?.map((district) => {
                  const regionKey = `${selectedProvince} ${district}`;
                  const isSelected = tempSelectedRegions.includes(regionKey);

                  return (
                    <button
                      key={district}
                      className="flex items-center px-3 py-2.5"
                      style={{
                        height: "44px",
                        background: isSelected
                          ? "rgba(0, 143, 237, 0.1)"
                          : "transparent",
                      }}
                      onClick={() => {
                        if (isSelected) {
                          setTempSelectedRegions(
                            tempSelectedRegions.filter((r) => r !== regionKey),
                          );
                        } else {
                          setTempSelectedRegions([
                            ...tempSelectedRegions,
                            regionKey,
                          ]);
                        }
                      }}
                      data-testid={`district-${district}`}
                    >
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "15px",
                          fontWeight: isSelected ? 600 : 500,
                          letterSpacing: isSelected ? "-0.02em" : "-0.01em",
                          color: isSelected ? "#008FED" : "#686A6E",
                        }}
                      >
                        {district}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Tags Area */}
            <div
              className="flex flex-col mx-5 mt-4"
              style={{
                minHeight: "100px",
                maxHeight: "180px",
              }}
            >
              <div className="flex flex-wrap gap-2 overflow-y-auto">
                {tempSelectedRegions.map((region, idx) => (
                  <div
                    key={idx}
                    className="flex items-center px-3 py-1.5 gap-1"
                    style={{
                      background: "#E3F2FD",
                      borderRadius: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "13px",
                        fontWeight: 400,
                        color: "#008FED",
                      }}
                    >
                      {region}
                    </span>
                    <button
                      onClick={() => {
                        setTempSelectedRegions(
                          tempSelectedRegions.filter((_, i) => i !== idx),
                        );
                      }}
                      className="ml-1"
                      style={{
                        color: "#008FED",
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Button */}
            <div
              className="flex justify-center items-center mx-5 mt-auto mb-5"
              style={{
                height: "48px",
              }}
            >
              <button
                className="w-full flex items-center justify-center"
                style={{
                  height: "48px",
                  background: "#008FED",
                  borderRadius: "6px",
                }}
                onClick={() => {
                  setCreateAccountForm({
                    ...createAccountForm,
                    serviceRegions: tempSelectedRegions,
                  });
                  setShowRegionModal(false);
                }}
                data-testid="button-region-confirm"
              >
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: "#FDFDFD",
                  }}
                >
                  완료
                </span>
              </button>
            </div>
          </div>
        </>
      )}
        </>
      )}

      {/* Add Notice Modal */}
      {showAddNoticeModal && (
        <>
          {/* Modal Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => {
              if (noticeTitle.trim() || noticeContent.trim()) {
                setShowNoticeCancelConfirmModal(true);
              } else {
                setShowAddNoticeModal(false);
                setNoticeTitle("");
                setNoticeContent("");
              }
            }}
            data-testid="modal-overlay-add-notice"
          />

          {/* Modal Panel */}
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
            style={{
              width: "420px",
              background: "#FDFDFD",
              borderRadius: "12px",
              padding: "24px",
            }}
            data-testid="modal-add-notice"
          >
            {/* Title */}
            <h2
              className="mb-6"
              style={{
                fontFamily: "Pretendard",
                fontSize: "20px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "#0C0C0C",
              }}
            >
              공지사항 추가
            </h2>

            {/* Title Input */}
            <div className="mb-4">
              <label
                className="block mb-2"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#0C0C0C",
                }}
              >
                제목
              </label>
              <input
                type="text"
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
                placeholder="제목을 작성하세요"
                className="w-full px-4 py-3"
                style={{
                  background: "#FDFDFD",
                  border: "2px solid rgba(12, 12, 12, 0.08)",
                  borderRadius: "8px",
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  color: "#0C0C0C",
                }}
                data-testid="input-notice-title"
              />
            </div>

            {/* Content Input */}
            <div className="mb-2">
              <label
                className="block mb-2"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#0C0C0C",
                }}
              >
                내용
              </label>
              <div className="relative">
                <textarea
                  value={noticeContent}
                  onChange={(e) => {
                    if (e.target.value.length <= 1000) {
                      setNoticeContent(e.target.value);
                    }
                  }}
                  placeholder="내용을 작성하세요"
                  rows={10}
                  className="w-full px-4 py-3 resize-none"
                  style={{
                    background: "#FDFDFD",
                    border: "2px solid rgba(12, 12, 12, 0.08)",
                    borderRadius: "8px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    color: "#0C0C0C",
                  }}
                  data-testid="textarea-notice-content"
                />
                <div
                  className="absolute bottom-3 right-3"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "12px",
                    fontWeight: 400,
                    color: "#686A6E",
                  }}
                >
                  {noticeContent.length}/1000
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  if (noticeTitle.trim() || noticeContent.trim()) {
                    setShowNoticeCancelConfirmModal(true);
                  } else {
                    setShowAddNoticeModal(false);
                    setNoticeTitle("");
                    setNoticeContent("");
                  }
                }}
                className="flex-1 py-3"
                style={{
                  background: "#F5F5F5",
                  borderRadius: "8px",
                  fontFamily: "Pretendard",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#686A6E",
                }}
                data-testid="button-cancel-notice"
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (!noticeTitle.trim() || !noticeContent.trim()) {
                    toast({
                      title: "입력 오류",
                      description: "제목과 내용을 입력해주세요.",
                      variant: "destructive",
                    });
                    return;
                  }
                  setShowNoticeConfirmModal(true);
                }}
                className="flex-1 py-3"
                style={{
                  background: "#008FED",
                  borderRadius: "8px",
                  fontFamily: "Pretendard",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#FDFDFD",
                }}
                data-testid="button-submit-notice"
              >
                게시
              </button>
            </div>
          </div>
        </>
      )}

      {/* Notice Confirmation Modal */}
      {showNoticeConfirmModal && (
        <>
          {/* Modal Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setShowNoticeConfirmModal(false)}
            data-testid="modal-overlay-confirm-notice"
          />

          {/* Modal Panel */}
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
            style={{
              width: "480px",
              background: "#FDFDFD",
              borderRadius: "12px",
              padding: "32px",
            }}
            data-testid="modal-confirm-notice"
          >
            {/* Title */}
            <h2
              className="mb-4"
              style={{
                fontFamily: "Pretendard",
                fontSize: "20px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "#0C0C0C",
                textAlign: "center",
              }}
            >
              공지를 게시하시겠습니까?
            </h2>

            {/* Message */}
            <p
              className="mb-8"
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
                fontWeight: 400,
                lineHeight: "1.6",
                color: "#686A6E",
                textAlign: "center",
              }}
            >
              게시 후에는 즉시 노출됩니다. 내용과 대상을 다시 확인해주세요.
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowNoticeConfirmModal(false)}
                className="flex-1 py-3"
                style={{
                  background: "transparent",
                  borderRadius: "8px",
                  fontFamily: "Pretendard",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#FF4444",
                }}
                data-testid="button-cancel-confirm-notice"
              >
                취소
              </button>
              <button
                onClick={() => {
                  createNoticeMutation.mutate({
                    title: noticeTitle.trim(),
                    content: noticeContent.trim(),
                  });
                  setShowNoticeConfirmModal(false);
                }}
                disabled={createNoticeMutation.isPending}
                className="flex-1 py-3"
                style={{
                  background: createNoticeMutation.isPending ? "#CCC" : "#008FED",
                  borderRadius: "8px",
                  fontFamily: "Pretendard",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#FDFDFD",
                  cursor: createNoticeMutation.isPending ? "not-allowed" : "pointer",
                }}
                data-testid="button-confirm-submit-notice"
              >
                {createNoticeMutation.isPending ? "등록 중..." : "게시"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Notice Cancel Confirmation Modal */}
      {showNoticeCancelConfirmModal && (
        <>
          {/* Modal Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setShowNoticeCancelConfirmModal(false)}
            data-testid="modal-overlay-cancel-confirm-notice"
          />

          {/* Modal Panel */}
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
            style={{
              width: "480px",
              background: "#FDFDFD",
              borderRadius: "12px",
              padding: "32px",
            }}
            data-testid="modal-cancel-confirm-notice"
          >
            {/* Title */}
            <h2
              className="mb-4"
              style={{
                fontFamily: "Pretendard",
                fontSize: "20px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "#0C0C0C",
                textAlign: "center",
              }}
            >
              작성을 중료하시겠습니까?
            </h2>

            {/* Message */}
            <p
              className="mb-8"
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
                fontWeight: 400,
                lineHeight: "1.6",
                color: "#686A6E",
                textAlign: "center",
              }}
            >
              나가시게 되면 입력 내용이 사라집니다.
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowNoticeCancelConfirmModal(false)}
                className="flex-1 py-3"
                style={{
                  background: "transparent",
                  borderRadius: "8px",
                  fontFamily: "Pretendard",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#FF4444",
                }}
                data-testid="button-stay-writing"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setShowNoticeCancelConfirmModal(false);
                  setShowAddNoticeModal(false);
                  setNoticeTitle("");
                  setNoticeContent("");
                }}
                className="flex-1 py-3"
                style={{
                  background: "#008FED",
                  borderRadius: "8px",
                  fontFamily: "Pretendard",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#FDFDFD",
                }}
                data-testid="button-leave-writing"
              >
                나가기
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
