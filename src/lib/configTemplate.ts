import type { WorkflowInput } from './types';

function titleCase(s: string): string {
  return s.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function generateConfigTemplate(workflowFilename: string, inputs: WorkflowInput[]): string {
  const workflowTitle = titleCase(workflowFilename.replace(/\.ya?ml$/, ''));

  let yaml = `# ═══════════════════════════════════════════════════════════
# Workflow Dispatch UI — Configuration
# ═══════════════════════════════════════════════════════════
#
# Customize how your workflow inputs appear in the dispatch UI.
# Place this file at: .github/workflow-dispatch.yml
#
# Full docs: https://github.com/tag-assistant/workflow-dispatch#configuration
#
# Features:
#   - Custom labels and descriptions for each input
#   - Input grouping into sections
#   - Dynamic dropdowns populated from GitHub API
#   - Validation patterns with custom error messages
#   - Placeholder text and icons

workflows:
  ${workflowFilename}:
    title: "${workflowTitle}"              # Display title (optional)
    description: "Describe your workflow"  # Shown below the title (optional)

    # ── Inputs ────────────────────────────────────
    inputs:\n`;

  for (const input of inputs) {
    const label = titleCase(input.name);
    yaml += `      ${input.name}:\n`;
    yaml += `        label: "${label}"`;
    yaml += `             # ${input.type}${input.required ? ', required' : ''}\n`;

    if (input.type === 'choice') {
      yaml += `        # placeholder: "Select ${label.toLowerCase()}"\n`;
    } else if (input.type === 'string') {
      yaml += `        # description: "Help text shown below the input"\n`;
      yaml += `        # placeholder: "Enter ${label.toLowerCase()}"\n`;
    } else if (input.type !== 'boolean') {
      yaml += `        # placeholder: "Enter ${label.toLowerCase()}"\n`;
    }
  }

  // Groups example
  yaml += `\n`;
  yaml += `    # ── Grouping ──────────────────────────────────\n`;
  yaml += `    # Organize inputs into collapsible sections:\n`;
  yaml += `    #\n`;
  if (inputs.length > 1) {
    yaml += `    # groups:\n`;
    yaml += `    #   - title: "🎯 Target"\n`;
    yaml += `    #     inputs: [${inputs.slice(0, Math.ceil(inputs.length / 2)).map(i => i.name).join(', ')}]\n`;
    yaml += `    #   - title: "⚙️ Options"\n`;
    yaml += `    #     inputs: [${inputs.slice(Math.ceil(inputs.length / 2)).map(i => i.name).join(', ')}]\n`;
  } else {
    yaml += `    # groups:\n`;
    yaml += `    #   - title: "🎯 Target"\n`;
    yaml += `    #     inputs: [${inputs.map(i => i.name).join(', ')}]\n`;
  }

  // Dynamic dropdowns
  yaml += `\n`;
  yaml += `    # ── Dynamic Dropdowns ─────────────────────────\n`;
  yaml += `    # Populate select options from GitHub API:\n`;
  yaml += `    #\n`;
  yaml += `    # inputs:\n`;
  yaml += `    #   branch:\n`;
  yaml += `    #     type: select\n`;
  yaml += `    #     label: "Branch"\n`;
  yaml += `    #     optionsFrom:\n`;
  yaml += `    #       source: branches    # Also: tags, releases, environments,\n`;
  yaml += `    #                           #        collaborators, labels, milestones\n`;

  // Validation
  yaml += `\n`;
  yaml += `    # ── Validation ────────────────────────────────\n`;
  yaml += `    # Add regex validation to string inputs:\n`;
  yaml += `    #\n`;
  yaml += `    # inputs:\n`;
  yaml += `    #   version:\n`;
  yaml += `    #     pattern: "^v\\\\d+\\\\.\\\\d+\\\\.\\\\d+$"\n`;
  yaml += `    #     validationMessage: "Must be semver (e.g. v1.2.3)"\n`;

  return yaml;
}

export function getConfigUrl(
  owner: string,
  repo: string,
  branch: string,
  configExists: boolean,
  workflowFilename: string,
  inputs: WorkflowInput[],
): string {
  if (configExists) {
    return `https://github.com/${owner}/${repo}/edit/${branch}/.github/workflow-dispatch.yml`;
  }
  const template = generateConfigTemplate(workflowFilename, inputs);
  return `https://github.com/${owner}/${repo}/new/${branch}?filename=.github/workflow-dispatch.yml&value=${encodeURIComponent(template)}`;
}
