import { useEffect, useState } from 'react';
import { ActionMenu, ActionList, Spinner, Box } from '@primer/react';
import { fetchDynamicOptions, listEnvironments } from '../../../lib/github';
import type { OptionsFrom } from '../../../lib/types';

interface Props {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  owner?: string;
  repo?: string;
  isEnvironment?: boolean;
  optionsFrom?: OptionsFrom;
}

export function SelectInput({ options: staticOptions, value, onChange, owner, repo, isEnvironment, optionsFrom }: Props) {
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>(
    staticOptions.map(o => ({ value: o, label: o }))
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!owner || !repo) return;

    if (optionsFrom) {
      setLoading(true);
      fetchDynamicOptions(owner, repo, optionsFrom.source, optionsFrom.endpoint, optionsFrom.valuePath, optionsFrom.labelPath)
        .then(opts => setOptions(opts))
        .finally(() => setLoading(false));
    } else if (isEnvironment) {
      setLoading(true);
      listEnvironments(owner, repo)
        .then(envs => setOptions(envs.map((e: any) => ({ value: e.name, label: e.name }))))
        .finally(() => setLoading(false));
    }
  }, [isEnvironment, owner, repo, optionsFrom]);

  const selectedLabel = options.find(o => o.value === value)?.label || value;

  return (
    <ActionMenu>
      <ActionMenu.Button>{selectedLabel || 'Select...'}</ActionMenu.Button>
      <ActionMenu.Overlay>
        <ActionList selectionVariant="single">
          {loading ? (
            <Box sx={{ p: 3, textAlign: 'center' }}><Spinner size="small" /></Box>
          ) : (
            options.map(opt => (
              <ActionList.Item key={opt.value} selected={opt.value === value} onSelect={() => onChange(opt.value)}>
                {opt.label}
              </ActionList.Item>
            ))
          )}
        </ActionList>
      </ActionMenu.Overlay>
    </ActionMenu>
  );
}
