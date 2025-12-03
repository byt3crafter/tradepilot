
import React from 'react';
import { AuthPage } from '../App';
import Button from '../components/ui/Button';
import AuthLogo from '../components/auth/AuthLogo';

interface LandingPageProps {
  navigate: (page: AuthPage) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  return (
    <div className="min-h-screen w-full flex flex-col">
      {/* Navigation Header */}
      <nav className="border-b border-white/5 bg-future-dark/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex-1" />
          <div className="flex items-center gap-6 text-sm">
            <a href="/faq" className="text-future-gray hover:text-future-light transition-colors">
              FAQ
            </a>
            <button onClick={() => navigate('login')} className="text-future-gray hover:text-future-light transition-colors">
              Log In
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
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

      {/* Footer */}
      <footer className="border-t border-white/5 bg-future-dark/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="text-future-gray text-sm">
              © 2024 JTradePilot. Building trading discipline, one trade at a time.
            </div>
            <div className="flex gap-6 text-sm">
              <a href="/about-us" className="text-future-gray hover:text-future-light transition-colors">
                Our Story
              </a>
              <a href="/privacy" className="text-future-gray hover:text-future-light transition-colors">
                Privacy
              </a>
              <a href="/terms" className="text-future-gray hover:text-future-light transition-colors">
                Terms
              </a>
              <a href="/risk-disclaimer" className="text-future-gray hover:text-future-light transition-colors">
                Disclaimer
              </a>
              <a href="/faq" className="text-future-gray hover:text-future-light transition-colors">
                FAQ
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
