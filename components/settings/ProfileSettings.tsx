import React, { useState } from 'react';
import md5 from 'md5';
import { useAuth } from '../../context/AuthContext';
import { Panel, ToggleSwitch } from '../ui';

const ProfileSettings: React.FC = () => {
  const { user, updateUserPreferences } = useAuth();
  const [useGravatar, setUseGravatar] = useState(user?.preferences?.useGravatar || false);
  const [isLoading, setIsLoading] = useState(false);

  const handleGravatarToggle = async (next: boolean) => {
    setIsLoading(true);
    try {
      setUseGravatar(next);
      await updateUserPreferences({ useGravatar: next });
    } catch (err) {
      console.error('Failed to update Gravatar preference', err);
      setUseGravatar(!next);
    } finally {
      setIsLoading(false);
    }
  };

  const gravatarUrl = user?.email
    ? `https://www.gravatar.com/avatar/${md5(user.email.trim().toLowerCase())}?d=identicon&s=80`
    : null;

  return (
    <div className="space-y-4">
      <Panel label="PROFILE">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="jtp-label mb-1">FULL NAME</p>
            <p className="text-jtp-lg font-medium text-jtp-text">{user?.fullName || '—'}</p>
          </div>
          <div>
            <p className="jtp-label mb-1">EMAIL</p>
            <p className="text-jtp-lg font-medium text-jtp-text">{user?.email || '—'}</p>
          </div>
        </div>
      </Panel>

      <Panel label="AVATAR">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-jtp-md font-medium text-jtp-text mb-1">Gravatar Avatar</p>
            <p className="text-jtp-md text-jtp-textMuted mb-3">
              Use your Gravatar profile picture linked to your email address instead of the default avatar.
            </p>
            {gravatarUrl && useGravatar && (
              <div className="flex items-center gap-3">
                <img
                  src={gravatarUrl}
                  alt="Gravatar preview"
                  className="w-10 h-10 rounded-full border border-jtp-borderStrong"
                />
                <span className="text-jtp-md text-jtp-textMuted">Preview</span>
              </div>
            )}
          </div>
          <div className="flex-shrink-0">
            <ToggleSwitch
              label="Use Gravatar"
              checked={useGravatar}
              onChange={handleGravatarToggle}
              disabled={isLoading}
            />
          </div>
        </div>
        <div className="pt-4 border-t border-jtp-border mt-4">
          <p className="text-jtp-md text-jtp-textMuted">
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
      </Panel>
    </div>
  );
};

export default ProfileSettings;
