import { useState } from 'react';
import { Box, Heading, Text, TextInput, Button, Flash, FormControl } from '@primer/react';
import { getToken } from '../lib/auth';

export function Settings() {
  const token = getToken();
  const masked = token ? `${token.slice(0, 7)}${'•'.repeat(20)}` : 'Not set';

  return (
    <Box>
      <Heading sx={{ mb: 4 }}>Settings</Heading>

      <Box sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, p: 4 }}>
        <FormControl>
          <FormControl.Label>Personal Access Token</FormControl.Label>
          <FormControl.Caption>Your token is stored in localStorage and never sent to any server.</FormControl.Caption>
          <TextInput value={masked} readOnly sx={{ width: '100%' }} />
        </FormControl>

        <Text as="p" sx={{ mt: 3, fontSize: 0, color: 'fg.muted' }}>
          To change your token, sign out and sign back in with a new one.
        </Text>
      </Box>
    </Box>
  );
}
