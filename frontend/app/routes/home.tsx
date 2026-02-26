import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Box, Heading, TextInput, Text, Flash } from '@primer/react';
import { api } from '../lib/api';
import { RepoSearch } from '../components/common/RepoSearch';
import { SearchIcon } from '@primer/octicons-react';

export function HomePage() {
  const [auth, setAuth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getAuthStatus().then(setAuth).finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ p: 6, textAlign: 'center' }}><Text>Loading...</Text></Box>;

  if (!auth?.authenticated) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Heading sx={{ mb: 3 }}>🚀 Workflow Dispatch</Heading>
        <Text as="p" sx={{ mb: 4, color: 'fg.muted', fontSize: 2 }}>
          A beautiful UI for dispatching GitHub Actions workflows
        </Text>
        <a href="/api/auth/github" style={{ textDecoration: 'none' }}>
          <Box
            as="button"
            sx={{
              bg: 'btn.primary.bg', color: 'btn.primary.text',
              border: 0, borderRadius: 2, px: 4, py: 2,
              fontSize: 2, cursor: 'pointer', fontWeight: 'bold',
            }}
          >
            Sign in with GitHub
          </Box>
        </a>
      </Box>
    );
  }

  return (
    <Box>
      <Heading sx={{ mb: 4 }}>Select a Repository</Heading>
      <RepoSearch onSelect={(owner, repo) => navigate(`/${owner}/${repo}`)} />
    </Box>
  );
}
