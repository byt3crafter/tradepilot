import React from 'react';
import { SignUp } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import AuthLogo from '../components/auth/AuthLogo';

const SignupPage: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 bg-void">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="mb-8">
          <AuthLogo />
        </div>
        <SignUp
        appearance={{
          baseTheme: dark,
          variables: {
            colorPrimary: '#FFFFFF',
            colorBackground: '#0A0A0A',
            colorText: '#FFFFFF',
            colorTextSecondary: '#888888',
            colorInputBackground: '#141414',
            colorInputText: '#FFFFFF',
            borderRadius: '0.75rem',
          },
          elements: {
            rootBox: "w-full max-w-md",
            card: "bg-surface border border-white/5 shadow-surface",
            headerTitle: "text-white font-orbitron",
            headerSubtitle: "text-secondary",
            socialButtonsBlockButton: "bg-white/5 border border-white/10 text-white hover:bg-white/10",
            formFieldLabel: "text-secondary",
            formFieldInput: "bg-surface-highlight border border-white/10 text-white focus:border-white/30 transition-colors",
            footerActionText: "text-secondary",
            footerActionLink: "text-white hover:underline",
            formButtonPrimary: "bg-white text-black hover:bg-gray-200 shadow-glow font-bold",
          }
        }}
        signInUrl="/login"
      />
      </div>
    </div>
  );
};

export default SignupPage;