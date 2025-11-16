# Backend

Modern Express 5.1.0 API server with TypeScript.

## Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run in development mode (with hot reload)
npm run dev
```

## Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## API Endpoints

- `GET /api/hello` - Hello World endpoint
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe

## Docker

```bash
# Build image
docker build -t workflow-dispatch-backend .

# Run container
docker run -p 3000:3000 workflow-dispatch-backend
```
