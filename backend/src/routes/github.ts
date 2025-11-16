import { Router } from 'express';
import { Octokit } from '@octokit/rest';
import { isAuthenticated } from '../middlewares/auth.js';
import yaml from 'js-yaml';

const router = Router();

// Simple in-memory cache with TTL (5 minutes)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): any | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// List organizations for authenticated user (paginated)
router.get('/orgs', isAuthenticated, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const per_page = parseInt(req.query.per_page as string) || 30;

    const user = req.user as any;
    if (!user?.accessToken) {
      return res.status(401).json({ error: 'No GitHub access token found' });
    }

    const octokit = new Octokit({ auth: user.accessToken });

    const { data } = await octokit.rest.orgs.listForAuthenticatedUser({
      page,
      per_page,
    });

    console.log(`Fetched ${data.length} organizations for page ${page} with per_page ${per_page}`);

    const orgs = data.map((org) => ({
      login: org.login,
      id: org.id,
      avatar_url: org.avatar_url,
      description: org.description,
    }));

    console.log(`Returning ${orgs.length} organizations:`, orgs.map(o => o.login).join(', '));

    res.json({
      orgs,
      page,
      per_page,
      has_more: data.length === per_page,
    });
  } catch (error: any) {
    if (error.status === 401 || error.status === 403) {
      return res.status(error.status).json({
        error: 'GitHub API authentication failed. Please log in again.',
      });
    }
    next(error);
  }
});

// List repositories for authenticated user or specific owner (paginated)
router.get('/repos', isAuthenticated, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const per_page = parseInt(req.query.per_page as string) || 30;
    const owner = req.query.owner as string | undefined;
    const search = req.query.q as string | undefined;

    const user = req.user as any;
    if (!user?.accessToken) {
      return res.status(401).json({ error: 'No GitHub access token found' });
    }

    // Create cache key
    const cacheKey = `repos:${user.id}:${owner || 'all'}:${search || 'none'}:${page}:${per_page}`;
    
    // Check cache
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const octokit = new Octokit({ auth: user.accessToken });

    let data;
    
    // If search query is provided, use GitHub search API
    if (search && search.trim().length > 0) {
      const searchQuery = owner 
        ? `${search} user:${owner} in:name,description`
        : `${search} user:${user.username} in:name,description`;
      
      const response = await octokit.rest.search.repos({
        q: searchQuery,
        page,
        per_page,
        sort: 'updated',
        order: 'desc',
      });
      
      data = response.data.items;
    }
    // If owner is specified, try org first then fall back to user
    else if (owner) {
      try {
        // Try as organization first (most common for multi-repo owners)
        const response = await octokit.rest.repos.listForOrg({
          org: owner,
          page,
          per_page,
          sort: 'updated',
          direction: 'desc',
          type: 'all',
        });
        data = response.data;
      } catch (error: any) {
        // If 404, it's a user account, not an org
        if (error.status === 404) {
          const response = await octokit.rest.repos.listForUser({
            username: owner,
            page,
            per_page,
            sort: 'updated',
            direction: 'desc',
            type: 'all',
          });
          data = response.data;
        } else {
          throw error;
        }
      }
    } else {
      // No owner specified, get all repos for authenticated user
      const response = await octokit.rest.repos.listForAuthenticatedUser({
        page,
        per_page,
        sort: 'updated',
        direction: 'desc',
      });
      data = response.data;
    }

    const repos = data.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      owner: repo.owner.login,
      private: repo.private,
      description: repo.description,
      updated_at: repo.updated_at,
    }));

    const response = {
      repos,
      page,
      per_page,
      has_more: data.length === per_page,
    };

    // Cache the response
    setCache(cacheKey, response);

    res.json(response);
  } catch (error: any) {
    if (error.status === 401 || error.status === 403) {
      return res.status(error.status).json({
        error: 'GitHub API authentication failed. Please log in again.',
      });
    }
    if (error.status === 404) {
      return res.status(404).json({
        error: 'Owner not found or no repositories available.',
      });
    }
    next(error);
  }
});

// List workflows for a repository (paginated)
router.get('/workflows/:owner/:repo', isAuthenticated, async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const per_page = parseInt(req.query.per_page as string) || 30;

    const user = req.user as any;
    if (!user?.accessToken) {
      return res.status(401).json({ error: 'No GitHub access token found' });
    }

    const octokit = new Octokit({ auth: user.accessToken });

    const { data } = await octokit.rest.actions.listRepoWorkflows({
      owner,
      repo,
      page,
      per_page,
    });

    // Filter workflows to only include those with workflow_dispatch trigger
    const workflowsWithDispatch = [];
    for (const workflow of data.workflows) {
      try {
        // Fetch workflow file content to check for workflow_dispatch trigger
        const { data: fileData } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: workflow.path,
        });

        if ('content' in fileData && !Array.isArray(fileData)) {
          const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
          const workflowYaml = yaml.load(content) as any;
          
          // Check for workflow_dispatch in multiple formats:
          // 1. on: workflow_dispatch (object)
          // 2. on: [workflow_dispatch] (array)
          // 3. on: { workflow_dispatch: null } (explicit null)
          const hasWorkflowDispatch = 
            workflowYaml?.on?.workflow_dispatch !== undefined ||
            (Array.isArray(workflowYaml?.on) && workflowYaml.on.includes('workflow_dispatch'));
          
          if (hasWorkflowDispatch) {
            workflowsWithDispatch.push({
              id: workflow.id,
              name: workflow.name,
              path: workflow.path,
              state: workflow.state,
              created_at: workflow.created_at,
              updated_at: workflow.updated_at,
            });
          }
        }
      } catch (error) {
        // Skip workflows that can't be read or parsed
        continue;
      }
    }

    res.json({
      workflows: workflowsWithDispatch,
      page,
      per_page,
      has_more: data.workflows.length === per_page,
      total_count: workflowsWithDispatch.length,
    });
  } catch (error: any) {
    if (error.status === 404) {
      return res.status(404).json({
        error: 'Repository not found or no workflows exist.',
      });
    }
    if (error.status === 403) {
      return res.status(403).json({
        error: 'Permission denied. Ensure you have access to this repository.',
      });
    }
    next(error);
  }
});

// List branches for a repository (paginated)
router.get('/repos/:owner/:repo/branches', isAuthenticated, async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const per_page = parseInt(req.query.per_page as string) || 30;

    const user = req.user as any;
    if (!user?.accessToken) {
      return res.status(401).json({ error: 'No GitHub access token found' });
    }

    const octokit = new Octokit({ auth: user.accessToken });

    const { data } = await octokit.rest.repos.listBranches({
      owner,
      repo,
      page,
      per_page,
    });

    const branches = data.map((branch) => ({
      name: branch.name,
      protected: branch.protected,
    }));

    res.json({
      branches,
      page,
      per_page,
      has_more: data.length === per_page,
    });
  } catch (error: any) {
    if (error.status === 404) {
      return res.status(404).json({
        error: 'Repository not found.',
      });
    }
    if (error.status === 403) {
      return res.status(403).json({
        error: 'Permission denied. Ensure you have access to this repository.',
      });
    }
    next(error);
  }
});

// Get workflow file content and parse input schema
router.get('/workflows/:owner/:repo/:workflow_id', isAuthenticated, async (req, res, next) => {
  try {
    const { owner, repo, workflow_id } = req.params;

    const user = req.user as any;
    if (!user?.accessToken) {
      return res.status(401).json({ error: 'No GitHub access token found' });
    }

    const octokit = new Octokit({ auth: user.accessToken });

    // First get the workflow details to find the path
    const { data: workflow } = await octokit.rest.actions.getWorkflow({
      owner,
      repo,
      workflow_id: workflow_id,
    });

    // Fetch the workflow file content
    const { data: fileData } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: workflow.path,
    });

    if (!('content' in fileData) || Array.isArray(fileData)) {
      return res.status(400).json({
        error: 'Unable to retrieve workflow file content.',
      });
    }

    // Decode base64 content
    const content = Buffer.from(fileData.content, 'base64').toString('utf-8');

    // Parse YAML to extract workflow_dispatch inputs
    const workflowYaml = yaml.load(content) as any;
    
    // Check for workflow_dispatch in multiple formats
    const hasWorkflowDispatch = 
      workflowYaml?.on?.workflow_dispatch !== undefined ||
      (Array.isArray(workflowYaml?.on) && workflowYaml.on.includes('workflow_dispatch'));
    
    const workflowDispatch = workflowYaml?.on?.workflow_dispatch;
    
    const inputs: Record<string, any> = {};
    if (workflowDispatch?.inputs) {
      Object.entries(workflowDispatch.inputs).forEach(([key, value]: [string, any]) => {
        inputs[key] = {
          description: value.description || '',
          required: value.required || false,
          default: value.default || '',
          type: value.type || 'string',
          options: value.options || null,
        };
      });
    }

    res.json({
      id: workflow.id,
      name: workflow.name,
      path: workflow.path,
      state: workflow.state,
      inputs,
      has_workflow_dispatch: hasWorkflowDispatch,
    });
  } catch (error: any) {
    if (error.status === 404) {
      return res.status(404).json({
        error: 'Workflow not found.',
      });
    }
    if (error.status === 403) {
      return res.status(403).json({
        error: 'Permission denied. Ensure you have access to this repository.',
      });
    }
    next(error);
  }
});

export default router;
