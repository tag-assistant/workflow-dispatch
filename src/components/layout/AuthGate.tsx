import { useState, useEffect, type ReactNode, createContext, useContext } from 'react';
import { Box, Heading, Text, TextInput, Button, Spinner } from '@primer/react';
import { MarkGithubIcon, KeyIcon, ShieldLockIcon, LinkExternalIcon } from '@primer/octicons-react';
import { Banner } from '@primer/react/experimental';
import { getToken, setToken, clearToken } from '../../lib/auth';
import { validateToken, initOctokit, resetOctokit } from '../../lib/github';

interface AuthContextValue {
  user: any;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue>({ user: null, signOut: () => {} });
export const useAuth = () => useContext(AuthContext);

interface Props {
  children: ReactNode;
}

const CREATE_TOKEN_URL =
  'https://github.com/settings/tokens/new?scopes=repo,workflow&description=Workflow+Dispatch+UI';

export function AuthGate({ children }: Props) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);
  const [step, setStep] = useState(1); // 1 = create token, 2 = paste token

  useEffect(() => {
    const token = getToken();
    if (token) {
      validateToken(token)
        .then(u => { initOctokit(token); setUser(u); })
        .catch(() => { clearToken(); setError('Stored token expired or invalid. Please sign in again.'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleSignIn = async () => {
    const t = tokenInput.trim();
    if (!t) return;
    setValidating(true);
    setError('');
    try {
      const u = await validateToken(t);
      setToken(t);
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
    setStep(1);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bg: 'canvas.default' }}>
        <Spinner size="large" />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bg: 'canvas.default' }}>
        <Box sx={{ maxWidth: 480, width: '100%', p: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 5 }}>
            <MarkGithubIcon size={48} />
            <Heading sx={{ mt: 3, mb: 2, color: 'fg.default' }}>Workflow Dispatch</Heading>
            <Text sx={{ color: 'fg.muted', fontSize: 1 }}>
              Dispatch GitHub Actions workflows with a beautiful custom UI
            </Text>
          </Box>

          {error && <Box sx={{ mb: 3 }}><Banner variant="critical">{error}</Banner></Box>}

          {/* Auth Card */}
          <Box sx={{
            border: '1px solid',
            borderColor: 'border.default',
            borderRadius: 2,
            overflow: 'hidden',
          }}>
            {/* Step 1: Create Token */}
            <Box sx={{
              p: 4,
              borderBottom: '1px solid',
              borderColor: 'border.default',
              bg: step === 1 ? 'canvas.subtle' : 'transparent',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{
                  width: 28, height: 28, borderRadius: '50%',
                  bg: step >= 1 ? 'success.emphasis' : 'neutral.muted',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 0, fontWeight: 'bold', color: 'fg.onEmphasis', flexShrink: 0,
                }}>1</Box>
                <Text sx={{ fontWeight: 'bold', color: 'fg.default', fontSize: 1 }}>
                  Create a GitHub Personal Access Token
                </Text>
              </Box>

              <Text as="p" sx={{ color: 'fg.muted', fontSize: 0, ml: '36px', mb: 3 }}>
                You'll need a token with <strong style={{ color: 'inherit' }}>repo</strong> and <strong style={{ color: 'inherit' }}>workflow</strong> scopes.
                We'll pre-fill everything for you.
              </Text>

              <Box sx={{ ml: '36px' }}>
                <Button
                  variant="primary"
                  size="large"
                  leadingVisual={KeyIcon}
                  trailingVisual={LinkExternalIcon}
                  onClick={() => { window.open(CREATE_TOKEN_URL, '_blank'); setStep(2); }}
                >
                  Create Token on GitHub
                </Button>
              </Box>
            </Box>

            {/* Step 2: Paste Token */}
            <Box sx={{
              p: 4,
              bg: step === 2 ? 'canvas.subtle' : 'transparent',
              opacity: step < 2 ? 0.5 : 1,
              transition: 'opacity 0.2s',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{
                  width: 28, height: 28, borderRadius: '50%',
                  bg: step >= 2 ? 'success.emphasis' : 'neutral.muted',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 0, fontWeight: 'bold', color: 'fg.onEmphasis', flexShrink: 0,
                }}>2</Box>
                <Text sx={{ fontWeight: 'bold', color: 'fg.default', fontSize: 1 }}>
                  Paste your token
                </Text>
              </Box>

              <Box sx={{ ml: '36px' }}>
                <TextInput
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={tokenInput}
                  onChange={e => { setTokenInput(e.target.value); if (step < 2) setStep(2); }}
                  onKeyDown={e => e.key === 'Enter' && handleSignIn()}
                  onFocus={() => setStep(2)}
                  sx={{ width: '100%', mb: 3 }}
                  size="large"
                  aria-label="Personal Access Token"
                />

                <Button
                  variant="primary"
                  size="large"
                  onClick={handleSignIn}
                  disabled={validating || !tokenInput.trim()}
                  block
                >
                  {validating ? 'Validating...' : '🚀 Get Started'}
                </Button>
              </Box>
            </Box>
          </Box>

          {/* Security note */}
          <Box sx={{ textAlign: 'center', mt: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <ShieldLockIcon size={16} />
            <Text sx={{ color: 'fg.muted', fontSize: 0 }}>
              Your token is stored locally and never sent to any third-party server.
            </Text>
          </Box>
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
