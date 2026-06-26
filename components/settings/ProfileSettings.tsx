import React, { useState } from 'react';
import md5 from 'md5';
import { useAuth } from '../../context/AuthContext';
import Card from '../Card';
import Button from '../ui/Button';

const ProfileSettings: React.FC = () => {
  const { user, updateUserPreferences } = useAuth();
  const [useGravatar, setUseGravatar] = useState(user?.preferences?.useGravatar || false);
  const [isLoading, setIsLoading] = useState(false);

  const handleGravatarToggle = async () => {
    setIsLoading(true);
    try {
      const newValue = !useGravatar;
      setUseGravatar(newValue);
      await updateUserPreferences({ useGravatar: newValue });
    } catch (err) {
      console.error('Failed to update Gravatar preference', err);
      setUseGravatar(!useGravatar);
    } finally {
      setIsLoading(false);
    }
  };

  const gravatarUrl = user?.email
    ? `https://www.gravatar.com/avatar/${md5(user.email.trim().toLowerCase())}?d=identicon&s=80`
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-jtp-xl font-semibold text-jtp-text mb-5">Profile</h2>

        <div className="space-y-5">
          {/* User Info */}
          <div className="pb-5 border-b border-jtp-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-jtp-xs uppercase tracking-wider text-jtp-textDim mb-1">Full Name</p>
                <p className="text-jtp-md text-jtp-text font-medium">{user?.fullName}</p>
              </div>
              <div>
                <p className="text-jtp-xs uppercase tracking-wider text-jtp-textDim mb-1">Email</p>
                <p className="text-jtp-md text-jtp-text font-medium">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Gravatar */}
          <div className="pb-5 border-b border-jtp-border">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-jtp-md font-semibold text-jtp-text mb-1">Gravatar Avatar</h3>
                <p className="text-jtp-sm text-jtp-textDim mb-3">
                  Use your Gravatar profile picture linked to your email address instead of the default avatar.
                </p>
                {gravatarUrl && useGravatar && (
                  <div className="flex items-center gap-3">
                    <img
                      src={gravatarUrl}
                      alt="Gravatar preview"
                      className="w-10 h-10 rounded-full border border-jtp-borderStrong"
                    />
                    <span className="text-jtp-sm text-jtp-textDim">Preview</span>
                  </div>
                )}
              </div>
              <Button
                onClick={handleGravatarToggle}
                isLoading={isLoading}
                variant={useGravatar ? 'primary' : 'secondary'}
                className="whitespace-nowrap flex-shrink-0"
              >
                {useGravatar ? 'Using Gravatar' : 'Enable Gravatar'}
              </Button>
            </div>
          </div>

          {/* Gravatar Info */}
          <div className="text-jtp-sm text-jtp-textDim space-y-1.5">
            <p>
              <span className="text-jtp-textSoft font-medium">Don't have a Gravatar?</span>{' '}
              Visit{' '}
              <a
                href="https://gravatar.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-jtp-blue hover:text-jtp-blueHover underline"
              >
                gravatar.com
              </a>
              {' '}to create one with your email address.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProfileSettings;
