import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { Box, Heading, Text, Flash, Button, SelectPanel } from '@primer/react';
import { api } from '../lib/api';
import { resolveInputs, type WorkflowConfig, type ResolvedInput } from '../lib/types';
import { DispatchForm } from '../components/dispatch/DispatchForm';
import { DispatchHistory } from '../components/dispatch/DispatchHistory';

export function DispatchPage() {
  const { owner, repo, workflow: workflowId } = useParams<{ owner: string; repo: string; workflow: string }>();
  const [searchParams] = useSearchParams();
  const embed = searchParams.get('embed') === 'true';

  const [workflow, setWorkflow] = useState<any>(null);
  const [config, setConfig] = useState<WorkflowConfig | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!owner || !repo || !workflowId) return;
    Promise.all([
      api.getWorkflow(owner, repo, workflowId),
      api.getConfig(owner, repo).catch(() => null),
      api.getBranches(owner, repo).catch(() => []),
    ]).then(([wf, cfg, br]) => {
      setWorkflow(wf);
      const workflowFile = wf.path?.split('/').pop() || '';
      setConfig(cfg?.workflows?.[workflowFile] || null);
      setBranches(br);
      if (br.length > 0) {
        const def = br.find((b: any) => b.name === 'main') || br[0];
        setSelectedBranch(def.name);
      }
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [owner, repo, workflowId]);

  const handleDispatch = useCallback(async (inputs: Record<string, string>) => {
    if (!owner || !repo || !workflow) return;
    setDispatching(true);
    setToast(null);
    try {
      let finalInputs = inputs;
      if (config?.jsonMode) {
        const jsonInputName = workflow.inputs?.[0]?.name || 'payload';
        finalInputs = { [jsonInputName]: JSON.stringify(inputs) };
      }
      await api.dispatch(owner, repo, workflow.id, selectedBranch, finalInputs);
      setToast({ type: 'success', message: 'Workflow dispatched successfully!' });
    } catch (e: any) {
      setToast({ type: 'error', message: e.message });
    } finally {
      setDispatching(false);
    }
  }, [owner, repo, workflow, selectedBranch, config]);

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Flash variant="danger">{error}</Flash>;
  if (!workflow) return <Flash variant="danger">Workflow not found</Flash>;

  const resolvedInputs = resolveInputs(workflow.inputs || [], config || undefined);
  const title = config?.title || workflow.name;
  const description = config?.description;

  return (
    <Box>
      {!embed && (
        <Box sx={{ mb: 4 }}>
          <Heading>{title}</Heading>
          <Text sx={{ color: 'fg.muted' }}>{owner}/{repo} • {workflow.path}</Text>
          {description && <Text as="p" sx={{ mt: 1, color: 'fg.muted' }}>{description}</Text>}
        </Box>
      )}

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

      {!embed && owner && repo && (
        <Box sx={{ mt: 6 }}>
          <Heading sx={{ mb: 3, fontSize: 2 }}>Recent Runs</Heading>
          <DispatchHistory owner={owner} repo={repo} workflowId={workflow.id} />
        </Box>
      )}
    </Box>
  );
}
