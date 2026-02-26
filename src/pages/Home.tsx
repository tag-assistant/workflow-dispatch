import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Heading, Text } from '@primer/react';
import { RepoSearch } from '../components/common/RepoSearch';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <Box>
      <Heading sx={{ mb: 4 }}>Select a Repository</Heading>
      <RepoSearch onSelect={(owner, repo) => navigate(`/${owner}/${repo}`)} />
    </Box>
  );
}
