import type { WorkflowInput } from './types';

function titleCase(s: string): string {
  return s.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function generateConfigTemplate(workflowFilename: string, inputs: WorkflowInput[]): string {
  const workflowTitle = titleCase(workflowFilename.replace(/\.ya?ml$/, ''));

  let yaml = `# Workflow Dispatch UI Configuration
# Customize how your workflow inputs appear in the dispatch UI
# Docs: https://github.com/tag-assistant/workflow-dispatch#configuration

workflows:
  ${workflowFilename}:
    title: "${workflowTitle}"
    description: "Describe your workflow here"
    inputs:\n`;

  for (const input of inputs) {
    const label = titleCase(input.name);
    yaml += `      ${input.name}:\n`;
    yaml += `        label: "${label}"\n`;

    if (input.type === 'choice') {
      yaml += `        # icon: "📋"\n`;
      yaml += `        # placeholder: "Select ${label.toLowerCase()}"\n`;
    } else if (input.type === 'boolean') {
      // no extra comments for boolean
    } else {
      yaml += `        # placeholder: "Enter ${label.toLowerCase()}"\n`;
      yaml += `        # pattern: "^.+$"\n`;
      yaml += `        # validationMessage: "Invalid ${label.toLowerCase()}"\n`;
    }
  }

  // Add commented-out groups example
  if (inputs.length > 1) {
    yaml += `    # Organize inputs into groups:\n`;
    yaml += `    # groups:\n`;
    yaml += `    #   - title: "Settings"\n`;
    yaml += `    #     inputs: [${inputs.map(i => i.name).join(', ')}]\n`;
  }

  yaml += `    #\n`;
  yaml += `    # Dynamic options from GitHub API:\n`;
  yaml += `    # inputs:\n`;
  yaml += `    #   tag:\n`;
  yaml += `    #     type: select\n`;
  yaml += `    #     label: "Release Tag"\n`;
  yaml += `    #     optionsFrom:\n`;
  yaml += `    #       source: tags  # options: tags, branches, releases, environments, collaborators, labels, milestones\n`;

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
