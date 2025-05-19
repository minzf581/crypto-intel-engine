import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { AssetProvider } from './context/AssetContext';
import { SignalProvider } from './context/SignalContext';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AssetProvider>
          <SignalProvider>
            <App />
          </SignalProvider>
        </AssetProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
); 