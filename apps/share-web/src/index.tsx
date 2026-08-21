import React from 'react';
import { createRoot } from 'react-dom/client';
import '@mantine/core/styles.css';

import { App } from './app';

const rootElement = document.querySelector('#root');
if (!rootElement) {
  throw new Error('Root element was not found');
}

const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
