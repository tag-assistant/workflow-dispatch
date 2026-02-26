import { Routes, Route } from 'react-router-dom';
import { Box } from '@primer/react';
import { Header } from './components/layout/Header';
import { AuthGate } from './components/layout/AuthGate';
import { HomePage } from './pages/Home';
import { RepoView } from './pages/RepoView';
import { DispatchPage } from './pages/DispatchPage';
import { Settings } from './pages/Settings';

export function App() {
  return (
    <Box sx={{ minHeight: '100vh', bg: 'canvas.default' }}>
      <AuthGate>
        <Header />
        <Box sx={{ maxWidth: 960, mx: 'auto', p: 4 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/:owner/:repo" element={<RepoView />} />
            <Route path="/:owner/:repo/:workflow" element={<DispatchPage />} />
          </Routes>
        </Box>
      </AuthGate>
    </Box>
  );
}
