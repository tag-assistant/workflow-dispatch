import { useEffect, useState } from 'react';
import { ActionMenu, ActionList } from '@primer/react';
import { listEnvironments } from '../../../lib/github';

interface Props {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  owner?: string;
  repo?: string;
  isEnvironment?: boolean;
}

export function SelectInput({ options: staticOptions, value, onChange, owner, repo, isEnvironment }: Props) {
  const [options, setOptions] = useState<string[]>(staticOptions);

  useEffect(() => {
    if (isEnvironment && owner && repo) {
      listEnvironments(owner, repo)
        .then(envs => setOptions(envs.map((e: any) => e.name)))
        .catch(() => {});
    }
  }, [isEnvironment, owner, repo]);

  return (
    <ActionMenu>
      <ActionMenu.Button>{value || 'Select...'}</ActionMenu.Button>
      <ActionMenu.Overlay>
        <ActionList selectionVariant="single">
          {options.map(opt => (
            <ActionList.Item key={opt} selected={opt === value} onSelect={() => onChange(opt)}>
              {opt}
            </ActionList.Item>
          ))}
        </ActionList>
      </ActionMenu.Overlay>
    </ActionMenu>
  );
}
