import { Router } from 'express';
import githubRoutes from './github.js';

const router = Router();

// Health check endpoints
router.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/health/ready', (req, res) => {
  // Add dependency checks here (database, redis, etc.)
  res.status(200).json({ 
    status: 'ready', 
    timestamp: new Date().toISOString() 
  });
});

// API routes
router.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello Worlds' });
});

// GitHub API routes
router.use('/api/github', githubRoutes);

export default router;
