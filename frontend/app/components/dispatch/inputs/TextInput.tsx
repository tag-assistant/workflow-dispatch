import { TextInput as PrimerTextInput, Textarea } from '@primer/react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}

export function TextInput({ value, onChange, placeholder, multiline }: Props) {
  if (multiline) {
    return (
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        sx={{ width: '100%' }}
      />
    );
  }
  return (
    <PrimerTextInput
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      sx={{ width: '100%' }}
    />
  );
}
