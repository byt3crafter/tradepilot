
import React from 'react';
import Card from '../Card';
import AuthLogo from './AuthLogo';

interface AuthCardProps {
  children: React.ReactNode;
  title: string;
}

const AuthCard: React.FC<AuthCardProps> = ({ children, title }) => {
  return (
    <Card className="w-full max-w-md animate-fade-in-up">
      <div className="text-center mb-8">
        <AuthLogo />
        <h2 className="mt-4 text-2xl font-orbitron text-future-light">{title}</h2>
      </div>
      {children}
    </Card>
  );
};

export default AuthCard;
