import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { ThemeProvider, BaseStyles } from '@primer/react';
import { App } from './root';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider colorMode="auto">
      <BaseStyles>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </BaseStyles>
    </ThemeProvider>
  </React.StrictMode>
);
