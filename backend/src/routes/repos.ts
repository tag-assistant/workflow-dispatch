import { Router } from 'express';
import { getOctokit } from '../services/github.js';

export const reposRouter = Router();

reposRouter.get('/', async (req, res) => {
  try {
    const octokit = getOctokit(req);
    const query = (req.query.q as string) || '';
    const page = parseInt(req.query.page as string) || 1;

    if (query) {
      const { data } = await octokit.search.repos({
        q: `${query} in:name fork:true`,
        per_page: 20,
        page,
        sort: 'updated',
      });
      res.json(data.items.map(r => ({
        id: r.id,
        full_name: r.full_name,
        owner: r.owner?.login,
        name: r.name,
        description: r.description,
        private: r.private,
        updated_at: r.updated_at,
      })));
    } else {
      const { data } = await octokit.repos.listForAuthenticatedUser({
        per_page: 30,
        page,
        sort: 'updated',
        type: 'all',
      });
      res.json(data.map(r => ({
        id: r.id,
        full_name: r.full_name,
        owner: r.owner.login,
        name: r.name,
        description: r.description,
        private: r.private,
        updated_at: r.updated_at,
      })));
    }
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});
