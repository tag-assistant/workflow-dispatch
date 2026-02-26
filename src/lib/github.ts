import { Octokit } from '@octokit/rest';
import { getToken } from './auth';
import { parse } from 'yaml';

let octokit: Octokit | null = null;

export function initOctokit(token: string) {
  octokit = new Octokit({ auth: token });
}

export function getOctokit(): Octokit {
  if (!octokit) {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    octokit = new Octokit({ auth: token });
  }
  return octokit;
}

export function resetOctokit() {
  octokit = null;
}

export async function validateToken(token: string) {
  const ok = new Octokit({ auth: token });
  const { data } = await ok.users.getAuthenticated();
  return data;
}

export async function searchRepos(query?: string) {
  const ok = getOctokit();
  if (query) {
    const { data } = await ok.search.repos({ q: query, per_page: 20 });
    return data.items.map(r => ({
      id: r.id,
      full_name: r.full_name,
      owner: r.owner?.login || '',
      name: r.name,
      description: r.description,
      private: r.private,
    }));
  }
  const { data } = await ok.repos.listForAuthenticatedUser({ per_page: 30, sort: 'pushed' });
  return data.map(r => ({
    id: r.id,
    full_name: r.full_name,
    owner: r.owner.login,
    name: r.name,
    description: r.description,
    private: r.private,
  }));
}

export async function listWorkflows(owner: string, repo: string) {
  const ok = getOctokit();
  const { data } = await ok.actions.listRepoWorkflows({ owner, repo, per_page: 100 });
  return data.workflows.filter(w => w.state === 'active');
}

export async function getWorkflowContent(owner: string, repo: string, path: string) {
  const ok = getOctokit();
  const { data } = await ok.repos.getContent({ owner, repo, path });
  if ('content' in data && data.content) {
    return atob(data.content);
  }
  throw new Error('Could not read workflow file');
}

export async function dispatch(owner: string, repo: string, workflowId: number, ref: string, inputs: Record<string, string>) {
  const ok = getOctokit();
  await ok.actions.createWorkflowDispatch({ owner, repo, workflow_id: workflowId, ref, inputs });
}

export async function listBranches(owner: string, repo: string) {
  const ok = getOctokit();
  const { data } = await ok.repos.listBranches({ owner, repo, per_page: 100 });
  return data;
}

export async function listEnvironments(owner: string, repo: string) {
  const ok = getOctokit();
  try {
    const { data } = await ok.repos.getAllEnvironments({ owner, repo });
    return data.environments || [];
  } catch {
    return [];
  }
}

export async function listRuns(owner: string, repo: string, workflowId?: number) {
  const ok = getOctokit();
  if (workflowId) {
    const { data } = await ok.actions.listWorkflowRuns({ owner, repo, workflow_id: workflowId, per_page: 10 });
    return data.workflow_runs;
  }
  const { data } = await ok.actions.listWorkflowRunsForRepo({ owner, repo, per_page: 10 });
  return data.workflow_runs;
}

export async function fetchDynamicOptions(
  owner: string,
  repo: string,
  source: string,
  endpoint?: string,
  valuePath?: string,
  labelPath?: string,
): Promise<Array<{ value: string; label: string }>> {
  const ok = getOctokit();
  const extract = (item: any, path?: string) => {
    if (!path) return String(item);
    return path.split('.').reduce((o, k) => o?.[k], item);
  };

  try {
    switch (source) {
      case 'tags': {
        const { data } = await ok.repos.listTags({ owner, repo, per_page: 50 });
        return data.map(t => ({ value: t.name, label: t.name }));
      }
      case 'branches': {
        const { data } = await ok.repos.listBranches({ owner, repo, per_page: 50 });
        return data.map(b => ({ value: b.name, label: b.name }));
      }
      case 'releases': {
        const { data } = await ok.repos.listReleases({ owner, repo, per_page: 50 });
        return data.map(r => ({ value: r.tag_name, label: r.name || r.tag_name }));
      }
      case 'environments': {
        const { data } = await ok.repos.getAllEnvironments({ owner, repo });
        return (data.environments || []).map((e: any) => ({ value: e.name, label: e.name }));
      }
      case 'collaborators': {
        const { data } = await ok.repos.listCollaborators({ owner, repo, per_page: 50 });
        return data.map(c => ({ value: c.login, label: c.login }));
      }
      case 'labels': {
        const { data } = await ok.issues.listLabelsForRepo({ owner, repo, per_page: 100 });
        return data.map(l => ({ value: l.name, label: l.name }));
      }
      case 'milestones': {
        const { data } = await ok.issues.listMilestones({ owner, repo, per_page: 50 });
        return data.map(m => ({ value: m.title, label: m.title }));
      }
      case 'api': {
        if (!endpoint) return [];
        const url = endpoint.replace('{owner}', owner).replace('{repo}', repo);
        const { data } = await ok.request(`GET ${url}`);
        const items = Array.isArray(data) ? data : (data as any)?.items || [];
        return items.map((item: any) => ({
          value: String(extract(item, valuePath) ?? ''),
          label: String(extract(item, labelPath || valuePath) ?? ''),
        }));
      }
      default:
        return [];
    }
  } catch {
    return [];
  }
}

export async function getRepoConfig(owner: string, repo: string) {
  const ok = getOctokit();
  try {
    const { data } = await ok.repos.getContent({ owner, repo, path: '.github/workflow-dispatch.yml' });
    if ('content' in data && data.content) {
      return parse(atob(data.content));
    }
    return null;
  } catch {
    return null;
  }
}
