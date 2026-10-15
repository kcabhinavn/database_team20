import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ActorProvider, type Role } from '@/context/ActorContext';
import { PageTitleProvider } from '@/context/PageTitleContext';

interface Options {
  route?: string;
  path?: string;
  role?: Role;
  riderId?: string | null;
}

/** Render a page with the same providers as the app, against a mocked fetch. */
export function renderPage(ui: ReactElement, { route = '/', path = '/', role = 'rider', riderId = null }: Options = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ActorProvider initialRole={role} initialRiderId={riderId}>
        <PageTitleProvider>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path={path} element={ui} />
              <Route path="*" element={<p>other page</p>} />
            </Routes>
          </MemoryRouter>
        </PageTitleProvider>
      </ActorProvider>
    </QueryClientProvider>,
  );
}

type Handler = (url: URL, init: RequestInit | undefined) => { status?: number; body: unknown } | undefined;

/** Replace fetch with a router of handlers; unknown URLs fail the test loudly. */
export function mockFetch(handler: Handler) {
  const calls: { url: URL; init: RequestInit | undefined }[] = [];
  const fn = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    calls.push({ url, init });
    const answer = handler(url, init);
    if (!answer) throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url.pathname}${url.search}`);
    return new Response(JSON.stringify(answer.body), {
      status: answer.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  globalThis.fetch = fn as typeof fetch;
  return calls;
}
