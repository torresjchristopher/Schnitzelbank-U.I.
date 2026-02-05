import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Emergency Blank Screen Protector
window.onerror = function(msg, _url, _lineNo, _columnNo, error) {
  console.error('Fatal App Error:', msg, error);
  // If the error happens during initial chunk load, the app is blank.
  // We can't do much, but we can try to clear the path.
  if (window.location.hash !== '') {
    // If we're stuck on a hash route that's crashing, go home.
    // window.location.hash = '';
  }
  return false;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
