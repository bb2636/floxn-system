import { useState } from "react";
import { useLocation } from "wouter";
import { Search } from "lucide-react";
import logoIcon from "@assets/Frame 2_1762217940686.png";

export default function AdminSettings() {
  const [, setLocation] = useLocation();
  const [activeMenu, setActiveMenu] = useState("사용자 계정 관리");
  const [roleFilter, setRoleFilter] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");

  const sidebarMenus = [
    { name: "사용자 계정 관리", active: true },
    { name: "접근 권한 관리", active: false },
    { name: "1:1 문의 관리", active: false },
    { name: "DB 관리", active: false },
    { name: "기준정보 관리", active: false },
    { name: "알림 메시지 전송", active: false },
  ];

  const roleFilters = ["전체", "관리자", "사원"];

  // Sample user data
  const users = [
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
    },
  ];

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
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 outline-none bg-transparent"
                      style={{
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: 600,
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.4)',
                      }}
                      data-testid="input-search"
                    />
                  </div>
                  <button
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
                  {users.length}
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
              {users.map((user) => (
                <div 
                  key={user.id}
                  className="flex items-center px-3"
                  style={{
                    height: '44px',
                  }}
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
    </div>
  );
}
