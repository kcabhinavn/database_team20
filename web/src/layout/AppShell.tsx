import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Skeleton } from '@/components/StateView';
import { PageTitleProvider } from '@/context/PageTitleContext';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import styles from './AppShell.module.css';

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setNavOpen(false), [pathname]);

  return (
    <PageTitleProvider>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>
      <div className={styles.shell}>
        <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
        <div className={styles.column}>
          <TopBar onOpenNav={() => setNavOpen(true)} />
          <main id="main" className={styles.main} tabIndex={-1}>
            <Suspense fallback={<Skeleton lines={8} label="Loading page" />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </PageTitleProvider>
  );
}
