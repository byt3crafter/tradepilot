import React from 'react';

interface AuthMarkProps {
  className?: string;
  size?: number; // height in px
}

const AuthMark: React.FC<AuthMarkProps> = ({ className = '', size = 20 }) => {
  return (
    <img
      src="/JTP_logo.png"
      alt="JTradePilot"
      className={`w-auto ${className}`}
      style={{ height: `${size}px` }}
    />
  );
};

export default AuthMark;