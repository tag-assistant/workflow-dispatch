import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Heading, Text, ActionList, Breadcrumbs, IconButton, Label } from '@primer/react';
import { WorkflowIcon, RepoIcon, StarIcon, StarFillIcon } from '@primer/octicons-react';
import { Blankslate, Banner, SkeletonText, SkeletonBox } from '@primer/react/experimental';
import { listWorkflows, getWorkflowContent } from '../lib/github';
import { addRecentRepo } from './Home';
import { getFavorites, toggleFavorite, isFavorite, getLastUsedTime, workflowKey, isDispatchableCached, setDispatchable } from '../lib/storage';

function WorkflowListSkeleton() {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, overflow: 'hidden' }}>
      {[1, 2, 3].map(i => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 3, px: 3, py: '12px', borderBottom: '1px solid', borderColor: 'border.muted' }}>
          <SkeletonBox width="16px" height="16px" />
          <Box sx={{ flex: 1 }}>
            <SkeletonText size="bodyMedium" />
            <SkeletonText size="bodySmall" maxWidth={200} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function sortWorkflows(workflows: any[], owner: string, repo: string): any[] {
  const favs = getFavorites();
  return [...workflows].sort((a, b) => {
    const aKey = workflowKey(owner, repo, a.id);
    const bKey = workflowKey(owner, repo, b.id);
    const aFav = favs.includes(aKey);
    const bFav = favs.includes(bKey);
    if (aFav !== bFav) return aFav ? -1 : 1;
    const aTime = getLastUsedTime(aKey);
    const bTime = getLastUsedTime(bKey);
    if (aTime !== bTime) return bTime - aTime;
    return 0;
  });
}

export function RepoView() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [, setTick] = useState(0); // force re-render on fav toggle
  const [dispatchable, setDispatchableState] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  useEffect(() => {
    if (!owner || !repo) return;
    addRecentRepo(owner, repo);
    listWorkflows(owner, repo)
      .then(wfs => {
        setWorkflows(wfs);
        // Check dispatchable status for each workflow
        wfs.forEach(w => {
          const key = workflowKey(owner, repo, w.id);
          const cached = isDispatchableCached(key);
          if (cached !== undefined) {
            setDispatchableState(prev => ({ ...prev, [key]: cached }));
          } else {
            getWorkflowContent(owner, repo, w.path)
              .then(content => {
                const isDisp = /on\s*:[\s\S]*?workflow_dispatch|on\s*:\s*\[.*workflow_dispatch.*\]|on\s*:\s*workflow_dispatch/.test(content);
                setDispatchable(key, isDisp);
                setDispatchableState(prev => ({ ...prev, [key]: isDisp }));
              })
              .catch(() => {
                // Can't determine, assume dispatchable
                setDispatchableState(prev => ({ ...prev, [key]: true }));
              });
          }
        });
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [owner, repo]);

  const handleToggleFavorite = (e: React.MouseEvent, wId: number) => {
    e.stopPropagation();
    e.preventDefault();
    toggleFavorite(workflowKey(owner!, repo!, wId));
    setTick(t => t + 1);
  };

  const sorted = sortWorkflows(workflows, owner || '', repo || '');

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 3 }}>
        <Breadcrumbs.Item onClick={() => navigate('/')} sx={{ cursor: 'pointer' }}>Home</Breadcrumbs.Item>
        <Breadcrumbs.Item selected>{owner}/{repo}</Breadcrumbs.Item>
      </Breadcrumbs>

      <Box sx={{ mb: 4, pb: 3, borderBottom: '1px solid', borderColor: 'border.default', display: 'flex', alignItems: 'center', gap: 2 }}>
        <RepoIcon size={24} />
        <Box>
          <Heading sx={{ fontSize: 3, color: 'fg.default' }}>{owner}/{repo}</Heading>
          <Text sx={{ color: 'fg.muted', fontSize: 1 }}>Select a workflow to dispatch</Text>
        </Box>
      </Box>

      {error && <Banner variant="critical" title="Failed to load workflows">{error}</Banner>}

      {loading && <WorkflowListSkeleton />}

      {!loading && !error && workflows.length === 0 && (
        <Blankslate>
          <Blankslate.Visual>
            <WorkflowIcon size={24} />
          </Blankslate.Visual>
          <Blankslate.Heading>No workflows found</Blankslate.Heading>
          <Blankslate.Description>
            This repository doesn't have any active workflows.
          </Blankslate.Description>
        </Blankslate>
      )}

      {!loading && !error && sorted.length > 0 && (
        <Box sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, overflow: 'hidden' }}>
          <ActionList>
            {sorted.map(w => {
              const key = workflowKey(owner!, repo!, w.id);
              const fav = isFavorite(key);
              const isDisp = dispatchable[key];
              const isNonDisp = isDisp === false;
              return (
                <ActionList.Item
                  key={w.id}
                  onSelect={() => navigate(`/${owner}/${repo}/${w.id}`)}
                  sx={isNonDisp ? { opacity: 0.5 } : undefined}
                >
                  <ActionList.LeadingVisual><WorkflowIcon /></ActionList.LeadingVisual>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Text sx={{ fontWeight: 'bold' }}>{w.name}</Text>
                    {isDisp === true && (
                      <Label variant="success" size="small">dispatchable</Label>
                    )}
                    {isNonDisp && (
                      <Label variant="secondary" size="small">no dispatch</Label>
                    )}
                  </Box>
                  <ActionList.Description>{w.path}</ActionList.Description>
                  <ActionList.TrailingVisual>
                    <IconButton
                      aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
                      icon={fav ? StarFillIcon : StarIcon}
                      variant="invisible"
                      size="small"
                      sx={{ color: fav ? 'attention.fg' : 'fg.muted' }}
                      onClick={(e: React.MouseEvent) => handleToggleFavorite(e, w.id)}
                    />
                  </ActionList.TrailingVisual>
                </ActionList.Item>
              );
            })}
          </ActionList>
        </Box>
      )}
    </Box>
  );
}
