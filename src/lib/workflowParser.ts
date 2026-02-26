import { parse } from 'yaml';

export interface WorkflowInput {
  name: string;
  description: string;
  required: boolean;
  default?: string;
  type: string;
  options?: string[];
}

export interface ParsedWorkflow {
  name: string;
  inputs: WorkflowInput[];
}

export function parseWorkflowYaml(content: string): ParsedWorkflow {
  const doc = parse(content);
  const name = doc?.name || 'Unnamed Workflow';
  const inputs: WorkflowInput[] = [];

  const trigger = doc?.on?.workflow_dispatch || doc?.on?.['workflow_dispatch'];
  const dispatchInputs = trigger?.inputs;
  if (dispatchInputs && typeof dispatchInputs === 'object') {
    for (const [key, val] of Object.entries(dispatchInputs)) {
      const v = val as any;
      inputs.push({
        name: key,
        description: v?.description || '',
        required: v?.required === true,
        default: v?.default?.toString(),
        type: v?.type || 'string',
        options: v?.options,
      });
    }
  }

  return { name, inputs };
}
