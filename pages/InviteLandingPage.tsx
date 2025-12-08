import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import AuthLogo from '../components/auth/AuthLogo';
import { usePublicRouter } from '../context/PublicRouterContext';

const InviteLandingPage: React.FC = () => {
    const { currentPath, navigate } = usePublicRouter();
    const { user, accessToken } = useAuth();
    const [isValid, setIsValid] = useState<boolean | null>(null);
    const [inviteDetails, setInviteDetails] = useState<{ type: string; duration?: number } | null>(null);
    const [error, setError] = useState('');
    const [isClaiming, setIsClaiming] = useState(false);

    // Extract code from path /join/:code
    const code = currentPath.split('/join/')[1];

    useEffect(() => {
        const validate = async () => {
            if (!code) return;
            try {
                const res = await api.validateInvite(code);
                setIsValid(true);
                setInviteDetails(res);
            } catch (err: any) {
                setIsValid(false);
                setError(err.message || 'Invalid invite code');
            }
        };
        validate();
    }, [code]);

    const handleClaim = async () => {
        if (!user || !accessToken || !code) {
            // Redirect to login/signup
            window.location.href = `/sign-in?redirect_url=${encodeURIComponent(window.location.pathname)}`;
            return;
        }

        setIsClaiming(true);
        try {
            await api.claimInvite(code, accessToken);
            alert('Invite claimed successfully!');
            navigate('/dashboard');
        } catch (err: any) {
            alert(`Failed to claim: ${err.message}`);
        } finally {
            setIsClaiming(false);
        }
    };

    if (isValid === null) return <div className="min-h-screen bg-[#08090A] flex items-center justify-center"><Spinner /></div>;

    return (
        <div className="min-h-screen bg-[#08090A] flex flex-col items-center justify-center p-4">
            <div className="mb-8">
                <AuthLogo />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md w-full text-center backdrop-blur-sm">
                {isValid ? (
                    <>
                        <div className="w-16 h-16 bg-momentum-green/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-3xl">🎁</span>
                        </div>
                        <h1 className="text-2xl font-orbitron text-white mb-2">You've been invited!</h1>
                        <p className="text-future-gray mb-6">
                            You have been gifted
                            <span className="text-white font-bold mx-1">
                                {inviteDetails?.type === 'LIFETIME' ? 'Lifetime Access' : `${inviteDetails?.duration} Days Trial`}
                            </span>
                            to JTradePilot Pro.
                        </p>

                        {user ? (
                            <button
                                onClick={handleClaim}
                                disabled={isClaiming}
                                className="w-full bg-momentum-green text-black font-bold py-3 rounded-lg hover:bg-momentum-green/90 disabled:opacity-50 transition-all"
                            >
                                {isClaiming ? 'Claiming...' : 'Claim Offer'}
                            </button>
                        ) : (
                            <button
                                onClick={handleClaim}
                                className="w-full bg-photonic-blue text-black font-bold py-3 rounded-lg hover:bg-photonic-blue/90 transition-all"
                            >
                                Sign in to Claim
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 bg-risk-high/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-3xl">⚠️</span>
                        </div>
                        <h1 className="text-2xl font-orbitron text-white mb-2">Invalid Invite</h1>
                        <p className="text-future-gray mb-6">{error}</p>
                        <button
                            onClick={() => navigate('/')}
                            className="text-white hover:text-photonic-blue underline"
                        >
                            Go Home
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default InviteLandingPage;
