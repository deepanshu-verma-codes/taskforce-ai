import { Problem, DashboardStats, AgentLog, DocumentUploadResponse, User } from './types';

const DIRECT_API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

async function smartFetch(endpoint: string, options?: RequestInit, isRetry = false): Promise<Response> {
  const timeoutMs = 180000; // 3-minute SLA timeout guard
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const mergedOptions: RequestInit = {
    ...options,
    credentials: 'include', // Guarantees HttpOnly cookies are attached on all requests
    signal: options?.signal || controller.signal,
  };

  try {
    let res: Response | null = null;

    // Strategy 1: Same-Origin relative proxy (/api/...)
    // This guarantees cookies match the browser host (e.g. localhost:5173) and persist across page refreshes
    try {
      const proxyRes = await fetch(`/api${endpoint}`, mergedOptions);
      res = proxyRes;
    } catch {
      // Relative proxy failed, fall back to direct backend URL
    }

    // Strategy 2: Direct connection
    if (!res) {
      res = await fetch(`${DIRECT_API}${endpoint}`, mergedOptions);
    }

    // Automatic silent token refresh on 401 Unauthorized (unless calling auth endpoints)
    if (res.status === 401 && !isRetry && !endpoint.startsWith('/auth/')) {
      try {
        const refreshRes = await fetch(`/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        }).catch(() => fetch(`${DIRECT_API}/auth/refresh`, { method: 'POST', credentials: 'include' }));

        if (refreshRes && refreshRes.ok) {
          // Retry original request once with fresh cookie
          return await smartFetch(endpoint, options, true);
        }
      } catch {
        // Refresh failed, proceed with 401 response
      }
    }

    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// Authentication & Session Management APIs
// ============================================================================

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const res = await smartFetch('/auth/me');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function registerUser(data: {
  username: string;
  name: string;
  password: string;
}): Promise<User> {
  const res = await smartFetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
    throw new Error(err.detail || 'Registration failed');
  }
  return res.json();
}

export async function loginUser(data: {
  username: string;
  password: string;
}): Promise<User> {
  const res = await smartFetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(err.detail || 'Invalid username or password');
  }
  return res.json();
}

export async function logoutUser(): Promise<void> {
  await smartFetch('/auth/logout', { method: 'POST' });
}

// ============================================================================
// Problem Floor & Observability APIs
// ============================================================================

export async function fetchStats(): Promise<DashboardStats | null> {
  try {
    const res = await smartFetch('/stats');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchProblems(): Promise<Problem[]> {
  try {
    const res = await smartFetch('/problems');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Failed to fetch problems:', err);
    return [];
  }
}

export async function fetchProblemById(id: string): Promise<Problem> {
  const res = await smartFetch(`/problems/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch problem ${id}`);
  }
  return res.json();
}

export async function fetchProblemLogs(id: string): Promise<AgentLog[]> {
  try {
    const res = await smartFetch(`/problems/${id}/logs`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function uploadDocument(file: File): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await smartFetch('/upload-document', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to upload document' }));
    throw new Error(err.detail || 'Failed to upload document');
  }

  return res.json();
}

export async function createProblem(data: {
  title: string;
  description: string;
  code_snippet?: string;
  logs?: string;
  language?: string;
  agent_count?: number;
  document_name?: string;
  document_text?: string;
}): Promise<Problem> {
  const res = await smartFetch('/problems', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create problem' }));
    throw new Error(err.detail || 'Failed to create problem');
  }
  return res.json();
}

export async function solveProblem(id: string): Promise<Problem> {
  const res = await smartFetch(`/problems/${id}/solve`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to solve problem' }));
    throw new Error(err.detail || 'Failed to solve problem');
  }
  return res.json();
}

export async function deleteProblem(id: string): Promise<boolean> {
  const res = await smartFetch(`/problems/${id}`, {
    method: 'DELETE',
  });
  return res.ok;
}

export async function resetAllProblems(): Promise<{ message: string; count: number }> {
  const res = await smartFetch('/problems/reset-all', {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to reset problems' }));
    throw new Error(err.detail || 'Failed to reset problems');
  }
  return res.json();
}
