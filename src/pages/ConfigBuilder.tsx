import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Heading, Text, Spinner,
  TextInput, FormControl, ActionMenu, ActionList, Breadcrumbs,
} from '@primer/react';
import { ArrowLeftIcon, GearIcon, PlusIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon } from '@primer/octicons-react';
import { Banner } from '@primer/react/experimental';
import { stringify } from 'yaml';
import {
  DndContext, DragOverlay, closestCenter, pointerWithin,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
  useSensor, useSensors, PointerSensor,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { getWorkflowContent, listWorkflows, getOctokit, getRepoConfig } from '../lib/github';
import { parseWorkflowYaml } from '../lib/workflowParser';
import { resolveInputs, type WorkflowInput, type WorkflowConfig, type InputConfig, type ResolvedInput } from '../lib/types';
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
  inputOrder: string[];
  groups: GroupState[];
}

const TYPE_OPTIONS = ['auto', 'string', 'select', 'multi-select', 'number', 'date', 'color', 'slider', 'json', 'file'];
const DYNAMIC_OPTIONS = ['none', 'branches', 'tags', 'releases', 'environments', 'collaborators', 'labels', 'milestones'];
const UNGROUPED_ID = '__ungrouped__';

function titleCase(s: string): string {
  return s.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 8);
}

/* ─── Drag Handle ─── */
function DragHandle({ listeners, attributes }: { listeners?: Record<string, Function>; attributes?: Record<string, any> }) {
  return (
    <Box
      as="span"
      sx={{ cursor: 'grab', color: 'fg.muted', px: 1, display: 'flex', alignItems: 'center', fontSize: '16px', userSelect: 'none', ':hover': { color: 'fg.default' } }}
      {...listeners}
      {...attributes}
    >
      ⠿
    </Box>
  );
}

/* ─── Input Card Fields with Progressive Disclosure ─── */
function InputCardFields({
  cfg, onUpdate, showDynamic,
}: {
  cfg: InputBuilderState;
  onUpdate: (field: keyof InputBuilderState, value: string) => void;
  showDynamic: boolean;
}) {
  const [showAdvanced, setShowAdvanced] = useState(
    () => (cfg.typeOverride !== 'auto') || cfg.pattern !== '' || cfg.dynamicSource !== 'none'
  );

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <FormControl>
        <FormControl.Label>Label</FormControl.Label>
        <TextInput block value={cfg.label} onChange={e => onUpdate('label', e.target.value)} />
      </FormControl>
      <FormControl>
        <FormControl.Label>Description</FormControl.Label>
        <TextInput block value={cfg.description} onChange={e => onUpdate('description', e.target.value)} placeholder="Help text shown below the field" />
      </FormControl>
      <FormControl>
        <FormControl.Label>Placeholder</FormControl.Label>
        <TextInput block value={cfg.placeholder} onChange={e => onUpdate('placeholder', e.target.value)} />
      </FormControl>
      {/* Advanced options toggle */}
      <Button variant="invisible" size="small" onClick={() => setShowAdvanced(!showAdvanced)} sx={{ alignSelf: 'flex-start' }}>
        {showAdvanced ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
        <Text sx={{ ml: 1, fontSize: 0 }}>Advanced options</Text>
      </Button>

      {showAdvanced && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pl: 3, borderLeft: '2px solid', borderColor: 'border.default' }}>
          <FormControl>
            <FormControl.Label>Type override</FormControl.Label>
            <Box>
              <ActionMenu>
                <ActionMenu.Button>{cfg.typeOverride || 'auto'}</ActionMenu.Button>
                <ActionMenu.Overlay>
                  <ActionList selectionVariant="single">
                    {TYPE_OPTIONS.map(t => (
                      <ActionList.Item key={t} selected={cfg.typeOverride === t} onSelect={() => onUpdate('typeOverride', t)}>
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
              <FormControl.Label>Dynamic options</FormControl.Label>
              <Box>
                <ActionMenu>
                  <ActionMenu.Button>{cfg.dynamicSource || 'none'}</ActionMenu.Button>
                  <ActionMenu.Overlay>
                    <ActionList selectionVariant="single">
                      {DYNAMIC_OPTIONS.map(d => (
                        <ActionList.Item key={d} selected={cfg.dynamicSource === d} onSelect={() => onUpdate('dynamicSource', d)}>
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
            <FormControl.Label>Validation pattern</FormControl.Label>
            <TextInput block value={cfg.pattern} onChange={e => onUpdate('pattern', e.target.value)} placeholder="^v\d+\.\d+\.\d+$" />
          </FormControl>
          {cfg.pattern && (
            <FormControl>
              <FormControl.Label>Validation message</FormControl.Label>
              <TextInput block value={cfg.validationMessage} onChange={e => onUpdate('validationMessage', e.target.value)} placeholder="Must match pattern" />
            </FormControl>
          )}
        </Box>
      )}
    </Box>
  );
}

/* ─── Sortable Input Card ─── */
function SortableInputCard({
  name, cfg, expanded, onToggle, onUpdate, state,
}: {
  name: string;
  cfg: InputBuilderState;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (field: keyof InputBuilderState, value: string) => void;
  state: BuilderState;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `input-${name}`,
    data: { type: 'input', name },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };
  const showDynamic = cfg.typeOverride === 'select' || cfg.typeOverride === 'multi-select';

  return (
    <Box ref={setNodeRef} style={style} sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, mb: 2, overflow: 'hidden', bg: 'canvas.default' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2, cursor: 'pointer', bg: 'canvas.subtle', ':hover': { bg: 'canvas.inset' } }}>
        <DragHandle listeners={listeners} attributes={attributes} />
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }} onClick={onToggle}>
          {expanded ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
          <Text sx={{ fontWeight: 'bold', fontSize: 1 }}>{name}</Text>
          <Text sx={{ color: 'fg.muted', fontSize: 0 }}>{cfg.label !== titleCase(name) ? cfg.label : ''}</Text>
        </Box>
      </Box>
      {expanded && (
        <InputCardFields cfg={cfg} onUpdate={onUpdate} showDynamic={showDynamic} />
      )}
    </Box>
  );
}

/* ─── Input Card Preview (for DragOverlay) ─── */
function InputCardOverlay({ name }: { name: string }) {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'accent.emphasis', borderRadius: 2, p: 2, bg: 'canvas.subtle', opacity: 0.85, boxShadow: 'shadow.large', display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box as="span" sx={{ color: 'fg.muted' }}>⠿</Box>
      <Text sx={{ fontWeight: 'bold', fontSize: 1 }}>{name}</Text>
    </Box>
  );
}

/* ─── Droppable Group Container ─── */
function DroppableGroup({
  groupId, title, isUngrouped, inputNames, children, onDelete, onTitleChange,
}: {
  groupId: string;
  title: string;
  isUngrouped?: boolean;
  inputNames: string[];
  children: React.ReactNode;
  onDelete?: () => void;
  onTitleChange?: (title: string) => void;
}) {
  const { isOver, setNodeRef: dropRef } = useDroppable({ id: `group-${groupId}`, data: { type: 'group', groupId } });

  // For sortable group headers (not ungrouped)
  const sortable = !isUngrouped
    ? useSortable({ id: `sortgroup-${groupId}`, data: { type: 'sortgroup', groupId } })
    : null;

  const wrapperStyle = sortable ? {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.3 : 1,
  } : {};

  return (
    <Box
      ref={sortable?.setNodeRef}
      style={wrapperStyle}
      sx={{ mb: 3 }}
    >
      {/* Group header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, py: 1 }}>
        {!isUngrouped && sortable && (
          <DragHandle listeners={sortable.listeners} attributes={sortable.attributes} />
        )}
        <Text sx={{ fontSize: 1, fontWeight: 'bold', color: isUngrouped ? 'fg.muted' : 'fg.default' }}>
          {isUngrouped ? '📋' : '🎯'} {isUngrouped ? 'Ungrouped' : (
            <Box as="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
              <TextInput
                size="small"
                value={title}
                onChange={e => onTitleChange?.(e.target.value)}
                sx={{ fontWeight: 'bold', width: '160px' }}
              />
            </Box>
          )}
        </Text>
        {!isUngrouped && (
          <Button variant="danger" size="small" leadingVisual={TrashIcon} onClick={onDelete}>Delete</Button>
        )}
      </Box>

      {/* Droppable zone */}
      <Box
        ref={dropRef}
        sx={{
          minHeight: '40px',
          p: 2,
          borderRadius: 2,
          border: '2px dashed',
          borderColor: isOver ? 'accent.emphasis' : 'border.default',
          bg: isOver ? 'accent.subtle' : 'transparent',
          transition: 'all 0.15s ease',
        }}
      >
        <SortableContext items={inputNames.map(n => `input-${n}`)} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
        {inputNames.length === 0 && (
          <Text sx={{ color: 'fg.muted', fontSize: 0, fontStyle: 'italic', textAlign: 'center', py: 2 }}>
            Drag inputs here
          </Text>
        )}
      </Box>
    </Box>
  );
}

/* ─── Group Header Overlay (for DragOverlay) ─── */
function GroupHeaderOverlay({ title }: { title: string }) {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'accent.emphasis', borderRadius: 2, p: 2, bg: 'canvas.subtle', opacity: 0.85, boxShadow: 'shadow.large', display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box as="span" sx={{ color: 'fg.muted' }}>⠿</Box>
      <Text sx={{ fontWeight: 'bold', fontSize: 1 }}>🎯 {title}</Text>
    </Box>
  );
}

/* ─── Main ConfigBuilder ─── */
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const [state, setState] = useState<BuilderState>({
    title: '',
    description: '',
    inputs: {},
    inputOrder: [],
    groups: [],
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Track unsaved changes
  const initialStateRef = useRef<string | null>(null);
  useEffect(() => {
    if (!loading && initialStateRef.current === null) {
      initialStateRef.current = JSON.stringify(state);
    }
    if (initialStateRef.current !== null) {
      setIsDirty(JSON.stringify(state) !== initialStateRef.current);
    }
  }, [state, loading]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

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

        const inputStates: Record<string, InputBuilderState> = {};
        const inputOrder: string[] = [];
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
          inputOrder.push(input.name);
        }

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

        setState({ title: existingConfig?.title || wf.name, description: existingConfig?.description || '', inputs: inputStates, inputOrder, groups });
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

  // Compute grouped inputs
  const { ungroupedInputs, groupedInputs } = useMemo(() => {
    const ungrouped: string[] = [];
    const grouped: Record<string, string[]> = {};
    for (const g of state.groups) grouped[g.id] = [];

    for (const name of state.inputOrder) {
      if (!state.inputs[name]) continue;
      const gid = state.inputs[name].group;
      if (gid && grouped[gid]) {
        grouped[gid].push(name);
      } else {
        ungrouped.push(name);
      }
    }
    return { ungroupedInputs: ungrouped, groupedInputs: grouped };
  }, [state]);

  // DnD handlers
  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  }, []);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Reorder groups
    if (activeData?.type === 'sortgroup' && overData?.type === 'sortgroup') {
      setState(prev => {
        const oldIdx = prev.groups.findIndex(g => g.id === activeData.groupId);
        const newIdx = prev.groups.findIndex(g => g.id === overData.groupId);
        if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return prev;
        return { ...prev, groups: arrayMove(prev.groups, oldIdx, newIdx) };
      });
      return;
    }

    // Input drag
    if (activeData?.type === 'input') {
      const inputName = activeData.name as string;

      setState(prev => {
        const currentGroup = prev.inputs[inputName]?.group || '';
        let targetGroupId = '';

        if (overData?.type === 'group') {
          targetGroupId = overData.groupId === UNGROUPED_ID ? '' : overData.groupId as string;
        } else if (overData?.type === 'input') {
          const overName = overData.name as string;
          targetGroupId = prev.inputs[overName]?.group || '';
        } else {
          return prev;
        }

        const newInputs = { ...prev.inputs, [inputName]: { ...prev.inputs[inputName], group: targetGroupId } };
        let newOrder = [...prev.inputOrder];

        // If dropped on another input, also handle reordering
        if (overData?.type === 'input') {
          const overName = overData.name as string;
          const oldIdx = newOrder.indexOf(inputName);
          const newIdx = newOrder.indexOf(overName);
          if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
            newOrder = arrayMove(newOrder, oldIdx, newIdx);
          }
        }

        return { ...prev, inputs: newInputs, inputOrder: newOrder };
      });
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!owner || !repo) return;
    setSaving(true);
    setToast(null);
    try {
      const wfConfig: any = {};
      if (state.title) wfConfig.title = state.title;
      if (state.description) wfConfig.description = state.description;

      const inputs: Record<string, any> = {};
      for (const name of state.inputOrder) {
        const cfg = state.inputs[name];
        if (!cfg) continue;
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

      if (state.groups.length > 0) {
        const groups = state.groups.map(g => ({
          title: g.title,
          inputs: state.inputOrder.filter(name => state.inputs[name]?.group === g.id),
        })).filter(g => g.inputs.length > 0);
        if (groups.length > 0) wfConfig.groups = groups;
      }

      const ok = getOctokit();
      let fullConfig: any = { workflows: {} };
      let sha = existingSha;

      if (sha) {
        try {
          const existing = await getRepoConfig(owner, repo);
          if (existing) fullConfig = existing;
        } catch { /* use empty */ }
      }

      try {
        const { data } = await ok.repos.getContent({ owner, repo, path: '.github/workflow-dispatch.yml' });
        if ('sha' in data) sha = (data as any).sha;
      } catch { sha = null; }

      fullConfig.workflows = fullConfig.workflows || {};
      fullConfig.workflows[workflowFile] = wfConfig;

      const yamlContent = stringify(fullConfig, { lineWidth: 120 });
      const content = btoa(unescape(encodeURIComponent(yamlContent)));

      const params: any = { owner, repo, path: '.github/workflow-dispatch.yml', message: 'Update workflow dispatch configuration', content };
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
      inputs: state.inputOrder.filter(name => state.inputs[name]?.group === g.id),
    })).filter(g => g.inputs.length > 0);

    return { title: state.title, description: state.description, inputs, groups: groups.length > 0 ? groups : undefined };
  }, [state]);

  if (loading) return <Box sx={{ textAlign: 'center', py: 6 }}><Spinner size="large" /></Box>;
  if (error) return <Banner variant="critical" title="Failed to load configuration">{error}</Banner>;

  const previewConfig = buildPreviewConfig();
  const resolvedInputs = resolveInputs(parsedInputs, previewConfig);
  // Reorder to match inputOrder
  const orderedInputs = state.inputOrder
    .map(name => resolvedInputs.find(i => i.name === name))
    .filter(Boolean) as ResolvedInput[];

  // Determine active drag overlay
  let overlayContent: React.ReactNode = null;
  if (activeId) {
    if (activeId.startsWith('input-')) {
      const name = activeId.replace('input-', '');
      overlayContent = <InputCardOverlay name={name} />;
    } else if (activeId.startsWith('sortgroup-')) {
      const gid = activeId.replace('sortgroup-', '');
      const g = state.groups.find(g => g.id === gid);
      if (g) overlayContent = <GroupHeaderOverlay title={g.title} />;
    }
  }

  const groupSortIds = state.groups.map(g => `sortgroup-${g.id}`);

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 3 }}>
        <Breadcrumbs.Item onClick={() => navigate('/')} sx={{ cursor: 'pointer' }}>Home</Breadcrumbs.Item>
        <Breadcrumbs.Item onClick={() => navigate(`/${owner}/${repo}`)} sx={{ cursor: 'pointer' }}>{owner}/{repo}</Breadcrumbs.Item>
        <Breadcrumbs.Item onClick={() => navigate(`/${owner}/${repo}/${workflowId}`)} sx={{ cursor: 'pointer' }}>{workflowFile}</Breadcrumbs.Item>
        <Breadcrumbs.Item selected>Configure</Breadcrumbs.Item>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4, pb: 3, borderBottom: '1px solid', borderColor: 'border.default' }}>
        <Button variant="invisible" leadingVisual={ArrowLeftIcon} onClick={() => navigate(`/${owner}/${repo}/${workflowId}`)}>Back</Button>
        <Box sx={{ flex: 1 }}>
          <Heading sx={{ fontSize: 2 }}><GearIcon /> Configure: {workflowFile}</Heading>
        </Box>
        <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save configuration'}</Button>
      </Box>

      {toast && (
        <Box sx={{ mb: 3 }}>
          <Banner
            variant={toast.type === 'success' ? 'success' : 'critical'}
            title={toast.type === 'success' ? 'Success' : 'Error'}
            onDismiss={() => setToast(null)}
          >
            {toast.message}
          </Banner>
        </Box>
      )}

      {/* Title & Description */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
        <FormControl sx={{ flex: 1 }}>
          <FormControl.Label>Title</FormControl.Label>
          <TextInput block value={state.title} onChange={e => setState(prev => ({ ...prev, title: e.target.value }))} placeholder="Workflow title" />
        </FormControl>
        <FormControl sx={{ flex: 1 }}>
          <FormControl.Label>Description</FormControl.Label>
          <TextInput block value={state.description} onChange={e => setState(prev => ({ ...prev, description: e.target.value }))} placeholder="Workflow description" />
        </FormControl>
      </Box>

      {/* Two column layout */}
      <Box sx={{ display: 'flex', gap: 4, flexDirection: ['column', 'column', 'row'] }}>
        {/* Left: Input Settings with DnD */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Heading sx={{ fontSize: 1, mb: 3, color: 'fg.muted', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📝 Input Settings
          </Heading>

          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {/* Ungrouped */}
            <DroppableGroup
              groupId={UNGROUPED_ID}
              title="Ungrouped"
              isUngrouped
              inputNames={ungroupedInputs}
            >
              {ungroupedInputs.map(name => (
                <SortableInputCard
                  key={name}
                  name={name}
                  cfg={state.inputs[name]}
                  expanded={expandedInputs.has(name)}
                  onToggle={() => toggleInput(name)}
                  onUpdate={(field, value) => updateInput(name, field, value)}
                  state={state}
                />
              ))}
            </DroppableGroup>

            {/* Groups (sortable) */}
            <SortableContext items={groupSortIds} strategy={verticalListSortingStrategy}>
              {state.groups.map(g => {
                const gInputs = groupedInputs[g.id] || [];
                return (
                  <DroppableGroup
                    key={g.id}
                    groupId={g.id}
                    title={g.title}
                    inputNames={gInputs}
                    onDelete={() => removeGroup(g.id)}
                    onTitleChange={title => updateGroupTitle(g.id, title)}
                  >
                    {gInputs.map(name => (
                      <SortableInputCard
                        key={name}
                        name={name}
                        cfg={state.inputs[name]}
                        expanded={expandedInputs.has(name)}
                        onToggle={() => toggleInput(name)}
                        onUpdate={(field, value) => updateInput(name, field, value)}
                        state={state}
                      />
                    ))}
                  </DroppableGroup>
                );
              })}
            </SortableContext>

            <DragOverlay dropAnimation={null}>
              {overlayContent}
            </DragOverlay>
          </DndContext>

          <Button size="small" leadingVisual={PlusIcon} onClick={addGroup} sx={{ mt: 2 }}>Add Group</Button>
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
              inputs={orderedInputs}
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
