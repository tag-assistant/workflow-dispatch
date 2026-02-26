import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { authRouter } from './routes/auth.js';
import { reposRouter } from './routes/repos.js';
import { workflowsRouter } from './routes/workflows.js';
import { dispatchesRouter } from './routes/dispatches.js';
import { authMiddleware } from './middleware/auth.js';
import { apiLimiter } from './middleware/rateLimit.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'workflow-dispatch-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.use(passport.initialize());
app.use(passport.session());

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const CALLBACK_URL = process.env.CALLBACK_URL || 'http://localhost:3001/api/auth/github/callback';

if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy(
    {
      clientID: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
      callbackURL: CALLBACK_URL,
      scope: ['repo', 'workflow'],
    },
    (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
      profile.accessToken = _accessToken;
      done(null, profile);
    }
  ));
}

passport.serializeUser((user: any, done) => done(null, user));
passport.deserializeUser((obj: any, done) => done(null, obj));

app.use('/api', apiLimiter);
app.use('/api/auth', authRouter);
app.use('/api/repos', authMiddleware, reposRouter);
app.use('/api/repos', authMiddleware, workflowsRouter);
app.use('/api/repos', authMiddleware, dispatchesRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
