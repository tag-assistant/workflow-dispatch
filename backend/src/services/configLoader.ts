import { Octokit } from '@octokit/rest';
import { parse } from 'yaml';

export interface DispatchConfig {
  workflows?: Record<string, {
    title?: string;
    description?: string;
    theme?: string;
    inputs?: Record<string, any>;
    groups?: Array<{ title: string; inputs: string[] }>;
    jsonMode?: boolean;
  }>;
}

export async function loadConfig(octokit: Octokit, owner: string, repo: string): Promise<DispatchConfig | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner, repo,
      path: '.github/workflow-dispatch.yml',
    });
    if ('content' in data && data.content) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return parse(content) as DispatchConfig;
    }
    return null;
  } catch {
    return null;
  }
}
