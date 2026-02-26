import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Heading, Text, Flash, Spinner } from '@primer/react';
import { getWorkflowContent, listBranches, getRepoConfig, dispatch as ghDispatch, listWorkflows } from '../lib/github';
import { parseWorkflowYaml } from '../lib/workflowParser';
import { resolveInputs, type WorkflowConfig } from '../lib/types';
import { DispatchForm } from '../components/dispatch/DispatchForm';
import { DispatchHistory } from '../components/dispatch/DispatchHistory';

export function DispatchPage() {
  const { owner, repo, workflow: workflowId } = useParams<{ owner: string; repo: string; workflow: string }>();

  const [workflowName, setWorkflowName] = useState('');
  const [workflowPath, setWorkflowPath] = useState('');
  const [parsedInputs, setParsedInputs] = useState<any[]>([]);
  const [config, setConfig] = useState<WorkflowConfig | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!owner || !repo || !workflowId) return;
    (async () => {
      try {
        // Get workflow metadata to find the path
        const workflows = await listWorkflows(owner, repo);
        const wf = workflows.find(w => w.id.toString() === workflowId);
        if (!wf) throw new Error('Workflow not found');

        setWorkflowName(wf.name);
        setWorkflowPath(wf.path);

        // Fetch and parse workflow YAML
        const content = await getWorkflowContent(owner, repo, wf.path);
        const parsed = parseWorkflowYaml(content);
        setParsedInputs(parsed.inputs);

        // Fetch config and branches in parallel
        const [cfg, br] = await Promise.all([
          getRepoConfig(owner, repo).catch(() => null),
          listBranches(owner, repo).catch(() => []),
        ]);

        const workflowFile = wf.path.split('/').pop() || '';
        setConfig(cfg?.workflows?.[workflowFile] || null);
        setBranches(br);
        if (br.length > 0) {
          const def = br.find((b: any) => b.name === 'main') || br[0];
          setSelectedBranch(def.name);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [owner, repo, workflowId]);

  const handleDispatch = useCallback(async (inputs: Record<string, string>) => {
    if (!owner || !repo || !workflowId) return;
    setDispatching(true);
    setToast(null);
    try {
      let finalInputs = inputs;
      if (config?.jsonMode) {
        const jsonInputName = parsedInputs[0]?.name || 'payload';
        finalInputs = { [jsonInputName]: JSON.stringify(inputs) };
      }
      await ghDispatch(owner, repo, parseInt(workflowId), selectedBranch, finalInputs);
      setToast({ type: 'success', message: 'Workflow dispatched successfully!' });
    } catch (e: any) {
      setToast({ type: 'error', message: e.message });
    } finally {
      setDispatching(false);
    }
  }, [owner, repo, workflowId, selectedBranch, config, parsedInputs]);

  if (loading) return <Box sx={{ textAlign: 'center', py: 6 }}><Spinner size="large" /></Box>;
  if (error) return <Flash variant="danger">{error}</Flash>;

  const resolvedInputs = resolveInputs(parsedInputs, config || undefined);
  const title = config?.title || workflowName;
  const description = config?.description;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Heading>{title}</Heading>
        <Text sx={{ color: 'fg.muted' }}>{owner}/{repo} • {workflowPath}</Text>
        {description && <Text as="p" sx={{ mt: 1, color: 'fg.muted' }}>{description}</Text>}
      </Box>

      {toast && (
        <Flash variant={toast.type === 'success' ? 'success' : 'danger'} sx={{ mb: 3 }}>
          {toast.message}
        </Flash>
      )}

      <DispatchForm
        inputs={resolvedInputs}
        groups={config?.groups}
        branches={branches}
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
        onDispatch={handleDispatch}
        dispatching={dispatching}
        owner={owner!}
        repo={repo!}
      />

      {owner && repo && (
        <Box sx={{ mt: 6 }}>
          <Heading sx={{ mb: 3, fontSize: 2 }}>Recent Runs</Heading>
          <DispatchHistory owner={owner} repo={repo} workflowId={parseInt(workflowId!)} />
        </Box>
      )}
    </Box>
  );
}
