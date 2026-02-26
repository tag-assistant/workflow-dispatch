import { TextInput } from '@primer/react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function NumberInput({ value, onChange, min, max, step }: Props) {
  return (
    <TextInput
      type="number"
      value={value}
      onChange={e => onChange(e.target.value)}
      min={min}
      max={max}
      step={step}
      sx={{ width: '100%' }}
    />
  );
}
