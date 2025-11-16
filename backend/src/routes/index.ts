import { Router } from 'express';

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

export default router;
