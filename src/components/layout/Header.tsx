import { useNavigate } from 'react-router-dom';
import { Box, Header as PrimerHeader, Text, Avatar, ActionMenu, ActionList } from '@primer/react';
import { MarkGithubIcon, GearIcon } from '@primer/octicons-react';
import { useAuth } from './AuthGate';

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <PrimerHeader>
      <PrimerHeader.Item>
        <PrimerHeader.Link onClick={() => navigate('/')} sx={{ cursor: 'pointer', fontSize: 2, fontWeight: 'bold' }}>
          <MarkGithubIcon size={32} />
          <Text sx={{ ml: 2 }}>Workflow Dispatch</Text>
        </PrimerHeader.Link>
      </PrimerHeader.Item>
      <PrimerHeader.Item full />
      {user && (
        <PrimerHeader.Item>
          <ActionMenu>
            <ActionMenu.Anchor>
              <Box sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar src={user.avatar_url} size={24} />
                <Text sx={{ color: 'header.text' }}>{user.login}</Text>
              </Box>
            </ActionMenu.Anchor>
            <ActionMenu.Overlay>
              <ActionList>
                <ActionList.Item onSelect={() => navigate('/settings')}>
                  <ActionList.LeadingVisual><GearIcon /></ActionList.LeadingVisual>
                  Settings
                </ActionList.Item>
                <ActionList.Divider />
                <ActionList.Item variant="danger" onSelect={signOut}>Sign out</ActionList.Item>
              </ActionList>
            </ActionMenu.Overlay>
          </ActionMenu>
        </PrimerHeader.Item>
      )}
    </PrimerHeader>
  );
}
