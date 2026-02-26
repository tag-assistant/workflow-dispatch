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
  description?: string;
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
  description?: string;
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

function isGenericDescription(desc: string, type: string): boolean {
  if (!desc) return true;
  const d = desc.trim().toLowerCase();
  const t = type.toLowerCase();
  // Matches: "string input", "String input (free-form text)", "string", etc.
  if (d === t) return true;
  if (d.startsWith(`${t} input`)) return true;
  return false;
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
    const resolvedType = cfg?.type || input.type || 'string';
    const rawDesc = cfg?.description || input.description || '';
    const description = isGenericDescription(rawDesc, resolvedType) ? undefined : rawDesc;
    return {
      ...input,
      description,
      config: cfg,
      resolvedType,
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
