import { Routes, Route } from 'react-router';
import { Header } from './components/layout/Header';
import { HomePage } from './routes/home';
import { RepoPage } from './routes/repo';
import { DispatchPage } from './routes/dispatch';
import { HistoryPage } from './routes/history';
import { Box } from '@primer/react';

export function App() {
  return (
    <Box sx={{ minHeight: '100vh', bg: 'canvas.default' }}>
      <Header />
      <Box sx={{ maxWidth: 960, mx: 'auto', p: 4 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/:owner/:repo" element={<RepoPage />} />
          <Route path="/:owner/:repo/:workflow" element={<DispatchPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </Box>
    </Box>
  );
}
