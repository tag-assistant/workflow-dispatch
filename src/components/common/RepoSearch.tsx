import { useState, useEffect } from 'react';
import { Box, TextInput, ActionList, Text } from '@primer/react';
import { SearchIcon, RepoIcon, LockIcon } from '@primer/octicons-react';
import { SkeletonText, SkeletonBox } from '@primer/react/experimental';
import { searchRepos } from '../../lib/github';

interface Props {
  onSelect: (owner: string, repo: string) => void;
  onResults?: (hasResults: boolean) => void;
}

function SearchSkeleton() {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, overflow: 'hidden' }}>
      {[1, 2, 3, 4].map(i => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 3, px: 3, py: '12px', borderBottom: '1px solid', borderColor: 'border.muted' }}>
          <SkeletonBox width="16px" height="16px" />
          <Box sx={{ flex: 1 }}>
            <SkeletonText size="bodyMedium" />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export function RepoSearch({ onSelect, onResults }: Props) {
  const [query, setQuery] = useState('');
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setRepos([]);
      setSearched(false);
      onResults?.(false);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(() => {
      searchRepos(query)
        .then(r => { setRepos(r); setSearched(true); onResults?.(true); })
        .catch(() => { setRepos([]); setSearched(true); onResults?.(true); })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <Box>
      <TextInput
        leadingVisual={SearchIcon}
        placeholder="Search repositories..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        sx={{ width: '100%', mb: 3 }}
        size="large"
      />
      {loading && <SearchSkeleton />}
      {!loading && searched && (
        <Box sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, overflow: 'hidden' }}>
          <ActionList>
            {repos.map(r => (
              <ActionList.Item key={r.id} onSelect={() => onSelect(r.owner, r.name)}>
                <ActionList.LeadingVisual>
                  {r.private ? <LockIcon /> : <RepoIcon />}
                </ActionList.LeadingVisual>
                <Box>
                  <Text sx={{ fontWeight: 'bold' }}>{r.full_name}</Text>
                  {r.description && (
                    <Text as="p" sx={{ color: 'fg.muted', fontSize: 0, mt: 1 }}>{r.description}</Text>
                  )}
                </Box>
              </ActionList.Item>
            ))}
            {repos.length === 0 && (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Text sx={{ color: 'fg.muted' }}>No repositories found.</Text>
              </Box>
            )}
          </ActionList>
        </Box>
      )}
    </Box>
  );
}
