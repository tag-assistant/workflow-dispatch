import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Heading, Text, ActionList } from '@primer/react';
import { RepoIcon, ClockIcon, SearchIcon as SearchOcticon, StarFillIcon } from '@primer/octicons-react';
import { Blankslate } from '@primer/react/experimental';
import { RepoSearch } from '../components/common/RepoSearch';
import { getFavorites } from '../lib/storage';

const RECENT_KEY = 'wd-recent-repos';
const MAX_RECENT = 5;

interface RecentRepo {
  owner: string;
  repo: string;
  fullName: string;
  visitedAt: number;
}

export function getRecentRepos(): RecentRepo[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch { return []; }
}

export function addRecentRepo(owner: string, repo: string) {
  const recent = getRecentRepos().filter(r => r.fullName !== `${owner}/${repo}`);
  recent.unshift({ owner, repo, fullName: `${owner}/${repo}`, visitedAt: Date.now() });
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

export function HomePage() {
  const navigate = useNavigate();
  const [recentRepos, setRecentRepos] = useState<RecentRepo[]>([]);
  const [hasSearchResults, setHasSearchResults] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setRecentRepos(getRecentRepos());
    setFavorites(getFavorites());
  }, []);

  const handleSelect = (owner: string, repo: string) => {
    addRecentRepo(owner, repo);
    navigate(`/${owner}/${repo}`);
  };

  const parsedFavorites = favorites.map(key => {
    const parts = key.split('/');
    return { owner: parts[0], repo: parts[1], workflowId: parts[2], key };
  });

  return (
    <Box>
      <Box sx={{ mb: 4, pb: 3, borderBottom: '1px solid', borderColor: 'border.default' }}>
        <Heading sx={{ fontSize: 3, color: 'fg.default' }}>Workflow Dispatch</Heading>
        <Text sx={{ color: 'fg.muted', fontSize: 1 }}>Search for a repository to dispatch workflows</Text>
      </Box>

      <RepoSearch onSelect={handleSelect} onResults={setHasSearchResults} />

      {!hasSearchResults && parsedFavorites.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Heading sx={{ fontSize: 1, mb: 2, color: 'fg.muted', display: 'flex', alignItems: 'center', gap: 2 }}>
            <StarFillIcon size={16} /> Favorites
          </Heading>
          <Box sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, overflow: 'hidden' }}>
            <ActionList>
              {parsedFavorites.map(f => (
                <ActionList.Item key={f.key} onSelect={() => navigate(`/${f.owner}/${f.repo}/${f.workflowId}`)}>
                  <ActionList.LeadingVisual><StarFillIcon /></ActionList.LeadingVisual>
                  <Box>
                    <Text sx={{ fontWeight: 'bold' }}>{f.owner}/{f.repo}</Text>
                    <Text sx={{ color: 'fg.muted', ml: 1 }}>#{f.workflowId}</Text>
                  </Box>
                </ActionList.Item>
              ))}
            </ActionList>
          </Box>
        </Box>
      )}

      {!hasSearchResults && recentRepos.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Heading sx={{ fontSize: 1, mb: 2, color: 'fg.muted', display: 'flex', alignItems: 'center', gap: 2 }}>
            <ClockIcon size={16} /> Recently visited
          </Heading>
          <Box sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, overflow: 'hidden' }}>
            <ActionList>
              {recentRepos.map(r => (
                <ActionList.Item key={r.fullName} onSelect={() => handleSelect(r.owner, r.repo)}>
                  <ActionList.LeadingVisual><RepoIcon /></ActionList.LeadingVisual>
                  {r.fullName}
                </ActionList.Item>
              ))}
            </ActionList>
          </Box>
        </Box>
      )}

      {!hasSearchResults && recentRepos.length === 0 && parsedFavorites.length === 0 && (
        <Box sx={{ mt: 5 }}>
          <Blankslate>
            <Blankslate.Visual>
              <SearchOcticon size={24} />
            </Blankslate.Visual>
            <Blankslate.Heading>Search for a repository to get started</Blankslate.Heading>
            <Blankslate.Description>
              Find a repository with workflow_dispatch workflows and dispatch them with a custom UI.
            </Blankslate.Description>
          </Blankslate>
        </Box>
      )}
    </Box>
  );
}
