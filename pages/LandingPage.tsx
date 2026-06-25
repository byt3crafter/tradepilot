import React, { useState } from 'react';
import { AuthPage } from '../types';
import Button from '../components/ui/Button';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

interface LandingPageProps {
  navigate: (page: AuthPage) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Capture Referral Code
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('referralCode', ref);
    }
  }, []);

  const slides = [
    {
      image: '/jtp1.png',
      alt: 'JTradePilot Dashboard',
      title: 'Track Your Challenge',
      description: 'Monitor profit targets and drawdown limits in real-time'
    },
    {
      image: '/jtp2.png',
      alt: 'JTradePilot Trade Journal',
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
    <div className="w-full h-full overflow-y-scroll bg-jtp-bg relative">
      <div className="relative z-10">
        <PublicNavbar />

        {/* Hero Section */}
        <div className="py-20 md:py-32 px-4">
          <div className="text-center max-w-4xl mx-auto animate-fade-in-up">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold font-sans text-jtp-text mb-6 tracking-tight">
              Trading Journal Simplified.
            </h1>
            <p className="text-xl sm:text-2xl text-jtp-blue font-semibold mb-8">
              No noise. Just clean data, simple journaling, and clear insights.
            </p>
            <p className="text-base sm:text-lg font-medium text-jtp-textMuted mb-10">
              $5.99/month • Cancel anytime
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button onClick={() => navigate('signup')} className="w-full sm:w-auto px-10 py-4 text-lg">
                Get Started
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
            <h2 className="text-3xl md:text-4xl font-sans font-bold text-jtp-text mb-4">
              Built for Prop Firms & New Traders
            </h2>
          </div>

          {/* Carousel */}
          <div className="relative">
            {/* Main Image Container */}
            <div className="bg-jtp-panel rounded-jtp-panel p-4 border border-jtp-border overflow-hidden">
              <img
                src={slides[currentSlide].image}
                alt={slides[currentSlide].alt}
                className="w-full h-auto rounded-jtp-2xl transition-opacity duration-300"
              />
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-jtp-panel/80 hover:bg-jtp-panel border border-jtp-border hover:border-jtp-borderStrong rounded-full p-3 transition-all"
              aria-label="Previous slide"
            >
              <svg className="w-6 h-6 text-jtp-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-jtp-panel/80 hover:bg-jtp-panel border border-jtp-border hover:border-jtp-borderStrong rounded-full p-3 transition-all"
              aria-label="Next slide"
            >
              <svg className="w-6 h-6 text-jtp-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Slide Info */}
            <div className="mt-6 text-center">
              <h3 className="text-xl font-semibold text-jtp-text mb-2">
                {slides[currentSlide].title}
              </h3>
              <p className="text-jtp-textMuted">
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
                    ? 'bg-jtp-blue w-8'
                    : 'bg-jtp-textMuted/30 hover:bg-jtp-textMuted/50'
                    }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center pt-12 md:pt-16">
            <h3 className="text-2xl md:text-3xl font-bold text-jtp-text mb-6">
              Ready to Get Funded?
            </h3>
            <div className="flex justify-center">
              <Button onClick={() => navigate('signup')} className="px-10 py-4 text-lg">
                Get Started
              </Button>
            </div>
            <p className="mt-4 text-sm text-jtp-textMuted">
              $5.99/month • Cancel anytime
            </p>
          </div>
        </div>

        <PublicFooter />
      </div>
    </div>
  );
};

export default LandingPage;
