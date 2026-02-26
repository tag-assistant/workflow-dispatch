import { getRepoConfig } from './github';
import type { DispatchConfig } from './types';

export async function loadConfig(owner: string, repo: string): Promise<DispatchConfig | null> {
  return getRepoConfig(owner, repo);
}
