import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import AuthLogo from '../components/auth/AuthLogo';

const LoginPage: React.FC = () => {
  // If we're already signed in, we shouldn't be here. The <SignedOut> wrapper *usually* handles this,
  // but direct navigation to /login might bypass it depending on how the router loads.
  // However, App.tsx renders UnauthenticatedApp only inside SignedOut.
  // If you are seeing this page while logged in, it means Clerk thinks you are SignedOut.

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 bg-jtp-bg">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="mb-8 w-full flex justify-center">
          <AuthLogo />
        </div>
        <SignIn
          appearance={{
            baseTheme: dark,
            variables: {
              colorPrimary: '#e8a23d',
              colorBackground: '#0b0c0e',
              colorText: '#e8eaed',
              colorTextSecondary: '#9aa1ab',
              colorInputBackground: '#0f1216',
              colorInputText: '#e8eaed',
              borderRadius: '4px',
              fontFamily: 'Inter, "IBM Plex Sans", system-ui, sans-serif',
            },
            elements: {
              rootBox: "w-full max-w-md",
              card: "bg-jtp-panel border border-jtp-border shadow-jtp-drawer",
              headerTitle: "text-jtp-text font-sans font-bold !text-center",
              headerSubtitle: "text-jtp-textMuted !text-center",
              socialButtonsBlockButton: "bg-jtp-control border border-jtp-borderStrong text-jtp-text hover:bg-jtp-active",
              formFieldLabel: "text-jtp-textMuted",
              formFieldInput: "bg-jtp-active border border-jtp-borderStrong text-jtp-text focus:border-jtp-blue transition-colors",
              footerActionText: "text-jtp-textMuted",
              footerActionLink: "text-jtp-blue hover:underline",
              formButtonPrimary: "bg-jtp-blue text-white hover:bg-jtp-blueHover font-bold",
            }
          }}
          signUpUrl="/signup"
          forceRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
};

export default LoginPage;
