import React from 'react';
import { useClerk } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import AuthLogo from '../components/auth/AuthLogo';

const SignupPage: React.FC = () => {
  const clerk = useClerk();
  const signUpDivRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (signUpDivRef.current && clerk) {
      const referralCode = localStorage.getItem('referralCode');

      clerk.mountSignUp(signUpDivRef.current, {
        appearance: {
          baseTheme: dark,
          variables: {
            colorPrimary: '#5b8def',
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
        },
        signInUrl: "/login",
        unsafeMetadata: referralCode ? { referralCode } : undefined,
        forceRedirectUrl: "/dashboard",
      });
    }

    return () => {
      if (signUpDivRef.current && clerk) {
        try {
          clerk.unmountSignUp(signUpDivRef.current);
        } catch (e) {
          // Ignore unmount errors
        }
      }
    };
  }, [clerk]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 bg-jtp-bg">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="mb-8 w-full flex justify-center">
          <AuthLogo />
        </div>
        <div ref={signUpDivRef} className="w-full max-w-md" />
      </div>
    </div>
  );
};

export default SignupPage;
