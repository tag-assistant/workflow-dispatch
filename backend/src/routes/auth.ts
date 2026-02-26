import { Router } from 'express';
import passport from 'passport';

export const authRouter = Router();

authRouter.get('/status', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    const user = req.user as any;
    res.json({
      authenticated: true,
      user: {
        login: user.username || user.displayName,
        avatar: user.photos?.[0]?.value,
        name: user.displayName,
      },
    });
  } else {
    res.json({ authenticated: false });
  }
});

authRouter.get('/github', passport.authenticate('github', { scope: ['repo', 'workflow'] }));

authRouter.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/' }),
  (_req, res) => {
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
  }
);

authRouter.post('/logout', (req, res) => {
  req.logout(() => {
    res.json({ success: true });
  });
});
