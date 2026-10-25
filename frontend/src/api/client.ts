/**
 * HTTP client for fetching from the FastAPI backend.
 *
 * Production/Vercel compatibility:
 * - Uses relative URLs by default (e.g. '/api/...'), allowing same-origin proxies
 *   and Vercel rewrites (vercel.json) to eliminate CORS problems.
 * - When VITE_API_BASE_URL is configured (e.g. cross-origin backend), it prepends
 *   the base URL automatically without any hardcoded localhost strings.
 */

const API_BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/$/, '');

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const fullUrl = getApiUrl(url);

  const response = await fetch(fullUrl, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorDetail = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // Ignore json parse error
    }
    throw new Error(errorDetail);
  }

  return response.json();
}
