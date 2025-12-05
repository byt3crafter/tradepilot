import React from 'react';

const AuthLogo: React.FC = () => {
  return (
    <div className="flex items-center justify-center gap-2">
      <img src="/JTP_logo.png" alt="JTP Logo" className="h-6 md:h-8 w-auto" />
      <h1 className="font-sans text-base md:text-lg font-bold tracking-tight text-white">
        JTradePilot
      </h1>
    </div>
  );
};

export default AuthLogo;