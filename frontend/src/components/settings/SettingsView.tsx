/**
 * Settings View
 * 
 * Provides configuration options including:
 * - Demo mode toggle
 * - Pipeline settings
 * - Display preferences
 */

import { useState, useEffect } from 'react';
import {
    Settings,
    Sparkles,
    Mail,
    Database,
    RefreshCw,
    Check,
    Info,
    AlertCircle
} from 'lucide-react';
import { useDemo } from '../../contexts';

export function SettingsView() {
    const { isDemo, isToggling, toggleDemo, config } = useDemo();
    const [showReloadHint, setShowReloadHint] = useState(false);
    const [emailLimit, setEmailLimit] = useState<number>(50);
    const [savedEmailLimit, setSavedEmailLimit] = useState<number>(50);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const hasUnsavedChanges = emailLimit !== savedEmailLimit;

    useEffect(() => {
        // Fetch pipeline settings on mount
        const fetchSettings = async () => {
            try {
                const response = await fetch('/api/pipeline/settings');
                if (response.ok) {
                    const data = await response.json();
                    const limit = data.email_max_limit || 50;
                    setEmailLimit(limit);
                    setSavedEmailLimit(limit);
                }
            } catch (error) {
                console.error('Failed to fetch pipeline settings:', error);
            }
        };
        fetchSettings();
    }, []);

    const handleSaveEmailLimit = async () => {
        setIsSaving(true);
        setSaveStatus('idle');
        try {
            const response = await fetch(`/api/pipeline/settings?email_max_limit=${emailLimit}`, {
                method: 'POST',
            });
            if (response.ok) {
                setSavedEmailLimit(emailLimit);
                setSaveStatus('success');
                setTimeout(() => setSaveStatus('idle'), 3000);
            } else {
                setSaveStatus('error');
            }
        } catch (error) {
            console.error('Failed to save email limit:', error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleDemo = async () => {
        setShowReloadHint(true);

        try {
            // Wait for the toggle to complete and persist
            await toggleDemo(!isDemo);

            // Give a moment for the user to see the feedback, then reload
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            console.error('Failed to toggle demo mode:', error);
            setShowReloadHint(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Settings</h2>
                    <p className="text-sm text-[var(--color-text-tertiary)]">Configure FeedPrism</p>
                </div>
            </div>

            {/* Demo Mode Section */}
            <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-light)] overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--color-border-light)]">
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        Demo Mode
                    </h3>
                </div>

                <div className="p-5 space-y-4">
                    {/* Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--color-text-primary)]">
                                Enable Demo Mode
                            </p>
                            <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                                Use pre-loaded sample data without Gmail login
                            </p>
                        </div>
                        <button
                            onClick={handleToggleDemo}
                            disabled={isToggling}
                            className={`
                                relative w-12 h-6 rounded-full transition-colors duration-200
                                ${isDemo
                                    ? 'bg-purple-600'
                                    : 'bg-gray-300'
                                }
                                ${isToggling ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                            `}
                        >
                            <span
                                className={`
                                    absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm
                                    transition-transform duration-200
                                    ${isDemo ? 'translate-x-6' : 'translate-x-0'}
                                `}
                            />
                            {isToggling && (
                                <RefreshCw className="absolute inset-0 m-auto w-3 h-3 text-white animate-spin" />
                            )}
                        </button>
                    </div>

                    {/* Status */}
                    <div className={`
                        flex items-start gap-3 p-3 rounded-lg
                        ${isDemo
                            ? 'bg-purple-50 border border-purple-200'
                            : 'bg-gray-50 border border-gray-200'
                        }
                    `}>
                        {isDemo ? (
                            <>
                                <Check className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-purple-900">Demo Mode Active</p>
                                    <p className="text-xs text-purple-700 mt-0.5">
                                        Viewing pre-loaded newsletter data. No Gmail login required.
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <Mail className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Production Mode</p>
                                    <p className="text-xs text-gray-600 mt-0.5">
                                        Using real Gmail data. Login required for full access.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Reload hint */}
                    {showReloadHint && (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                            <p className="text-sm text-blue-700">
                                Reloading to apply changes...
                            </p>
                        </div>
                    )}

                    {/* Info */}
                    <div className="flex items-start gap-2 text-xs text-[var(--color-text-tertiary)]">
                        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <p>
                            Demo mode is ideal for hackathon demos and testing.
                            It uses sample newsletters already processed in the database.
                        </p>
                    </div>
                </div>
            </div>

            {/* Email Processing Settings Section */}
            <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-light)] overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--color-border-light)]">
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                        <Mail className="w-4 h-4 text-blue-500" />
                        Email Processing Limit
                    </h3>
                </div>

                <div className="p-5 space-y-4">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-[var(--color-text-primary)]">
                            Maximum Emails per Batch
                        </label>
                        <p className="text-xs text-[var(--color-text-tertiary)] mb-3">
                            Set the maximum number of emails to process in a single extraction batch (1-500)
                        </p>
                        <div className="flex gap-3 items-center">
                            <input
                                type="number"
                                min="1"
                                max="500"
                                value={emailLimit}
                                onChange={(e) => setEmailLimit(Math.min(500, Math.max(1, parseInt(e.target.value) || 1)))}
                                className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-light)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={handleSaveEmailLimit}
                                disabled={!hasUnsavedChanges || isSaving}
                                className={`
                                    px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
                                    ${hasUnsavedChanges
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }
                                    ${isSaving ? 'opacity-50 cursor-wait' : ''}
                                `}
                            >
                                {isSaving ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : saveStatus === 'success' ? (
                                    <span className="flex items-center gap-1">
                                        <Check className="w-4 h-4" /> Saved
                                    </span>
                                ) : (
                                    'Save'
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Save status feedback */}
                    {saveStatus === 'success' && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <Check className="w-4 h-4 text-green-600" />
                            <p className="text-sm text-green-700">
                                Email limit saved! Changes will apply on next email fetch.
                            </p>
                        </div>
                    )}
                    {saveStatus === 'error' && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <p className="text-sm text-red-700">
                                Failed to save settings. Please try again.
                            </p>
                        </div>
                    )}

                    <div className="flex items-start gap-2 text-xs text-[var(--color-text-tertiary)] p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-600" />
                        <p>
                            Higher limits allow processing more emails at once but may take longer. The system internally caps at 500 emails maximum.
                        </p>
                    </div>
                </div>
            </div>

            {/* Data Source Section */}
            <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-light)] overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--color-border-light)]">
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                        <Database className="w-4 h-4 text-blue-500" />
                        Data Source
                    </h3>
                </div>

                <div className="p-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-[var(--color-bg-tertiary)]">
                            <p className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide">Source</p>
                            <p className="text-sm font-medium text-[var(--color-text-primary)] mt-1">
                                {config?.features.data_source === 'pre-loaded' ? 'Pre-loaded Data' : 'Gmail API'}
                            </p>
                        </div>
                        <div className="p-4 rounded-lg bg-[var(--color-bg-tertiary)]">
                            <p className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide">Login Required</p>
                            <p className="text-sm font-medium text-[var(--color-text-primary)] mt-1">
                                {config?.features.login_required ? 'Yes' : 'No'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* About Section */}
            <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-light)] overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--color-border-light)]">
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">About</h3>
                </div>

                <div className="p-5 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-[var(--color-text-tertiary)]">Version</span>
                        <span className="text-[var(--color-text-primary)] font-medium">1.0.0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-[var(--color-text-tertiary)]">Build</span>
                        <span className="text-[var(--color-text-primary)] font-medium">Hackathon Edition</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SettingsView;
