import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Heading, Text, Flash, Spinner,
  TextInput, FormControl, ActionMenu, ActionList,
} from '@primer/react';
import { ArrowLeftIcon, GearIcon, PlusIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon, ArrowUpIcon, ArrowDownIcon } from '@primer/octicons-react';
import { stringify } from 'yaml';
import { getWorkflowContent, listWorkflows, getOctokit, getRepoConfig } from '../lib/github';
import { parseWorkflowYaml } from '../lib/workflowParser';
import { resolveInputs, type WorkflowInput, type WorkflowConfig, type InputConfig } from '../lib/types';
import { DispatchForm } from '../components/dispatch/DispatchForm';

interface InputBuilderState {
  label: string;
  description: string;
  placeholder: string;
  typeOverride: string;
  dynamicSource: string;
  pattern: string;
  validationMessage: string;
  group: string;
}

interface GroupState {
  id: string;
  title: string;
}

interface BuilderState {
  title: string;
  description: string;
  inputs: Record<string, InputBuilderState>;
  groups: GroupState[];
}

const TYPE_OPTIONS = ['auto', 'string', 'select', 'multi-select', 'number', 'date', 'color', 'slider', 'json', 'file'];
const DYNAMIC_OPTIONS = ['none', 'branches', 'tags', 'releases', 'environments', 'collaborators', 'labels', 'milestones'];

function titleCase(s: string): string {
  return s.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function ConfigBuilder() {
  const { owner, repo, workflow: workflowId } = useParams<{ owner: string; repo: string; workflow: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [workflowFile, setWorkflowFile] = useState('');
  const [parsedInputs, setParsedInputs] = useState<WorkflowInput[]>([]);
  const [existingSha, setExistingSha] = useState<string | null>(null);
  const [expandedInputs, setExpandedInputs] = useState<Set<string>>(new Set());

  const [state, setState] = useState<BuilderState>({
    title: '',
    description: '',
    inputs: {},
    groups: [],
  });

  useEffect(() => {
    if (!owner || !repo || !workflowId) return;
    (async () => {
      try {
        const workflows = await listWorkflows(owner, repo);
        const wf = workflows.find(w => w.id.toString() === workflowId);
        if (!wf) throw new Error('Workflow not found');

        const wfFile = wf.path.split('/').pop() || '';
        setWorkflowFile(wfFile);

        const content = await getWorkflowContent(owner, repo, wf.path);
        const parsed = parseWorkflowYaml(content);
        setParsedInputs(parsed.inputs);

        // Load existing config
        const ok = getOctokit();
        let existingConfig: WorkflowConfig | null = null;
        try {
          const { data } = await ok.repos.getContent({ owner, repo, path: '.github/workflow-dispatch.yml' });
          if ('content' in data && data.content) {
            setExistingSha((data as any).sha);
            const fullConfig = await getRepoConfig(owner, repo);
            existingConfig = fullConfig?.workflows?.[wfFile] || null;
          }
        } catch { /* no config yet */ }

        // Initialize builder state
        const inputStates: Record<string, InputBuilderState> = {};
        for (const input of parsed.inputs) {
          const cfg = existingConfig?.inputs?.[input.name];
          inputStates[input.name] = {
            label: cfg?.label || titleCase(input.name),
            description: cfg?.description || input.description || '',
            placeholder: cfg?.placeholder || '',
            typeOverride: cfg?.type || 'auto',
            dynamicSource: cfg?.optionsFrom?.source || 'none',
            pattern: cfg?.pattern || '',
            validationMessage: cfg?.validationMessage || '',
            group: '',
          };
        }

        // Assign groups
        const groups: GroupState[] = (existingConfig?.groups || []).map(g => ({
          id: generateId(),
          title: g.title,
        }));

        if (existingConfig?.groups) {
          for (const g of existingConfig.groups) {
            const gState = groups.find(gs => gs.title === g.title);
            if (gState) {
              for (const inputName of g.inputs) {
                if (inputStates[inputName]) {
                  inputStates[inputName].group = gState.id;
                }
              }
            }
          }
        }

        setState({
          title: existingConfig?.title || wf.name,
          description: existingConfig?.description || '',
          inputs: inputStates,
          groups,
        });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [owner, repo, workflowId]);

  const toggleInput = useCallback((name: string) => {
    setExpandedInputs(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }, []);

  const updateInput = useCallback((name: string, field: keyof InputBuilderState, value: string) => {
    setState(prev => ({
      ...prev,
      inputs: { ...prev.inputs, [name]: { ...prev.inputs[name], [field]: value } },
    }));
  }, []);

  const addGroup = useCallback(() => {
    setState(prev => ({
      ...prev,
      groups: [...prev.groups, { id: generateId(), title: 'New Group' }],
    }));
  }, []);

  const removeGroup = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      groups: prev.groups.filter(g => g.id !== id),
      inputs: Object.fromEntries(
        Object.entries(prev.inputs).map(([k, v]) => [k, v.group === id ? { ...v, group: '' } : v])
      ),
    }));
  }, []);

  const updateGroupTitle = useCallback((id: string, title: string) => {
    setState(prev => ({
      ...prev,
      groups: prev.groups.map(g => g.id === id ? { ...g, title } : g),
    }));
  }, []);

  const moveGroup = useCallback((id: string, dir: -1 | 1) => {
    setState(prev => {
      const idx = prev.groups.findIndex(g => g.id === id);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.groups.length) return prev;
      const groups = [...prev.groups];
      [groups[idx], groups[newIdx]] = [groups[newIdx], groups[idx]];
      return { ...prev, groups };
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!owner || !repo) return;
    setSaving(true);
    setToast(null);
    try {
      // Build the config YAML object
      const wfConfig: any = {};
      if (state.title) wfConfig.title = state.title;
      if (state.description) wfConfig.description = state.description;

      const inputs: Record<string, any> = {};
      for (const [name, cfg] of Object.entries(state.inputs)) {
        const ic: any = {};
        if (cfg.label && cfg.label !== titleCase(name)) ic.label = cfg.label;
        if (cfg.description) ic.description = cfg.description;
        if (cfg.placeholder) ic.placeholder = cfg.placeholder;
        if (cfg.typeOverride && cfg.typeOverride !== 'auto') ic.type = cfg.typeOverride;
        if (cfg.pattern) ic.pattern = cfg.pattern;
        if (cfg.validationMessage) ic.validationMessage = cfg.validationMessage;
        if (cfg.dynamicSource && cfg.dynamicSource !== 'none') {
          ic.optionsFrom = { source: cfg.dynamicSource };
        }
        if (Object.keys(ic).length > 0) inputs[name] = ic;
      }
      if (Object.keys(inputs).length > 0) wfConfig.inputs = inputs;

      // Groups
      if (state.groups.length > 0) {
        const groups = state.groups.map(g => ({
          title: g.title,
          inputs: Object.entries(state.inputs)
            .filter(([, v]) => v.group === g.id)
            .map(([k]) => k),
        })).filter(g => g.inputs.length > 0);
        if (groups.length > 0) wfConfig.groups = groups;
      }

      // Need to load existing full config to preserve other workflows
      const ok = getOctokit();
      let fullConfig: any = { workflows: {} };
      let sha = existingSha;

      if (sha) {
        try {
          const existing = await getRepoConfig(owner, repo);
          if (existing) fullConfig = existing;
        } catch { /* use empty */ }
      }

      // Re-fetch SHA in case it changed
      try {
        const { data } = await ok.repos.getContent({ owner, repo, path: '.github/workflow-dispatch.yml' });
        if ('sha' in data) sha = (data as any).sha;
      } catch { sha = null; }

      fullConfig.workflows = fullConfig.workflows || {};
      fullConfig.workflows[workflowFile] = wfConfig;

      const yamlContent = stringify(fullConfig, { lineWidth: 120 });
      const content = btoa(unescape(encodeURIComponent(yamlContent)));

      const params: any = {
        owner,
        repo,
        path: '.github/workflow-dispatch.yml',
        message: 'Update workflow dispatch configuration',
        content,
      };
      if (sha) params.sha = sha;

      await ok.repos.createOrUpdateFileContents(params);
      setToast({ type: 'success', message: '✅ Configuration saved!' });
      setTimeout(() => navigate(`/${owner}/${repo}/${workflowId}`), 1500);
    } catch (e: any) {
      setToast({ type: 'error', message: `Failed to save: ${e.message}` });
    } finally {
      setSaving(false);
    }
  }, [owner, repo, workflowId, workflowFile, state, existingSha, navigate]);

  // Build preview data
  const buildPreviewConfig = useCallback((): WorkflowConfig => {
    const inputs: Record<string, InputConfig> = {};
    for (const [name, cfg] of Object.entries(state.inputs)) {
      const ic: InputConfig = {};
      if (cfg.label) ic.label = cfg.label;
      if (cfg.description) ic.description = cfg.description;
      if (cfg.placeholder) ic.placeholder = cfg.placeholder;
      if (cfg.typeOverride && cfg.typeOverride !== 'auto') ic.type = cfg.typeOverride;
      if (cfg.pattern) ic.pattern = cfg.pattern;
      if (cfg.validationMessage) ic.validationMessage = cfg.validationMessage;
      if (cfg.dynamicSource && cfg.dynamicSource !== 'none') {
        ic.optionsFrom = { source: cfg.dynamicSource as any };
      }
      inputs[name] = ic;
    }

    const groups = state.groups.map(g => ({
      title: g.title,
      inputs: Object.entries(state.inputs).filter(([, v]) => v.group === g.id).map(([k]) => k),
    })).filter(g => g.inputs.length > 0);

    return {
      title: state.title,
      description: state.description,
      inputs,
      groups: groups.length > 0 ? groups : undefined,
    };
  }, [state]);

  if (loading) return <Box sx={{ textAlign: 'center', py: 6 }}><Spinner size="large" /></Box>;
  if (error) return <Flash variant="danger">{error}</Flash>;

  const previewConfig = buildPreviewConfig();
  const resolvedInputs = resolveInputs(parsedInputs, previewConfig);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4, pb: 3, borderBottom: '1px solid', borderColor: 'border.default' }}>
        <Button variant="invisible" leadingVisual={ArrowLeftIcon} onClick={() => navigate(`/${owner}/${repo}/${workflowId}`)}>
          Back
        </Button>
        <Box sx={{ flex: 1 }}>
          <Heading sx={{ fontSize: 2 }}>
            <GearIcon /> Configure: {workflowFile}
          </Heading>
        </Box>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </Box>

      {toast && (
        <Flash variant={toast.type === 'success' ? 'success' : 'danger'} sx={{ mb: 3 }}>
          {toast.message}
        </Flash>
      )}

      {/* Title & Description */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
        <FormControl sx={{ flex: 1 }}>
          <FormControl.Label>Title</FormControl.Label>
          <TextInput
            block
            value={state.title}
            onChange={e => setState(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Workflow title"
          />
        </FormControl>
        <FormControl sx={{ flex: 1 }}>
          <FormControl.Label>Description</FormControl.Label>
          <TextInput
            block
            value={state.description}
            onChange={e => setState(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Workflow description"
          />
        </FormControl>
      </Box>

      {/* Two column layout */}
      <Box sx={{ display: 'flex', gap: 4, flexDirection: ['column', 'column', 'row'] }}>
        {/* Left: Input Settings */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Heading sx={{ fontSize: 1, mb: 3, color: 'fg.muted', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📝 Input Settings
          </Heading>

          {Object.entries(state.inputs).map(([name, cfg]) => {
            const expanded = expandedInputs.has(name);
            const showDynamic = cfg.typeOverride === 'select' || cfg.typeOverride === 'multi-select';

            return (
              <Box
                key={name}
                sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, mb: 2, overflow: 'hidden' }}
              >
                {/* Collapsed header */}
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, cursor: 'pointer', bg: 'canvas.subtle', ':hover': { bg: 'canvas.inset' } }}
                  onClick={() => toggleInput(name)}
                >
                  {expanded ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
                  <Text sx={{ fontWeight: 'bold', fontSize: 1 }}>{name}</Text>
                  <Text sx={{ color: 'fg.muted', fontSize: 0 }}>{cfg.label !== titleCase(name) ? cfg.label : ''}</Text>
                </Box>

                {/* Expanded settings */}
                {expanded && (
                  <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <FormControl>
                      <FormControl.Label>Label</FormControl.Label>
                      <TextInput block value={cfg.label} onChange={e => updateInput(name, 'label', e.target.value)} />
                    </FormControl>

                    <FormControl>
                      <FormControl.Label>Description</FormControl.Label>
                      <TextInput block value={cfg.description} onChange={e => updateInput(name, 'description', e.target.value)} placeholder="Help text" />
                    </FormControl>

                    <FormControl>
                      <FormControl.Label>Placeholder</FormControl.Label>
                      <TextInput block value={cfg.placeholder} onChange={e => updateInput(name, 'placeholder', e.target.value)} />
                    </FormControl>

                    <FormControl>
                      <FormControl.Label>Type Override</FormControl.Label>
                      <Box>
                        <ActionMenu>
                          <ActionMenu.Button>{cfg.typeOverride || 'auto'}</ActionMenu.Button>
                          <ActionMenu.Overlay>
                            <ActionList selectionVariant="single">
                              {TYPE_OPTIONS.map(t => (
                                <ActionList.Item key={t} selected={cfg.typeOverride === t} onSelect={() => updateInput(name, 'typeOverride', t)}>
                                  {t}
                                </ActionList.Item>
                              ))}
                            </ActionList>
                          </ActionMenu.Overlay>
                        </ActionMenu>
                      </Box>
                    </FormControl>

                    {showDynamic && (
                      <FormControl>
                        <FormControl.Label>Dynamic Options</FormControl.Label>
                        <Box>
                          <ActionMenu>
                            <ActionMenu.Button>{cfg.dynamicSource || 'none'}</ActionMenu.Button>
                            <ActionMenu.Overlay>
                              <ActionList selectionVariant="single">
                                {DYNAMIC_OPTIONS.map(d => (
                                  <ActionList.Item key={d} selected={cfg.dynamicSource === d} onSelect={() => updateInput(name, 'dynamicSource', d)}>
                                    {d}
                                  </ActionList.Item>
                                ))}
                              </ActionList>
                            </ActionMenu.Overlay>
                          </ActionMenu>
                        </Box>
                      </FormControl>
                    )}

                    <FormControl>
                      <FormControl.Label>Validation Pattern</FormControl.Label>
                      <TextInput block value={cfg.pattern} onChange={e => updateInput(name, 'pattern', e.target.value)} placeholder="^v\d+\.\d+\.\d+$" />
                    </FormControl>

                    {cfg.pattern && (
                      <FormControl>
                        <FormControl.Label>Validation Message</FormControl.Label>
                        <TextInput block value={cfg.validationMessage} onChange={e => updateInput(name, 'validationMessage', e.target.value)} placeholder="Must match pattern" />
                      </FormControl>
                    )}

                    <FormControl>
                      <FormControl.Label>Group</FormControl.Label>
                      <Box>
                        <ActionMenu>
                          <ActionMenu.Button>{state.groups.find(g => g.id === cfg.group)?.title || 'Ungrouped'}</ActionMenu.Button>
                          <ActionMenu.Overlay>
                            <ActionList selectionVariant="single">
                              <ActionList.Item selected={!cfg.group} onSelect={() => updateInput(name, 'group', '')}>
                                Ungrouped
                              </ActionList.Item>
                              {state.groups.map(g => (
                                <ActionList.Item key={g.id} selected={cfg.group === g.id} onSelect={() => updateInput(name, 'group', g.id)}>
                                  {g.title}
                                </ActionList.Item>
                              ))}
                            </ActionList>
                          </ActionMenu.Overlay>
                        </ActionMenu>
                      </Box>
                    </FormControl>
                  </Box>
                )}
              </Box>
            );
          })}

          {/* Groups Section */}
          <Box sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Heading sx={{ fontSize: 1, color: 'fg.muted', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Groups
              </Heading>
              <Button size="small" leadingVisual={PlusIcon} onClick={addGroup}>Add Group</Button>
            </Box>

            {state.groups.map((g, idx) => (
              <Box key={g.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, border: '1px solid', borderColor: 'border.default', borderRadius: 2, p: 2 }}>
                <TextInput
                  value={g.title}
                  onChange={e => updateGroupTitle(g.id, e.target.value)}
                  sx={{ flex: 1 }}
                />
                <Button variant="invisible" size="small" aria-label="Move up" onClick={() => moveGroup(g.id, -1)} disabled={idx === 0}>
                  <ArrowUpIcon size={16} />
                </Button>
                <Button variant="invisible" size="small" aria-label="Move down" onClick={() => moveGroup(g.id, 1)} disabled={idx === state.groups.length - 1}>
                  <ArrowDownIcon size={16} />
                </Button>
                <Button variant="danger" size="small" leadingVisual={TrashIcon} onClick={() => removeGroup(g.id)}>
                  Delete
                </Button>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Right: Live Preview */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Heading sx={{ fontSize: 1, mb: 3, color: 'fg.muted', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            👁 Live Preview
          </Heading>

          <Box sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, bg: 'canvas.subtle', p: 4 }}>
            {state.title && <Heading sx={{ fontSize: 2, mb: 1 }}>{state.title}</Heading>}
            {state.description && <Text sx={{ color: 'fg.muted', fontSize: 1, mb: 3, display: 'block' }}>{state.description}</Text>}
            <DispatchForm
              inputs={resolvedInputs}
              groups={previewConfig.groups}
              branches={[{ name: 'main' }]}
              selectedBranch="main"
              onBranchChange={() => {}}
              onDispatch={() => {}}
              dispatching={false}
              owner={owner!}
              repo={repo!}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
