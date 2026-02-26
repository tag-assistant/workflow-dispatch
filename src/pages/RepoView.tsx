import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Heading, Text, ActionList, Flash, Spinner } from '@primer/react';
import { WorkflowIcon } from '@primer/octicons-react';
import { listWorkflows } from '../lib/github';

export function RepoView() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!owner || !repo) return;
    listWorkflows(owner, repo)
      .then(setWorkflows)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [owner, repo]);

  if (loading) return <Box sx={{ textAlign: 'center', py: 6 }}><Spinner size="large" /></Box>;
  if (error) return <Flash variant="danger">{error}</Flash>;

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
