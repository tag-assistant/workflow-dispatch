# GitHub Workflow Dispatch Application

A full-stack TypeScript application that allows users to trigger GitHub Actions workflow dispatches after authenticating with their GitHub account.

## Features

- 🔐 **GitHub OAuth Authentication** - Secure login with GitHub OAuth
- 🚀 **Workflow Dispatch** - Trigger workflows on any repository you have access to
- 🎨 **Modern UI** - Built with React Router v7 and GitHub Primer components
- 🔒 **Protected Routes** - Authentication required to access the application
- 📊 **Real-time Feedback** - Success/error messages for workflow dispatches

## Tech Stack

### Backend
- Express.js 5.1.0 with TypeScript
- Passport.js with GitHub OAuth2 strategy
- Octokit (GitHub REST API client)
- Express-session (in-memory sessions)
- Helmet, CORS, Rate limiting for security

### Frontend
- React Router v7 (SSR-enabled)
- GitHub Primer React components
- TypeScript
- Vite

## Prerequisites

- Node.js 18+ 
- A GitHub OAuth App (see setup instructions below)

## GitHub OAuth App Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in the application details:
   - **Application name**: `Workflow Dispatch App` (or your choice)
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:3000/auth/github/callback`
4. Click **"Register application"**
5. Copy the **Client ID** and generate a new **Client Secret**
6. Save these for the next step

## Installation & Setup

### 1. Clone and Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Backend Environment Variables

Create a `.env` file in the `backend/` directory (you can copy from `.env.example`):

```bash
cd backend
cp .env.example .env
```

Edit the `.env` file and add your GitHub OAuth credentials:

```env
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3001

# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# Session Configuration
SESSION_SECRET=change-this-to-a-random-secret-in-production

# Frontend URL (for OAuth redirect after login)
FRONTEND_URL=http://localhost:5173
```

### 3. Run the Application

From the root directory:

```bash
npm run dev
```

This will start both the backend (port 3000) and frontend (port 5173) in development mode.

Alternatively, run them separately:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 4. Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000

## Usage

1. **Login**: Click "Login with GitHub" on the login page
2. **Authorize**: Authorize the app with `repo` and `workflow` scopes
3. **Dispatch Workflows**: Fill in the workflow dispatch form:
   - **Repository Owner**: The GitHub username or organization
   - **Repository Name**: The repository name
   - **Workflow ID**: The workflow filename (e.g., `main.yml`) or numeric ID
   - **Git Reference**: Branch name, tag, or commit SHA (e.g., `main`)

## API Endpoints

### Authentication
- `GET /auth/github` - Initiate GitHub OAuth flow
- `GET /auth/github/callback` - OAuth callback handler
- `GET /auth/user` - Get current authenticated user
- `POST /auth/logout` - Logout and destroy session

### Workflows
- `POST /api/workflows/dispatch` - Trigger a workflow dispatch
  ```json
  {
    "owner": "octocat",
    "repo": "hello-world",
    "workflow_id": "main.yml",
    "ref": "main",
    "inputs": {} // optional
  }
  ```

### Health Checks
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe

## Docker Deployment

### Development
```bash
docker-compose -f docker-compose.dev.yml up
```

### Production
```bash
docker-compose up
```

## Security Notes

- 🔒 Sessions are stored in-memory by default (not suitable for production with multiple instances)
- 🔐 GitHub access tokens are stored server-side only in the session
- 🛡️ Rate limiting enabled (100 requests per 15 minutes per IP)
- 🔒 CORS configured to allow specific origins
- 🔐 Cookies are httpOnly and secure in production

## Production Considerations

For production deployment:

1. **Session Store**: Replace in-memory sessions with Redis or a database
2. **HTTPS**: Use HTTPS and update OAuth callback URL
3. **Environment Variables**: Use proper secrets management
4. **Session Secret**: Generate a strong random secret
5. **CORS**: Update `ALLOWED_ORIGINS` to your production domains
6. **Rate Limiting**: Adjust based on your needs

## Troubleshooting

### "Unauthorized" errors
- Ensure you're logged in via GitHub OAuth
- Check that your GitHub OAuth app is properly configured
- Verify your `.env` file has correct credentials

### Workflow dispatch fails
- Ensure you have the `repo` and `workflow` scopes granted
- Verify you have permission to trigger workflows on that repository
- Check that the workflow file exists and accepts `workflow_dispatch` events

### CORS errors
- Verify `ALLOWED_ORIGINS` in backend `.env` includes your frontend URL
- Check that cookies are being sent with `credentials: 'include'`

## License

MIT
