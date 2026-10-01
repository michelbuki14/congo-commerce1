import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';
import '@/i18n';

// Apply the OS colour scheme synchronously, before first paint.
//
// This must NOT be a useEffect call: this file is entrypoint code, not a
// component, so React throws "Invalid hook call" and module evaluation aborts
// before createRoot().render() below ever runs -- which shows up as a blank
// page with no error to explain it. Setting the class inline also avoids a
// flash of the wrong theme on load.
if (typeof window !== 'undefined' && window.matchMedia) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', prefersDark);
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
