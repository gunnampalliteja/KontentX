import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useAppStore, useAuthStore } from './store'

void useAppStore.getState().hydrate().catch((error: unknown) => {
  console.error('Unable to load marketplace data:', error);
});
void useAuthStore.getState().restoreSession().catch((error: unknown) => {
  console.error('Unable to restore the current session:', error);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
