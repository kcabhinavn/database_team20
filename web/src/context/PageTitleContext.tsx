import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/** Pages announce their title; the top bar shows it and the tab title follows. */
export interface PageTitle {
  title: string;
  crumb?: { label: string; to: string };
}

interface PageTitleState {
  current: PageTitle;
  setCurrent: (title: PageTitle) => void;
}

const PageTitleContext = createContext<PageTitleState | null>(null);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<PageTitle>({ title: '' });
  const value = useMemo(() => ({ current, setCurrent }), [current]);
  return <PageTitleContext.Provider value={value}>{children}</PageTitleContext.Provider>;
}

export function useCurrentPageTitle(): PageTitle {
  return useContext(PageTitleContext)?.current ?? { title: '' };
}

export function usePageTitle(title: string, crumb?: { label: string; to: string }) {
  const setCurrent = useContext(PageTitleContext)?.setCurrent;
  const crumbLabel = crumb?.label;
  const crumbTo = crumb?.to;
  useEffect(() => {
    setCurrent?.({ title, crumb: crumbLabel && crumbTo ? { label: crumbLabel, to: crumbTo } : undefined });
    document.title = title ? `${title} · RideSync` : 'RideSync';
  }, [setCurrent, title, crumbLabel, crumbTo]);
}
