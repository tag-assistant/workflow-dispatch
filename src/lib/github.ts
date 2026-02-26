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
