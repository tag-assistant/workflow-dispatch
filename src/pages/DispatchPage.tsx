import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Heading, Text, Button, IconButton, Breadcrumbs } from '@primer/react';
import { WorkflowIcon, GearIcon, XIcon } from '@primer/octicons-react';
import { Banner, SkeletonText, SkeletonBox } from '@primer/react/experimental';
import { getWorkflowContent, listBranches, getRepoConfig, dispatch as ghDispatch, listWorkflows } from '../lib/github';
import { parseWorkflowYaml } from '../lib/workflowParser';
import { resolveInputs, type WorkflowConfig } from '../lib/types';
import { DispatchForm } from '../components/dispatch/DispatchForm';
import { DispatchHistory, type DispatchHistoryHandle } from '../components/dispatch/DispatchHistory';
import { getConfigUrl } from '../lib/configTemplate';

function DispatchPageSkeleton() {
  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', gap: 3 }}>
        <SkeletonBox width="24px" height="24px" />
        <Box sx={{ flex: 1 }}>
          <SkeletonText size="titleMedium" maxWidth={300} />
          <SkeletonText size="bodySmall" maxWidth={200} />
        </Box>
      </Box>
      <Box sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, bg: 'canvas.subtle', p: 4 }}>
        {[1, 2, 3].map(i => (
          <Box key={i} sx={{ mb: 3 }}>
            <SkeletonText size="bodySmall" maxWidth={100} />
            <Box sx={{ mt: 1 }}><SkeletonBox height="32px" /></Box>
          </Box>
        ))}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 3, borderTop: '1px solid', borderColor: 'border.default' }}>
          <SkeletonBox width="160px" height="36px" />
        </Box>
      </Box>
    </Box>
  );
}

export function DispatchPage() {
  const { owner, repo, workflow: workflowId } = useParams<{ owner: string; repo: string; workflow: string }>();
  const navigate = useNavigate();

  const [workflowName, setWorkflowName] = useState('');
  const [workflowPath, setWorkflowPath] = useState('');
  const [parsedInputs, setParsedInputs] = useState<any[]>([]);
  const [config, setConfig] = useState<WorkflowConfig | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [configExists, setConfigExists] = useState(false);
  const historyRef = useRef<DispatchHistoryHandle>(null);
  const [tipDismissed, setTipDismissed] = useState(() => {
    if (!owner || !repo) return false;
    return localStorage.getItem(`wd-banner-dismissed:${owner}/${repo}`) === '1';
  });

  useEffect(() => {
    if (!owner || !repo || !workflowId) return;
    (async () => {
      try {
        const workflows = await listWorkflows(owner, repo);
        const wf = workflows.find(w => w.id.toString() === workflowId);
        if (!wf) throw new Error('Workflow not found');

        setWorkflowName(wf.name);
        setWorkflowPath(wf.path);

        const content = await getWorkflowContent(owner, repo, wf.path);
        const parsed = parseWorkflowYaml(content);
        setParsedInputs(parsed.inputs);

        const [cfg, br] = await Promise.all([
          getRepoConfig(owner, repo).catch(() => null),
          listBranches(owner, repo).catch(() => []),
        ]);

        const workflowFile = wf.path.split('/').pop() || '';
        setConfigExists(!!cfg);
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
    setFeedback(null);
    try {
      let finalInputs = inputs;
      if (config?.jsonMode) {
        const jsonInputName = parsedInputs[0]?.name || 'payload';
        finalInputs = { [jsonInputName]: JSON.stringify(inputs) };
      }
      await ghDispatch(owner, repo, parseInt(workflowId), selectedBranch, finalInputs);
      setFeedback({ type: 'success', message: 'Workflow dispatched successfully' });

      setTimeout(() => historyRef.current?.refresh(), 2000);
      const pollId = setInterval(() => historyRef.current?.refresh(), 5000);
      setTimeout(() => clearInterval(pollId), 30000);

      document.getElementById('recent-runs')?.scrollIntoView({ behavior: 'smooth' });
    } catch (e: any) {
      setFeedback({ type: 'error', message: `Failed to dispatch workflow: ${e.message}` });
    } finally {
      setDispatching(false);
    }
  }, [owner, repo, workflowId, selectedBranch, config, parsedInputs]);

  const resolvedInputs = !loading ? resolveInputs(parsedInputs, config || undefined) : [];
  const title = config?.title || workflowName || 'Workflow';
  const description = config?.description;
  const workflowFile = workflowPath.split('/').pop() || '';
  const configUrl = !loading ? getConfigUrl(owner!, repo!, selectedBranch, configExists, workflowFile, parsedInputs) : '';

  const dismissTip = () => {
    setTipDismissed(true);
    localStorage.setItem(`wd-banner-dismissed:${owner}/${repo}`, '1');
  };

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 3 }}>
        <Breadcrumbs.Item onClick={() => navigate('/')} sx={{ cursor: 'pointer' }}>Home</Breadcrumbs.Item>
        <Breadcrumbs.Item onClick={() => navigate(`/${owner}/${repo}`)} sx={{ cursor: 'pointer' }}>{owner}/{repo}</Breadcrumbs.Item>
        <Breadcrumbs.Item selected>{title}</Breadcrumbs.Item>
      </Breadcrumbs>

      {error && (
        <Banner variant="critical" title="Failed to load workflow">{error}</Banner>
      )}

      {loading && <DispatchPageSkeleton />}

      {!loading && !error && (
        <>
          {/* Page Header */}
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', gap: 3 }}>
            <Box sx={{ color: 'fg.muted', mt: 1 }}>
              <WorkflowIcon size={24} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Heading sx={{ color: 'fg.default', fontSize: 3 }}>{title}</Heading>
                <Button
                  variant="invisible"
                  size="small"
                  leadingVisual={GearIcon}
                  onClick={() => navigate(`/${owner}/${repo}/${workflowId}/configure`)}
                >
                  {configExists ? 'Edit config' : 'Customize'}
                </Button>
              </Box>
              <Text sx={{ color: 'fg.muted', fontSize: 1 }}>{owner}/{repo} · {workflowPath}</Text>
              {description && <Text as="p" sx={{ mt: 1, color: 'fg.muted', fontSize: 1 }}>{description}</Text>}
            </Box>
          </Box>

          {feedback && (
            <Box sx={{ mb: 3 }}>
              <Banner
                variant={feedback.type === 'success' ? 'success' : 'critical'}
                title={feedback.type === 'success' ? 'Success' : 'Error'}
                onDismiss={() => setFeedback(null)}
              >
                {feedback.message}
              </Banner>
            </Box>
          )}

          {!configExists && !tipDismissed && (
            <Box sx={{ mb: 3 }}>
              <Banner variant="info" onDismiss={dismissTip}>
                Add a <code>.github/workflow-dispatch.yml</code> to customize labels, grouping, and dynamic dropdowns.{' '}
                <a href="https://github.com/tag-assistant/workflow-dispatch/blob/main/.github/workflow-dispatch.yml" target="_blank" rel="noopener noreferrer">See example</a>
                {' · '}
                <a href={configUrl} target="_blank" rel="noopener noreferrer">Add config</a>
              </Banner>
            </Box>
          )}

          {/* Form Card */}
          <Box sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, bg: 'canvas.subtle', p: 4 }}>
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
          </Box>

          {/* Recent Runs */}
          {owner && repo && (
            <Box sx={{ mt: 5 }} id="recent-runs">
              <Heading sx={{ mb: 3, fontSize: 2, color: 'fg.default', pb: 2, borderBottom: '1px solid', borderColor: 'border.default' }}>
                Recent runs
              </Heading>
              <DispatchHistory ref={historyRef} owner={owner} repo={repo} workflowId={parseInt(workflowId!)} />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
