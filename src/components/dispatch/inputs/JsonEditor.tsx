import { lazy, Suspense } from 'react';
import { Box, Spinner } from '@primer/react';

const MonacoEditor = lazy(() => import('@monaco-editor/react').then(m => ({ default: m.default })));

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function JsonEditor({ value, onChange }: Props) {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, overflow: 'hidden', height: 200 }}>
      <Suspense fallback={<Box sx={{ p: 3 }}><Spinner /></Box>}>
        <MonacoEditor
          height="200px"
          language="json"
          value={value}
          onChange={v => onChange(v || '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            lineNumbers: 'off',
            scrollBeyondLastLine: false,
            fontSize: 13,
            tabSize: 2,
            automaticLayout: true,
          }}
        />
      </Suspense>
    </Box>
  );
}
