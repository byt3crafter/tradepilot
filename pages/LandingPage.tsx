
import React, { useState } from 'react';
import { AuthPage } from '../types';
import Button from '../components/ui/Button';
import AuthLogo from '../components/auth/AuthLogo';
import { XIcon } from '../components/icons/XIcon';
import { DiscordIcon } from '../components/icons/DiscordIcon';
import { MenuIcon } from '../components/icons/MenuIcon';
import { DashboardIcon } from '../components/icons/DashboardIcon';
import { JournalIcon } from '../components/icons/JournalIcon';
import { PlaybookIcon } from '../components/icons/PlaybookIcon';
import { AnalyticsIcon } from '../components/icons/AnalyticsIcon';

interface LandingPageProps {
  navigate: (page: AuthPage) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const slides = [
    {
      image: '/jtp1.png',
      alt: 'JTradeJournal Dashboard',
      title: 'Track Your Challenge',
      description: 'Monitor profit targets and drawdown limits in real-time'
    },
    {
      image: '/jtp2.png',
      alt: 'JTradeJournal Trade Journal',
      title: 'AI Trade Analysis',
      description: 'Get instant feedback on every trade you take'
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
      <nav className="border-b border-white/5 bg-future-dark/50 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/JTP_logo.png" alt="JTP" className="h-6 w-auto" />
            <span className="px-2 py-1 bg-photonic-blue/20 border border-photonic-blue/50 rounded text-xs font-bold text-photonic-blue uppercase tracking-wider">
              BETA
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <a href="https://x.com/JTradePilot" target="_blank" rel="noopener noreferrer" className="text-future-gray hover:text-white transition-colors">
              <XIcon className="w-5 h-5" />
            </a>
            <a href="https://discord.gg/JTradePilot" target="_blank" rel="noopener noreferrer" className="text-future-gray hover:text-white transition-colors">
              <DiscordIcon className="w-5 h-5" />
            </a>
            <button onClick={() => navigate('login')} className="text-future-gray hover:text-future-light transition-colors">
              Log In
            </button>
            <Button onClick={() => navigate('signup')} className="px-4 py-2 text-sm">
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-future-gray hover:text-white p-2 transition-colors"
            >
              {isMobileMenuOpen ? (
                <XIcon className="w-6 h-6" />
              ) : (
                <MenuIcon className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-[#08090A] border-b border-white/10 absolute w-full left-0 top-16 z-50 shadow-2xl animate-fade-in">
            <div className="px-4 py-6 space-y-4">
              {/* Sidebar Items Mimic */}
              <div className="space-y-1 pb-4 border-b border-white/5">
                <p className="px-2 text-xs font-semibold text-future-gray uppercase tracking-wider mb-2">Features</p>
                <button onClick={() => navigate('login')} className="w-full flex items-center gap-3 px-2 py-3 text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left">
                  <DashboardIcon className="w-5 h-5" />
                  <span className="font-medium">Dashboard</span>
                </button>
                <button onClick={() => navigate('login')} className="w-full flex items-center gap-3 px-2 py-3 text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left">
                  <JournalIcon className="w-5 h-5" />
                  <span className="font-medium">Journal</span>
                </button>
                <button onClick={() => navigate('login')} className="w-full flex items-center gap-3 px-2 py-3 text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left">
                  <PlaybookIcon className="w-5 h-5" />
                  <span className="font-medium">Playbooks</span>
                </button>
                <button onClick={() => navigate('login')} className="w-full flex items-center gap-3 px-2 py-3 text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left">
                  <AnalyticsIcon className="w-5 h-5" />
                  <span className="font-medium">Analytics</span>
                </button>
              </div>

              {/* Site Links */}
              <div className="space-y-1 pb-4 border-b border-white/5">
                <a href="/pricing" className="block px-2 py-2 text-secondary hover:text-white transition-colors">Pricing</a>
                <a href="/about-us" className="block px-2 py-2 text-secondary hover:text-white transition-colors">Our Story</a>
                <a href="/faq" className="block px-2 py-2 text-secondary hover:text-white transition-colors">FAQ</a>
              </div>

              {/* Socials */}
              <div className="flex items-center gap-4 px-2 py-2">
                <a href="https://x.com/JTradePilot" target="_blank" rel="noopener noreferrer" className="text-future-gray hover:text-white transition-colors">
                  <XIcon className="w-5 h-5" />
                </a>
                <a href="https://discord.gg/JTradePilot" target="_blank" rel="noopener noreferrer" className="text-future-gray hover:text-white transition-colors">
                  <DiscordIcon className="w-5 h-5" />
                </a>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-2">
                <Button onClick={() => navigate('login')} variant="secondary" className="w-full justify-center">
                  Log In
                </Button>
                <Button onClick={() => navigate('signup')} className="w-full justify-center">
                  Start Free Trial
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <div className="py-20 md:py-32 px-4">
        <div className="text-center max-w-4xl mx-auto animate-fade-in-up">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold font-orbitron text-white mb-6 tracking-tight">
            Pass Your Prop Firm Challenge
          </h1>
          <p className="text-xl sm:text-2xl text-photonic-blue font-semibold mb-8">
            Track Your Progress. Stay Disciplined. Get Funded.
          </p>
          <p className="text-base sm:text-lg font-medium text-primary/80 mb-10">
            15-day free trial • $5/month
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={() => navigate('signup')} className="w-full sm:w-auto px-10 py-4 text-lg">
              Start Free Trial
            </Button>
            <Button onClick={() => navigate('login')} variant="secondary" className="w-full sm:w-auto px-10 py-4 text-lg">
              Log In
            </Button>
          </div>
        </div>
      </div>

      {/* Product Screenshots Carousel */}
      <div className="py-12 md:py-20 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-orbitron font-bold text-white mb-4">
            Built for Prop Traders
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
        <div className="text-center pt-12 md:pt-16">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-6">
            Ready to Get Funded?
          </h3>
          <Button onClick={() => navigate('signup')} className="px-10 py-4 text-lg">
            Start Free Trial
          </Button>
          <p className="mt-4 text-sm text-future-gray">
            15-day free trial • $5/month
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-future-dark/50 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="text-future-gray text-sm text-center sm:text-left">
              © 2024 JTradeJournal. Your prop firm challenge tracker and trading journal.
            </div>
            <div className="flex flex-wrap justify-center sm:justify-end gap-x-6 gap-y-2 text-sm">
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
