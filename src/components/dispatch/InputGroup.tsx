import { Box, Text } from '@primer/react';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
}

export function InputGroup({ title, children }: Props) {
  return (
    <Box sx={{ mb: 4 }}>
      <Text sx={{ fontSize: 1, fontWeight: 'bold', color: 'fg.muted', textTransform: 'uppercase', letterSpacing: '0.05em', pb: 2, mb: 3, display: 'block', borderBottom: '1px solid', borderColor: 'border.default' }}>
        {title}
      </Text>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {children}
      </Box>
    </Box>
  );
}
