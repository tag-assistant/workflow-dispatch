import { Checkbox } from '@primer/react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function BooleanToggle({ value, onChange }: Props) {
  const isOn = value === 'true';
  return (
    <Checkbox
      checked={isOn}
      onChange={() => onChange(isOn ? 'false' : 'true')}
    />
  );
}
