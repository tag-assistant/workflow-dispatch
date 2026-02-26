import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Heading, Text, ActionList, Breadcrumbs } from '@primer/react';
import { WorkflowIcon, RepoIcon } from '@primer/octicons-react';
import { Blankslate, Banner, SkeletonText, SkeletonBox } from '@primer/react/experimental';
import { listWorkflows } from '../lib/github';
import { addRecentRepo } from './Home';

function WorkflowListSkeleton() {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, overflow: 'hidden' }}>
      {[1, 2, 3].map(i => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 3, px: 3, py: '12px', borderBottom: '1px solid', borderColor: 'border.muted' }}>
          <SkeletonBox width="16px" height="16px" />
          <Box sx={{ flex: 1 }}>
            <SkeletonText size="bodyMedium" />
            <SkeletonText size="bodySmall" maxWidth={200} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export function RepoView() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!owner || !repo) return;
    addRecentRepo(owner, repo);
    listWorkflows(owner, repo)
      .then(setWorkflows)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [owner, repo]);

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 3 }}>
        <Breadcrumbs.Item onClick={() => navigate('/')} sx={{ cursor: 'pointer' }}>Home</Breadcrumbs.Item>
        <Breadcrumbs.Item selected>{owner}/{repo}</Breadcrumbs.Item>
      </Breadcrumbs>

      <Box sx={{ mb: 4, pb: 3, borderBottom: '1px solid', borderColor: 'border.default', display: 'flex', alignItems: 'center', gap: 2 }}>
        <RepoIcon size={24} />
        <Box>
          <Heading sx={{ fontSize: 3, color: 'fg.default' }}>{owner}/{repo}</Heading>
          <Text sx={{ color: 'fg.muted', fontSize: 1 }}>Select a workflow to dispatch</Text>
        </Box>
      </Box>

      {error && <Banner variant="critical" title="Failed to load workflows">{error}</Banner>}

      {loading && <WorkflowListSkeleton />}

      {!loading && !error && workflows.length === 0 && (
        <Blankslate>
          <Blankslate.Visual>
            <WorkflowIcon size={24} />
          </Blankslate.Visual>
          <Blankslate.Heading>No dispatchable workflows</Blankslate.Heading>
          <Blankslate.Description>
            This repository doesn't have any workflows with <code>workflow_dispatch</code> triggers.
          </Blankslate.Description>
        </Blankslate>
      )}

      {!loading && !error && workflows.length > 0 && (
        <Box sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, overflow: 'hidden' }}>
          <ActionList>
            {workflows.map(w => (
              <ActionList.Item key={w.id} onSelect={() => navigate(`/${owner}/${repo}/${w.id}`)}>
                <ActionList.LeadingVisual><WorkflowIcon /></ActionList.LeadingVisual>
                <Box>
                  <Text sx={{ fontWeight: 'bold' }}>{w.name}</Text>
                </Box>
                <ActionList.Description>{w.path}</ActionList.Description>
              </ActionList.Item>
            ))}
          </ActionList>
        </Box>
      )}
    </Box>
  );
}
