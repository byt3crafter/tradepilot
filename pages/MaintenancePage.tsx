import React, { useEffect } from 'react';
import Card from '../components/Card';
import { useAuth } from '../context/AuthContext';
// import { LogoIcon } from '../components/icons/LogoIcon'; // Assuming LogoIcon exists, matching Dashboard

const MaintenancePage: React.FC = () => {
    // Force logout or clear state if needed, but not necessary. User can stay logged in but blocked.
    const { logout, user } = useAuth();

    // Allow admin to bypass? 
    // If admin is logged in, they might want to access dashboard.
    // The App.tsx logic will handle the redirect. If we render this page, it means we are blocked.
    // If Admin, direct link to /admin-panel might be allowed eventually, but for now simple block.

    return (
        <div className="min-h-screen bg-future-dark flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>

            <Card className="max-w-md w-full relative z-10 p-10 border-risk-high/30 glow-risk">
                {/* <div className="flex justify-center mb-6">
                    <LogoIcon className="w-16 h-16 text-future-light" />
                </div> */}
                <h1 className="text-3xl font-orbitron font-bold text-white mb-4">
                    Under Maintenance
                </h1>
                <p className="text-future-gray mb-8">
                    We are currently performing scheduled maintenance to improve TradePilot. <br />
                    Please check back in a few minutes.
                </p>

                <div className="w-16 h-1 bg-risk-high/50 mx-auto rounded-full mb-8"></div>

                {user?.role === 'ADMIN' && (
                    <div className="mt-4 p-4 bg-white/5 rounded border border-white/10">
                        <p className="text-sm text-future-gray mb-2">You are logged in as Admin.</p>
                        <a href="/admin-panel" className="text-momentum-green hover:underline">Go to Admin Panel</a>
                    </div>
                )}

                {/* <button onClick={logout} className="mt-8 text-sm text-future-gray hover:text-white transition-colors">
                    Logout
                </button> */}
            </Card>
        </div>
    );
};

export default MaintenancePage;
