import { Router } from 'express';
import { getOctokit } from '../services/github.js';

export const dispatchesRouter = Router();

dispatchesRouter.post('/:owner/:repo/dispatches', async (req, res) => {
  try {
    const octokit = getOctokit(req);
    const { owner, repo } = req.params;
    const { workflow_id, ref, inputs } = req.body;

    await octokit.actions.createWorkflowDispatch({
      owner, repo,
      workflow_id,
      ref,
      inputs: inputs || {},
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

dispatchesRouter.get('/:owner/:repo/runs', async (req, res) => {
  try {
    const octokit = getOctokit(req);
    const { owner, repo } = req.params;
    const workflow_id = req.query.workflow_id ? parseInt(req.query.workflow_id as string) : undefined;

    const params: any = {
      owner, repo,
      per_page: 20,
      event: 'workflow_dispatch',
    };
    if (workflow_id) params.workflow_id = workflow_id;

    const { data } = await octokit.actions.listWorkflowRuns(params);
    res.json(data.workflow_runs.map(r => ({
      id: r.id,
      name: r.name,
      status: r.status,
      conclusion: r.conclusion,
      head_branch: r.head_branch,
      created_at: r.created_at,
      updated_at: r.updated_at,
      html_url: r.html_url,
      run_number: r.run_number,
      actor: r.actor ? { login: r.actor.login, avatar_url: r.actor.avatar_url } : null,
    })));
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});
