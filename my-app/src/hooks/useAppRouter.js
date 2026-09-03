import { useEffect, useState } from 'react';

export function useAppRouter() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const updatePathname = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', updatePathname);
    return () => window.removeEventListener('popstate', updatePathname);
  }, []);

  const navigate = (path, replace = false) => {
    if (window.location.pathname === path) {
      return;
    }

    window.history[replace ? 'replaceState' : 'pushState']({}, '', path);
    setPathname(path);
  };

  return { pathname, navigate };
}
