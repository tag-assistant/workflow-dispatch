import { useEffect, useState } from 'react';
import { Box, Checkbox, FormControl, Spinner } from '@primer/react';
import { fetchDynamicOptions } from '../../../lib/github';
import type { OptionsFrom } from '../../../lib/types';

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  owner?: string;
  repo?: string;
  optionsFrom?: OptionsFrom;
}

export function MultiSelect({ options: staticOptions, value, onChange, owner, repo, optionsFrom }: Props) {
  const [options, setOptions] = useState<Option[]>(staticOptions);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!owner || !repo || !optionsFrom) return;
    setLoading(true);
    fetchDynamicOptions(owner, repo, optionsFrom.source, optionsFrom.endpoint, optionsFrom.valuePath, optionsFrom.labelPath)
      .then(opts => setOptions(opts))
      .finally(() => setLoading(false));
  }, [owner, repo, optionsFrom]);

  const selected = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

  const toggle = (val: string) => {
    const next = selected.includes(val)
      ? selected.filter(s => s !== val)
      : [...selected, val];
    onChange(next.join(','));
  };

  if (loading) {
    return <Box sx={{ p: 2 }}><Spinner size="small" /></Box>;
  }

  if (options.length === 0) {
    return <Box sx={{ p: 2, color: 'fg.muted', fontStyle: 'italic' }}>No options available</Box>;
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
      {options.map(opt => (
        <FormControl key={opt.value} sx={{ display: 'flex', alignItems: 'center' }}>
          <Checkbox
            checked={selected.includes(opt.value)}
            onChange={() => toggle(opt.value)}
          />
          <FormControl.Label>{opt.label}</FormControl.Label>
        </FormControl>
      ))}
    </Box>
  );
}
