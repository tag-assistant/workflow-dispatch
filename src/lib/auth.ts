const TOKEN_KEY = 'gh_token';
const TOKEN_TYPE_KEY = 'gh_token_type';
const CLIENT_ID_KEY = 'gh_oauth_client_id';

export type TokenType = 'pat' | 'oauth';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string, type: TokenType = 'pat'): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_TYPE_KEY, type);
}

export function getTokenType(): TokenType {
  return (localStorage.getItem(TOKEN_TYPE_KEY) as TokenType) || 'pat';
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_TYPE_KEY);
}

// Default client ID for the hosted version (tag-assistant.github.io)
const DEFAULT_CLIENT_ID = 'Ov23liYkN9KtXO20gIoN';

export function getClientId(): string {
  // Priority: URL param > localStorage > default
  const params = new URLSearchParams(window.location.search);
  const urlClientId = params.get('client_id');
  if (urlClientId) {
    setClientId(urlClientId);
    return urlClientId;
  }
  return localStorage.getItem(CLIENT_ID_KEY) || DEFAULT_CLIENT_ID;
}

export function setClientId(clientId: string): void {
  localStorage.setItem(CLIENT_ID_KEY, clientId);
}

export function getStoredClientId(): string {
  return localStorage.getItem(CLIENT_ID_KEY) || '';
}
