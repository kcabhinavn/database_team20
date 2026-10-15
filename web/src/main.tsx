import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { createQueryClient } from '@/api/queryClient';
import { ActorProvider } from '@/context/ActorContext';
import { App } from './App';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('index.html is missing <div id="root">');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={createQueryClient()}>
      <ActorProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ActorProvider>
    </QueryClientProvider>
  </StrictMode>,
);
