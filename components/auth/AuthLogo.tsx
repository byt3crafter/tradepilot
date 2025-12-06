import React from 'react';

const AuthLogo: React.FC = () => {
  return (
    <div className="flex items-center justify-center gap-2">
      <img src="/JTP_logo.png" alt="JTP Logo" className="h-5 md:h-6 w-auto" />
      <h1 className="font-sans text-sm md:text-base font-bold tracking-tight text-white">
        JTradePilot
      </h1>
    </div>
  );
};

export default AuthLogo;