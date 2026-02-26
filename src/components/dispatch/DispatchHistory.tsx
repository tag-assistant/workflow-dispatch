import { useEffect, useState } from 'react';
import { ActionList, Avatar, Box, Label, Spinner, Text, RelativeTime } from '@primer/react';
import { CheckCircleIcon, XCircleIcon, ClockIcon, SyncIcon, SkipIcon } from '@primer/octicons-react';
import { listRuns } from '../../lib/github';

interface Props {
  owner: string;
  repo: string;
  workflowId?: number;
}

function statusIcon(status: string, conclusion: string | null) {
  if (status === 'completed') {
    if (conclusion === 'success') return <CheckCircleIcon fill="var(--fgColor-success)" />;
    if (conclusion === 'failure') return <XCircleIcon fill="var(--fgColor-danger)" />;
    if (conclusion === 'cancelled') return <SkipIcon fill="var(--fgColor-muted)" />;
    return <CheckCircleIcon fill="var(--fgColor-success)" />;
  }
  if (status === 'in_progress') return <SyncIcon className="anim-rotate" fill="var(--fgColor-attention)" />;
  return <ClockIcon fill="var(--fgColor-muted)" />;
}

export function DispatchHistory({ owner, repo, workflowId }: Props) {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listRuns(owner, repo, workflowId)
      .then(setRuns)
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  }, [owner, repo, workflowId]);

  if (loading) return <Box sx={{ textAlign: 'center', py: 4 }}><Spinner /></Box>;
  if (runs.length === 0) return <Text sx={{ color: 'fg.muted', fontStyle: 'italic' }}>No recent runs.</Text>;

  return (
    <ActionList>
      {runs.map(run => (
        <ActionList.LinkItem key={run.id} href={run.html_url} target="_blank" rel="noopener">
          <ActionList.LeadingVisual>
            {statusIcon(run.status, run.conclusion)}
          </ActionList.LeadingVisual>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Text sx={{ fontWeight: 'bold' }}>#{run.run_number}</Text>
            <Label>{run.head_branch}</Label>
          </Box>
          <ActionList.Description>
            <RelativeTime date={new Date(run.created_at)} />
            {run.actor && <> by {run.actor.login}</>}
          </ActionList.Description>
          {run.actor && (
            <ActionList.TrailingVisual>
              <Avatar src={run.actor.avatar_url} size={20} />
            </ActionList.TrailingVisual>
          )}
        </ActionList.LinkItem>
      ))}
    </ActionList>
  );
}
