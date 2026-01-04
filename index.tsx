
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
// @ts-ignore
import { registerSW } from 'virtual:pwa-register';

// Register the Update Listener for immediate version detection and takeover
const updateSW = registerSW({
  onNeedRefresh() {
    // Immediate Takeover: Trigger update and reload without manual confirmation
    updateSW(true);
  },
  onOfflineReady() {
    console.log("App is ready for offline use.");
  },
});

// Force Reload Logic: Detects when a new Service Worker has taken over and reloads the page once
if ('serviceWorker' in navigator) {
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
