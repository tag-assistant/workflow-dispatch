import { Router } from 'express';
import { Octokit } from '@octokit/rest';
import { isAuthenticated } from '../middlewares/auth.js';

const router = Router();

// Trigger a workflow dispatch event
router.post('/dispatch', isAuthenticated, async (req, res, next) => {
  try {
    const { owner, repo, workflow_id, ref, inputs } = req.body;

    // Validate required fields
    if (!owner || !repo || !workflow_id || !ref) {
      return res.status(400).json({
        error: 'Missing required fields: owner, repo, workflow_id, and ref are required',
      });
    }

    // Get the user's GitHub access token from session
    const user = req.user as any;
    if (!user?.accessToken) {
      return res.status(401).json({ error: 'No GitHub access token found' });
    }

    // Initialize Octokit with user's access token
    const octokit = new Octokit({
      auth: user.accessToken,
    });

    // Trigger the workflow dispatch
    await octokit.rest.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id,
      ref,
      inputs: inputs || {}, // Optional workflow inputs
    });

    res.json({
      message: 'Workflow dispatch triggered successfully',
      owner,
      repo,
      workflow_id,
      ref,
    });
  } catch (error: any) {
    // Handle GitHub API errors
    if (error.status === 404) {
      return res.status(404).json({
        error: 'Workflow not found. Check that the owner, repo, and workflow_id are correct.',
      });
    }
    if (error.status === 403) {
      return res.status(403).json({
        error: 'Permission denied. Make sure you have the required permissions for this repository.',
      });
    }
    next(error);
  }
});

export default router;
