import React, { useState } from 'react';
import { MenuIcon } from './icons/MenuIcon';
import { XIcon } from './icons/XIcon';
import PublicLink from './PublicLink';

const PublicNavbar: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <nav className="border-b border-jtp-border bg-jtp-bg sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                {/* Logo */}
                <PublicLink href="/" className="text-jtp-text font-semibold hover:opacity-80 transition-opacity flex items-center gap-2">
                    <img src="/JTP_logo.png" alt="JTP Logo" className="h-6 w-auto" />
                    <span className="font-sans font-bold tracking-wide">JTradePilot</span>
                    <span className="px-2 py-0.5 bg-jtp-blue/20 border border-jtp-blue/50 rounded-jtp-xs text-[10px] font-bold text-jtp-blue uppercase tracking-wider">
                        BETA
                    </span>
                </PublicLink>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-6">
                    <PublicLink href="/features" className="text-jtp-textMuted hover:text-jtp-text transition-colors text-sm font-medium">
                        Features
                    </PublicLink>
                    <PublicLink href="/pricing" className="text-jtp-textMuted hover:text-jtp-text transition-colors text-sm font-medium">
                        Pricing
                    </PublicLink>
                    <PublicLink href="/about-us" className="text-jtp-textMuted hover:text-jtp-text transition-colors text-sm font-medium">
                        About
                    </PublicLink>
                    <PublicLink href="/login" className="text-jtp-textMuted hover:text-jtp-text transition-colors text-sm font-medium">
                        Log In
                    </PublicLink>
                    <PublicLink href="/signup" className="px-4 py-2 bg-jtp-blue text-white rounded-jtp-md hover:bg-jtp-blueHover transition-colors text-sm font-bold">
                        Sign Up
                    </PublicLink>
                </div>

                {/* Mobile Menu Button */}
                <div className="md:hidden">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="text-jtp-textMuted hover:text-jtp-text p-2 transition-colors"
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
                <div className="md:hidden bg-jtp-bg fixed inset-0 z-50 flex flex-col">
                    <div className="flex items-center justify-between px-4 h-16 border-b border-jtp-border">
                        <PublicLink href="/" className="text-jtp-text font-semibold flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                            <img src="/JTP_logo.png" alt="JTP Logo" className="h-6 w-auto" />
                            <span className="font-sans font-bold tracking-wide">JTradePilot</span>
                            <span className="px-2 py-0.5 bg-jtp-blue/20 border border-jtp-blue/50 rounded-jtp-xs text-[10px] font-bold text-jtp-blue uppercase tracking-wider">
                                BETA
                            </span>
                        </PublicLink>
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="text-jtp-textMuted hover:text-jtp-text p-2 transition-colors rounded-jtp-md active:bg-white/10"
                        >
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="px-4 py-6 space-y-4">
                        <PublicLink
                            href="/features"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block px-2 py-2 text-jtp-textMuted hover:text-jtp-text transition-colors"
                        >
                            Features
                        </PublicLink>
                        <PublicLink
                            href="/pricing"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block px-2 py-2 text-jtp-textMuted hover:text-jtp-text transition-colors"
                        >
                            Pricing
                        </PublicLink>
                        <PublicLink
                            href="/about-us"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block px-2 py-2 text-jtp-textMuted hover:text-jtp-text transition-colors"
                        >
                            About
                        </PublicLink>
                        <div className="pt-4 border-t border-jtp-border flex flex-col gap-3">
                            <PublicLink
                                href="/login"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="block w-full text-center px-4 py-2 text-jtp-textMuted hover:text-jtp-text border border-jtp-borderStrong rounded-jtp-md transition-colors"
                            >
                                Log In
                            </PublicLink>
                            <PublicLink
                                href="/signup"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="block w-full text-center px-4 py-2 bg-jtp-blue text-white font-bold rounded-jtp-md hover:bg-jtp-blueHover transition-colors"
                            >
                                Sign Up
                            </PublicLink>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default PublicNavbar;
