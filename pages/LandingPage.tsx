

import React from 'react';
import { AuthPage } from '../App';
import Button from '../components/ui/Button';
import AuthLogo from '../components/auth/AuthLogo';

interface LandingPageProps {
  navigate: (page: AuthPage) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  return (
    <div className="text-center max-w-2xl mx-auto animate-fade-in-up">
      <AuthLogo />
      <p className="mt-4 text-lg text-future-gray">
        Your ultimate trading companion. Record, analyze, and refine your trades with intelligent insights and a powerful journal system.
      </p>
      <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
        <Button onClick={() => navigate('login')} className="w-full sm:w-40">
          Log In
        </Button>
        <Button onClick={() => navigate('signup')} className="w-full sm:w-40">
          Sign Up
        </Button>
      </div>
    </div>
  );
};

export default LandingPage;
