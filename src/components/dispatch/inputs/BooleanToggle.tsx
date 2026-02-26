import { Box, Text } from '@primer/react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function BooleanToggle({ value, onChange }: Props) {
  const isOn = value === 'true';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <input
        type="checkbox"
        checked={isOn}
        onChange={() => onChange(isOn ? 'false' : 'true')}
        style={{ width: 20, height: 20, cursor: 'pointer' }}
      />
      <Text sx={{ color: 'fg.muted' }}>{isOn ? 'On' : 'Off'}</Text>
    </Box>
  );
}
