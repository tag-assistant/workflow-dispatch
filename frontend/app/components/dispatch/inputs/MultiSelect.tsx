import { Box, Checkbox, FormControl, Text } from '@primer/react';

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}

export function MultiSelect({ options, value, onChange }: Props) {
  const selected = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

  const toggle = (val: string) => {
    const next = selected.includes(val)
      ? selected.filter(s => s !== val)
      : [...selected, val];
    onChange(next.join(','));
  };

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
