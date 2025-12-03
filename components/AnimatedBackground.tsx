import React, { useEffect } from 'react';

export const AnimatedBackground: React.FC = () => {
  useEffect(() => {
    // Initialize UnicornStudio if not already initialized
    if (!window.UnicornStudio) {
      window.UnicornStudio = { isInitialized: false };
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js';
      script.onload = function() {
        if (window.UnicornStudio && !window.UnicornStudio.isInitialized) {
          window.UnicornStudio.init?.();
          window.UnicornStudio.isInitialized = true;
        }
      };
      (document.head || document.body).appendChild(script);
    }
  }, []);

  return (
    <>
      {/* Grid Background */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{
        backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        backgroundAttachment: 'fixed',
      }} />

      {/* UnicornStudio Animated Background */}
      <div
        className="aura-background-component fixed top-0 w-full h-screen -z-10 pointer-events-none"
        data-alpha-mask="80"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, black 0%, black 80%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 0%, black 80%, transparent)',
        }}
      >
        <div
          data-us-project="0WrRbFIPaKoWVkiQWBG0"
          className="absolute w-full h-full left-0 top-0 -z-10"
        />
      </div>

      {/* Vignette Overlay */}
      <div
        className="fixed inset-0 z-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, #08090A 100%)',
          opacity: 0.8,
        }}
      />
    </>
  );
};

// Declare global types for UnicornStudio
declare global {
  interface Window {
    UnicornStudio?: {
      isInitialized?: boolean;
      init?: () => void;
    };
  }
}
