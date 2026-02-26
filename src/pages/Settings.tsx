import { useState } from 'react';
import { Box, Heading, Text, TextInput, Button, FormControl, Flash, Label } from '@primer/react';
import { getToken, getTokenType, getStoredClientId, setClientId } from '../lib/auth';

export function Settings() {
  const token = getToken();
  const tokenType = getTokenType();
  const masked = token ? `${token.slice(0, 7)}${'•'.repeat(20)}` : 'Not set';

  const [clientId, setClientIdInput] = useState(getStoredClientId());
  const [saved, setSaved] = useState(false);

  const handleSaveClientId = () => {
    setClientId(clientId.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Box>
      <Heading sx={{ mb: 4 }}>Settings</Heading>

      <Box sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, p: 4, mb: 4 }}>
        <FormControl>
          <FormControl.Label>Authentication</FormControl.Label>
          <FormControl.Caption>Your token is stored in localStorage and never sent to any server.</FormControl.Caption>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
            <TextInput value={masked} readOnly sx={{ flex: 1 }} />
            <Label variant={tokenType === 'oauth' ? 'accent' : 'default'}>
              {tokenType === 'oauth' ? 'OAuth' : 'PAT'}
            </Label>
          </Box>
        </FormControl>

        <Text as="p" sx={{ mt: 3, fontSize: 0, color: 'fg.muted' }}>
          To change your token, sign out and sign back in.
        </Text>
      </Box>

      <Box sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, p: 4 }}>
        <FormControl>
          <FormControl.Label>OAuth Client ID</FormControl.Label>
          <FormControl.Caption>
            Override the default OAuth App client ID for self-hosted instances.{' '}
            <a href="https://github.com/settings/applications/new" target="_blank" rel="noopener">
              Create an OAuth App →
            </a>
          </FormControl.Caption>
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextInput
              value={clientId}
              onChange={e => { setClientIdInput(e.target.value); setSaved(false); }}
              placeholder="Ov23li..."
              sx={{ flex: 1 }}
            />
            <Button onClick={handleSaveClientId}>Save</Button>
          </Box>
        </FormControl>

        {saved && <Flash variant="success" sx={{ mt: 2 }}>Client ID saved.</Flash>}

        <Text as="p" sx={{ mt: 3, fontSize: 0, color: 'fg.muted' }}>
          When using OAuth Device Flow, the app needs a GitHub OAuth App with "Device Authorization Flow" enabled.
          No callback URL is required.
        </Text>
      </Box>
    </Box>
  );
}
