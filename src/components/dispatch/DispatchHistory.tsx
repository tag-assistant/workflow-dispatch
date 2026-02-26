import { useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { ActionList, Avatar, Box, Label, Text, RelativeTime } from '@primer/react';
import { CheckCircleIcon, XCircleIcon, ClockIcon, SyncIcon, SkipIcon } from '@primer/octicons-react';
import { SkeletonText, SkeletonBox, SkeletonAvatar } from '@primer/react/experimental';
import { listRuns } from '../../lib/github';

interface Props {
  owner: string;
  repo: string;
  workflowId?: number;
}

export interface DispatchHistoryHandle {
  refresh: () => Promise<void>;
}

function statusIcon(status: string, conclusion: string | null) {
  if (status === 'completed') {
    if (conclusion === 'success') return <CheckCircleIcon fill="var(--fgColor-success)" />;
    if (conclusion === 'failure') return <XCircleIcon fill="var(--fgColor-danger)" />;
    if (conclusion === 'cancelled') return <SkipIcon fill="var(--fgColor-muted)" />;
    return <CheckCircleIcon fill="var(--fgColor-success)" />;
  }
  if (status === 'in_progress') return <SyncIcon className="anim-rotate" fill="var(--fgColor-accent)" />;
  return <ClockIcon fill="var(--fgColor-attention)" />;
}

function RunsSkeleton() {
  return (
    <Box>
      {[1, 2, 3, 4, 5].map(i => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 3, px: 3, py: '10px', borderBottom: '1px solid', borderColor: 'border.muted' }}>
          <SkeletonBox width="16px" height="16px" />
          <SkeletonText size="bodyMedium" maxWidth={60} />
          <SkeletonBox width="60px" height="20px" />
          <Box sx={{ flex: 1 }} />
          <SkeletonText size="bodySmall" maxWidth={80} />
          <SkeletonAvatar size={20} />
        </Box>
      ))}
    </Box>
  );
}

export const DispatchHistory = forwardRef<DispatchHistoryHandle, Props>(({ owner, repo, workflowId }, ref) => {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRuns = useCallback(async () => {
    try {
      const data = await listRuns(owner, repo, workflowId);
      setRuns(data);
    } catch {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, [owner, repo, workflowId]);

  useImperativeHandle(ref, () => ({ refresh: fetchRuns }), [fetchRuns]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  if (loading) return <RunsSkeleton />;
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
});
