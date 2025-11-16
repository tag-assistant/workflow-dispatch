const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Include cookies for session auth
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || errorData.error || 'API request failed',
        response.status,
        errorData
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error', 0, error);
  }
}

export const api = {
  hello: () => fetchApi<{ message: string }>('/api/hello'),
  
  // Auth endpoints
  auth: {
    getUser: () => fetchApi<{
      id: string;
      username: string;
      displayName: string;
      profileUrl: string;
      avatarUrl?: string;
    }>('/auth/user'),
    
    logout: () => fetchApi<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),
    
    getLoginUrl: () => `${API_URL}/auth/github`,
  },
  
  // Workflow endpoints
  workflows: {
    dispatch: (data: {
      owner: string;
      repo: string;
      workflow_id: string;
      ref: string;
      inputs?: Record<string, string>;
    }) => fetchApi<{
      message: string;
      owner: string;
      repo: string;
      workflow_id: string;
      ref: string;
    }>('/api/workflows/dispatch', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },

  // GitHub API endpoints
  github: {
    listOrgs: (params?: { page?: number; per_page?: number }) =>
      fetchApi<{
        orgs: Array<{
          login: string;
          id: number;
          avatar_url: string;
          description: string | null;
        }>;
        page: number;
        per_page: number;
        has_more: boolean;
      }>(`/api/github/orgs?${new URLSearchParams({
        page: (params?.page || 1).toString(),
        per_page: (params?.per_page || 30).toString(),
      })}`),

    listRepos: (params?: { page?: number; per_page?: number; owner?: string; q?: string }) =>
      fetchApi<{
        repos: Array<{
          id: number;
          name: string;
          full_name: string;
          owner: string;
          private: boolean;
          description: string | null;
          updated_at: string;
        }>;
        page: number;
        per_page: number;
        has_more: boolean;
      }>(`/api/github/repos?${new URLSearchParams({
        page: (params?.page || 1).toString(),
        per_page: (params?.per_page || 30).toString(),
        ...(params?.owner ? { owner: params.owner } : {}),
        ...(params?.q ? { q: params.q } : {}),
      })}`),  

    listWorkflows: (owner: string, repo: string, params?: { page?: number; per_page?: number }) =>
      fetchApi<{
        workflows: Array<{
          id: number;
          name: string;
          path: string;
          state: string;
          created_at: string;
          updated_at: string;
        }>;
        page: number;
        per_page: number;
        has_more: boolean;
        total_count: number;
      }>(`/api/github/workflows/${owner}/${repo}?${new URLSearchParams({
        page: (params?.page || 1).toString(),
        per_page: (params?.per_page || 30).toString(),
      })}`),

    listBranches: (owner: string, repo: string, params?: { page?: number; per_page?: number }) =>
      fetchApi<{
        branches: Array<{
          name: string;
          protected: boolean;
        }>;
        page: number;
        per_page: number;
        has_more: boolean;
      }>(`/api/github/repos/${owner}/${repo}/branches?${new URLSearchParams({
        page: (params?.page || 1).toString(),
        per_page: (params?.per_page || 30).toString(),
      })}`),

    getWorkflowSchema: (owner: string, repo: string, workflow_id: string) =>
      fetchApi<{
        id: number;
        name: string;
        path: string;
        state: string;
        has_workflow_dispatch: boolean;
        inputs: Record<string, {
          description: string;
          required: boolean;
          default: string;
          type: string;
          options: string[] | null;
        }>;
      }>(`/api/github/workflows/${owner}/${repo}/${workflow_id}`),
  },
};
