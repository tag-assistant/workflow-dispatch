# 🚀 Workflow Dispatch

> A customizable workflow dispatch UI builder for GitHub Actions — way better than GitHub's built-in text-only inputs.

![Screenshot Placeholder](https://via.placeholder.com/800x400/1f2937/ffffff?text=Workflow+Dispatch+UI)

## ✨ Features

- 🔍 **Auto-discovery** — Automatically introspects workflow files to discover inputs
- 🎨 **Rich Input Types** — Boolean toggles, dropdowns, multi-select, JSON editor, color picker, sliders, and more
- 📋 **Custom Configuration** — Optional `.github/workflow-dispatch.yml` for custom labels, groups, themes, and validation
- 🔗 **Shareable URLs** — Clean `/{owner}/{repo}/{workflow}` URLs you can share with your team
- 📊 **Dispatch History** — See recent workflow runs with status indicators
- 🌙 **Dark Mode** — Follows system preference with GitHub Primer theming
- 📦 **JSON Mode** — Pack all inputs into a single JSON payload
- 🏗️ **Embed Mode** — Use `?embed=true` for iframe embedding

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- A [GitHub OAuth App](https://github.com/settings/developers)

### Environment Variables

Create a `.env` file in the root:

```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
SESSION_SECRET=a-random-secret-string
CALLBACK_URL=http://localhost:3001/api/auth/github/callback
FRONTEND_URL=http://localhost:5173
```

### Manual Setup

```bash
# Install dependencies
npm run install:all

# Start dev servers (frontend + backend)
npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:3001`.

### Docker

```bash
docker compose up
```

Production frontend on `http://localhost:3000`, backend on `http://localhost:3001`.

For development with hot reload:

```bash
docker compose -f docker-compose.dev.yml up
```

## 📖 Configuration

### Automatic Introspection

Without any configuration, Workflow Dispatch automatically parses your workflow files and generates forms based on `workflow_dispatch.inputs`:

```yaml
# .github/workflows/deploy.yml
on:
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        options: [staging, production]
      version:
        type: string
        required: true
      dry_run:
        type: boolean
        default: false
```

### Custom UI Configuration

For richer controls, add `.github/workflow-dispatch.yml` to your repo:

```yaml
workflows:
  deploy.yml:
    title: "🚀 Deploy to Production"
    description: "Deploy the application to production"
    theme: "blue"
    inputs:
      environment:
        type: environment
        label: "Target Environment"
        icon: "🌍"
      version:
        label: "Version Tag"
        placeholder: "v1.0.0"
        pattern: "^v\\d+\\.\\d+\\.\\d+$"
        validation: "Must be semver (e.g. v1.0.0)"
      features:
        type: multi-select
        label: "Feature Flags"
        options:
          - { value: dark-mode, label: "Dark Mode" }
          - { value: new-api, label: "New API" }
      config:
        type: json
        label: "Deploy Config"
        default: '{"replicas": 3}'
    groups:
      - title: Deployment
        inputs: [environment, version]
      - title: Options
        inputs: [features, config]
    jsonMode: false
```

## 📝 Input Types Reference

| Workflow Type | Config Type | Form Control |
|---|---|---|
| `string` | `string` | Text input |
| `boolean` | `boolean` | Toggle switch |
| `choice` | `choice` | Select dropdown |
| `environment` | `environment` | Environment selector |
| — | `multi-select` | Checkboxes |
| — | `json` | Monaco JSON editor |
| — | `number` | Number input |
| — | `date` | Date picker |
| — | `color` | Color picker |
| — | `slider` | Range slider |
| — | `file` | File upload/paste |
| — | `regex` | Text with pattern validation |

## 🔌 API Reference

All API routes require authentication (except auth routes).

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/auth/status` | Current user info |
| `GET` | `/api/auth/github` | OAuth redirect |
| `GET` | `/api/auth/github/callback` | OAuth callback |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/repos` | List user repos (`?q=` to search) |
| `GET` | `/api/repos/:owner/:repo/workflows` | List workflows |
| `GET` | `/api/repos/:owner/:repo/workflows/:id` | Workflow details + inputs |
| `GET` | `/api/repos/:owner/:repo/config` | Fetch dispatch config |
| `GET` | `/api/repos/:owner/:repo/branches` | List branches |
| `GET` | `/api/repos/:owner/:repo/environments` | List environments |
| `POST` | `/api/repos/:owner/:repo/dispatches` | Trigger workflow |
| `GET` | `/api/repos/:owner/:repo/runs` | Recent workflow runs |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feat/amazing-feature`
5. Open a Pull Request

## 📄 License

MIT — see [LICENSE](LICENSE) for details.
