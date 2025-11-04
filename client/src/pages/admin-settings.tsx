import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, X, ChevronDown } from "lucide-react";
import logoIcon from "@assets/Frame 2_1762217940686.png";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, VALID_ROLES } from "@shared/schema";

export default function AdminSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeMenu, setActiveMenu] = useState("사용자 계정 관리");
  const [roleFilter, setRoleFilter] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedUser, setSelectedUser] = useState<Omit<User, 'password'> | null>(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState("0000");
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showAccountCreatedModal, setShowAccountCreatedModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [sendEmailNotification, setSendEmailNotification] = useState(false);
  const [sendSmsNotification, setSendSmsNotification] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("0000");
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
    language: "",
    salaryGrade: "",
    contractNumber: "",
    accountHolder: "",
    availableHours: "",
    serviceRegion: "",
  });

  // Check authentication
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Fetch all users from server
  const { data: allUsers = [], isLoading: usersLoading } = useQuery<Omit<User, 'password'>[]>({
    queryKey: ["/api/users"],
    enabled: !!user,
  });

  useEffect(() => {
    if (!userLoading && !user) {
      setLocation("/");
    }
  }, [user, userLoading, setLocation]);

  const sidebarMenus = [
    { name: "사용자 계정 관리", active: true },
    { name: "접근 권한 관리", active: false },
    { name: "1:1 문의 관리", active: false },
    { name: "DB 관리", active: false },
    { name: "기준정보 관리", active: false },
    { name: "알림 메시지 전송", active: false },
  ];

  // Use VALID_ROLES from schema for role filter options
  const roleFilters = ["전체", ...VALID_ROLES];

  // Apply filtering and search
  const filteredUsers = allUsers.filter((u) => {
    // Role filter
    const matchesRole = roleFilter === "전체" || u.role === roleFilter;
    
    // Search filter - improved with trim and lowercase
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const normalizedName = u.name.toLowerCase();
    const matchesSearch = normalizedQuery === "" || normalizedName.includes(normalizedQuery);
    
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
    <div className="relative" style={{ height: '1223px', background: '#E7EDFE' }}>
      {/* Blur Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute"
          style={{
            width: '1095px',
            height: '777px',
            left: '97px',
            bottom: '-200px',
            background: 'rgba(254, 240, 230, 0.4)',
            borderRadius: '9999px',
            filter: 'blur(212px)',
            transform: 'rotate(-35.25deg)',
          }}
        />
        <div 
          className="absolute"
          style={{
            width: '1335px',
            height: '1323px',
            left: '811px',
            bottom: '0px',
            background: 'rgba(234, 230, 254, 0.5)',
            borderRadius: '9999px',
            filter: 'blur(212px)',
          }}
        />
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

      {/* Header */}
      <header 
        className="relative w-full h-[89px] px-8 flex items-center justify-between"
        style={{
          background: 'rgba(255, 255, 255, 0.06)',
          borderBottom: '1px solid rgba(0, 143, 237, 0.2)',
          backdropFilter: 'blur(22px)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 w-[260px]">
          <img 
            src={logoIcon} 
            alt="FLOXN Logo" 
            className="w-6 h-6"
          />
          <div className="text-2xl font-bold text-gray-900">FLOXN</div>
        </div>

        {/* Navigation Menu */}
        <div className="flex items-center gap-6 flex-1 px-6">
          {["홈", "접수하기", "진행상황", "현장조사", "종합진행관리", "통계 및 정산", "관리자 설정"].map((item) => (
            <button
              key={item}
              onClick={() => {
                if (item === "홈") setLocation("/dashboard");
              }}
              className="px-6 py-3 rounded-lg transition-colors"
              style={{
                fontFamily: 'Pretendard',
                fontSize: '18px',
                fontWeight: item === "관리자 설정" ? 600 : 500,
                letterSpacing: '-0.02em',
                color: item === "관리자 설정" ? '#0C0C0C' : 'rgba(12, 12, 12, 0.5)',
              }}
              data-testid={`menu-${item}`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0, 143, 237, 0.3)' }}
          />
          <div className="flex items-center gap-2">
            <span 
              style={{
                fontFamily: 'Pretendard',
                fontSize: '15px',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: 'rgba(12, 12, 12, 0.7)',
              }}
            >
              xblock01
            </span>
            <span 
              style={{
                fontFamily: 'Pretendard',
                fontSize: '15px',
                fontWeight: 500,
                letterSpacing: '-0.01em',
                color: 'rgba(12, 12, 12, 0.4)',
              }}
            >
              관리자
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative flex" style={{ height: 'calc(1223px - 89px)' }}>
        {/* Left Sidebar */}
        <div 
          className="flex flex-col"
          style={{
            width: '260px',
            background: 'rgba(255, 255, 255, 0.06)',
            borderRight: '1px solid rgba(0, 143, 237, 0.2)',
          }}
        >
          {/* Section Header */}
          <div className="px-8 py-4">
            <span 
              style={{
                fontFamily: 'Pretendard',
                fontSize: '15px',
                fontWeight: 500,
                letterSpacing: '-0.01em',
                color: 'rgba(12, 12, 12, 0.5)',
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
                  background: activeMenu === menu.name ? 'rgba(12, 12, 12, 0.08)' : 'transparent',
                  fontFamily: 'Pretendard',
                  fontSize: '16px',
                  fontWeight: activeMenu === menu.name ? 700 : 500,
                  letterSpacing: '-0.02em',
                  color: activeMenu === menu.name ? '#008FED' : 'rgba(12, 12, 12, 0.8)',
                }}
                data-testid={`sidebar-${menu.name}`}
              >
                {menu.name}
              </button>
            ))}
          </div>
        </div>

        {/* Main Section */}
        <div className="flex-1 px-8 py-6">
          {/* Title */}
          <div className="flex items-center mb-6">
            <h1 
              style={{
                fontFamily: 'Pretendard',
                fontSize: '26px',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: '#0C0C0C',
              }}
            >
              사용자 계정 관리
            </h1>
          </div>

          {/* Search Card */}
          <div 
            className="mb-6 rounded-xl"
            style={{
              background: '#FFFFFF',
              boxShadow: '0px 0px 20px #DBE9F5',
            }}
          >
            {/* Card Header */}
            <div 
              className="px-6 py-6"
              style={{
                borderBottom: '2px solid rgba(12, 12, 12, 0.1)',
              }}
            >
              <span 
                style={{
                  fontFamily: 'Pretendard',
                  fontSize: '20px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: '#0C0C0C',
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
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: 500,
                    letterSpacing: '-0.01em',
                    color: '#686A6E',
                  }}
                >
                  검색
                </label>
                <div className="flex items-center">
                  <div 
                    className="flex items-center flex-1 px-5 py-4 gap-3"
                    style={{
                      background: '#FDFDFD',
                      border: '2px solid rgba(12, 12, 12, 0.08)',
                      borderRadius: '8px 0px 0px 8px',
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
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: 600,
                        letterSpacing: '-0.02em',
                        color: searchInput ? 'rgba(12, 12, 12, 0.9)' : 'rgba(12, 12, 12, 0.4)',
                      }}
                      data-testid="input-search"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    className="px-5 py-4"
                    style={{
                      width: '155px',
                      height: '68px',
                      background: '#008FED',
                      border: '2px solid rgba(12, 12, 12, 0.08)',
                      borderRadius: '0px 8px 8px 0px',
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 600,
                      letterSpacing: '-0.02em',
                      color: '#FDFDFD',
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
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: 500,
                    letterSpacing: '-0.01em',
                    color: '#686A6E',
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
                        background: roleFilter === filter ? 'rgba(0, 143, 237, 0.1)' : 'transparent',
                        border: roleFilter === filter ? '2px solid rgba(255, 255, 255, 0.04)' : '1px solid rgba(12, 12, 12, 0.3)',
                        boxShadow: roleFilter === filter ? 'inset 0px -2px 4px rgba(0, 0, 0, 0.05), inset 0px 2px 4px rgba(0, 0, 0, 0.05)' : 'none',
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: roleFilter === filter ? 600 : 400,
                        letterSpacing: '-0.02em',
                        color: roleFilter === filter ? '#008FED' : 'rgba(12, 12, 12, 0.9)',
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
                    fontFamily: 'Pretendard',
                    fontSize: '20px',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: '#0C0C0C',
                  }}
                >
                  계정
                </span>
                <span 
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '20px',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: '#008FED',
                  }}
                  data-testid="text-user-count"
                >
                  {filteredUsers.length}
                </span>
              </div>
              <button
                className="flex items-center justify-center px-6 hover-elevate active-elevate-2"
                style={{
                  height: '48px',
                  background: '#008FED',
                  borderRadius: '6px',
                }}
                onClick={() => setShowCreateAccountModal(true)}
                data-testid="button-create-account"
              >
                <span style={{
                  fontFamily: 'Pretendard',
                  fontSize: '16px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: '#FDFDFD',
                }}>
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
                  height: '54px',
                  background: 'rgba(12, 12, 12, 0.04)',
                }}
              >
                <div className="px-2" style={{ width: '122px' }}>
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '15px',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: 'rgba(12, 12, 12, 0.6)',
                  }}>역할</span>
                </div>
                <div className="px-2" style={{ width: '155px' }}>
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '15px',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: 'rgba(12, 12, 12, 0.6)',
                  }}>회사명</span>
                </div>
                <div className="px-2 flex-1">
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '15px',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: 'rgba(12, 12, 12, 0.6)',
                  }}>성함</span>
                </div>
                <div className="px-2" style={{ width: '134px' }}>
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '15px',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: 'rgba(12, 12, 12, 0.6)',
                  }}>소속부서</span>
                </div>
                <div className="px-2 flex-1">
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '15px',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: 'rgba(12, 12, 12, 0.6)',
                  }}>직급</span>
                </div>
                <div className="px-2" style={{ width: '190px' }}>
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '15px',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: 'rgba(12, 12, 12, 0.6)',
                  }}>이메일 주소</span>
                </div>
                <div className="px-2" style={{ width: '162px' }}>
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '15px',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: 'rgba(12, 12, 12, 0.6)',
                  }}>ID</span>
                </div>
                <div className="px-2" style={{ width: '163px' }}>
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '15px',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: 'rgba(12, 12, 12, 0.6)',
                  }}>연락처</span>
                </div>
                <div className="px-2" style={{ width: '163px' }}>
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '15px',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: 'rgba(12, 12, 12, 0.6)',
                  }}>사무실 전화</span>
                </div>
                <div className="px-2" style={{ width: '163px' }}>
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '15px',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: 'rgba(12, 12, 12, 0.6)',
                  }}>계정 생성일</span>
                </div>
                <div className="px-2 flex-1">
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '15px',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: 'rgba(12, 12, 12, 0.6)',
                  }}>요청</span>
                </div>
              </div>

              {/* Table Rows */}
              {filteredUsers.map((user) => (
                <div 
                  key={user.id}
                  className="flex items-center px-3 hover:bg-black/5 transition-colors"
                  style={{
                    height: '44px',
                  }}
                  data-testid={`user-row-${user.id}`}
                >
                  <div className="px-2 cursor-pointer" style={{ width: '122px' }} onClick={() => setSelectedUser(user)}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.8)',
                    }}>{user.role}</span>
                  </div>
                  <div className="px-2 cursor-pointer" style={{ width: '155px' }} onClick={() => setSelectedUser(user)}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.8)',
                    }}>{user.company}</span>
                  </div>
                  <div className="px-2 flex-1 cursor-pointer" onClick={() => setSelectedUser(user)}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.8)',
                    }}>{user.name}</span>
                  </div>
                  <div className="px-2 cursor-pointer" style={{ width: '134px' }} onClick={() => setSelectedUser(user)}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.8)',
                    }}>{user.department}</span>
                  </div>
                  <div className="px-2 flex-1 cursor-pointer" onClick={() => setSelectedUser(user)}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.8)',
                    }}>{user.position}</span>
                  </div>
                  <div className="px-2 cursor-pointer" style={{ width: '190px' }} onClick={() => setSelectedUser(user)}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.8)',
                    }}>{user.email}</span>
                  </div>
                  <div className="px-2 cursor-pointer" style={{ width: '162px' }} onClick={() => setSelectedUser(user)}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.8)',
                    }}>{user.username}</span>
                  </div>
                  <div className="px-2 cursor-pointer" style={{ width: '163px' }} onClick={() => setSelectedUser(user)}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.8)',
                    }}>{user.phone}</span>
                  </div>
                  <div className="px-2 cursor-pointer" style={{ width: '163px' }} onClick={() => setSelectedUser(user)}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.8)',
                    }}>{user.office}</span>
                  </div>
                  <div className="px-2 cursor-pointer" style={{ width: '163px' }} onClick={() => setSelectedUser(user)}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.8)',
                    }}>{user.createdAt}</span>
                  </div>
                  <div className="px-2 flex-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUser(user);
                      }}
                      className="flex items-center justify-center"
                      style={{
                        width: '92px',
                        height: '28px',
                        background: '#FFFFFF',
                        border: '1px solid rgba(12, 12, 12, 0.2)',
                        borderRadius: '6px',
                      }}
                      data-testid={`button-view-detail-${user.id}`}
                    >
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 500,
                        letterSpacing: '-0.01em',
                        color: 'rgba(12, 12, 12, 0.8)',
                      }}>
                        자세히 보기
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Account Detail Modal */}
      {selectedUser && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40"
            style={{
              background: 'rgba(0, 0, 0, 0.7)',
              opacity: 0.4,
            }}
            onClick={() => setSelectedUser(null)}
            data-testid="modal-overlay"
          />

          {/* Modal Panel */}
          <div 
            className="fixed right-0 top-0 z-50 bg-white"
            style={{
              width: '609px',
              height: '100vh',
              overflowY: 'auto',
            }}
            data-testid="modal-account-detail"
          >
            {/* Header */}
            <div 
              className="flex items-center justify-center relative"
              style={{
                height: '128px',
                padding: '24px 20px',
              }}
            >
              <h2 style={{
                fontFamily: 'Pretendard',
                fontSize: '22px',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: '#0C0C0C',
              }}>
                계정 상세보기
              </h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="absolute right-5"
                style={{
                  width: '24px',
                  height: '24px',
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
                background: 'rgba(12, 12, 12, 0.04)',
                backdropFilter: 'blur(7px)',
                borderRadius: '12px',
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{
                  fontFamily: 'Pretendard',
                  fontSize: '18px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: 'rgba(12, 12, 12, 0.9)',
                }}>
                  {selectedUser.name}
                </span>
                <div 
                  className="w-1 h-1 rounded-full"
                  style={{ background: 'rgba(0, 143, 237, 0.9)' }}
                />
                <span style={{
                  fontFamily: 'Pretendard',
                  fontSize: '18px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: 'rgba(12, 12, 12, 0.9)',
                }}>
                  {selectedUser.company}
                </span>
                <div 
                  className="flex items-center justify-center px-2.5 py-1 rounded-full"
                  style={{
                    background: 'rgba(12, 12, 12, 0.1)',
                    backdropFilter: 'blur(7px)',
                  }}
                >
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: 400,
                    letterSpacing: '-0.01em',
                    color: 'rgba(12, 12, 12, 0.7)',
                  }}>
                    {selectedUser.role}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span style={{
                  fontFamily: 'Pretendard',
                  fontSize: '16px',
                  fontWeight: 400,
                  letterSpacing: '-0.02em',
                  color: 'rgba(12, 12, 12, 0.7)',
                }}>
                  {selectedUser.username}
                </span>
                <span style={{
                  fontFamily: 'Pretendard',
                  fontSize: '16px',
                  fontWeight: 400,
                  letterSpacing: '-0.02em',
                  color: 'rgba(12, 12, 12, 0.7)',
                }}>
                  {selectedUser.phone}
                </span>
              </div>
            </div>

            {/* Content Sections */}
            <div className="flex flex-col px-5 mt-8">
              {/* Basic Info Section */}
              <div className="flex flex-col pb-7" style={{ borderBottom: '1px solid rgba(12, 12, 12, 0.1)' }}>
                <div className="px-4 py-2.5">
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '15px',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: 'rgba(12, 12, 12, 0.9)',
                  }}>
                    {selectedUser.role === '보험사' ? '기본 정보' : '사용자 정보'}
                  </span>
                </div>
                <div className="flex flex-col gap-4">
                  {/* Row 1 */}
                  <div className="flex gap-5">
                    <div className="flex-1 flex flex-col gap-2">
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 400,
                        letterSpacing: '-0.01em',
                        color: 'rgba(12, 12, 12, 0.5)',
                      }}>성함</span>
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: 400,
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}>{selectedUser.name}</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 400,
                        letterSpacing: '-0.01em',
                        color: 'rgba(12, 12, 12, 0.5)',
                      }}>ID</span>
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: 400,
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}>{selectedUser.username}</span>
                    </div>
                  </div>
                  {/* Row 2 */}
                  <div className="flex gap-5">
                    <div className="flex-1 flex flex-col gap-2">
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 400,
                        letterSpacing: '-0.01em',
                        color: 'rgba(12, 12, 12, 0.5)',
                      }}>연락처</span>
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: 400,
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}>{selectedUser.phone}</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 400,
                        letterSpacing: '-0.01em',
                        color: 'rgba(12, 12, 12, 0.5)',
                      }}>이메일 주소</span>
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: 400,
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}>{selectedUser.email}</span>
                    </div>
                  </div>
                  {/* Row 3 */}
                  <div className="flex gap-5">
                    <div className="flex-1 flex flex-col gap-2">
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 400,
                        letterSpacing: '-0.01em',
                        color: 'rgba(12, 12, 12, 0.5)',
                      }}>계정 생성일</span>
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: 400,
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}>{selectedUser.createdAt}</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 400,
                        letterSpacing: '-0.01em',
                        color: 'rgba(12, 12, 12, 0.5)',
                      }}>역할</span>
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: 400,
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}>{selectedUser.role}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Company Info Section */}
              <div className="flex flex-col py-7">
                <div className="px-4 py-2.5">
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '15px',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: 'rgba(12, 12, 12, 0.9)',
                  }}>
                    {selectedUser.role === '보험사' ? '보험사 정보' : 
                     selectedUser.role === '관리자' ? '관리자 정보' : 
                     selectedUser.role === '심사사' ? '심사사 정보' :
                     selectedUser.role === '조사사' ? '조사사 정보' :
                     selectedUser.role === '협력사' ? '협력사 정보' :
                     '회사 정보'}
                  </span>
                </div>
                <div className="flex flex-col gap-4">
                  {/* Row 1 */}
                  <div className="flex gap-5">
                    <div className="flex-1 flex flex-col gap-2">
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 400,
                        letterSpacing: '-0.01em',
                        color: 'rgba(12, 12, 12, 0.5)',
                      }}>회사명</span>
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: 400,
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}>{selectedUser.company}</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 400,
                        letterSpacing: '-0.01em',
                        color: 'rgba(12, 12, 12, 0.5)',
                      }}>소속부서</span>
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: 400,
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}>{selectedUser.department}</span>
                    </div>
                  </div>
                  {/* Row 2 */}
                  <div className="flex gap-5">
                    <div className="flex-1 flex flex-col gap-2">
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 400,
                        letterSpacing: '-0.01em',
                        color: 'rgba(12, 12, 12, 0.5)',
                      }}>직급</span>
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: 400,
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}>{selectedUser.position}</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 400,
                        letterSpacing: '-0.01em',
                        color: 'rgba(12, 12, 12, 0.5)',
                      }}>사무실 전화</span>
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: 400,
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}>{selectedUser.office}</span>
                    </div>
                  </div>
                  {/* Row 3 */}
                  <div className="flex gap-5">
                    <div className="flex-1 flex flex-col gap-2">
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 400,
                        letterSpacing: '-0.01em',
                        color: 'rgba(12, 12, 12, 0.5)',
                      }}>주소</span>
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: 400,
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}>{selectedUser.address}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Buttons */}
            <div 
              className="absolute bottom-0 left-0 right-0 flex gap-5 px-8"
              style={{
                height: '64px',
                alignItems: 'center',
              }}
            >
              <button
                className="flex-1 flex items-center justify-center rounded-xl"
                style={{
                  height: '64px',
                  background: '#D02B20',
                  boxShadow: '2px 4px 30px #BDD1F0',
                }}
                onClick={() => {
                  setShowDeleteAccountModal(true);
                }}
                data-testid="button-delete-account"
              >
                <span style={{
                  fontFamily: 'Pretendard',
                  fontSize: '20px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: '#FDFDFD',
                }}>
                  계정 삭제
                </span>
              </button>
              <button
                className="flex-1 flex items-center justify-center rounded-xl"
                style={{
                  height: '64px',
                  background: 'transparent',
                  boxShadow: '2px 4px 30px #BDD1F0',
                }}
                onClick={() => {
                  setShowResetPasswordModal(true);
                }}
                data-testid="button-reset-password"
              >
                <span style={{
                  fontFamily: 'Pretendard',
                  fontSize: '20px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: '#D02B20',
                }}>
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
              background: 'rgba(0, 0, 0, 0.7)',
              opacity: 0.4,
            }}
            onClick={() => setShowResetPasswordModal(false)}
            data-testid="modal-overlay-reset"
          />

          {/* Modal */}
          <div 
            className="fixed z-50 bg-white flex flex-col"
            style={{
              width: '747px',
              height: '516px',
              left: 'calc(50% - 747px/2 + 0.5px)',
              top: 'calc(50% - 516px/2 + 0.5px)',
              boxShadow: '0px -2px 70px rgba(179, 193, 205, 0.8)',
              borderRadius: '12px',
              gap: '32px',
            }}
            data-testid="modal-reset-password"
          >
            {/* Header */}
            <div 
              className="flex flex-col items-center"
              style={{
                width: '747px',
                height: '396px',
                gap: '16px',
              }}
            >
              <div 
                className="flex flex-row justify-center items-center"
                style={{
                  width: '747px',
                  height: '60px',
                  gap: '321px',
                }}
              >
                <h2 style={{
                  fontFamily: 'Pretendard',
                  fontSize: '18px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: '#0C0C0C',
                }}>
                  비밀번호 초기화
                </h2>
              </div>

              {/* Content */}
              <div 
                className="flex flex-col"
                style={{
                  width: '707px',
                  height: '320px',
                  gap: '24px',
                }}
              >
                {/* Selected Account Section */}
                <div 
                  className="flex flex-col"
                  style={{
                    width: '707px',
                    height: '244px',
                    gap: '20px',
                  }}
                >
                  {/* Section Title */}
                  <div className="flex flex-col" style={{ width: '707px', height: '114px', gap: '8px' }}>
                    <div className="flex flex-row" style={{ width: '707px', height: '18px', gap: '2px' }}>
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 500,
                        letterSpacing: '-0.01em',
                        color: '#686A6E',
                      }}>
                        선택 계정
                      </span>
                    </div>

                    {/* Profile Card */}
                    <div 
                      className="flex flex-col justify-center p-5"
                      style={{
                        width: '707px',
                        height: '88px',
                        background: 'rgba(12, 12, 12, 0.04)',
                        backdropFilter: 'blur(7px)',
                        borderRadius: '12px',
                        gap: '8px',
                      }}
                    >
                      <div className="flex flex-row items-center" style={{ width: '667px', height: '26px', gap: '16px' }}>
                        <div className="flex flex-row items-center" style={{ width: '180px', height: '26px', gap: '9px' }}>
                          <span style={{
                            fontFamily: 'Pretendard',
                            fontSize: '18px',
                            fontWeight: 600,
                            letterSpacing: '-0.02em',
                            color: 'rgba(12, 12, 12, 0.9)',
                          }}>
                            {selectedUser.name}
                          </span>
                          <div 
                            style={{
                              width: '4px',
                              height: '4px',
                              background: 'rgba(0, 143, 237, 0.9)',
                              borderRadius: '50%',
                            }}
                          />
                          <span style={{
                            fontFamily: 'Pretendard',
                            fontSize: '18px',
                            fontWeight: 600,
                            letterSpacing: '-0.02em',
                            color: 'rgba(12, 12, 12, 0.9)',
                          }}>
                            {selectedUser.company}
                          </span>
                          <div 
                            className="flex items-center justify-center"
                            style={{
                              width: '57px',
                              height: '26px',
                              padding: '4px 10px',
                              background: 'rgba(12, 12, 12, 0.1)',
                              backdropFilter: 'blur(7px)',
                              borderRadius: '20px',
                            }}
                          >
                            <span style={{
                              fontFamily: 'Pretendard',
                              fontSize: '14px',
                              fontWeight: 400,
                              letterSpacing: '-0.01em',
                              color: 'rgba(12, 12, 12, 0.7)',
                            }}>
                              {selectedUser.role}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-row" style={{ width: '400px', height: '20px', gap: '24px' }}>
                        <span style={{
                          fontFamily: 'Pretendard',
                          fontSize: '16px',
                          fontWeight: 400,
                          letterSpacing: '-0.02em',
                          color: 'rgba(12, 12, 12, 0.7)',
                        }}>
                          {selectedUser.username}
                        </span>
                        <span style={{
                          fontFamily: 'Pretendard',
                          fontSize: '16px',
                          fontWeight: 400,
                          letterSpacing: '-0.02em',
                          color: 'rgba(12, 12, 12, 0.7)',
                        }}>
                          {selectedUser.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* New Password Section */}
                  <div 
                    className="flex flex-col"
                    style={{
                      width: '707px',
                      height: '110px',
                      gap: '10px',
                    }}
                  >
                    <div className="flex flex-col" style={{ width: '432px', height: '76px', gap: '8px' }}>
                      <div className="flex flex-row" style={{ width: '432px', height: '18px', gap: '2px' }}>
                        <span style={{
                          fontFamily: 'Pretendard',
                          fontSize: '14px',
                          fontWeight: 500,
                          letterSpacing: '-0.01em',
                          color: '#686A6E',
                        }}>
                          새 비밀번호(자동)
                        </span>
                      </div>

                      {/* Input Field + Reset Button */}
                      <div className="flex flex-row items-center" style={{ width: '432px', height: '50px', gap: '8px' }}>
                        <div 
                          className="flex flex-row items-center"
                          style={{
                            width: '343px',
                            height: '50px',
                            padding: '10px 20px',
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            gap: '10px',
                          }}
                        >
                          <span style={{
                            fontFamily: 'Pretendard',
                            fontSize: '16px',
                            fontWeight: 600,
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                          }}>
                            {resetPasswordValue}
                          </span>
                        </div>

                        <button
                          className="flex flex-row items-center justify-center"
                          style={{
                            width: '81px',
                            height: '50px',
                            padding: '10px 20px',
                            background: 'rgba(208, 43, 32, 0.1)',
                            border: '1px solid #D02B20',
                            borderRadius: '8px',
                            gap: '10px',
                          }}
                          onClick={() => setResetPasswordValue("0000")}
                          data-testid="button-trigger-reset"
                        >
                          <span style={{
                            fontFamily: 'Pretendard',
                            fontSize: '16px',
                            fontWeight: 600,
                            letterSpacing: '-0.02em',
                            color: '#D02B20',
                          }}>
                            초기화
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Warning Message */}
                    <div 
                      className="flex flex-row justify-center items-center"
                      style={{
                        width: '707px',
                        height: '52px',
                        padding: '16px 12px',
                        background: 'rgba(255, 226, 85, 0.2)',
                        backdropFilter: 'blur(7px)',
                        borderRadius: '20px',
                        gap: '10px',
                      }}
                    >
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: 500,
                        letterSpacing: '-0.02em',
                        color: '#A16000',
                      }}>
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
                width: '747px',
                height: '88px',
                padding: '20px',
                background: '#FDFDFD',
                borderTop: '1px solid rgba(12, 12, 12, 0.08)',
                gap: '10px',
              }}
            >
              <div 
                className="flex flex-row justify-between items-center"
                style={{
                  width: '707px',
                  height: '48px',
                }}
              >
                <button
                  className="flex flex-row justify-center items-center"
                  style={{
                    width: '353.5px',
                    height: '48px',
                    padding: '10px',
                    borderRadius: '6px',
                    gap: '10px',
                  }}
                  onClick={() => setShowResetPasswordModal(false)}
                  data-testid="button-cancel-reset"
                >
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '16px',
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                    color: '#D02B20',
                  }}>
                    취소
                  </span>
                </button>

                <button
                  className="flex flex-row justify-center items-center"
                  style={{
                    width: '353.5px',
                    height: '48px',
                    padding: '10px',
                    background: '#008FED',
                    borderRadius: '6px',
                    gap: '10px',
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
                        description: error instanceof Error ? error.message : "비밀번호 변경 중 오류가 발생했습니다.",
                      });
                    }
                  }}
                  data-testid="button-confirm-reset"
                >
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '16px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: '#FDFDFD',
                  }}>
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
              background: 'rgba(0, 0, 0, 0.7)',
              opacity: 0.4,
            }}
            onClick={() => setShowDeleteAccountModal(false)}
            data-testid="modal-overlay-delete"
          />

          {/* Modal */}
          <div 
            className="fixed z-50 bg-white flex flex-col"
            style={{
              width: '747px',
              height: '386px',
              left: 'calc(50% - 747px/2 + 0.5px)',
              top: 'calc(50% - 386px/2 + 0.5px)',
              boxShadow: '0px -2px 70px rgba(179, 193, 205, 0.8)',
              borderRadius: '12px',
              gap: '32px',
            }}
            data-testid="modal-delete-account"
          >
            {/* Content */}
            <div 
              className="flex flex-col items-center"
              style={{
                width: '747px',
                height: '266px',
                gap: '16px',
              }}
            >
              {/* Header */}
              <div 
                className="flex flex-row justify-center items-center"
                style={{
                  width: '747px',
                  height: '60px',
                  gap: '321px',
                }}
              >
                <h2 style={{
                  fontFamily: 'Pretendard',
                  fontSize: '18px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: '#0C0C0C',
                }}>
                  계정 삭제
                </h2>
              </div>

              {/* Body */}
              <div 
                className="flex flex-col"
                style={{
                  width: '707px',
                  height: '190px',
                  gap: '24px',
                }}
              >
                {/* Selected Account Section */}
                <div 
                  className="flex flex-col"
                  style={{
                    width: '707px',
                    height: '114px',
                    gap: '20px',
                  }}
                >
                  {/* Section Title */}
                  <div className="flex flex-row" style={{ width: '707px', height: '18px', gap: '2px' }}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontWeight: 500,
                      letterSpacing: '-0.01em',
                      color: '#686A6E',
                    }}>
                      선택 계정
                    </span>
                  </div>

                  {/* Profile Card */}
                  <div 
                    className="flex flex-col justify-center p-5"
                    style={{
                      width: '707px',
                      height: '88px',
                      background: 'rgba(12, 12, 12, 0.04)',
                      backdropFilter: 'blur(7px)',
                      borderRadius: '12px',
                      gap: '8px',
                    }}
                  >
                    {/* Top row: Name, Company, Role */}
                    <div 
                      className="flex flex-row items-center"
                      style={{
                        width: '667px',
                        height: '26px',
                        gap: '16px',
                      }}
                    >
                      <div className="flex flex-row items-center gap-2.5">
                        <span style={{
                          fontFamily: 'Pretendard',
                          fontSize: '18px',
                          fontWeight: 600,
                          letterSpacing: '-0.02em',
                          color: 'rgba(12, 12, 12, 0.9)',
                        }}>{selectedUser.name}</span>
                        <div style={{ width: '4px', height: '4px', background: 'rgba(0, 143, 237, 0.9)', borderRadius: '50%' }} />
                        <span style={{
                          fontFamily: 'Pretendard',
                          fontSize: '18px',
                          fontWeight: 600,
                          letterSpacing: '-0.02em',
                          color: 'rgba(12, 12, 12, 0.9)',
                        }}>{selectedUser.company}</span>
                      </div>
                      <div 
                        className="flex items-center justify-center px-2.5"
                        style={{
                          height: '26px',
                          background: 'rgba(12, 12, 12, 0.1)',
                          backdropFilter: 'blur(7px)',
                          borderRadius: '20px',
                        }}
                      >
                        <span style={{
                          fontFamily: 'Pretendard',
                          fontSize: '14px',
                          fontWeight: 400,
                          letterSpacing: '-0.01em',
                          color: 'rgba(12, 12, 12, 0.7)',
                        }}>{selectedUser.role}</span>
                      </div>
                    </div>

                    {/* Bottom row: Username, Phone */}
                    <div 
                      className="flex flex-row"
                      style={{
                        width: '400px',
                        height: '20px',
                        gap: '24px',
                      }}
                    >
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: 400,
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.7)',
                      }}>{selectedUser.username}</span>
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: 400,
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.7)',
                      }}>{selectedUser.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Warning Message */}
                <div 
                  className="flex flex-row justify-center items-center"
                  style={{
                    width: '707px',
                    height: '52px',
                    padding: '16px 12px',
                    gap: '10px',
                    background: 'rgba(208, 43, 32, 0.2)',
                    backdropFilter: 'blur(7px)',
                    borderRadius: '20px',
                  }}
                >
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '16px',
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                    color: '#D02B20',
                  }}>
                    계정 삭제 시 즉시 로그아웃됩니다. 활동 로그/정산 기록 등 이력 데이터는 보존됩니다.
                  </span>
                </div>
              </div>
            </div>

            {/* Footer with Buttons */}
            <div 
              className="flex flex-col items-start p-5"
              style={{
                width: '747px',
                height: '88px',
                background: '#FDFDFD',
                borderTop: '1px solid rgba(12, 12, 12, 0.08)',
                gap: '10px',
              }}
            >
              <div 
                className="flex flex-row justify-between items-center"
                style={{
                  width: '707px',
                  height: '48px',
                }}
              >
                {/* Cancel Button */}
                <button
                  className="flex-1 flex items-center justify-center"
                  style={{
                    height: '48px',
                    borderRadius: '6px',
                  }}
                  onClick={() => setShowDeleteAccountModal(false)}
                  data-testid="button-cancel-delete"
                >
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '16px',
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                    color: '#D02B20',
                  }}>
                    취소
                  </span>
                </button>

                {/* Confirm Delete Button */}
                <button
                  className="flex-1 flex items-center justify-center"
                  style={{
                    height: '48px',
                    background: '#D02B20',
                    borderRadius: '6px',
                  }}
                  onClick={async () => {
                    try {
                      // Call delete account API
                      await apiRequest("POST", "/api/delete-account", {
                        username: selectedUser.username,
                      });
                      
                      // Invalidate users query to refetch from server
                      await queryClient.invalidateQueries({ queryKey: ["/api/users"] });
                      
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
                        description: error instanceof Error ? error.message : "계정 삭제 중 오류가 발생했습니다.",
                      });
                    }
                  }}
                  data-testid="button-confirm-delete"
                >
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '16px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: '#FDFDFD',
                  }}>
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
              background: 'rgba(0, 0, 0, 0.28)',
              zIndex: 9999,
            }}
            onClick={() => setShowCancelConfirmModal(true)}
          />

          {/* Modal */}
          <div 
            className="fixed flex flex-col"
            style={{
              width: '1016px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              background: '#FFFFFF',
              boxShadow: '0px 0px 20px #DBE9F5',
              borderRadius: '12px',
              zIndex: 10000,
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid="modal-create-account"
          >
            {/* Header */}
            <div 
              className="flex flex-row justify-between items-center px-6 py-6"
              style={{
                borderBottom: '2px solid rgba(12, 12, 12, 0.1)',
              }}
            >
              <div style={{ width: '28px' }} />
              <h2 style={{
                fontFamily: 'Pretendard',
                fontSize: '22px',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: '#0C0C0C',
              }}>
                새로운 계정 생성
              </h2>
              <button
                className="flex items-center justify-center hover-elevate active-elevate-2"
                style={{
                  width: '28px',
                  height: '28px',
                }}
                onClick={() => setShowCancelConfirmModal(true)}
                data-testid="button-close-create-modal"
              >
                <X size={20} style={{ color: 'rgba(12, 12, 12, 0.8)' }} />
              </button>
            </div>

            {/* Form Content */}
            <div 
              className="flex-1 flex flex-col px-6 py-6 gap-6 overflow-y-auto"
              style={{
                maxHeight: 'calc(90vh - 170px)',
              }}
            >
              {/* Role Selection */}
              <div className="flex flex-col gap-2">
                <label style={{
                  fontFamily: 'Pretendard',
                  fontSize: '14px',
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                  color: '#686A6E',
                }}>
                  역할
                </label>
                <div className="relative" style={{ width: '97px' }}>
                  <select
                    value={createAccountForm.role}
                    onChange={(e) => setCreateAccountForm({ ...createAccountForm, role: e.target.value })}
                    className="flex items-center justify-center px-4 pr-8 appearance-none cursor-pointer"
                    style={{
                      width: '100%',
                      height: '46px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(12, 12, 12, 0.3)',
                      boxShadow: 'inset 0px -2px 4px rgba(0, 0, 0, 0.05), inset 0px 2px 4px rgba(0, 0, 0, 0.05)',
                      backdropFilter: 'blur(7px)',
                      borderRadius: '6px',
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 500,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.9)',
                    }}
                    data-testid="select-role"
                  >
                    {VALID_ROLES.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  <ChevronDown 
                    size={22} 
                    className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'rgba(12, 12, 12, 0.6)' }}
                  />
                </div>
              </div>

              {/* Form Inputs */}
              <div className="flex flex-col gap-4">
                <h3 style={{
                  fontFamily: 'Pretendard',
                  fontSize: '16px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: '#0C0C0C',
                }}>
                  기본 정보
                </h3>

                {/* 기본 정보: 성함, ID, 연락처, 이메일 주소 */}
                <div className="flex gap-3" style={{ width: '100%' }}>
                  <div className="flex-1">
                    <label className="block mb-2" style={{
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontWeight: 400,
                      letterSpacing: '-0.01em',
                      color: '#686A6E',
                    }}>
                      성함
                    </label>
                    <input
                      type="text"
                      placeholder="성함"
                      value={createAccountForm.name}
                      onChange={(e) => setCreateAccountForm({ ...createAccountForm, name: e.target.value })}
                      className="w-full px-4 py-3 outline-none"
                      style={{
                        background: '#FDFDFD',
                        border: '2px solid rgba(12, 12, 12, 0.08)',
                        borderRadius: '8px',
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 400,
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}
                      data-testid="input-name"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block mb-2" style={{
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontWeight: 400,
                      letterSpacing: '-0.01em',
                      color: '#686A6E',
                    }}>
                      ID
                    </label>
                    <input
                      type="text"
                      placeholder="사용자 ID"
                      value={createAccountForm.username}
                      onChange={(e) => setCreateAccountForm({ ...createAccountForm, username: e.target.value })}
                      className="w-full px-4 py-3 outline-none"
                      style={{
                        background: '#FDFDFD',
                        border: '2px solid rgba(12, 12, 12, 0.08)',
                        borderRadius: '8px',
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 400,
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}
                      data-testid="input-username"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block mb-2" style={{
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontWeight: 400,
                      letterSpacing: '-0.01em',
                      color: '#686A6E',
                    }}>
                      연락처
                    </label>
                    <input
                      type="tel"
                      placeholder="- 빼고 입력"
                      value={createAccountForm.phone}
                      onChange={(e) => setCreateAccountForm({ ...createAccountForm, phone: e.target.value })}
                      className="w-full px-4 py-3 outline-none"
                      style={{
                        background: '#FDFDFD',
                        border: '2px solid rgba(12, 12, 12, 0.08)',
                        borderRadius: '8px',
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 400,
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}
                      data-testid="input-phone"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block mb-2" style={{
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontWeight: 400,
                      letterSpacing: '-0.01em',
                      color: '#686A6E',
                    }}>
                      이메일 주소
                    </label>
                    <input
                      type="email"
                      placeholder="이메일 주소"
                      value={createAccountForm.email}
                      onChange={(e) => setCreateAccountForm({ ...createAccountForm, email: e.target.value })}
                      className="w-full px-4 py-3 outline-none"
                      style={{
                        background: '#FDFDFD',
                        border: '2px solid rgba(12, 12, 12, 0.08)',
                        borderRadius: '8px',
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 400,
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}
                      data-testid="input-email"
                    />
                  </div>
                </div>

                <h3 style={{
                  fontFamily: 'Pretendard',
                  fontSize: '16px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: '#0C0C0C',
                  marginTop: '12px',
                }}>
                  {createAccountForm.role === '보험사' ? '보험사 정보' : 
                   createAccountForm.role === '관리자' ? '관리자 정보' : 
                   createAccountForm.role === '심사사' ? '심사사 정보' :
                   createAccountForm.role === '조사사' ? '조사사 정보' :
                   createAccountForm.role === '협력사' ? '협력사 정보' :
                   '회사 정보'}
                </h3>

{createAccountForm.role === '협력사' ? (
                  <>
                    {/* 협력사 정보: Row 1 - 회사명, 소속부서, 직급, 사용할 언어 */}
                    <div className="flex gap-3" style={{ width: '100%' }}>
                      <div className="flex-1">
                        <label className="block mb-2" style={{
                          fontFamily: 'Pretendard',
                          fontSize: '14px',
                          fontWeight: 400,
                          letterSpacing: '-0.01em',
                          color: '#686A6E',
                        }}>
                          회사명
                        </label>
                        <input
                          type="text"
                          placeholder="회사명"
                          value={createAccountForm.company}
                          onChange={(e) => setCreateAccountForm({ ...createAccountForm, company: e.target.value })}
                          className="w-full px-4 py-3 outline-none"
                          style={{
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontSize: '14px',
                            fontWeight: 400,
                            letterSpacing: '-0.02em',
                            color: 'rgba(12, 12, 12, 0.9)',
                          }}
                          data-testid="input-company"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block mb-2" style={{
                          fontFamily: 'Pretendard',
                          fontSize: '14px',
                          fontWeight: 400,
                          letterSpacing: '-0.01em',
                          color: '#686A6E',
                        }}>
                          소속부서
                        </label>
                        <input
                          type="text"
                          placeholder="소속부서"
                          value={createAccountForm.department}
                          onChange={(e) => setCreateAccountForm({ ...createAccountForm, department: e.target.value })}
                          className="w-full px-4 py-3 outline-none"
                          style={{
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontSize: '14px',
                            fontWeight: 400,
                            letterSpacing: '-0.02em',
                            color: 'rgba(12, 12, 12, 0.9)',
                          }}
                          data-testid="input-department"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block mb-2" style={{
                          fontFamily: 'Pretendard',
                          fontSize: '14px',
                          fontWeight: 400,
                          letterSpacing: '-0.01em',
                          color: '#686A6E',
                        }}>
                          직급
                        </label>
                        <input
                          type="text"
                          placeholder="직급"
                          value={createAccountForm.position}
                          onChange={(e) => setCreateAccountForm({ ...createAccountForm, position: e.target.value })}
                          className="w-full px-4 py-3 outline-none"
                          style={{
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontSize: '14px',
                            fontWeight: 400,
                            letterSpacing: '-0.02em',
                            color: 'rgba(12, 12, 12, 0.9)',
                          }}
                          data-testid="input-position"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block mb-2" style={{
                          fontFamily: 'Pretendard',
                          fontSize: '14px',
                          fontWeight: 400,
                          letterSpacing: '-0.01em',
                          color: '#686A6E',
                        }}>
                          사용할 언어
                        </label>
                        <input
                          type="text"
                          placeholder="사용할 언어"
                          value={createAccountForm.language}
                          onChange={(e) => setCreateAccountForm({ ...createAccountForm, language: e.target.value })}
                          className="w-full px-4 py-3 outline-none"
                          style={{
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontSize: '14px',
                            fontWeight: 400,
                            letterSpacing: '-0.02em',
                            color: 'rgba(12, 12, 12, 0.9)',
                          }}
                          data-testid="input-language"
                        />
                      </div>
                    </div>

                    {/* 협력사 정보: Row 2 - 연봉 산대, 계약번호, 예금주 */}
                    <div className="flex gap-3" style={{ width: '100%' }}>
                      <div className="flex-1">
                        <label className="block mb-2" style={{
                          fontFamily: 'Pretendard',
                          fontSize: '14px',
                          fontWeight: 400,
                          letterSpacing: '-0.01em',
                          color: '#686A6E',
                        }}>
                          연봉 산대
                        </label>
                        <input
                          type="text"
                          placeholder="연봉 산대"
                          value={createAccountForm.salaryGrade}
                          onChange={(e) => setCreateAccountForm({ ...createAccountForm, salaryGrade: e.target.value })}
                          className="w-full px-4 py-3 outline-none"
                          style={{
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontSize: '14px',
                            fontWeight: 400,
                            letterSpacing: '-0.02em',
                            color: 'rgba(12, 12, 12, 0.9)',
                          }}
                          data-testid="input-salary-grade"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block mb-2" style={{
                          fontFamily: 'Pretendard',
                          fontSize: '14px',
                          fontWeight: 400,
                          letterSpacing: '-0.01em',
                          color: '#686A6E',
                        }}>
                          계약번호
                        </label>
                        <input
                          type="text"
                          placeholder="** 빼고 입력"
                          value={createAccountForm.contractNumber}
                          onChange={(e) => setCreateAccountForm({ ...createAccountForm, contractNumber: e.target.value })}
                          className="w-full px-4 py-3 outline-none"
                          style={{
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontSize: '14px',
                            fontWeight: 400,
                            letterSpacing: '-0.02em',
                            color: 'rgba(12, 12, 12, 0.9)',
                          }}
                          data-testid="input-contract-number"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block mb-2" style={{
                          fontFamily: 'Pretendard',
                          fontSize: '14px',
                          fontWeight: 400,
                          letterSpacing: '-0.01em',
                          color: '#686A6E',
                        }}>
                          예금주
                        </label>
                        <input
                          type="text"
                          placeholder="예금주"
                          value={createAccountForm.accountHolder}
                          onChange={(e) => setCreateAccountForm({ ...createAccountForm, accountHolder: e.target.value })}
                          className="w-full px-4 py-3 outline-none"
                          style={{
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontSize: '14px',
                            fontWeight: 400,
                            letterSpacing: '-0.02em',
                            color: 'rgba(12, 12, 12, 0.9)',
                          }}
                          data-testid="input-account-holder"
                        />
                      </div>
                    </div>

                    {/* 협력사 정보: Row 3 - 주소 (full width) */}
                    <div style={{ width: '100%' }}>
                      <label className="block mb-2" style={{
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 400,
                        letterSpacing: '-0.01em',
                        color: '#686A6E',
                      }}>
                        주소
                      </label>
                      <input
                        type="text"
                        placeholder="주소"
                        value={createAccountForm.address}
                        onChange={(e) => setCreateAccountForm({ ...createAccountForm, address: e.target.value })}
                        className="w-full px-4 py-3 outline-none"
                        style={{
                          background: '#FDFDFD',
                          border: '2px solid rgba(12, 12, 12, 0.08)',
                          borderRadius: '8px',
                          fontFamily: 'Pretendard',
                          fontSize: '14px',
                          fontWeight: 400,
                          letterSpacing: '-0.02em',
                          color: 'rgba(12, 12, 12, 0.9)',
                        }}
                        data-testid="input-address"
                      />
                    </div>

                    {/* 협력사 정보: Row 4 - 활동가능시간 + 지역 선택 */}
                    <div className="flex gap-3" style={{ width: '100%' }}>
                      <div style={{ flex: '0 0 69%' }}>
                        <label className="block mb-2" style={{
                          fontFamily: 'Pretendard',
                          fontSize: '14px',
                          fontWeight: 400,
                          letterSpacing: '-0.01em',
                          color: '#686A6E',
                        }}>
                          활동가능시간
                        </label>
                        <input
                          type="text"
                          placeholder="활동가능시간"
                          value={createAccountForm.availableHours}
                          onChange={(e) => setCreateAccountForm({ ...createAccountForm, availableHours: e.target.value })}
                          className="w-full px-4 py-3 outline-none"
                          style={{
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontSize: '14px',
                            fontWeight: 400,
                            letterSpacing: '-0.02em',
                            color: 'rgba(12, 12, 12, 0.9)',
                          }}
                          data-testid="input-available-hours"
                        />
                      </div>
                      <div style={{ flex: '0 0 31%' }}>
                        <label className="block mb-2" style={{
                          fontFamily: 'Pretendard',
                          fontSize: '14px',
                          fontWeight: 400,
                          letterSpacing: '-0.01em',
                          color: '#686A6E',
                        }}>
                          지역 선택
                        </label>
                        <input
                          type="text"
                          placeholder="지역 선택"
                          value={createAccountForm.serviceRegion}
                          onChange={(e) => setCreateAccountForm({ ...createAccountForm, serviceRegion: e.target.value })}
                          className="w-full px-4 py-3 outline-none"
                          style={{
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontSize: '14px',
                            fontWeight: 400,
                            letterSpacing: '-0.02em',
                            color: 'rgba(12, 12, 12, 0.9)',
                          }}
                          data-testid="input-service-region"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  /* 다른 역할: 회사명, 소속부서, 직급, 사무실 전화 */
                  <div className="flex gap-3" style={{ width: '100%' }}>
                    <div className="flex-1">
                      <label className="block mb-2" style={{
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 400,
                        letterSpacing: '-0.01em',
                        color: '#686A6E',
                      }}>
                        회사명
                      </label>
                      <input
                        type="text"
                        placeholder="회사명"
                        value={createAccountForm.company}
                        onChange={(e) => setCreateAccountForm({ ...createAccountForm, company: e.target.value })}
                        className="w-full px-4 py-3 outline-none"
                        style={{
                          background: '#FDFDFD',
                          border: '2px solid rgba(12, 12, 12, 0.08)',
                          borderRadius: '8px',
                          fontFamily: 'Pretendard',
                          fontSize: '14px',
                          fontWeight: 400,
                          letterSpacing: '-0.02em',
                          color: 'rgba(12, 12, 12, 0.9)',
                        }}
                        data-testid="input-company"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block mb-2" style={{
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 400,
                        letterSpacing: '-0.01em',
                        color: '#686A6E',
                      }}>
                        소속부서
                      </label>
                      <input
                        type="text"
                        placeholder="소속부서"
                        value={createAccountForm.department}
                        onChange={(e) => setCreateAccountForm({ ...createAccountForm, department: e.target.value })}
                        className="w-full px-4 py-3 outline-none"
                        style={{
                          background: '#FDFDFD',
                          border: '2px solid rgba(12, 12, 12, 0.08)',
                          borderRadius: '8px',
                          fontFamily: 'Pretendard',
                          fontSize: '14px',
                          fontWeight: 400,
                          letterSpacing: '-0.02em',
                          color: 'rgba(12, 12, 12, 0.9)',
                        }}
                        data-testid="input-department"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block mb-2" style={{
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 400,
                        letterSpacing: '-0.01em',
                        color: '#686A6E',
                      }}>
                        직급
                      </label>
                      <input
                        type="text"
                        placeholder="직급"
                        value={createAccountForm.position}
                        onChange={(e) => setCreateAccountForm({ ...createAccountForm, position: e.target.value })}
                        className="w-full px-4 py-3 outline-none"
                        style={{
                          background: '#FDFDFD',
                          border: '2px solid rgba(12, 12, 12, 0.08)',
                          borderRadius: '8px',
                          fontFamily: 'Pretendard',
                          fontSize: '14px',
                          fontWeight: 400,
                          letterSpacing: '-0.02em',
                          color: 'rgba(12, 12, 12, 0.9)',
                        }}
                        data-testid="input-position"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block mb-2" style={{
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 400,
                        letterSpacing: '-0.01em',
                        color: '#686A6E',
                      }}>
                        사무실 전화
                      </label>
                      <input
                        type="tel"
                        placeholder="-빼고 입력"
                        value={createAccountForm.office}
                        onChange={(e) => setCreateAccountForm({ ...createAccountForm, office: e.target.value })}
                        className="w-full px-4 py-3 outline-none"
                        style={{
                          background: '#FDFDFD',
                          border: '2px solid rgba(12, 12, 12, 0.08)',
                          borderRadius: '8px',
                          fontFamily: 'Pretendard',
                          fontSize: '14px',
                          fontWeight: 400,
                          letterSpacing: '-0.02em',
                          color: 'rgba(12, 12, 12, 0.9)',
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
                background: '#FDFDFD',
                borderTop: '1px solid rgba(12, 12, 12, 0.08)',
              }}
            >
              <button
                className="flex items-center justify-center hover-elevate active-elevate-2"
                style={{
                  height: '48px',
                  padding: '0 24px',
                  background: 'transparent',
                  borderRadius: '6px',
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
                    language: "",
                    salaryGrade: "",
                    contractNumber: "",
                    accountHolder: "",
                    availableHours: "",
                    serviceRegion: "",
                  });
                }}
                data-testid="button-reset-form"
              >
                <span style={{
                  fontFamily: 'Pretendard',
                  fontSize: '16px',
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  color: '#0C0C0C4D',
                }}>
                  초기화
                </span>
              </button>

              <button
                type="button"
                className="flex items-center justify-center hover-elevate active-elevate-2"
                style={{
                  height: '48px',
                  padding: '0 32px',
                  background: '#008FED',
                  borderRadius: '6px',
                }}
                onClick={() => {
                  // Validate required fields
                  if (!createAccountForm.name || !createAccountForm.company || !createAccountForm.username) {
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
                <span style={{
                  fontFamily: 'Pretendard',
                  fontSize: '16px',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: '#FDFDFD',
                }}>
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
              background: 'rgba(0, 0, 0, 0.7)',
              opacity: 0.4,
            }}
            onClick={() => setShowCancelConfirmModal(true)}
            data-testid="modal-overlay-account-created"
          />

          {/* Modal */}
          <div 
            className="fixed z-50 bg-white flex flex-col"
            style={{
              width: '747px',
              height: '440px',
              left: 'calc(50% - 747px/2 + 0.5px)',
              top: 'calc(50% - 440px/2 + 0.5px)',
              boxShadow: '0px -2px 70px rgba(179, 193, 205, 0.8)',
              borderRadius: '12px',
              gap: '32px',
            }}
            data-testid="modal-account-created"
          >
            {/* Content */}
            <div 
              className="flex flex-col items-center"
              style={{
                width: '747px',
                height: '320px',
                gap: '16px',
              }}
            >
              {/* Header */}
              <div 
                className="flex flex-row justify-center items-center"
                style={{
                  width: '747px',
                  height: '60px',
                  gap: '321px',
                }}
              >
                <h2 style={{
                  fontFamily: 'Pretendard',
                  fontSize: '18px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: '#0C0C0C',
                }}>
                  비밀번호 생성
                </h2>
              </div>

              {/* Body */}
              <div 
                className="flex flex-col"
                style={{
                  width: '707px',
                  height: '244px',
                  gap: '20px',
                }}
              >
                {/* Profile Card Section */}
                <div 
                  className="flex flex-col"
                  style={{
                    width: '707px',
                    height: '114px',
                    gap: '20px',
                  }}
                >
                  {/* Section Title */}
                  <div className="flex flex-row" style={{ width: '707px', height: '18px', gap: '2px' }}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontWeight: 500,
                      letterSpacing: '-0.01em',
                      color: '#686A6E',
                    }}>
                      생성 계정
                    </span>
                  </div>

                  {/* Profile Card */}
                  <div 
                    className="flex flex-col justify-center p-5"
                    style={{
                      width: '707px',
                      height: '88px',
                      background: 'rgba(12, 12, 12, 0.04)',
                      backdropFilter: 'blur(7px)',
                      borderRadius: '12px',
                      gap: '8px',
                    }}
                  >
                    {/* Top row: Name, Company, Role */}
                    <div 
                      className="flex flex-row items-center"
                      style={{
                        width: '667px',
                        height: '26px',
                        gap: '16px',
                      }}
                    >
                      <div className="flex flex-row items-center gap-2.5">
                        <span style={{
                          fontFamily: 'Pretendard',
                          fontSize: '18px',
                          fontWeight: 600,
                          letterSpacing: '-0.02em',
                          color: 'rgba(12, 12, 12, 0.9)',
                        }}>{createAccountForm.name}</span>
                        <div style={{ width: '4px', height: '4px', background: 'rgba(0, 143, 237, 0.9)', borderRadius: '50%' }} />
                        <span style={{
                          fontFamily: 'Pretendard',
                          fontSize: '18px',
                          fontWeight: 600,
                          letterSpacing: '-0.02em',
                          color: 'rgba(12, 12, 12, 0.9)',
                        }}>{createAccountForm.company}</span>
                      </div>
                      <div 
                        className="flex items-center justify-center px-2.5"
                        style={{
                          height: '26px',
                          background: 'rgba(12, 12, 12, 0.1)',
                          backdropFilter: 'blur(7px)',
                          borderRadius: '20px',
                        }}
                      >
                        <span style={{
                          fontFamily: 'Pretendard',
                          fontSize: '14px',
                          fontWeight: 400,
                          letterSpacing: '-0.01em',
                          color: 'rgba(12, 12, 12, 0.7)',
                        }}>{createAccountForm.role}</span>
                      </div>
                    </div>

                    {/* Bottom row: Username, Phone */}
                    <div 
                      className="flex flex-row"
                      style={{
                        width: '400px',
                        height: '20px',
                        gap: '24px',
                      }}
                    >
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: 400,
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.7)',
                      }}>{createAccountForm.username}</span>
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: 400,
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.7)',
                      }}>{createAccountForm.phone || '010-0000-0000'}</span>
                    </div>
                  </div>
                </div>

                {/* Password Section */}
                <div 
                  className="flex flex-col"
                  style={{
                    width: '707px',
                    height: '110px',
                    gap: '10px',
                  }}
                >
                  <div className="flex flex-col" style={{ width: '419px', height: '76px', gap: '8px' }}>
                    <div className="flex flex-row" style={{ width: '419px', height: '18px', gap: '2px' }}>
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 500,
                        letterSpacing: '-0.01em',
                        color: '#686A6E',
                      }}>
                        비밀번호 생성(자동)
                      </span>
                    </div>

                    {/* Input Field + Copy Button */}
                    <div className="flex flex-row items-center" style={{ width: '419px', height: '50px', gap: '8px' }}>
                      <input
                        type="text"
                        value={generatedPassword}
                        onChange={(e) => setGeneratedPassword(e.target.value)}
                        className="flex flex-row items-center"
                        style={{
                          width: '343px',
                          height: '50px',
                          padding: '10px 20px',
                          background: '#FDFDFD',
                          border: '2px solid rgba(12, 12, 12, 0.08)',
                          borderRadius: '8px',
                          fontFamily: 'Pretendard',
                          fontSize: '16px',
                          fontWeight: 600,
                          letterSpacing: '-0.02em',
                          color: '#0C0C0C',
                          outline: 'none',
                        }}
                        data-testid="input-password"
                      />

                      <button
                        className="flex flex-row items-center justify-center"
                        style={{
                          width: '68px',
                          height: '50px',
                          padding: '10px 20px',
                          background: 'rgba(0, 143, 237, 0.1)',
                          border: '1px solid rgba(0, 143, 237, 0.3)',
                          borderRadius: '8px',
                          gap: '10px',
                        }}
                        onClick={() => {
                          navigator.clipboard.writeText(generatedPassword);
                          toast({
                            title: "복사 완료",
                            description: "비밀번호가 클립보드에 복사되었습니다.",
                          });
                        }}
                        data-testid="button-copy-password"
                      >
                        <span style={{
                          fontFamily: 'Pretendard',
                          fontSize: '16px',
                          fontWeight: 600,
                          letterSpacing: '-0.02em',
                          color: '#008FED',
                        }}>
                          복사
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Notification Options */}
                  <div 
                    className="flex flex-row items-center"
                    style={{
                      gap: '32px',
                    }}
                  >
                    {/* Email notification checkbox */}
                    <div 
                      className="flex flex-row items-center cursor-pointer"
                      style={{ gap: '6px' }}
                      onClick={() => setSendEmailNotification(!sendEmailNotification)}
                    >
                      <div 
                        style={{
                          width: '24px',
                          height: '24px',
                          border: '2px solid rgba(12, 12, 12, 0.24)',
                          borderRadius: '4px',
                          background: sendEmailNotification ? '#008FED' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {sendEmailNotification && (
                          <span style={{ color: 'white', fontSize: '16px' }}>✓</span>
                        )}
                      </div>
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 500,
                        letterSpacing: '-0.01em',
                        color: 'rgba(12, 12, 12, 0.8)',
                      }}>
                        이메일로 안내 발송
                      </span>
                    </div>

                    {/* SMS notification checkbox */}
                    <div 
                      className="flex flex-row items-center cursor-pointer"
                      style={{ gap: '6px' }}
                      onClick={() => setSendSmsNotification(!sendSmsNotification)}
                    >
                      <div 
                        style={{
                          width: '24px',
                          height: '24px',
                          border: '2px solid rgba(12, 12, 12, 0.24)',
                          borderRadius: '4px',
                          background: sendSmsNotification ? '#008FED' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {sendSmsNotification && (
                          <span style={{ color: 'white', fontSize: '16px' }}>✓</span>
                        )}
                      </div>
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 500,
                        letterSpacing: '-0.01em',
                        color: 'rgba(12, 12, 12, 0.8)',
                      }}>
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
                width: '747px',
                height: '88px',
                background: '#FDFDFD',
                borderTop: '1px solid rgba(12, 12, 12, 0.08)',
                gap: '10px',
              }}
            >
              <div 
                className="flex flex-row justify-between items-center"
                style={{
                  width: '707px',
                  height: '48px',
                }}
              >
                {/* Cancel Button */}
                <button
                  className="flex-1 flex items-center justify-center"
                  style={{
                    height: '48px',
                    borderRadius: '6px',
                  }}
                  onClick={() => {
                    setShowAccountCreatedModal(false);
                    setSendEmailNotification(false);
                    setSendSmsNotification(false);
                    setGeneratedPassword("0000");
                  }}
                  data-testid="button-cancel-account-created"
                >
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '16px',
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                    color: '#D02B20',
                  }}>
                    취소
                  </span>
                </button>

                {/* Confirm Button */}
                <button
                  className="flex-1 flex items-center justify-center"
                  style={{
                    height: '48px',
                    background: '#008FED',
                    borderRadius: '6px',
                  }}
                  onClick={async () => {
                    try {
                      // Call create account API with user-entered password
                      await apiRequest("POST", "/api/create-account", {
                        ...createAccountForm,
                        password: generatedPassword,
                      });
                      
                      // Invalidate users query to refetch from server
                      await queryClient.invalidateQueries({ queryKey: ["/api/users"] });
                      
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
                        language: "",
                        salaryGrade: "",
                        contractNumber: "",
                        accountHolder: "",
                        availableHours: "",
                        serviceRegion: "",
                      });
                    } catch (error: any) {
                      console.error("Failed to create account:", error);
                      
                      // Show error message
                      const errorMessage = error?.error || error?.message || "계정 생성 중 오류가 발생했습니다.";
                      toast({
                        variant: "destructive",
                        title: "계정 생성 실패",
                        description: errorMessage,
                      });
                    }
                  }}
                  data-testid="button-confirm-account-created"
                >
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '16px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: '#FDFDFD',
                  }}>
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
              background: 'rgba(0, 0, 0, 0.7)',
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
              width: '400px',
              height: '199px',
              left: 'calc(50% - 400px/2)',
              top: 'calc(50% - 199px/2)',
              background: '#FFFFFF',
              boxShadow: '0px -2px 70px rgba(179, 193, 205, 0.8)',
              borderRadius: '12px',
              padding: '32px 0px 0px',
              gap: '24px',
              zIndex: 10002,
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid="modal-cancel-confirm"
          >
            {/* Content */}
            <div 
              className="flex flex-col items-center"
              style={{
                width: '222px',
                height: '55px',
                gap: '8px',
              }}
            >
              <h2 style={{
                fontFamily: 'Pretendard',
                fontSize: '18px',
                fontWeight: 600,
                lineHeight: '148%',
                textAlign: 'center',
                letterSpacing: '-0.02em',
                color: '#0C0C0C',
              }}>
                계정 생성을 그만두시겠습니까?
              </h2>
              <p style={{
                fontFamily: 'Pretendard',
                fontSize: '16px',
                fontWeight: 500,
                lineHeight: '128%',
                textAlign: 'center',
                letterSpacing: '-0.02em',
                color: 'rgba(12, 12, 12, 0.8)',
              }}>
                지금 나가면 모든 입력이 사라집니다.
              </p>
            </div>

            {/* Footer with Buttons */}
            <div 
              className="flex flex-col items-start p-5"
              style={{
                width: '400px',
                height: '88px',
                background: '#FDFDFD',
                borderTop: '1px solid rgba(12, 12, 12, 0.08)',
                gap: '10px',
              }}
            >
              <div 
                className="flex flex-row justify-between items-center"
                style={{
                  width: '360px',
                  height: '48px',
                }}
              >
                {/* Cancel Button */}
                <button
                  className="flex-1 flex items-center justify-center"
                  style={{
                    height: '48px',
                    borderRadius: '6px',
                  }}
                  onClick={() => setShowCancelConfirmModal(false)}
                  data-testid="button-cancel-confirm-cancel"
                >
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '16px',
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                    color: '#D02B20',
                  }}>
                    취소
                  </span>
                </button>

                {/* Confirm Exit Button */}
                <button
                  className="flex-1 flex items-center justify-center"
                  style={{
                    height: '48px',
                    background: '#008FED',
                    borderRadius: '6px',
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
                      language: "",
                      salaryGrade: "",
                      contractNumber: "",
                      accountHolder: "",
                      availableHours: "",
                      serviceRegion: "",
                    });
                  }}
                  data-testid="button-cancel-confirm-exit"
                >
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '16px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: '#FDFDFD',
                  }}>
                    나가기
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
