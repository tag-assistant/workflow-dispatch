import { Box, Heading } from '@primer/react';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
}

export function InputGroup({ title, children }: Props) {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, p: 3, mb: 3 }}>
      <Heading sx={{ fontSize: 1, mb: 3, color: 'fg.muted', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </Heading>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {children}
      </Box>
    </Box>
  );
}
