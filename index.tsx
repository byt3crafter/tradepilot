import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { AccountProvider } from './context/AccountContext';
import { StrategyProvider } from './context/StrategyContext';
import { ChecklistProvider } from './context/ChecklistContext';
import { TradeProvider } from './context/TradeContext';
import { SettingsProvider } from './context/SettingsContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <AccountProvider>
        <StrategyProvider>
          <ChecklistProvider>
            <SettingsProvider>
              <TradeProvider>
                <App />
              </TradeProvider>
            </SettingsProvider>
          </ChecklistProvider>
        </StrategyProvider>
      </AccountProvider>
    </AuthProvider>
  </React.StrictMode>
);