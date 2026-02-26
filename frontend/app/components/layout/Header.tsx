import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Box, Header as PrimerHeader, Text, Avatar, ActionMenu, ActionList } from '@primer/react';
import { MarkGithubIcon } from '@primer/octicons-react';
import { api } from '../../lib/api';

export function Header() {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.getAuthStatus().then(data => {
      if (data.authenticated) setUser(data.user);
    });
  }, []);

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
                <Avatar src={user.avatar} size={24} />
                <Text sx={{ color: 'header.text' }}>{user.login}</Text>
              </Box>
            </ActionMenu.Anchor>
            <ActionMenu.Overlay>
              <ActionList>
                <ActionList.Item onSelect={() => navigate('/history')}>History</ActionList.Item>
                <ActionList.Divider />
                <ActionList.Item variant="danger" onSelect={() => {
                  api.logout().then(() => window.location.href = '/');
                }}>Sign out</ActionList.Item>
              </ActionList>
            </ActionMenu.Overlay>
          </ActionMenu>
        </PrimerHeader.Item>
      )}
    </PrimerHeader>
  );
}
