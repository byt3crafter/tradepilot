
import React from 'react';
import { AuthPage } from '../App';
import Button from '../components/ui/Button';
import AuthLogo from '../components/auth/AuthLogo';

interface LandingPageProps {
  navigate: (page: AuthPage) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="text-center max-w-2xl mx-auto animate-fade-in-up">
        <div className="flex justify-center mb-6">
            <AuthLogo />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold font-orbitron text-white mb-6 tracking-tight">
            Master Your Edge.
        </h1>
        <p className="mt-4 text-lg text-secondary leading-relaxed">
          The professional trading journal for serious traders. Record, analyze, and refine your execution with intelligent insights.
        </p>
        <p className="mt-8 font-semibold text-primary/80">
          Start your 15-day free trial. No credit card required.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button onClick={() => navigate('login')} variant="secondary" className="w-full sm:w-40">
            Log In
          </Button>
          <Button onClick={() => navigate('signup')} className="w-full sm:w-40">
            Sign Up Free
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
