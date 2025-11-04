import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import logoIcon from "@assets/Frame 2_1762217940686.png";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";

type UserData = {
  id: number;
  role: string;
  company: string;
  name: string;
  department: string;
  position: string;
  email: string;
  username: string;
  phone: string;
  office: string;
  createdAt: string;
  address?: string;
};

export default function AdminSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeMenu, setActiveMenu] = useState("사용자 계정 관리");
  const [roleFilter, setRoleFilter] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState("0000");
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  // Check authentication
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  const sidebarMenus = [
    { name: "사용자 계정 관리", active: true },
    { name: "접근 권한 관리", active: false },
    { name: "1:1 문의 관리", active: false },
    { name: "DB 관리", active: false },
    { name: "기준정보 관리", active: false },
    { name: "알림 메시지 전송", active: false },
  ];

  const roleFilters = ["전체", "관리자", "사원"];

  // Sample user data - expanded for better testing
  const allUsers = [
    {
      id: 1,
      role: "관리자",
      company: "플록슨",
      name: "김블락",
      department: "개발팀",
      position: "팀장",
      email: "xblock@floxn.com",
      username: "xblock01",
      phone: "010-1234-5678",
      office: "02-1234-5678",
      createdAt: "2024.01.15",
      address: "서울 강남구",
    },
    {
      id: 2,
      role: "사원",
      company: "플록슨",
      name: "이철수",
      department: "영업팀",
      position: "대리",
      email: "chulsu@floxn.com",
      username: "chulsu01",
      phone: "010-2345-6789",
      office: "02-2345-6789",
      createdAt: "2024.02.20",
      address: "서울 서초구",
    },
    {
      id: 3,
      role: "관리자",
      company: "플록슨",
      name: "박영희",
      department: "기획팀",
      position: "부장",
      email: "park@floxn.com",
      username: "park01",
      phone: "010-3456-7890",
      office: "02-3456-7890",
      createdAt: "2024.01.20",
      address: "서울 송파구",
    },
    {
      id: 4,
      role: "사원",
      company: "플록슨",
      name: "정민수",
      department: "개발팀",
      position: "사원",
      email: "jung@floxn.com",
      username: "jung01",
      phone: "010-4567-8901",
      office: "02-4567-8901",
      createdAt: "2024.03.10",
      address: "경기 성남시",
    },
    {
      id: 5,
      role: "사원",
      company: "플록슨",
      name: "최수정",
      department: "마케팅팀",
      position: "과장",
      email: "choi@floxn.com",
      username: "choi01",
      phone: "010-5678-9012",
      office: "02-5678-9012",
      createdAt: "2024.02.15",
      address: "서울 마포구",
    },
    {
      id: 6,
      role: "관리자",
      company: "플록슨",
      name: "김현우",
      department: "인사팀",
      position: "차장",
      email: "kimh@floxn.com",
      username: "kimh01",
      phone: "010-6789-0123",
      office: "02-6789-0123",
      createdAt: "2024.01.05",
      address: "서울 종로구",
    },
    {
      id: 7,
      role: "사원",
      company: "플록슨",
      name: "윤서연",
      department: "영업팀",
      position: "사원",
      email: "yoon@floxn.com",
      username: "yoon01",
      phone: "010-7890-1234",
      office: "02-7890-1234",
      createdAt: "2024.03.25",
      address: "서울 양천구",
    },
  ];

  // Apply filtering and search
  const filteredUsers = allUsers.filter((user) => {
    // Role filter
    const matchesRole = roleFilter === "전체" || user.role === roleFilter;
    
    // Search filter - improved with trim and lowercase
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const normalizedName = user.name.toLowerCase();
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
          <div className="flex items-center gap-4 mb-6">
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
                className="px-3 py-3 rounded-md"
                style={{
                  background: '#008FED',
                  fontFamily: 'Pretendard',
                  fontSize: '18px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: '#FDFDFD',
                }}
                data-testid="button-create-account"
              >
                계정 생성
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
                  className="flex items-center px-3 cursor-pointer hover:bg-black/5 transition-colors"
                  style={{
                    height: '44px',
                  }}
                  onClick={() => setSelectedUser(user)}
                  data-testid={`user-row-${user.id}`}
                >
                  <div className="px-2" style={{ width: '122px' }}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.8)',
                    }}>{user.role}</span>
                  </div>
                  <div className="px-2" style={{ width: '155px' }}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.8)',
                    }}>{user.company}</span>
                  </div>
                  <div className="px-2 flex-1">
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.8)',
                    }}>{user.name}</span>
                  </div>
                  <div className="px-2" style={{ width: '134px' }}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.8)',
                    }}>{user.department}</span>
                  </div>
                  <div className="px-2 flex-1">
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.8)',
                    }}>{user.position}</span>
                  </div>
                  <div className="px-2" style={{ width: '190px' }}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.8)',
                    }}>{user.email}</span>
                  </div>
                  <div className="px-2" style={{ width: '162px' }}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.8)',
                    }}>{user.username}</span>
                  </div>
                  <div className="px-2" style={{ width: '163px' }}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.8)',
                    }}>{user.phone}</span>
                  </div>
                  <div className="px-2" style={{ width: '163px' }}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.8)',
                    }}>{user.office}</span>
                  </div>
                  <div className="px-2" style={{ width: '163px' }}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.8)',
                    }}>{user.createdAt}</span>
                  </div>
                  <div className="px-2 flex-1">
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.8)',
                    }}>-</span>
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
                    기본 정보
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
                    보험사 정보
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
                      <div className="flex flex-row" style={{ width: '177px', height: '20px', gap: '24px' }}>
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
                        width: '177px',
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
                    // TODO: Implement delete account API call
                    toast({
                      variant: "destructive",
                      title: "기능 준비 중",
                      description: "계정 삭제 기능은 현재 개발 중입니다.",
                    });
                    setShowDeleteAccountModal(false);
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
    </div>
  );
}
