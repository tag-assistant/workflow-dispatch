export interface OptionsFrom {
  source: 'tags' | 'branches' | 'releases' | 'environments' | 'collaborators' | 'labels' | 'milestones' | 'api';
  endpoint?: string;
  valuePath?: string;
  labelPath?: string;
}

export interface InputConfig {
  type?: string;
  label?: string;
  icon?: string;
  placeholder?: string;
  pattern?: string;
  validationMessage?: string;
  options?: Array<{ value: string; label: string }>;
  default?: string;
  min?: number;
  max?: number;
  step?: number;
  optionsFrom?: OptionsFrom;
}

export interface WorkflowConfig {
  title?: string;
  description?: string;
  theme?: string;
  inputs?: Record<string, InputConfig>;
  groups?: Array<{ title: string; inputs: string[] }>;
  jsonMode?: boolean;
}

export interface DispatchConfig {
  workflows?: Record<string, WorkflowConfig>;
}

export interface WorkflowInput {
  name: string;
  description: string;
  required: boolean;
  default?: string;
  type: string;
  options?: string[];
}

export interface ResolvedInput extends WorkflowInput {
  config?: InputConfig;
  resolvedType: string;
  label: string;
  placeholder?: string;
  pattern?: string;
  validationMessage?: string;
  optionsFrom?: OptionsFrom;
}

export interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  head_branch: string;
  created_at: string;
  html_url: string;
  run_number: number;
  actor: { login: string; avatar_url: string } | null;
}

export function resolveInputs(inputs: WorkflowInput[], config?: WorkflowConfig): ResolvedInput[] {
  // Collect all config input names that aren't in parsed inputs (dynamic options from config)
  const parsedNames = new Set(inputs.map(i => i.name));
  const extraInputs: WorkflowInput[] = [];
  if (config?.inputs) {
    for (const [name, cfg] of Object.entries(config.inputs)) {
      if (!parsedNames.has(name) && cfg.optionsFrom) {
        extraInputs.push({
          name,
          description: '',
          required: false,
          type: cfg.type || 'string',
          options: undefined,
        });
      }
    }
  }

  const allInputs = [...inputs, ...extraInputs];

  return allInputs.map(input => {
    const cfg = config?.inputs?.[input.name];
    return {
      ...input,
      config: cfg,
      resolvedType: cfg?.type || input.type || 'string',
      label: cfg?.label || input.name,
      placeholder: cfg?.placeholder,
      pattern: cfg?.pattern,
      validationMessage: cfg?.validationMessage,
      default: cfg?.default || input.default,
      options: cfg?.options?.map(o => o.value) || input.options,
      optionsFrom: cfg?.optionsFrom,
    };
  });
}
