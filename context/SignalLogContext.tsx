import React, { createContext, useContext } from 'react';

const SignalLogContext = createContext<any>(undefined);

export const SignalLogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // This feature is deprecated.
  return <>{children}</>;
};

export const useSignalLog = () => {
  // This feature is deprecated.
  return {};
};
