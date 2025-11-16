import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import pinoHttp from 'pino-http';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import logger from './utils/logger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import passport, { initializePassport } from './middlewares/auth.js';
import router from './routes/index.js';
import authRouter from './routes/auth.js';
import workflowsRouter from './routes/workflows.js';

// Initialize Passport configuration
initializePassport();

const app = express();

// Security middleware
app.use(helmet());
app.disable('x-powered-by');

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later',
});

app.use(limiter);

// Request logging with pino-http
app.use(pinoHttp());

// Cookie parsing
app.use(cookieParser());

// Session configuration (in-memory store)
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-secret-key-change-in-production';
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Allow HTTP in development
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
      domain: 'localhost', // Share cookie across localhost ports
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/auth', authRouter);
app.use('/api/workflows', workflowsRouter);
app.use(router);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
