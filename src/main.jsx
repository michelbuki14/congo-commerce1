import React from 'react';
import { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';
import '@/i18n';

function Root() {
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);