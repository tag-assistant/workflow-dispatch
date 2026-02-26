import { useState, useEffect, type ReactNode } from 'react';
import { Box, Heading, Text, TextInput, Button, Flash, Spinner } from '@primer/react';
import { MarkGithubIcon, KeyIcon } from '@primer/octicons-react';
import { getToken, setToken } from '../../lib/auth';
import { validateToken, initOctokit } from '../../lib/github';

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
    import('../../lib/auth').then(({ clearToken }) => clearToken());
    import('../../lib/github').then(({ resetOctokit }) => resetOctokit());
    setUser(null);
    setTokenInput('');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spinner size="large" />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bg: 'canvas.default' }}>
        <Box sx={{ maxWidth: 440, width: '100%', p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 5 }}>
            <MarkGithubIcon size={48} />
            <Heading sx={{ mt: 3, mb: 2 }}>Workflow Dispatch</Heading>
            <Text sx={{ color: 'fg.muted' }}>A beautiful UI for dispatching GitHub Actions workflows</Text>
          </Box>

          <Box sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, p: 4 }}>
            <Text as="p" sx={{ fontWeight: 'bold', mb: 3 }}>
              <KeyIcon /> Sign in with a Personal Access Token
            </Text>

            {error && <Flash variant="danger" sx={{ mb: 3 }}>{error}</Flash>}

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
