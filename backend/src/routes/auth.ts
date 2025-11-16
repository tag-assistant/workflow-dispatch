import { Router } from 'express';
import passport from '../middlewares/auth.js';

const router = Router();

// Initiate GitHub OAuth flow
router.get('/github', passport.authenticate('github'));

// GitHub OAuth callback
router.get(
  '/github/callback',
  passport.authenticate('github', { 
    failureRedirect: process.env.FRONTEND_URL || 'http://localhost:5173/login',
    successRedirect: process.env.FRONTEND_URL || 'http://localhost:5173'
  })
);

// Get current authenticated user
router.get('/user', (req, res) => {
  if (req.isAuthenticated()) {
    const user = req.user as any;
    // Don't send the access token to the frontend for security
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      profileUrl: user.profileUrl,
      avatarUrl: user.avatarUrl,
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to destroy session' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });
});

export default router;
