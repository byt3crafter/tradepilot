import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Card from '../Card';
import Button from '../ui/Button';

const ProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const [useGravatar, setUseGravatar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleGravatarToggle = async () => {
    setIsLoading(true);
    try {
      // In future, this would save to database
      // For now, just toggle the local state
      setUseGravatar(!useGravatar);
      console.log('Gravatar preference:', !useGravatar);
    } catch (err) {
      console.error('Failed to update Gravatar preference');
    } finally {
      setIsLoading(false);
    }
  };

  const gravatarUrl = user?.email
    ? `https://www.gravatar.com/avatar/${user.email}?d=identicon&s=80`
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-orbitron text-photonic-blue mb-6">Profile</h2>

        <div className="space-y-6">
          {/* User Info */}
          <div className="pb-6 border-b border-white/10">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-future-gray mb-2">Full Name</p>
                <p className="text-future-light font-medium">{user?.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-future-gray mb-2">Email</p>
                <p className="text-future-light font-medium">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Gravatar Option */}
          <div className="pb-6 border-b border-white/10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-future-light mb-2">Gravatar Avatar</h3>
                <p className="text-xs text-future-gray mb-4">
                  Use your Gravatar profile picture instead of the default avatar. Your Gravatar is linked to your email address.
                </p>
                {gravatarUrl && useGravatar && (
                  <div className="mb-3">
                    <p className="text-xs text-future-gray mb-2">Preview:</p>
                    <img
                      src={gravatarUrl}
                      alt="Gravatar preview"
                      className="w-12 h-12 rounded-full border border-white/10"
                    />
                  </div>
                )}
              </div>
              <Button
                onClick={handleGravatarToggle}
                isLoading={isLoading}
                variant={useGravatar ? 'primary' : 'secondary'}
                className="whitespace-nowrap"
              >
                {useGravatar ? 'Using Gravatar' : 'Enable Gravatar'}
              </Button>
            </div>
          </div>

          {/* Gravatar Info */}
          <div className="text-xs text-future-gray space-y-2">
            <p>
              <strong>Don't have a Gravatar?</strong> Visit{' '}
              <a
                href="https://gravatar.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-photonic-blue hover:text-photonic-blue/80 underline"
              >
                gravatar.com
              </a>
              {' '}to create one using your email address.
            </p>
            <p>
              Gravatar is a free service that hosts your profile picture and makes it available across the web.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProfileSettings;
