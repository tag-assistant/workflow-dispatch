import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';

let isInitialized = false;

// Lazy-load configuration to ensure environment variables are loaded
const getGitHubConfig = () => {
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback';

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    throw new Error('GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set in environment variables');
  }

  return { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_CALLBACK_URL };
};

// Configure GitHub OAuth strategy with repo and workflow scopes
export const initializePassport = () => {
  if (isInitialized) return;
  
  const config = getGitHubConfig();
  
  passport.use(
    new GitHubStrategy(
      {
        clientID: config.GITHUB_CLIENT_ID,
        clientSecret: config.GITHUB_CLIENT_SECRET,
        callbackURL: config.GITHUB_CALLBACK_URL,
        scope: ['repo', 'workflow', 'read:org'], // Scopes needed for workflow dispatch and listing orgs
      },
      (accessToken: string, refreshToken: string, profile: any, done: any) => {
        // Store the access token with the user profile
        const user = {
          id: profile.id,
          username: profile.username,
          displayName: profile.displayName,
          profileUrl: profile.profileUrl,
          avatarUrl: profile.photos?.[0]?.value,
          accessToken, // Store token for making GitHub API calls
        };
        return done(null, user);
      }
    )
  );

  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  // Deserialize user from session
  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });
  
  isInitialized = true;
};

// Middleware to check if user is authenticated
export const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized. Please log in.' });
};

export default passport;
