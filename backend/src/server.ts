import dotenv from 'dotenv';
import { createTerminus } from '@godaddy/terminus';
import app from './app.js';
import logger from './utils/logger.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

// Create server
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`✅ Health check: http://localhost:${PORT}/health/live`);
  logger.info(`🌍 API endpoint: http://localhost:${PORT}/api/hello`);
});

// Graceful shutdown configuration
const onSignal = async (): Promise<void> => {
  logger.info('Server is starting cleanup');
  // Add cleanup logic here (close database connections, etc.)
};

const onShutdown = async (): Promise<void> => {
  logger.info('Cleanup finished, server is shutting down');
};

const beforeShutdown = (): Promise<void> => {
  // Give time for load balancer to remove instance
  return new Promise((resolve) => {
    setTimeout(resolve, 5000);
  });
};

// Health check for terminus
const healthCheck = async (): Promise<void> => {
  // Add health checks here (database connectivity, etc.)
};

// Setup graceful shutdown with terminus
createTerminus(server, {
  signal: 'SIGINT',
  healthChecks: {
    '/health/live': healthCheck,
    '/health/ready': healthCheck,
  },
  beforeShutdown,
  onSignal,
  onShutdown,
  timeout: 30000,
  logger: (msg, err) => logger.error({ err }, msg),
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error({ err }, 'Uncaught Exception');
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  logger.error({ reason }, 'Unhandled Promise Rejection');
  process.exit(1);
});
