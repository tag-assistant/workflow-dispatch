import 'express-session';

declare module 'express-session' {
  interface SessionData {
    passport?: {
      user?: any;
    };
  }
}

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      displayName: string;
      profileUrl: string;
      avatarUrl?: string;
      accessToken: string;
    }
  }
}

export {};
