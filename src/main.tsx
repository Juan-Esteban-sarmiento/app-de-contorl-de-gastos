import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

/* Estilos de la app y tokens de Stitch */
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
