import React, { useState } from 'react';
import { XIcon } from '../icons/XIcon';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface GenerateInviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#08090A] border border-white/10 rounded-xl w-full max-w-md p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-future-gray hover:text-white">
                    <XIcon className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-orbitron text-white mb-6">Generate Invite Link</h2>

                {generatedCode ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-momentum-green/10 border border-momentum-green/20 rounded-lg text-center">
                            <p className="text-sm text-momentum-green font-bold mb-2">Invite Code Generated!</p>
                            <p className="text-2xl font-mono text-white tracking-widest">{generatedCode}</p>
                        </div>
                        <div className="flex gap-2">
                            <input
                                readOnly
                                value={`${window.location.origin}/join/${generatedCode}`}
                                className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-future-gray"
                            />
                            <button
                                onClick={copyLink}
                                className="bg-momentum-green text-black font-bold px-4 py-2 rounded hover:bg-momentum-green/90"
                            >
                                Copy
                            </button>
                        </div>
                        <button
                            onClick={() => { setGeneratedCode(null); onClose(); }}
                            className="w-full mt-4 text-future-gray hover:text-white text-sm"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-future-gray mb-1">Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as any)}
                                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white focus:border-momentum-green outline-none"
                            >
                                <option value="TRIAL">Trial Access</option>
                                <option value="LIFETIME">Lifetime Access</option>
                            </select>
                        </div>

                        {type === 'TRIAL' && (
                            <div>
                                <label className="block text-sm text-future-gray mb-1">Duration (Days)</label>
                                <input
                                    type="number"
                                    value={duration}
                                    onChange={(e) => setDuration(parseInt(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white focus:border-momentum-green outline-none"
                                    min="1"
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-photonic-blue text-black font-bold py-3 rounded hover:bg-photonic-blue/90 disabled:opacity-50 mt-4"
                        >
                            {isLoading ? 'Generating...' : 'Generate Link'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default GenerateInviteModal;
