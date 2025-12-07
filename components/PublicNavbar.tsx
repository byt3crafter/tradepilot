import React, { useState } from 'react';
import { MenuIcon } from './icons/MenuIcon';
import { XIcon } from './icons/XIcon';
import Button from './ui/Button';

import PublicLink from './PublicLink';

const PublicNavbar: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <nav className="border-b border-white/5 bg-[#08090A] sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                {/* Logo */}
                <PublicLink href="/" className="text-white font-semibold hover:opacity-80 transition-opacity flex items-center gap-2">
                    <img src="/JTP_logo.png" alt="JTP Logo" className="h-6 w-auto" />
                    <span className="font-orbitron tracking-wider">JTradePilot</span>
                </PublicLink>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-6">
                    <PublicLink href="/pricing" className="text-future-gray hover:text-white transition-colors text-sm font-medium">
                        Pricing
                    </PublicLink>
                    <PublicLink href="/about-us" className="text-future-gray hover:text-white transition-colors text-sm font-medium">
                        About
                    </PublicLink>
                    <PublicLink href="/login" className="text-future-gray hover:text-white transition-colors text-sm font-medium">
                        Log In
                    </PublicLink>
                    <PublicLink href="/signup" className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors text-sm font-bold">
                        Sign Up
                    </PublicLink>
                </div>

                {/* Mobile Menu Button */}
                <div className="md:hidden">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="text-future-gray hover:text-white p-2 transition-colors"
                    >
                        {isMobileMenuOpen ? (
                            <XIcon className="w-6 h-6" />
                        ) : (
                            <MenuIcon className="w-6 h-6" />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-[#08090A] border-b border-white/10 absolute w-full left-0 top-16 z-50 shadow-2xl">
                    <div className="px-4 py-6 space-y-4">
                        <PublicLink
                            href="/pricing"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block px-2 py-2 text-future-gray hover:text-white transition-colors"
                        >
                            Pricing
                        </PublicLink>
                        <PublicLink
                            href="/about-us"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block px-2 py-2 text-future-gray hover:text-white transition-colors"
                        >
                            About
                        </PublicLink>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default PublicNavbar;
