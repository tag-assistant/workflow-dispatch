import { Octokit } from '@octokit/rest';

export function getOctokit(req: any): Octokit {
  const token = req.user?.accessToken;
  if (!token) throw new Error('No access token');
  return new Octokit({ auth: token });
}
