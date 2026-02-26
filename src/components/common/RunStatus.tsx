import { Box, Label, Text, RelativeTime } from '@primer/react';
import { CheckCircleIcon, XCircleIcon, ClockIcon, SyncIcon } from '@primer/octicons-react';

interface Props {
  run: {
    status: string;
    conclusion: string | null;
    head_branch: string;
    created_at: string;
    html_url: string;
    run_number: number;
    actor: { login: string; avatar_url: string } | null;
  };
}

function statusIcon(status: string, conclusion: string | null) {
  if (status === 'completed') {
    if (conclusion === 'success') return <CheckCircleIcon fill="var(--fgColor-success)" />;
    if (conclusion === 'failure') return <XCircleIcon fill="var(--fgColor-danger)" />;
    return <CheckCircleIcon />;
  }
  if (status === 'in_progress') return <SyncIcon className="anim-rotate" fill="var(--fgColor-accent)" />;
  return <ClockIcon fill="var(--fgColor-attention)" />;
}

export function RunStatus({ run }: Props) {
  return (
    <Box
      as="a"
      href={run.html_url}
      target="_blank"
      rel="noopener"
      sx={{
        display: 'flex', alignItems: 'center', gap: 2, py: 2, px: 3,
        textDecoration: 'none', color: 'fg.default',
        borderRadius: 2, ':hover': { bg: 'canvas.subtle' },
      }}
    >
      {statusIcon(run.status, run.conclusion)}
      <Text sx={{ fontWeight: 'bold' }}>#{run.run_number}</Text>
      <Label>{run.head_branch}</Label>
      <Box sx={{ flex: 1 }} />
      <Text sx={{ color: 'fg.muted', fontSize: 0 }}>
        <RelativeTime date={new Date(run.created_at)} />
      </Text>
      {run.actor && (
        <Text sx={{ color: 'fg.muted', fontSize: 0 }}>by @{run.actor.login}</Text>
      )}
    </Box>
  );
}
