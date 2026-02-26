import { useEffect, useState } from 'react';
import { Box, Text, Spinner } from '@primer/react';
import { listRuns } from '../../lib/github';
import { RunStatus } from '../common/RunStatus';

interface Props {
  owner: string;
  repo: string;
  workflowId?: number;
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

  if (loading) return <Spinner />;
  if (runs.length === 0) return <Text sx={{ color: 'fg.muted' }}>No recent runs.</Text>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {runs.map(run => <RunStatus key={run.id} run={run} />)}
    </Box>
  );
}
