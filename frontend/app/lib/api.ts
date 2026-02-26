const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  getAuthStatus: () => request<{ authenticated: boolean; user?: any }>('/auth/status'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getRepos: (q?: string) => request<any[]>(`/repos${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  getWorkflows: (owner: string, repo: string) => request<any[]>(`/repos/${owner}/${repo}/workflows`),
  getWorkflow: (owner: string, repo: string, id: string) => request<any>(`/repos/${owner}/${repo}/workflows/${id}`),
  getConfig: (owner: string, repo: string) => request<any>(`/repos/${owner}/${repo}/config`),
  getBranches: (owner: string, repo: string) => request<any[]>(`/repos/${owner}/${repo}/branches`),
  getEnvironments: (owner: string, repo: string) => request<any[]>(`/repos/${owner}/${repo}/environments`),
  getRuns: (owner: string, repo: string, workflowId?: number) =>
    request<any[]>(`/repos/${owner}/${repo}/runs${workflowId ? `?workflow_id=${workflowId}` : ''}`),
  dispatch: (owner: string, repo: string, workflowId: number, ref: string, inputs: Record<string, string>) =>
    request<{ success: boolean }>(`/repos/${owner}/${repo}/dispatches`, {
      method: 'POST',
      body: JSON.stringify({ workflow_id: workflowId, ref, inputs }),
    }),
};
