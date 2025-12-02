import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import AuthLogo from '../components/auth/AuthLogo';

const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative animate-fade-in-up">
      <div className="mb-8">
        <AuthLogo />
      </div>
      <SignIn 
        appearance={{
            elements: {
                rootBox: "w-full",
                card: "bg-surface border border-white/10 shadow-surface backdrop-blur-sm rounded-xl",
                headerTitle: "text-white font-orbitron",
                headerSubtitle: "text-secondary",
                socialButtonsBlockButton: "bg-white/5 border border-white/10 text-white hover:bg-white/10",
                formFieldLabel: "text-secondary",
                formFieldInput: "bg-void border border-white/10 text-white focus:border-primary/50 transition-colors",
                footerActionText: "text-secondary",
                footerActionLink: "text-primary hover:text-white hover:underline",
                formButtonPrimary: "bg-white text-black hover:bg-gray-200 shadow-glow font-bold",
            }
        }}
        signUpUrl="/signup"
      />
    </div>
  );
};

export default LoginPage;