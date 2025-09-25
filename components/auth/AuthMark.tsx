import React from 'react';

interface AuthMarkProps {
  className?: string;
  size?: number; // font size in px
}

const AuthMark: React.FC<AuthMarkProps> = ({ className = '', size = 20 }) => {
  return (
    <span
      className={`font-orbitron font-bold text-photonic-blue drop-shadow-[0_0_6px_rgba(0,191,255,0.65)] ${className}`}
      style={{ fontSize: size }}
      aria-label="TradePilot"
    >
      TP
    </span>
  );
};

export default AuthMark;
