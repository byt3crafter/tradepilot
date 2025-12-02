
import React, { useState } from 'react';
import md5 from 'md5';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Spinner from '../components/Spinner';

const PersonalisationPage: React.FC = () => {
  const { user } = useAuth();
  
  // States for name change
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [nameIsLoading, setNameIsLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    );
  }

  const gravatarHash = md5(user.email.trim().toLowerCase());
  const gravatarUrl = `https://www.gravatar.com/avatar/${gravatarHash}?d=identicon&s=200`;

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameIsLoading(true);
    setNameError('');
    setNameSuccess('');
    // TODO: This endpoint doesn't exist yet, but this is how you'd call it.
    setTimeout(() => {
        setNameSuccess(`Name updated to ${fullName} (simulated).`);
        setNameIsLoading(false);
    }, 1000);
  };
  
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-3xl font-orbitron text-future-light">Personalisation</h1>
        <p className="text-future-gray">Manage your personal details and preferences.</p>
      </div>

      <Card>
        <h2 className="text-xl font-orbitron text-photonic-blue mb-6">Profile Details</h2>
        <div className="flex flex-col sm:flex-row items-start gap-8">
          <div className="flex flex-col items-center gap-2">
             <img src={gravatarUrl} alt="User Avatar" className="w-24 h-24 rounded-full border-4 border-white/10" />
             <span className="text-xs text-secondary">Powered by Gravatar</span>
          </div>
          
          <form onSubmit={handleNameSubmit} className="flex-1 w-full max-w-md">
            <Input 
                label="Full Name" 
                id="fullName" 
                type="text" 
                value={fullName} 
                onChange={e => setFullName(e.target.value)}
                disabled={nameIsLoading}
            />
            <Input label="Email Address" id="email" type="email" value={user.email} disabled />
            
            {nameError && <p className="text-sm text-risk-high mt-2">{nameError}</p>}
            {nameSuccess && <p className="text-sm text-momentum-green mt-2">{nameSuccess}</p>}
            
            <div className="mt-6">
                <Button type="submit" isLoading={nameIsLoading}>
                    Save Changes
                </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default PersonalisationPage;
