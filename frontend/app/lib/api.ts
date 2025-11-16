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
};
