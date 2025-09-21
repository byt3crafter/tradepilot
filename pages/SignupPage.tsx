

import React, { useState, useEffect } from 'react';
import { AuthPage } from '../App';
import AuthCard from '../components/auth/AuthCard';
import AuthInput from '../components/auth/AuthInput';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

interface SignupPageProps {
  navigate: (page: AuthPage) => void;
}

const SignupPage: React.FC<SignupPageProps> = ({ navigate }) => {
  const { register, resendVerification } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    // FIX: Changed NodeJS.Timeout to ReturnType<typeof setTimeout> for browser compatibility.
    let timer: ReturnType<typeof setTimeout>;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);


  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendSuccess(false);
    try {
      await resendVerification(email);
      setResendSuccess(true);
      setResendCooldown(60);
    } catch (err) {
      // Handle error display if needed
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await register(email, password, fullName);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthCard title="Check Your Email">
        <div className="text-center text-future-gray">
          <p>
            Registration successful! We've sent a verification link to{' '}
            <span className="font-semibold text-future-light">{email}</span>.
          </p>
          <p className="mt-4">Please check your inbox to activate your account.</p>
          
          <div className="mt-6 border-t border-photonic-blue/20 pt-6">
            <p className="text-sm">Didn't receive the email?</p>
            <Button variant="link" onClick={handleResend} disabled={resendCooldown > 0}>
                Resend email {resendCooldown > 0 && `(${resendCooldown}s)`}
            </Button>
            {resendSuccess && <p className="text-momentum-green text-sm mt-2">A new link has been sent.</p>}
          </div>

          <div className="mt-8">
            <Button variant="link" onClick={() => navigate('login')}>
              Back to Log In
            </Button>
          </div>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create Account">
      <form onSubmit={handleSubmit}>
        <AuthInput 
          label="Full Name" 
          id="fullName" 
          type="text" 
          placeholder="John Doe" 
          required 
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={isLoading}
        />
        <AuthInput 
          label="Email" 
          id="email" 
          type="email" 
          placeholder="you@example.com" 
          required 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />
        <AuthInput 
          label="Password" 
          id="password" 
          type="password" 
          placeholder="Minimum 8 characters" 
          required 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />

        {error && <p className="text-risk-high text-sm text-center mb-4">{error}</p>}

        <div className="mt-6">
          <Button type="submit" disabled={isLoading}>
             {isLoading ? <Spinner /> : 'Sign Up'}
          </Button>
        </div>
      </form>
       <div className="mt-6 text-center">
        <p className="text-future-gray">
          Already have an account?{' '}
          <Button variant="link" onClick={() => navigate('login')} disabled={isLoading}>
            Log In
          </Button>
        </p>
      </div>
    </AuthCard>
  );
};

export default SignupPage;