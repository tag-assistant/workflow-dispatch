import { useState, useEffect } from 'react';
import { Box, TextInput, ActionList, Text, Spinner } from '@primer/react';
import { SearchIcon, RepoIcon, LockIcon } from '@primer/octicons-react';
import { searchRepos } from '../../lib/github';

interface Props {
  onSelect: (owner: string, repo: string) => void;
}

export function RepoSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      searchRepos(query || undefined)
        .then(setRepos)
        .catch(() => setRepos([]))
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
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}><Spinner /></Box>
      ) : (
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
          {repos.length === 0 && !loading && (
            <Text sx={{ color: 'fg.muted', p: 3 }}>No repositories found.</Text>
          )}
        </ActionList>
      )}
    </Box>
  );
}
