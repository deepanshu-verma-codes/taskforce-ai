import { Problem, DashboardStats, AgentLog, DocumentUploadResponse } from './types';

const DIRECT_API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

async function smartFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const timeoutMs = 180000; // 3-minute SLA timeout guard
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const mergedOptions: RequestInit = {
    ...options,
    signal: options?.signal || controller.signal,
  };

  try {
    // Strategy 1: Attempt direct connection to backend
    try {
      const directRes = await fetch(`${DIRECT_API}${endpoint}`, mergedOptions);
      if (directRes.ok) return directRes;
    } catch {
      // Direct connection failed (e.g. cross-origin or proxy required), try relative
    }

    // Strategy 2: Attempt relative proxy (/api/...)
    const proxyRes = await fetch(`/api${endpoint}`, mergedOptions);
    if (!proxyRes.ok) {
      throw new Error(`API request failed for ${endpoint} with status ${proxyRes.status}`);
    }
    return proxyRes;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchStats(): Promise<DashboardStats> {
  const res = await smartFetch('/stats');
  return res.json();
}

export async function fetchProblems(): Promise<Problem[]> {
  const res = await smartFetch('/problems');
  return res.json();
}

export async function fetchProblemById(id: string): Promise<Problem> {
  const res = await smartFetch(`/problems/${id}`);
  return res.json();
}

export async function fetchProblemLogs(id: string): Promise<AgentLog[]> {
  const res = await smartFetch(`/problems/${id}/logs`);
  return res.json();
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
  return res.json();
}

export async function solveProblem(id: string): Promise<Problem> {
  const res = await smartFetch(`/problems/${id}/solve`, {
    method: 'POST',
  });
  return res.json();
}
