import { QueryClient, QueryFunction } from "@tanstack/react-query";

// queryClient는 아래에서 정의되므로 여기서는 참조만
let queryClientInstance: QueryClient | null = null;

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // 401 에러 발생 시 세션 체크 (중복 로그인 감지)
    if (res.status === 401) {
      // 로그인 페이지에서는 401 에러를 무시 (무한 리다이렉트 방지)
      const currentPath = window.location.pathname;
      if (currentPath === "/" || currentPath === "/login" || currentPath === "/mobile-login") {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }
      
      try {
        const checkRes = await fetch("/api/check-session", { credentials: "include" });
        const checkData = await checkRes.json();
        if (!checkData.authenticated) {
          // 세션이 무효화되었으면 CSRF 토큰 캐시도 초기화
          csrfTokenCache = null;
          // 세션이 무효화되었으면 로그아웃 처리
          if (queryClientInstance) {
            queryClientInstance.clear();
          }
          window.location.href = "/";
          return;
        }
      } catch {
        // check-session 실패 시에도 CSRF 토큰 캐시 초기화
        csrfTokenCache = null;
        // check-session 실패 시에도 로그아웃 (단, 로그인 페이지가 아닐 때만)
        if (queryClientInstance) {
          queryClientInstance.clear();
        }
        window.location.href = "/";
        return;
      }
    }
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// CSRF 토큰 캐시 (세션별로 관리)
// 주의: 세션이 변경되면 토큰도 무효화되므로, 401 에러 시 캐시 초기화 필요
let csrfTokenCache: string | null = null;

/**
 * CSRF 토큰 가져오기
 */
async function getCsrfToken(): Promise<string | null> {
  // 캐시가 있으면 사용 (세션 변경 시 401로 인해 재요청됨)
  if (csrfTokenCache) {
    return csrfTokenCache;
  }

  try {
    const res = await fetch("/api/csrf-token", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      csrfTokenCache = data.csrfToken || null;
      return csrfTokenCache;
    } else if (res.status === 401) {
      // 인증 실패 시 캐시 초기화
      csrfTokenCache = null;
    }
  } catch (error) {
    console.warn("[CSRF] Failed to get CSRF token:", error);
    csrfTokenCache = null;
  }
  return null;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // POST/PUT/PATCH/DELETE 요청에 CSRF 토큰 추가
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = await getCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // 창 포커스 시 데이터 새로고침
      staleTime: 30 * 1000, // 30초 후 데이터 stale 처리
      gcTime: 5 * 60 * 1000, // 5분간 캐시 유지
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// queryClient 인스턴스를 throwIfResNotOk에서 사용할 수 있도록 설정
queryClientInstance = queryClient;
