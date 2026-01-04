import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Standard Service Worker Registration (Independent of Vite virtual modules)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW: Registered successfully:', registration.scope);
      
      // Immediate update logic
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('SW: New content available, reloading...');
              window.location.reload();
            }
          };
        }
      };
    }).catch(error => {
      console.error('SW: Registration failed:', error);
    });
  });

  // Force Reload Logic: Detects when a new Service Worker has taken over
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

// Force HTTPS for compatibility in Production (GCP/Netlify)
if (
  window.location.protocol !== 'https:' && 
  window.location.hostname !== 'localhost' && 
  window.location.hostname !== '127.0.0.1'
) {
  window.location.replace(`https:${window.location.href.substring(window.location.protocol.length)}`);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);