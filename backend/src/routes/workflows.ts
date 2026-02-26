import { Router } from 'express';
import { getOctokit } from '../services/github.js';
import { parseWorkflowYaml } from '../services/workflowParser.js';
import { loadConfig } from '../services/configLoader.js';

export const workflowsRouter = Router();

workflowsRouter.get('/:owner/:repo/workflows', async (req, res) => {
  try {
    const octokit = getOctokit(req);
    const { owner, repo } = req.params;
    const { data } = await octokit.actions.listRepoWorkflows({ owner, repo, per_page: 100 });
    const dispatchable = data.workflows.filter(w => w.state === 'active');
    res.json(dispatchable.map(w => ({
      id: w.id,
      name: w.name,
      path: w.path,
      state: w.state,
      badge_url: w.badge_url,
    })));
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

workflowsRouter.get('/:owner/:repo/workflows/:id', async (req, res) => {
  try {
    const octokit = getOctokit(req);
    const { owner, repo, id } = req.params;

    const { data: workflow } = await octokit.actions.getWorkflow({
      owner, repo, workflow_id: parseInt(id),
    });

    // Fetch the workflow file content to parse inputs
    const path = workflow.path;
    let parsed = { name: workflow.name, inputs: [] as any[] };
    try {
      const { data: fileData } = await octokit.repos.getContent({ owner, repo, path });
      if ('content' in fileData && fileData.content) {
        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        parsed = parseWorkflowYaml(content);
      }
    } catch { /* file might not be accessible */ }

    res.json({
      id: workflow.id,
      name: parsed.name || workflow.name,
      path: workflow.path,
      state: workflow.state,
      inputs: parsed.inputs,
    });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

workflowsRouter.get('/:owner/:repo/config', async (req, res) => {
  try {
    const octokit = getOctokit(req);
    const { owner, repo } = req.params;
    const config = await loadConfig(octokit, owner, repo);
    res.json(config || {});
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

workflowsRouter.get('/:owner/:repo/environments', async (req, res) => {
  try {
    const octokit = getOctokit(req);
    const { owner, repo } = req.params;
    const { data } = await octokit.repos.getAllEnvironments({ owner, repo });
    res.json((data.environments || []).map(e => ({ id: e.id, name: e.name })));
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

workflowsRouter.get('/:owner/:repo/branches', async (req, res) => {
  try {
    const octokit = getOctokit(req);
    const { owner, repo } = req.params;
    const { data } = await octokit.repos.listBranches({ owner, repo, per_page: 100 });
    res.json(data.map(b => ({ name: b.name, protected: b.protected })));
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});
