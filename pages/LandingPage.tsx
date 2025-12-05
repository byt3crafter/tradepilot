
import React, { useState } from 'react';
import { AuthPage } from '../types';
import Button from '../components/ui/Button';
import AuthLogo from '../components/auth/AuthLogo';
import { XIcon } from '../components/icons/XIcon';
import { DiscordIcon } from '../components/icons/DiscordIcon';

interface LandingPageProps {
  navigate: (page: AuthPage) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      image: '/jtp1.png',
      alt: 'JTradeJournal Dashboard - Performance tracking',
      title: 'Performance Dashboard',
      description: 'Track your trading performance with real-time analytics and insights'
    },
    {
      image: '/jtp2.png',
      alt: 'JTradeJournal Trade Journal - AI-powered analysis',
      title: 'AI-Powered Trade Journal',
      description: 'Log trades and get instant AI analysis to improve your strategy'
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="w-full h-full overflow-y-scroll">
      {/* Navigation Header */}
      <nav className="border-b border-white/5 bg-future-dark/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 bg-photonic-blue/20 border border-photonic-blue/50 rounded text-xs font-bold text-photonic-blue uppercase tracking-wider">
              BETA
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <a href="https://x.com/JTradePilot" target="_blank" rel="noopener noreferrer" className="text-future-gray hover:text-white transition-colors">
              <XIcon className="w-5 h-5" />
            </a>
            <a href="https://discord.gg/JTradePilot" target="_blank" rel="noopener noreferrer" className="text-future-gray hover:text-white transition-colors">
              <DiscordIcon className="w-5 h-5" />
            </a>
            <button onClick={() => navigate('login')} className="text-future-gray hover:text-future-light transition-colors">
              Log In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="py-20 px-4">
        <div className="text-center max-w-3xl mx-auto animate-fade-in-up">
          <div className="flex justify-center mb-8">
            <AuthLogo />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold font-orbitron text-white mb-4 tracking-tight">
            Master Your Edge.
          </h1>
          <p className="text-xl text-photonic-blue font-semibold tracking-wide mb-6">
            JTradeJournal - Your Professional Trading Companion
          </p>
          <p className="text-lg text-secondary leading-relaxed mb-8">
            The most powerful trading journal for serious traders. Record every trade, analyze performance, and refine your strategy with AI-driven insights.
          </p>
          <p className="font-semibold text-primary/80 mb-8">
            Start your 15-day free trial. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={() => navigate('signup')} className="w-full sm:w-48">
              Sign Up Free
            </Button>
            <Button onClick={() => navigate('login')} variant="secondary" className="w-full sm:w-48">
              Log In
            </Button>
          </div>
        </div>
      </div>

      {/* Product Screenshots Carousel */}
      <div className="py-20 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-orbitron font-bold text-white mb-4">
            See It In Action
          </h2>
        </div>

        {/* Carousel */}
        <div className="relative">
          {/* Main Image Container */}
          <div className="bg-future-panel/30 rounded-xl p-4 border border-photonic-blue/20 overflow-hidden">
            <img
              src={slides[currentSlide].image}
              alt={slides[currentSlide].alt}
              className="w-full h-auto rounded-lg transition-opacity duration-300"
            />
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-future-panel/80 hover:bg-future-panel border border-photonic-blue/30 hover:border-photonic-blue/50 rounded-full p-3 transition-all"
            aria-label="Previous slide"
          >
            <svg className="w-6 h-6 text-photonic-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-future-panel/80 hover:bg-future-panel border border-photonic-blue/30 hover:border-photonic-blue/50 rounded-full p-3 transition-all"
            aria-label="Next slide"
          >
            <svg className="w-6 h-6 text-photonic-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Slide Info */}
          <div className="mt-6 text-center">
            <h3 className="text-xl font-semibold text-white mb-2">
              {slides[currentSlide].title}
            </h3>
            <p className="text-future-gray">
              {slides[currentSlide].description}
            </p>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all ${index === currentSlide
                    ? 'bg-photonic-blue w-8'
                    : 'bg-future-gray/30 hover:bg-future-gray/50'
                  }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-16">
          <Button onClick={() => navigate('signup')} className="px-10 py-4 text-lg">
            Start Your Free Trial →
          </Button>
          <p className="mt-4 text-sm text-future-gray">
            15-day free trial • No credit card required • $5/month after trial
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-future-dark/50 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="text-future-gray text-sm">
              © 2024 JTradeJournal. Master your trading with intelligent insights.
            </div>
            <div className="flex gap-6 text-sm">
              <a href="/pricing" className="text-future-gray hover:text-future-light transition-colors">
                Pricing
              </a>
              <a href="/about-us" className="text-future-gray hover:text-future-light transition-colors">
                Our Story
              </a>
              <a href="/privacy" className="text-future-gray hover:text-future-light transition-colors">
                Privacy
              </a>
              <a href="/terms" className="text-future-gray hover:text-future-light transition-colors">
                Terms
              </a>
              <a href="/refund-policy" className="text-future-gray hover:text-future-light transition-colors">
                Refund Policy
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
