# Workflow Dispatch UI

> A beautiful, static web UI for dispatching GitHub Actions workflows — deployable on GitHub Pages.

**[Live Demo →](https://tag-assistant.github.io/workflow-dispatch/)**

## Features

- 🚀 **Dispatch workflows** with a clean, form-based UI
- 🔍 **Search repositories** and browse dispatchable workflows
- 🎨 **Custom input types** — text, select, boolean, JSON, number, date, color, slider, file, multi-select
- 📋 **Custom configuration** via `.github/workflow-dispatch.yml` — labels, icons, placeholders, input groups
- 🌙 **Dark mode** — follows your system preference (Primer theme)
- 📊 **Run history** — see recent workflow runs inline
- 🔒 **Client-side only** — your token never leaves your browser

## Quick Start

1. Visit the [live demo](https://tag-assistant.github.io/workflow-dispatch/)
2. Enter a [Personal Access Token](https://github.com/settings/tokens/new?scopes=repo,workflow&description=Workflow+Dispatch+UI) with `repo` and `workflow` scopes
3. Search for a repository, pick a workflow, fill in inputs, and dispatch!

## Deploy Your Own

1. Fork this repository
2. Enable GitHub Pages in your repo settings (source: GitHub Actions)
3. Push to `main` — the included GitHub Actions workflow will build and deploy automatically

### Local Development

```bash
git clone https://github.com/tag-assistant/workflow-dispatch.git
cd workflow-dispatch
npm install
npm run dev
```

## Configuration

Add a `.github/workflow-dispatch.yml` to any repository to customize the dispatch UI:

```yaml
workflows:
  deploy.yml:
    title: "🚀 Deploy"
    description: "Deploy to production"
    inputs:
      environment:
        label: "🌍 Environment"
        icon: "🌍"
      version:
        label: "📦 Version"
        placeholder: "e.g. v1.0.0"
    groups:
      - title: "Deployment"
        inputs: ["environment", "version"]
```

### Configuration Options

| Field | Description |
|-------|-------------|
| `title` | Display title for the workflow |
| `description` | Description shown below the title |
| `inputs.<name>.label` | Custom label for the input |
| `inputs.<name>.icon` | Emoji icon shown before the label |
| `inputs.<name>.placeholder` | Placeholder text |
| `inputs.<name>.type` | Override input type (see below) |
| `inputs.<name>.pattern` | Regex validation pattern |
| `inputs.<name>.validation` | Custom validation error message |
| `inputs.<name>.min/max/step` | Numeric constraints |
| `inputs.<name>.options` | Options for multi-select (`[{value, label}]`) |
| `groups` | Group inputs into titled sections |
| `jsonMode` | Pack all inputs into a single JSON string |

### Input Types

| Type | Description |
|------|-------------|
| `string` | Text input (default) |
| `boolean` | Checkbox toggle |
| `choice` | Dropdown select (from workflow `options`) |
| `environment` | Dropdown populated from repo environments |
| `number` | Numeric input with min/max/step |
| `date` | Date picker |
| `color` | Color picker with hex input |
| `slider` | Range slider with min/max/step |
| `json` | Monaco JSON editor |
| `file` | File upload or paste |
| `multi-select` | Checkbox group |

## How It Works

- **No backend** — all GitHub API calls happen directly from your browser using [Octokit](https://github.com/octokit/rest.js)
- **PAT authentication** — your token is stored in `localStorage` and used for all API calls
- **Workflow parsing** — fetches workflow YAML from the repo, parses `on.workflow_dispatch.inputs`, and generates a form
- **Static deployment** — builds to a static `dist/` folder, deployed via GitHub Pages

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Primer React](https://primer.style/react/) — GitHub's design system
- [Octokit](https://github.com/octokit/rest.js) — GitHub API client
- [Vite](https://vitejs.dev/) — build tool
- [yaml](https://github.com/eemeli/yaml) — YAML parser

## License

MIT
