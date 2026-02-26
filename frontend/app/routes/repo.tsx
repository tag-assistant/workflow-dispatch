import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Box, Heading, Text, ActionList } from '@primer/react';
import { WorkflowIcon } from '@primer/octicons-react';
import { api } from '../lib/api';

export function RepoPage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!owner || !repo) return;
    api.getWorkflows(owner, repo)
      .then(setWorkflows)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [owner, repo]);

  if (loading) return <Text>Loading workflows...</Text>;
  if (error) return <Text sx={{ color: 'danger.fg' }}>{error}</Text>;

  return (
    <Box>
      <Heading sx={{ mb: 2 }}>{owner}/{repo}</Heading>
      <Text as="p" sx={{ mb: 4, color: 'fg.muted' }}>Select a workflow to dispatch</Text>
      <ActionList>
        {workflows.map(w => (
          <ActionList.Item key={w.id} onSelect={() => navigate(`/${owner}/${repo}/${w.id}`)}>
            <ActionList.LeadingVisual><WorkflowIcon /></ActionList.LeadingVisual>
            {w.name}
            <ActionList.Description>{w.path}</ActionList.Description>
          </ActionList.Item>
        ))}
        {workflows.length === 0 && (
          <Text sx={{ color: 'fg.muted', p: 3 }}>No dispatchable workflows found.</Text>
        )}
      </ActionList>
    </Box>
  );
}
