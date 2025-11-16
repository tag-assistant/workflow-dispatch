import type { Route } from "./+types/workflow-select";
import { api } from "../lib/api";
import { 
  Heading, 
  Text, 
  Button, 
  Avatar, 
  Flash,
  SelectPanel,
  Spinner,
  FormControl,
} from "@primer/react";
import type { ActionListItemInput } from "@primer/react/deprecated";
import { useState, useEffect } from "react";
import { redirect, useNavigate, useSearchParams } from "react-router";
import { RepoIcon, WorkflowIcon, GitBranchIcon } from "@primer/octicons-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Select Workflow - GitHub Workflow Dispatch" },
    { name: "description", content: "Select a workflow to dispatch" },
  ];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  try {
    const user = await api.auth.getUser();
    
    // Parse URL parameters
    const url = new URL(request.url);
    const urlParams = {
      owner: url.searchParams.get('owner'),
      repo: url.searchParams.get('repo'),
      workflow_id: url.searchParams.get('workflow_id'),
      ref: url.searchParams.get('ref'),
    };
    
    return { user, error: null, urlParams };
  } catch (error) {
    throw redirect('/login');
  }
}
clientLoader.hydrate = false;

export default function WorkflowSelect({ loaderData }: Route.ComponentProps) {
  const { user, urlParams } = loaderData;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Owner selection state
  const [owners, setOwners] = useState<any[]>([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [ownerSelectOpen, setOwnerSelectOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<ActionListItemInput | undefined>(undefined);

  // Repository selection state
  const [repos, setRepos] = useState<any[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [repoSelectOpen, setRepoSelectOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<ActionListItemInput | undefined>(undefined);
  const [repoPage, setRepoPage] = useState(1);
  const [repoHasMore, setRepoHasMore] = useState(false);
  const [repoCache, setRepoCache] = useState<Map<string, { repos: any[], hasMore: boolean, lastPage: number }>>(new Map());
  const [repoSearchQuery, setRepoSearchQuery] = useState("");
  
  // Workflow selection state
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [workflowsLoading, setWorkflowsLoading] = useState(false);
  const [workflowSearch, setWorkflowSearch] = useState("");
  const [workflowSelectOpen, setWorkflowSelectOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ActionListItemInput | undefined>(undefined);

  // Branch selection state
  const [branches, setBranches] = useState<any[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");
  const [branchSelectOpen, setBranchSelectOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<ActionListItemInput | undefined>(undefined);

  const [error, setError] = useState<string | null>(null);

  // Load owners on mount
  useEffect(() => {
    loadOwners();
  }, []);

  // Load repos when owner is selected
  useEffect(() => {
    if (selectedOwner?.id) {
      loadRepos(selectedOwner.id as string);
    }
  }, [selectedOwner]);

  // Debounced search for repositories
  useEffect(() => {
    if (!selectedOwner?.id) return;
    
    const trimmedSearch = repoSearch.trim();
    
    // If search is cleared, reload normal repos
    if (trimmedSearch === '' && repoSearchQuery !== '') {
      setRepoSearchQuery('');
      setRepoPage(1);
      loadRepos(selectedOwner.id as string);
      return;
    }
    
    // Debounce search
    if (trimmedSearch.length < 2) return; // Require at least 2 characters
    
    const timeoutId = setTimeout(() => {
      setRepoSearchQuery(trimmedSearch);
      setRepoPage(1);
      loadRepos(selectedOwner.id as string, 1, false, trimmedSearch);
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [repoSearch, selectedOwner]);

  // Pre-populate owner from URL params
  useEffect(() => {
    if (urlParams.owner && owners.length > 0) {
      const owner = owners.find((o) => o.login === urlParams.owner);
      if (owner) {
        const ownerItem: ActionListItemInput = {
          id: owner.login,
          text: owner.login,
          leadingVisual: () => <Avatar src={owner.avatar_url} size={20} />,
        };
        setSelectedOwner(ownerItem);
      }
    }
  }, [urlParams.owner, owners]);

  // Pre-populate from URL params
  useEffect(() => {
    if (urlParams.owner && urlParams.repo && repos.length > 0) {
      const repoItem: ActionListItemInput = {
        id: urlParams.repo,
        text: urlParams.repo,
        leadingVisual: () => <RepoIcon />,
      };
      setSelectedRepo(repoItem);
      loadWorkflows(urlParams.owner, urlParams.repo);
      loadBranches(urlParams.owner, urlParams.repo);
    }
  }, [urlParams.owner, urlParams.repo, repos]);

  // Pre-populate branch from URL params
  useEffect(() => {
    if (urlParams.ref && branches.length > 0) {
      const branchItem: ActionListItemInput = {
        id: urlParams.ref,
        text: urlParams.ref,
        leadingVisual: () => <GitBranchIcon />,
      };
      setSelectedBranch(branchItem);
    } else if (branches.length > 0 && !selectedBranch) {
      // Default to first branch (usually main/master)
      const defaultBranch = branches[0];
      const branchItem: ActionListItemInput = {
        id: defaultBranch.name,
        text: defaultBranch.name,
        leadingVisual: () => <GitBranchIcon />,
      };
      setSelectedBranch(branchItem);
    }
  }, [urlParams.ref, branches]);

  // Pre-populate workflow from URL params
  useEffect(() => {
    if (urlParams.workflow_id && workflows.length > 0) {
      const workflow = workflows.find((w) => w.id.toString() === urlParams.workflow_id);
      if (workflow) {
        const workflowItem: ActionListItemInput = {
          id: workflow.id.toString(),
          text: workflow.name,
          description: `${workflow.path} • ${workflow.state}`,
          leadingVisual: () => <WorkflowIcon />,
        };
        setSelectedWorkflow(workflowItem);
      }
    }
  }, [urlParams.workflow_id, workflows]);

  const loadOwners = async () => {
    setOwnersLoading(true);
    setError(null);
    try {
      // Get authenticated user and their organizations
      const [orgsResult] = await Promise.all([
        api.github.listOrgs({ page: 1, per_page: 100 }),
      ]);
      
      console.log('Received organizations:', orgsResult);
      console.log('Number of orgs:', orgsResult.orgs?.length);
      
      // Combine user and orgs as owner options
      const ownerList = [
        {
          login: user.username,
          avatar_url: user.avatarUrl,
          type: 'User',
        },
        ...orgsResult.orgs.map((org: any) => ({
          login: org.login,
          avatar_url: org.avatar_url,
          type: 'Organization',
        })),
      ];
      
      console.log('Total owners (user + orgs):', ownerList.length);
      console.log('Owner logins:', ownerList.map(o => o.login).join(', '));
      
      setOwners(ownerList);
    } catch (error: any) {
      console.error('Failed to load owners:', error);
      setError(error.message || 'Failed to load owners');
    } finally {
      setOwnersLoading(false);
    }
  };

  const loadRepos = async (owner: string, page: number = 1, append: boolean = false, searchQuery?: string) => {
    // Don't use cache when searching
    if (page === 1 && !append && !searchQuery) {
      const cached = repoCache.get(owner);
      if (cached) {
        setRepos(cached.repos);
        setRepoPage(cached.lastPage);
        setRepoHasMore(cached.hasMore);
        return;
      }
    }

    setReposLoading(true);
    setError(null);
    try {
      const result = await api.github.listRepos({ 
        page, 
        per_page: 30, 
        owner,
        ...(searchQuery ? { q: searchQuery } : {})
      });
      
      if (append) {
        const newRepos = [...repos, ...result.repos];
        setRepos(newRepos);
        // Update cache only if not searching
        if (!searchQuery) {
          repoCache.set(owner, { repos: newRepos, hasMore: result.has_more, lastPage: page });
          setRepoCache(new Map(repoCache));
        }
      } else {
        setRepos(result.repos);
        // Cache first page only if not searching
        if (!searchQuery) {
          repoCache.set(owner, { repos: result.repos, hasMore: result.has_more, lastPage: page });
          setRepoCache(new Map(repoCache));
        }
      }
      
      setRepoPage(page);
      setRepoHasMore(result.has_more);
    } catch (error: any) {
      setError(error.message || 'Failed to load repositories');
    } finally {
      setReposLoading(false);
    }
  };

  const loadMoreRepos = async () => {
    if (!selectedOwner?.id || !repoHasMore || reposLoading) return;
    await loadRepos(selectedOwner.id as string, repoPage + 1, true, repoSearchQuery || undefined);
  };

  const loadWorkflows = async (owner: string, repo: string) => {
    setWorkflowsLoading(true);
    setError(null);
    try {
      const result = await api.github.listWorkflows(owner, repo, { page: 1, per_page: 100 });
      setWorkflows(result.workflows);
    } catch (error: any) {
      setError(error.message || 'Failed to load workflows');
    } finally {
      setWorkflowsLoading(false);
    }
  };

  const loadBranches = async (owner: string, repo: string) => {
    setBranchesLoading(true);
    setError(null);
    try {
      const result = await api.github.listBranches(owner, repo, { page: 1, per_page: 100 });
      setBranches(result.branches);
    } catch (error: any) {
      setError(error.message || 'Failed to load branches');
    } finally {
      setBranchesLoading(false);
    }
  };

  const handleOwnerChange = (selected: ActionListItemInput | undefined) => {
    setSelectedOwner(selected);
    setSelectedRepo(undefined);
    setSelectedWorkflow(undefined);
    setSelectedBranch(undefined);
    setRepos([]);
    setWorkflows([]);
    setBranches([]);
    setRepoPage(1);
    setRepoHasMore(false);
  };

  const handleRepoChange = (selected: ActionListItemInput | undefined) => {
    setSelectedRepo(selected);
    setSelectedWorkflow(undefined);
    setSelectedBranch(undefined);
    setWorkflows([]);
    setBranches([]);
    
    if (selected?.id && selectedOwner?.id) {
      const owner = selectedOwner.id as string;
      const repo = selected.id as string;
      loadWorkflows(owner, repo);
      loadBranches(owner, repo);
    }
  };

  const handleProceed = () => {
    if (!selectedOwner?.id || !selectedRepo?.id || !selectedWorkflow?.id || !selectedBranch?.id) return;
    
    const params = new URLSearchParams({
      owner: selectedOwner.id as string,
      repo: selectedRepo.id as string,
      workflow_id: selectedWorkflow.id as string,
      ref: selectedBranch.id as string,
    });
    
    navigate(`/workflows/dispatch?${params.toString()}`);
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Convert owners to SelectPanel items
  const ownerItems: ActionListItemInput[] = owners
    .filter(owner =>
      owner.login.toLowerCase().includes(ownerSearch.toLowerCase())
    )
    .map(owner => ({
      id: owner.login,
      text: owner.login,
      leadingVisual: () => <Avatar src={owner.avatar_url} size={20} />,
    }));

  // Convert repos to SelectPanel items (filtering now done server-side)
  const repoItems: ActionListItemInput[] = repos
    .map(repo => ({
      id: repo.name,
      text: repo.name,
      description: repo.description || undefined,
      leadingVisual: () => <RepoIcon />,
    }));

  // Convert workflows to SelectPanel items
  const workflowItems: ActionListItemInput[] = workflows
    .filter(workflow =>
      workflow.name.toLowerCase().includes(workflowSearch.toLowerCase()) ||
      workflow.path?.toLowerCase().includes(workflowSearch.toLowerCase())
    )
    .map(workflow => ({
      id: workflow.id.toString(),
      text: workflow.name,
      description: `${workflow.path} • ${workflow.state}`,
      leadingVisual: () => <WorkflowIcon />,
    }));

  // Convert branches to SelectPanel items
  const branchItems: ActionListItemInput[] = branches
    .filter(branch =>
      branch.name.toLowerCase().includes(branchSearch.toLowerCase())
    )
    .map(branch => ({
      id: branch.name,
      text: branch.name,
      leadingVisual: () => <GitBranchIcon />,
    }));

  return (
    <div style={{ padding: '2rem' }}>
      {/* User header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--borderColor-default)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Avatar src={user.avatarUrl || ''} size={48} />
          <div>
            <Heading as="h2" style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
              {user.displayName || user.username}
            </Heading>
            <Text as="p" style={{ fontSize: '0.875rem', color: 'var(--fgColor-muted)' }}>
              @{user.username}
            </Text>
          </div>
        </div>
        <Button onClick={handleLogout}>Logout</Button>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Heading as="h1" style={{ marginBottom: '0.5rem' }}>
          Select Workflow
        </Heading>
        
        <Text as="p" style={{ marginBottom: '2rem', color: 'var(--fgColor-muted)' }}>
          Choose a repository, workflow, and git reference to dispatch
        </Text>

        {error && (
          <Flash variant="danger" style={{ marginBottom: '1rem' }}>
            {error}
          </Flash>
        )}

        <div
          style={{
            padding: '1.5rem',
            border: '1px solid var(--borderColor-default)',
            borderRadius: '6px',
          }}
        >
          {/* Owner Selection */}
          <FormControl style={{ marginBottom: '1.5rem' }}>
            <FormControl.Label>Owner *</FormControl.Label>
            <SelectPanel
              renderAnchor={({children, ...anchorProps}) => (
                <Button {...anchorProps}>
                  {children || 'Choose an owner'}
                </Button>
              )}
              placeholder="Pick an owner"
              placeholderText="Search owners..."
              open={ownerSelectOpen}
              onOpenChange={setOwnerSelectOpen}
              items={ownerItems}
              selected={selectedOwner}
              onSelectedChange={handleOwnerChange}
              onFilterChange={setOwnerSearch}
              loading={ownersLoading}
            />
            <FormControl.Caption>
              Select the user or organization that owns the repository
            </FormControl.Caption>
          </FormControl>

          {/* Repository Selection */}
          <FormControl style={{ marginBottom: '1.5rem' }} disabled={!selectedOwner}>
            <FormControl.Label>Repository name *</FormControl.Label>
            <SelectPanel
              renderAnchor={({children, ...anchorProps}) => (
                <Button {...anchorProps} disabled={!selectedOwner}>
                  {children || 'Select repository...'}
                </Button>
              )}
              placeholder="Pick a repository"
              placeholderText="Search repositories..."
              open={repoSelectOpen}
              onOpenChange={setRepoSelectOpen}
              items={repoItems}
              selected={selectedRepo}
              onSelectedChange={handleRepoChange}
              onFilterChange={setRepoSearch}
              loading={reposLoading && repoPage === 1}
              footer={
                repoHasMore ? (
                  <Button 
                    size="small" 
                    block 
                    onClick={loadMoreRepos}
                    disabled={reposLoading}
                  >
                    {reposLoading ? (
                      <>
                        <Spinner size="small" style={{ marginRight: '0.5rem' }} />
                        Loading more...
                      </>
                    ) : (
                      `Load more repositories (${repos.length} loaded)`
                    )}
                  </Button>
                ) : repos.length > 0 ? (
                  <Text as="p" size="small" style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--fgColor-muted)' }}>
                    All {repos.length} repositories loaded
                  </Text>
                ) : undefined
              }
            />
            <FormControl.Caption>
              Select a repository you have workflow dispatch access to
            </FormControl.Caption>
          </FormControl>

          {/* Workflow Selection */}
          <FormControl style={{ marginBottom: '1.5rem' }} disabled={!selectedRepo}>
            <FormControl.Label>Workflow</FormControl.Label>
            <SelectPanel
              renderAnchor={({children, ...anchorProps}) => (
                <Button {...anchorProps} disabled={!selectedRepo}>
                  {children || 'Select workflow...'}
                </Button>
              )}
              placeholder="Pick a workflow"
              placeholderText="Search workflows..."
              open={workflowSelectOpen}
              onOpenChange={setWorkflowSelectOpen}
              items={workflowItems}
              selected={selectedWorkflow}
              onSelectedChange={setSelectedWorkflow}
              onFilterChange={setWorkflowSearch}
              loading={workflowsLoading}
            />
            <FormControl.Caption>
              Choose the workflow to dispatch
            </FormControl.Caption>
          </FormControl>

          {/* Git Reference Selection */}
          <FormControl style={{ marginBottom: '1.5rem' }} disabled={!selectedRepo}>
            <FormControl.Label>Git Reference</FormControl.Label>
            <SelectPanel
              renderAnchor={({children, ...anchorProps}) => (
                <Button {...anchorProps} disabled={!selectedRepo}>
                  {children || 'Select branch...'}
                </Button>
              )}
              placeholder="Pick a branch"
              placeholderText="Search branches..."
              open={branchSelectOpen}
              onOpenChange={setBranchSelectOpen}
              items={branchItems}
              selected={selectedBranch}
              onSelectedChange={setSelectedBranch}
              onFilterChange={setBranchSearch}
              loading={branchesLoading}
            />
            <FormControl.Caption>
              Branch, tag, or commit SHA to run the workflow on
            </FormControl.Caption>
          </FormControl>

          <Button
            variant="primary"
            disabled={!selectedOwner || !selectedRepo || !selectedWorkflow || !selectedBranch}
            onClick={handleProceed}
          >
            Continue to Workflow Inputs →
          </Button>
        </div>
      </div>
    </div>
  );
}
