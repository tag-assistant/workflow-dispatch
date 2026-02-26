import { useState, useCallback } from 'react';
import { Box, Button, FormControl, ActionMenu, ActionList, Text } from '@primer/react';
import { RocketIcon, GitBranchIcon, InboxIcon } from '@primer/octicons-react';
import { InputField } from './InputField';
import { InputGroup } from './InputGroup';
import type { ResolvedInput } from '../../lib/types';

interface Props {
  inputs: ResolvedInput[];
  groups?: Array<{ title: string; inputs: string[] }>;
  branches: any[];
  selectedBranch: string;
  onBranchChange: (branch: string) => void;
  onDispatch: (inputs: Record<string, string>) => void;
  dispatching: boolean;
  owner: string;
  repo: string;
}

export function DispatchForm({ inputs, groups, branches, selectedBranch, onBranchChange, onDispatch, dispatching, owner, repo }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    inputs.forEach(i => { if (i.default) defaults[i.name] = i.default; });
    return defaults;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setValue = useCallback((name: string, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  }, []);

  const handleSubmit = useCallback(() => {
    const newErrors: Record<string, string> = {};
    inputs.forEach(input => {
      if (input.required && !values[input.name]) {
        newErrors[input.name] = 'This field is required';
      }
      if (input.pattern && values[input.name]) {
        const re = new RegExp(input.pattern);
        if (!re.test(values[input.name])) {
          newErrors[input.name] = input.validationMessage || `Must match pattern: ${input.pattern}`;
        }
      }
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onDispatch(values);
  }, [inputs, values, onDispatch]);

  const renderInput = (input: ResolvedInput) => (
    <InputField
      key={input.name}
      input={input}
      value={values[input.name] || ''}
      onChange={v => setValue(input.name, v)}
      error={errors[input.name]}
      owner={owner}
      repo={repo}
    />
  );

  const groupedInputNames = new Set(groups?.flatMap(g => g.inputs) || []);
  const ungroupedInputs = inputs.filter(i => !groupedInputNames.has(i.name));

  return (
    <Box>
      {inputs.length === 0 && (
        <Box sx={{ py: 5, textAlign: 'center' }}>
          <Box sx={{ color: 'fg.muted', mb: 2 }}>
            <InboxIcon size={32} />
          </Box>
          <Text sx={{ color: 'fg.muted', fontSize: 1 }}>
            This workflow has no configurable inputs. You can dispatch it directly.
          </Text>
        </Box>
      )}

      {groups?.map(group => (
        <InputGroup key={group.title} title={group.title}>
          {group.inputs.map(name => {
            const input = inputs.find(i => i.name === name);
            return input ? renderInput(input) : null;
          })}
        </InputGroup>
      ))}

      {ungroupedInputs.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 4 }}>
          {ungroupedInputs.map(renderInput)}
        </Box>
      )}

      {/* Footer bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, pt: 3, borderTop: '1px solid', borderColor: 'border.default' }}>
        <FormControl>
          <FormControl.Label visuallyHidden>Branch</FormControl.Label>
          <ActionMenu>
            <ActionMenu.Button leadingVisual={GitBranchIcon}>{selectedBranch}</ActionMenu.Button>
            <ActionMenu.Overlay>
              <ActionList selectionVariant="single">
                {branches.map((b: any) => (
                  <ActionList.Item
                    key={b.name}
                    selected={b.name === selectedBranch}
                    onSelect={() => onBranchChange(b.name)}
                  >
                    {b.name}
                  </ActionList.Item>
                ))}
              </ActionList>
            </ActionMenu.Overlay>
          </ActionMenu>
        </FormControl>
        <Box sx={{ flex: 1 }} />
        <Button variant="primary" size="large" onClick={handleSubmit} disabled={dispatching} leadingVisual={RocketIcon}>
          {dispatching ? 'Dispatching...' : 'Dispatch Workflow'}
        </Button>
      </Box>
    </Box>
  );
}
