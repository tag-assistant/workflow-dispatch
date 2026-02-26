import { Box, Text } from '@primer/react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  step: number;
}

export function SliderInput({ value, onChange, min, max, step }: Props) {
  const numValue = parseFloat(value) || min;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <Text sx={{ color: 'fg.muted', fontSize: 0 }}>{min}</Text>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={numValue}
        onChange={e => onChange(e.target.value)}
        style={{ flex: 1 }}
      />
      <Text sx={{ color: 'fg.muted', fontSize: 0 }}>{max}</Text>
      <Text sx={{ fontWeight: 'bold', minWidth: 40, textAlign: 'right' }}>{numValue}</Text>
    </Box>
  );
}
