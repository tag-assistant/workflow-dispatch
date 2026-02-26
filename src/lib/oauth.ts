import { getClientId } from './auth';

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface TokenErrorResponse {
  error: string;
  error_description?: string;
}

export async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const clientId = getClientId();
  const res = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      scope: 'repo',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to request device code: ${res.status} ${text}`);
  }

  return res.json();
}

export async function pollForToken(
  deviceCode: string,
  interval: number,
  expiresIn: number,
  signal: AbortSignal,
): Promise<string> {
  const clientId = getClientId();
  const deadline = Date.now() + expiresIn * 1000;
  let pollInterval = interval * 1000;

  while (Date.now() < deadline) {
    if (signal.aborted) throw new Error('Cancelled');

    await new Promise(resolve => setTimeout(resolve, pollInterval));
    if (signal.aborted) throw new Error('Cancelled');

    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    const data: TokenResponse | TokenErrorResponse = await res.json();

    if ('access_token' in data) {
      return data.access_token;
    }

    const err = data as TokenErrorResponse;
    switch (err.error) {
      case 'authorization_pending':
        continue;
      case 'slow_down':
        pollInterval += 5000;
        continue;
      case 'expired_token':
        throw new Error('Device code expired. Please try again.');
      case 'access_denied':
        throw new Error('Authorization was denied.');
      default:
        throw new Error(err.error_description || err.error || 'Unknown error');
    }
  }

  throw new Error('Device code expired. Please try again.');
}
