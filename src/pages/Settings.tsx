import { Box, Heading, Text, TextInput, FormControl, Label } from '@primer/react';
import { getToken } from '../lib/auth';

export function Settings() {
  const token = getToken();
  const masked = token ? `${token.slice(0, 7)}${'•'.repeat(20)}` : 'Not set';

  return (
    <Box>
      <Heading sx={{ mb: 4, color: 'fg.default' }}>Settings</Heading>

      <Box sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, p: 4, mb: 4 }}>
        <FormControl>
          <FormControl.Label sx={{ color: 'fg.default' }}>Authentication</FormControl.Label>
          <FormControl.Caption>Your token is stored in localStorage and never sent to any server.</FormControl.Caption>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
            <TextInput value={masked} readOnly sx={{ flex: 1 }} />
            <Label>PAT</Label>
          </Box>
        </FormControl>

        <Text as="p" sx={{ mt: 3, fontSize: 0, color: 'fg.muted' }}>
          To change your token, sign out and sign back in.
        </Text>
      </Box>
    </Box>
  );
}
