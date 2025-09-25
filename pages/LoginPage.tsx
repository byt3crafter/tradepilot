import React, { useState, useEffect } from 'react';
import { AuthPage } from '../App';
import AuthCard from '../components/auth/AuthCard';
import AuthInput from '../components/auth/AuthInput';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

const UNVERIFIED_EMAIL_MESSAGE = 'Please verify your email address before logging in.';

interface LoginPageProps {
  navigate: (page: AuthPage) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ navigate }) => {
  const { login, resendVerification } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);


  useEffect(() => {
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
      setError('Failed to resend verification email.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowResend(false);
    setResendSuccess(false);
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to log in. Please check your credentials.';
      setError(errorMessage);
      if (errorMessage === UNVERIFIED_EMAIL_MESSAGE) {
        setShowResend(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard title="Welcome Back">
      <form onSubmit={handleSubmit}>
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
          placeholder="••••••••" 
          required 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />
        <div className="text-right -mt-2 mb-4">
          <Button variant="link" type="button" onClick={() => navigate('forgot-password')} className="text-sm" disabled={isLoading}>
            Forgot Password?
          </Button>
        </div>
        
        {error && <p className="text-risk-high text-sm text-center mb-4">{error}</p>}

        {showResend && (
           <div className="text-center mb-4">
             <Button variant="link" onClick={handleResend} disabled={resendCooldown > 0}>
                Resend verification email {resendCooldown > 0 && `(${resendCooldown}s)`}
             </Button>
             {resendSuccess && <p className="text-momentum-green text-sm mt-2">A new verification link has been sent.</p>}
           </div>
        )}

        <div className="mt-6">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Spinner /> : 'Log In'}
          </Button>
        </div>
      </form>
      <div className="mt-6 text-center">
        <p className="text-future-gray">
          Don't have an account?{' '}
          <Button variant="link" onClick={() => navigate('signup')} disabled={isLoading}>
            Sign Up
          </Button>
        </p>
      </div>
    </AuthCard>
  );
};

export default LoginPage;