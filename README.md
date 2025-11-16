# Workflow Dispatch

Modern full-stack application with Express 5.1.0 backend and React Router v7 frontend.

## Architecture

- **Backend**: Express 5.1.0 with TypeScript, Helmet security, CORS, rate limiting, Pino logging, graceful shutdown
- **Frontend**: React Router v7 with TypeScript, Vite, Tailwind CSS
- **Deployment**: Docker Compose orchestration

## Quick Start

### Development (Local)

```bash
# Install backend dependencies
cd backend
npm install
cp .env.example .env
npm run dev

# In another terminal, install frontend dependencies
cd frontend
npm install
npm run dev
```

Backend runs on `http://localhost:3000`
Frontend runs on `http://localhost:5173`

### Development (Docker Compose)

```bash
# Run with hot reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Production (Docker Compose)

```bash
# Build and run production containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## API Endpoints

- `GET /api/hello` - Hello World endpoint
- `GET /health/live` - Liveness probe (container is running)
- `GET /health/ready` - Readiness probe (ready to accept traffic)

## Project Structure

```
.
├── backend/                 # Express 5.1.0 API
│   ├── src/
│   │   ├── app.ts          # Express app setup
│   │   ├── server.ts       # Server with graceful shutdown
│   │   ├── routes/         # API routes
│   │   ├── middlewares/    # Custom middleware
│   │   └── utils/          # Utilities (logger, errors)
│   ├── Dockerfile
│   └── package.json
├── frontend/               # React Router v7
│   ├── app/
│   │   ├── routes/         # Route components
│   │   └── lib/            # Utilities (API client)
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml      # Production configuration
└── docker-compose.dev.yml  # Development overrides
```

## Tech Stack

### Backend
- Express 5.1.0 (latest, with native async error handling)
- TypeScript 5.6
- Helmet (security headers)
- CORS
- Express Rate Limit
- Pino (high-performance logging)
- @godaddy/terminus (graceful shutdown)

### Frontend
- React 19.1.1
- React Router 7.9.2
- TypeScript 5.9
- Vite 7.1.7
- Tailwind CSS 4.1.13

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3001
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000
```

## Security Features

- ✅ Helmet security headers (XSS, clickjacking protection)
- ✅ CORS with configurable origins
- ✅ Rate limiting (100 req/15min)
- ✅ Non-root Docker user
- ✅ Multi-stage Docker builds
- ✅ Health checks for container orchestration
- ✅ Graceful shutdown handling

## Contributing

The backend follows 2025 Express best practices with:
- Layered architecture (routes, middleware, utils)
- Custom error handling with AppError class
- Structured logging with Pino
- Automatic async error handling (Express 5 feature)
- Type-safe TypeScript with strict mode
- Production-ready Docker setup
