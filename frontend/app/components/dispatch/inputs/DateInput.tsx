import { TextInput } from '@primer/react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function DateInput({ value, onChange }: Props) {
  return (
    <TextInput
      type="date"
      value={value}
      onChange={e => onChange(e.target.value)}
      sx={{ width: '100%' }}
    />
  );
}
