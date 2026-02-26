import { Box, TextInput } from '@primer/react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function ColorPicker({ value, onChange }: Props) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <input
        type="color"
        value={value || '#000000'}
        onChange={e => onChange(e.target.value)}
        style={{ width: 40, height: 32, border: 'none', cursor: 'pointer' }}
      />
      <TextInput
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="#000000"
        sx={{ width: 120 }}
      />
    </Box>
  );
}
