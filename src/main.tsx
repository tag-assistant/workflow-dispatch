import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ThemeProvider, BaseStyles } from '@primer/react';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider colorMode="auto">
      <BaseStyles>
        <HashRouter>
          <App />
        </HashRouter>
      </BaseStyles>
    </ThemeProvider>
  </React.StrictMode>
);
