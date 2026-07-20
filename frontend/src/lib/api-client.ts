import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./token-storage";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message?: string
  ) {
    super(message ?? `API hatasi: ${status}`);
  }
}

interface ApiFetchOptions extends RequestInit {
  // true ise Authorization header'i eklenmez (orn. otp/request, otp/verify).
  skipAuth?: boolean;
  // true ise 401 alindiginda otomatik refresh denenmez (sonsuz donguyu
  // onlemek icin - refresh cagrisinin kendisinde kullanilir).
  skipRefreshRetry?: boolean;
}

// Gorev 9.4: Backend'e istek atan merkezi fetch wrapper. Otomatik olarak
// Authorization header'i ekler, JSON govdeyi parse eder, 401 alindiginda
// refresh token ile bir kez yeniden dener (Bolum 8, "Neden JWT + refresh
// token" - kullanici fark etmeden oturum devam etsin diye).
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { skipAuth = false, skipRefreshRetry = false, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  // Kullanici istegi: hukuki ispat/gunlukleme icin ekran cozunurlugu
  // ve saat dilimi de her istekte gonderilir - sunucu (audit
  // interceptor) bunlari okuyup gunluge yazar. Sadece tarayicida
  // calisirken eklenir (SSR/build sirasinda window yoktur).
  if (typeof window !== "undefined") {
    finalHeaders["X-Screen-Resolution"] = `${window.screen.width}x${window.screen.height}`;
    try {
      finalHeaders["X-Timezone"] = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      // Tarayici desteklemiyorsa sessizce atla.
    }
  }

  if (!skipAuth) {
    const accessToken = getAccessToken();
    if (accessToken) {
      finalHeaders.Authorization = `Bearer ${accessToken}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
  });

  // 401 alindiysa ve refresh token varsa, bir kez yenileyip istegi tekrarla.
  if (response.status === 401 && !skipAuth && !skipRefreshRetry) {
    const refreshed = await tryRefreshAccessToken();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, skipRefreshRetry: true });
    }
    clearTokens();
  }

  const contentType = response.headers.get("content-type");
  const body = contentType?.includes("application/json") ? await response.json() : undefined;

  if (!response.ok) {
    throw new ApiError(response.status, body, (body as any)?.message);
  }

  return body as T;
}

async function tryRefreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const data = await apiFetch<{ access_token: string }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
      skipAuth: true,
      skipRefreshRetry: true,
    });
    setTokens(data.access_token);
    return true;
  } catch {
    return false;
  }
}
