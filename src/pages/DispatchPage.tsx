import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Heading, Text, Button, IconButton, Breadcrumbs, Tooltip } from '@primer/react';
import { WorkflowIcon, GearIcon, StarIcon, StarFillIcon, LinkIcon } from '@primer/octicons-react';
import { Banner, SkeletonText, SkeletonBox } from '@primer/react/experimental';
import { getWorkflowContent, listBranches, getRepoConfig, dispatch as ghDispatch, listWorkflows, listRuns } from '../lib/github';
import { parseWorkflowYaml } from '../lib/workflowParser';
import { resolveInputs, type WorkflowConfig } from '../lib/types';
import { DispatchForm } from '../components/dispatch/DispatchForm';
import { DispatchHistory, type DispatchHistoryHandle } from '../components/dispatch/DispatchHistory';
import { getConfigUrl } from '../lib/configTemplate';
import { markLastUsed, isFavorite, toggleFavorite, workflowKey } from '../lib/storage';

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
  const [searchParams] = useSearchParams();

  const [workflowName, setWorkflowName] = useState('');
  const [workflowPath, setWorkflowPath] = useState('');
  const [parsedInputs, setParsedInputs] = useState<any[]>([]);
  const [config, setConfig] = useState<WorkflowConfig | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; runUrl?: string } | null>(null);
  const [configExists, setConfigExists] = useState(false);
  const [, setTick] = useState(0);
  const [copied, setCopied] = useState(false);
  const historyRef = useRef<DispatchHistoryHandle>(null);
  const formValuesRef = useRef<Record<string, string>>({});
  const [tipDismissed, setTipDismissed] = useState(() => {
    if (!owner || !repo) return false;
    return localStorage.getItem(`wd-banner-dismissed:${owner}/${repo}`) === '1';
  });

  // Track last used
  useEffect(() => {
    if (owner && repo && workflowId) {
      markLastUsed(workflowKey(owner, repo, workflowId));
    }
  }, [owner, repo, workflowId]);

  // Read URL params for pre-fill
  const urlRef = searchParams.get('ref');
  const urlInputs: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (key !== 'ref') urlInputs[key] = value;
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
          const refFromUrl = urlRef;
          const match = refFromUrl ? br.find((b: any) => b.name === refFromUrl) : null;
          const def = match || br.find((b: any) => b.name === 'main') || br[0];
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
      markLastUsed(workflowKey(owner, repo, workflowId));

      // Wait for run to appear, then update banner with link
      setTimeout(async () => {
        try {
          const runs = await listRuns(owner, repo, parseInt(workflowId));
          const latestRun = runs[0];
          if (latestRun) {
            setFeedback({
              type: 'success',
              message: 'Workflow dispatched!',
              runUrl: `https://github.com/${owner}/${repo}/actions/runs/${latestRun.id}`,
            });
          }
        } catch { /* ignore */ }
        historyRef.current?.refresh();
      }, 2000);
      const pollId = setInterval(() => historyRef.current?.refresh(), 5000);
      setTimeout(() => clearInterval(pollId), 30000);

      document.getElementById('recent-runs')?.scrollIntoView({ behavior: 'smooth' });
    } catch (e: any) {
      setFeedback({ type: 'error', message: `Failed to dispatch workflow: ${e.message}` });
    } finally {
      setDispatching(false);
    }
  }, [owner, repo, workflowId, selectedBranch, config, parsedInputs]);

  const handleCopyLink = useCallback(() => {
    const vals = formValuesRef.current;
    const params = new URLSearchParams();
    if (selectedBranch && selectedBranch !== 'main') params.set('ref', selectedBranch);
    Object.entries(vals).forEach(([k, v]) => { if (v) params.set(k, v); });
    const qs = params.toString();
    const base = `${window.location.origin}${window.location.pathname}#/${owner}/${repo}/${workflowId}`;
    const url = qs ? `${base}?${qs}` : base;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [owner, repo, workflowId, selectedBranch]);

  const handleToggleFavorite = () => {
    if (owner && repo && workflowId) {
      toggleFavorite(workflowKey(owner, repo, workflowId));
      setTick(t => t + 1);
    }
  };

  const resolvedInputs = !loading ? resolveInputs(parsedInputs, config || undefined) : [];
  const title = config?.title || workflowName || 'Workflow';
  const description = config?.description;
  const workflowFile = workflowPath.split('/').pop() || '';
  const configUrl = !loading ? getConfigUrl(owner!, repo!, selectedBranch, configExists, workflowFile, parsedInputs) : '';
  const fav = owner && repo && workflowId ? isFavorite(workflowKey(owner, repo, workflowId)) : false;

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
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Heading sx={{ color: 'fg.default', fontSize: 3 }}>{title}</Heading>
                <IconButton
                  aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
                  icon={fav ? StarFillIcon : StarIcon}
                  variant="invisible"
                  size="small"
                  sx={{ color: fav ? 'attention.fg' : 'fg.muted' }}
                  onClick={handleToggleFavorite}
                />
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
                {feedback.runUrl && (
                  <> <a href={feedback.runUrl} target="_blank" rel="noopener noreferrer">View run →</a></>
                )}
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
              initialValues={urlInputs}
              onValuesChange={(vals) => { formValuesRef.current = vals; }}
              shareButton={
                <Tooltip text={copied ? 'Copied!' : 'Copy link with current values'} direction="n">
                  <Button
                    variant="invisible"
                    size="large"
                    leadingVisual={LinkIcon}
                    onClick={handleCopyLink}
                  >
                    {copied ? 'Copied!' : 'Share'}
                  </Button>
                </Tooltip>
              }
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
