import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Force HTTPS for compatibility in Production (GCP)
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
