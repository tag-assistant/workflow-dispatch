import { Box, Heading, Text } from '@primer/react';

export function HistoryPage() {
  return (
    <Box>
      <Heading sx={{ mb: 3 }}>Dispatch History</Heading>
      <Text sx={{ color: 'fg.muted' }}>
        Select a repository and workflow to view dispatch history.
      </Text>
    </Box>
  );
}
