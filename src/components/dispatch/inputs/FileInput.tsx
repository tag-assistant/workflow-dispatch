import { useCallback } from 'react';
import { Box, Button, Textarea, Text } from '@primer/react';
import { UploadIcon } from '@primer/octicons-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function FileInput({ value, onChange }: Props) {
  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsText(file);
  }, [onChange]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <label style={{ cursor: 'pointer' }}>
          <Button leadingVisual={UploadIcon} onClick={() => {}}>Upload File</Button>
          <input type="file" hidden onChange={handleFile} />
        </label>
        <Text sx={{ color: 'fg.muted', fontSize: 0 }}>or paste content below</Text>
      </Box>
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Paste file content here..."
        rows={4}
        sx={{ width: '100%', fontFamily: 'mono' }}
      />
    </Box>
  );
}
