import { Checkbox } from '@primer/react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}

export function BooleanToggle({ value, onChange, id }: Props) {
  const isOn = value === 'true';
  return (
    <Checkbox
      id={id}
      checked={isOn}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.checked ? 'true' : 'false')}
    />
  );
}
