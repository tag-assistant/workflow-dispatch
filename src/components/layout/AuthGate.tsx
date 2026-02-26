import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Box, Heading, Text, TextInput, Button, Flash, Spinner } from '@primer/react';
import { MarkGithubIcon, KeyIcon, CopyIcon, LinkExternalIcon } from '@primer/octicons-react';
import { getToken, setToken, clearToken, getClientId } from '../../lib/auth';
import { validateToken, initOctokit, resetOctokit } from '../../lib/github';
import { requestDeviceCode, pollForToken } from '../../lib/oauth';

interface AuthContextValue {
  user: any;
  signOut: () => void;
}

import { createContext, useContext } from 'react';
export const AuthContext = createContext<AuthContextValue>({ user: null, signOut: () => {} });
export const useAuth = () => useContext(AuthContext);

interface Props {
  children: ReactNode;
}

export function AuthGate({ children }: Props) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);
  const [showPat, setShowPat] = useState(false);

  // OAuth device flow state
  const [deviceFlow, setDeviceFlow] = useState<{
    userCode: string;
    verificationUri: string;
    expiresAt: number;
  } | null>(null);
  const [deviceFlowLoading, setDeviceFlowLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      validateToken(token)
        .then(u => { initOctokit(token); setUser(u); })
        .catch(() => { setError('Stored token is invalid or expired.'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Countdown timer for device flow
  useEffect(() => {
    if (!deviceFlow) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((deviceFlow.expiresAt - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining === 0) setDeviceFlow(null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deviceFlow]);

  const handleOAuthStart = async () => {
    setError('');
    setDeviceFlowLoading(true);
    try {
      const resp = await requestDeviceCode();
      const expiresAt = Date.now() + resp.expires_in * 1000;
      setDeviceFlow({
        userCode: resp.user_code,
        verificationUri: resp.verification_uri,
        expiresAt,
      });

      // Start polling
      const controller = new AbortController();
      abortRef.current = controller;

      const token = await pollForToken(resp.device_code, resp.interval, resp.expires_in, controller.signal);

      // Validate and store
      const u = await validateToken(token);
      setToken(token, 'oauth');
      initOctokit(token);
      setUser(u);
      setDeviceFlow(null);
    } catch (e: any) {
      if (e.message !== 'Cancelled') {
        setError(e.message || 'OAuth authentication failed.');
      }
      setDeviceFlow(null);
    } finally {
      setDeviceFlowLoading(false);
      abortRef.current = null;
    }
  };

  const handleCancelDeviceFlow = () => {
    abortRef.current?.abort();
    setDeviceFlow(null);
    setDeviceFlowLoading(false);
  };

  const handleCopyCode = () => {
    if (deviceFlow) navigator.clipboard.writeText(deviceFlow.userCode);
  };

  const handleSignIn = async () => {
    const t = tokenInput.trim();
    if (!t) return;
    setValidating(true);
    setError('');
    try {
      const u = await validateToken(t);
      setToken(t, 'pat');
      initOctokit(t);
      setUser(u);
    } catch {
      setError('Invalid token. Make sure it has repo and workflow scopes.');
    } finally {
      setValidating(false);
    }
  };

  const signOut = () => {
    clearToken();
    resetOctokit();
    setUser(null);
    setTokenInput('');
    setShowPat(false);
    setDeviceFlow(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spinner size="large" />
      </Box>
    );
  }

  if (!user) {
    const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bg: 'canvas.default' }}>
        <Box sx={{ maxWidth: 440, width: '100%', p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 5 }}>
            <MarkGithubIcon size={48} />
            <Heading sx={{ mt: 3, mb: 2 }}>Workflow Dispatch</Heading>
            <Text sx={{ color: 'fg.muted' }}>Sign in to dispatch GitHub Actions workflows</Text>
          </Box>

          {error && <Flash variant="danger" sx={{ mb: 3 }}>{error}</Flash>}

          {/* Device Flow Active */}
          {deviceFlow ? (
            <Box sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, p: 4, textAlign: 'center' }}>
              <Text as="p" sx={{ mb: 3, fontWeight: 'bold' }}>Enter this code on GitHub:</Text>

              <Box sx={{
                display: 'inline-block', px: 4, py: 3, mb: 3,
                bg: 'canvas.subtle', borderRadius: 2,
                border: '2px solid', borderColor: 'accent.emphasis',
              }}>
                <Text sx={{ fontFamily: 'mono', fontSize: 4, fontWeight: 'bold', letterSpacing: '0.1em' }}>
                  {deviceFlow.userCode}
                </Text>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
                <Button size="small" onClick={handleCopyCode} leadingVisual={CopyIcon}>Copy</Button>
                <Button
                  size="small"
                  variant="primary"
                  leadingVisual={LinkExternalIcon}
                  onClick={() => window.open(deviceFlow.verificationUri, '_blank')}
                >
                  Open GitHub
                </Button>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
                <Spinner size="small" />
                <Text sx={{ color: 'fg.muted' }}>Waiting for authorization...</Text>
              </Box>

              <Text as="p" sx={{ fontSize: 0, color: 'fg.muted', mb: 3 }}>
                Code expires in {formatTime(countdown)}
              </Text>

              <Button variant="invisible" onClick={handleCancelDeviceFlow}>Cancel</Button>
            </Box>
          ) : (
            <>
              {/* OAuth Sign In Button */}
              <Box sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, p: 4, mb: 3 }}>
                <Button
                  variant="primary"
                  size="large"
                  onClick={handleOAuthStart}
                  disabled={deviceFlowLoading}
                  leadingVisual={MarkGithubIcon}
                  block
                >
                  {deviceFlowLoading ? 'Starting...' : 'Sign in with GitHub'}
                </Button>

                {getClientId() === 'PLACEHOLDER_CLIENT_ID' && (
                  <Text as="p" sx={{ mt: 2, fontSize: 0, color: 'attention.fg', textAlign: 'center' }}>
                    ⚠️ No OAuth App configured.{' '}
                    <a href="#" onClick={(e) => { e.preventDefault(); setShowPat(true); }}>Use a PAT instead</a>
                    {' '}or set a Client ID in Settings.
                  </Text>
                )}
              </Box>

              {/* Divider */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, my: 3 }}>
                <Box sx={{ flex: 1, height: '1px', bg: 'border.default' }} />
                <Text sx={{ color: 'fg.muted', fontSize: 0 }}>or</Text>
                <Box sx={{ flex: 1, height: '1px', bg: 'border.default' }} />
              </Box>

              {/* PAT Section */}
              {!showPat ? (
                <Box sx={{ textAlign: 'center' }}>
                  <Button variant="invisible" onClick={() => setShowPat(true)} leadingVisual={KeyIcon}>
                    Use a Personal Access Token
                  </Button>
                </Box>
              ) : (
                <Box sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, p: 4 }}>
                  <Text as="p" sx={{ fontWeight: 'bold', mb: 3 }}>
                    <KeyIcon /> Personal Access Token
                  </Text>

                  <TextInput
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={tokenInput}
                    onChange={e => setTokenInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSignIn()}
                    sx={{ width: '100%', mb: 3 }}
                    size="large"
                    aria-label="Personal Access Token"
                  />

                  <Button variant="primary" size="large" onClick={handleSignIn} disabled={validating || !tokenInput.trim()} block>
                    {validating ? 'Validating...' : 'Sign In'}
                  </Button>

                  <Text as="p" sx={{ mt: 3, fontSize: 0, color: 'fg.muted', textAlign: 'center' }}>
                    Need a token?{' '}
                    <a href="https://github.com/settings/tokens/new?scopes=repo,workflow&description=Workflow+Dispatch+UI" target="_blank" rel="noopener">
                      Create one with repo &amp; workflow scopes →
                    </a>
                  </Text>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <AuthContext.Provider value={{ user, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
