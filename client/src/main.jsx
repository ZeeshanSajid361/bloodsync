import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

window.onerror = function(msg, url, lineNo, columnNo, error) {
  console.error('[Global Error]', msg, 'at', url, 'line', lineNo, error);
  return false;
};

window.onunhandledrejection = function(event) {
  console.error('[Unhandled Rejection]', event.reason);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
