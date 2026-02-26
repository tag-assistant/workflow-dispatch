# Workflow Dispatch

> A better UI for GitHub's `workflow_dispatch` — with custom labels, grouped inputs, dynamic dropdowns, and validation.

**[🚀 Try it live →](https://workflow-dispatch.vercel.app)**

<!-- TODO: Add screenshot -->
<!-- ![Screenshot](docs/screenshot.png) -->

## ✨ Features

- 🏷️ **Custom labels & descriptions** — Replace raw input names with friendly labels and help text
- 📂 **Input grouping** — Organize inputs into collapsible sections
- 🔽 **Dynamic dropdowns** — Populate selects from branches, tags, releases, environments, and more
- ✅ **Validation** — Regex patterns with custom error messages
- 🎨 **Rich input types** — Booleans as toggles, choices as dropdowns, strings with placeholders
- 📋 **Dispatch history** — See recent workflow runs and their status
- 🔐 **Token-based auth** — Uses your GitHub PAT, nothing stored server-side

## 🚀 Quick Start

1. Go to **[workflow-dispatch.vercel.app](https://workflow-dispatch.vercel.app)**
2. Enter a GitHub Personal Access Token (needs `repo` and `actions` scopes)
3. Search for a repository and select a `workflow_dispatch` workflow
4. Fill in the inputs and hit **Dispatch** 🎉

### Optional: Add a config file

Drop a `.github/workflow-dispatch.yml` in your repo to customize the UI:

```yaml
workflows:
  deploy.yml:
    title: "🚀 Deploy"
    description: "Deploy to any environment"
    inputs:
      environment:
        label: "🌍 Environment"
        description: "Target environment"
      version:
        label: "📦 Version"
        placeholder: "e.g. v1.2.3"
    groups:
      - title: "Target"
        inputs: [environment, version]
```

## 📖 Configuration Guide

The config file lives at `.github/workflow-dispatch.yml` in your repository.

### Structure

```yaml
workflows:
  <workflow-filename>.yml:
    title: "Display Title"          # Optional
    description: "Shown below title" # Optional
    inputs:
      <input-name>:
        label: "Custom Label"
        description: "Help text"
        placeholder: "Placeholder"
        pattern: "^v\\d+$"
        validationMessage: "Error message"
    groups:
      - title: "Section Name"
        description: "Section description"  # Optional
        inputs: [input1, input2]
```

### Input Properties

| Property | Description |
|---|---|
| `label` | Display label (default: title-cased input name) |
| `description` | Help text shown below the input |
| `placeholder` | Placeholder text for text/select inputs |
| `pattern` | Regex validation pattern (string inputs only) |
| `validationMessage` | Error message when pattern doesn't match |
| `type` | Set to `select` for dynamic dropdowns |
| `optionsFrom` | Source for dynamic options (see below) |

### Dynamic Dropdowns (`optionsFrom`)

Add inputs that pull options from the GitHub API:

```yaml
inputs:
  branch:
    type: select
    label: "Branch"
    optionsFrom:
      source: branches
```

| Source | Description |
|---|---|
| `branches` | Repository branches |
| `tags` | Repository tags |
| `releases` | GitHub releases (tag names) |
| `environments` | Deployment environments |
| `collaborators` | Repository collaborators |
| `labels` | Issue/PR labels |
| `milestones` | Repository milestones |

### Groups

Organize inputs into collapsible sections:

```yaml
groups:
  - title: "🎯 Target"
    description: "Where to deploy"
    inputs: [environment, version, branch]
  - title: "⚙️ Options"
    inputs: [dry_run, notify]
```

### Full Example

See the [live example config](https://github.com/tag-assistant/workflow-dispatch/blob/main/.github/workflow-dispatch.yml) used by this repo.

## Input Types

| GitHub Type | UI Control |
|---|---|
| `string` | Text input with optional placeholder & validation |
| `boolean` | Toggle switch |
| `choice` | Dropdown select |
| `number` | Number input |
| `environment` | Environment selector |
| *dynamic* (`select` + `optionsFrom`) | Dropdown populated from GitHub API |

## 🏗️ Self-Hosted

1. Fork this repository
2. Deploy to Vercel (or any static host):
   ```bash
   npm install
   npm run build
   # Output in dist/
   ```
3. Optionally set up your own Vercel project and push

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Run `npm run build` to verify
5. Open a PR

## 📄 License

[MIT](LICENSE)
