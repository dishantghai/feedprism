/**
 * Demo Mode Banner
 * 
 * Displays a banner when demo mode is active to inform users
 * that they're viewing pre-loaded sample data.
 */

import { Info, Sparkles } from 'lucide-react';
import { useDemo } from '../../contexts';

export function DemoBanner() {
    const { isDemo, config, user } = useDemo();

    if (!isDemo || !config?.banner.show) {
        return null;
    }

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2">
            <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-medium">
                        {config.banner.text}
                    </span>
                </div>
                {user && (
                    <div className="flex items-center gap-2 text-sm opacity-90">
                        <img
                            src={user.picture}
                            alt={user.name}
                            className="w-5 h-5 rounded-full"
                        />
                        <span>{user.name}</span>
                    </div>
                )}
                <div className="flex items-center gap-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">
                    <Info className="w-3 h-3" />
                    <span>Sample Data</span>
                </div>
            </div>
        </div>
    );
}
