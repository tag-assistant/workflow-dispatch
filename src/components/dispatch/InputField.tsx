import { FormControl } from '@primer/react';
import type { ResolvedInput } from '../../lib/types';
import { TextInput } from './inputs/TextInput';
import { SelectInput } from './inputs/SelectInput';
import { MultiSelect } from './inputs/MultiSelect';
import { BooleanToggle } from './inputs/BooleanToggle';
import { JsonEditor } from './inputs/JsonEditor';
import { NumberInput } from './inputs/NumberInput';
import { DateInput } from './inputs/DateInput';
import { ColorPicker } from './inputs/ColorPicker';
import { SliderInput } from './inputs/SliderInput';
import { FileInput } from './inputs/FileInput';

interface Props {
  input: ResolvedInput;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  owner: string;
  repo: string;
}

export function InputField({ input, value, onChange, error, owner, repo }: Props) {
  const renderControl = () => {
    switch (input.resolvedType) {
      case 'boolean':
        return <BooleanToggle value={value} onChange={onChange} />;
      case 'choice':
        return <SelectInput options={input.options || []} value={value} onChange={onChange} />;
      case 'environment':
        return <SelectInput options={[]} value={value} onChange={onChange} owner={owner} repo={repo} isEnvironment />;
      case 'multi-select':
        return <MultiSelect options={input.config?.options || []} value={value} onChange={onChange} />;
      case 'json':
        return <JsonEditor value={value} onChange={onChange} />;
      case 'number':
        return <NumberInput value={value} onChange={onChange} min={input.config?.min} max={input.config?.max} step={input.config?.step} />;
      case 'date':
        return <DateInput value={value} onChange={onChange} />;
      case 'color':
        return <ColorPicker value={value} onChange={onChange} />;
      case 'slider':
        return <SliderInput value={value} onChange={onChange} min={input.config?.min || 0} max={input.config?.max || 100} step={input.config?.step || 1} />;
      case 'file':
        return <FileInput value={value} onChange={onChange} />;
      default:
        return <TextInput value={value} onChange={onChange} placeholder={input.placeholder} multiline={input.description?.length > 100} />;
    }
  };

  return (
    <FormControl>
      <FormControl.Label>
        {input.config?.icon ? `${input.config.icon} ` : ''}{input.label}
        {input.required && <span style={{ color: 'var(--fgColor-danger)' }}> *</span>}
      </FormControl.Label>
      {input.description && <FormControl.Caption>{input.description}</FormControl.Caption>}
      {renderControl()}
      {error && <FormControl.Validation variant="error">{error}</FormControl.Validation>}
    </FormControl>
  );
}
