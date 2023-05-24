import React from 'react';
import { createRoot } from 'react-dom/client';
import { attachLogger } from 'effector-logger';

import { App } from './app';

attachLogger();

const root = createRoot(document.querySelector('#root')!);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
