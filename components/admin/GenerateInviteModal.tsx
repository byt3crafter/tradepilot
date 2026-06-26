import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface GenerateInviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const inputClass = "w-full bg-jtp-control border border-jtp-borderStrong rounded-jtp-md px-3 py-2 text-jtp-text text-jtp-md placeholder-jtp-textDisabled focus:outline-none focus:ring-1 focus:ring-jtp-blue focus:border-jtp-blue transition-colors font-sans";
const selectClass = `${inputClass} [&>option]:bg-jtp-panel [&>option]:text-jtp-text`;
const labelClass = "block text-jtp-xs text-jtp-textDim uppercase tracking-wider mb-1.5";

const GenerateInviteModal: React.FC<GenerateInviteModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { accessToken } = useAuth();
    const [type, setType] = useState<'TRIAL' | 'LIFETIME'>('TRIAL');
    const [duration, setDuration] = useState(30);
    const [isLoading, setIsLoading] = useState(false);
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken) return;
        setIsLoading(true);
        try {
            const res = await api.generateInvite(type, type === 'TRIAL' ? duration : undefined, accessToken);
            setGeneratedCode(res.code);
            onSuccess();
        } catch (err: any) {
            alert(`Failed: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const copyLink = () => {
        if (generatedCode) {
            const link = `${window.location.origin}/join/${generatedCode}`;
            navigator.clipboard.writeText(link);
            alert('Link copied to clipboard!');
        }
    };

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-modal-title"
            onClick={onClose}
        >
            <div
                className="bg-jtp-panel border border-jtp-borderStrong rounded-jtp-panel shadow-jtp-drawer w-full max-w-md animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-jtp-border">
                    <h2 id="invite-modal-title" className="text-jtp-lg font-semibold text-jtp-text tracking-tight">
                        Generate Invite Link
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-jtp-textDim hover:text-jtp-text transition-colors rounded-jtp-sm p-1"
                        aria-label="Close modal"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-5">
                    {generatedCode ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-jtp-profit/10 border border-jtp-profit/20 rounded-jtp-panel text-center">
                                <p className="text-jtp-xs text-jtp-profit font-semibold uppercase tracking-wider mb-2">
                                    Invite Code Generated
                                </p>
                                <p className="font-mono text-jtp-3xl text-jtp-text tracking-widest">{generatedCode}</p>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    readOnly
                                    value={`${window.location.origin}/join/${generatedCode}`}
                                    className={`${inputClass} flex-1 text-jtp-xs font-mono`}
                                />
                                <button
                                    onClick={copyLink}
                                    className="flex-shrink-0 bg-jtp-blue hover:bg-jtp-blueHover text-white font-semibold px-4 py-2 rounded-jtp-md text-jtp-sm transition-colors"
                                >
                                    Copy
                                </button>
                            </div>
                            <button
                                onClick={() => { setGeneratedCode(null); onClose(); }}
                                className="w-full text-jtp-textDim hover:text-jtp-text text-jtp-sm transition-colors py-2"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className={labelClass}>Type</label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as any)}
                                    className={selectClass}
                                >
                                    <option value="TRIAL">Trial Access</option>
                                    <option value="LIFETIME">Lifetime Access</option>
                                </select>
                            </div>

                            {type === 'TRIAL' && (
                                <div>
                                    <label className={labelClass}>Duration (Days)</label>
                                    <input
                                        type="number"
                                        value={duration}
                                        onChange={(e) => setDuration(parseInt(e.target.value))}
                                        className={`${inputClass} font-mono`}
                                        min="1"
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-jtp-blue hover:bg-jtp-blueHover disabled:opacity-50 text-white font-semibold py-2.5 rounded-jtp-md text-jtp-md transition-colors mt-2"
                            >
                                {isLoading ? 'Generating…' : 'Generate Link'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default GenerateInviteModal;
