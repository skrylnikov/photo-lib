import { MantineProvider } from '@mantine/core';
import { useEffect, useState } from 'react';

import { appShell } from './style.css.ts';
import { Home } from '../pages/home';
import { AlbumPage } from '../pages/album';
import { AdminPage } from '../pages/admin';

export const App = () => {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const navigate = (next: string) => { window.history.pushState({}, '', next); setPath(next); };
  const content = path === '/admin'
    ? <AdminPage navigate={navigate} />
    : path.startsWith('/album/')
      ? <AlbumPage slug={decodeURIComponent(path.slice('/album/'.length))} navigate={navigate} />
      : <Home navigate={navigate} />;
  return <MantineProvider><main className={appShell}>{content}</main></MantineProvider>;
};
