import { createRouter } from 'router5';
import browserPlugin from 'router5-plugin-browser';


const routes = [
  { name: 'home', path: '/' },
  { name: 'search', path: '/search' },
  { name: 'favorite', path: '/favorite' },
  { name: 'folder', path: '/folder' },
  { name: 'settings', path: '/settings' },
] ;

export const router = createRouter(routes);

router.usePlugin(browserPlugin());


router.start();
