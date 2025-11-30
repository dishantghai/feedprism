/**
 * Demo Mode Context
 * 
 * Provides demo mode state and configuration throughout the app.
 * When demo mode is enabled:
 * - No login is required
 * - Uses pre-loaded email data from Qdrant
 * - Shows demo mode banner
 */

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from '../services/api';
import type { DemoConfig, DemoUser } from '../services/api';

interface DemoContextType {
    isDemo: boolean;
    isLoading: boolean;
    isToggling: boolean;
    config: DemoConfig | null;
    user: DemoUser | null;
    error: string | null;
    toggleDemo: (enabled: boolean) => Promise<void>;
    refreshDemoStatus: () => Promise<void>;
    // Track if demo extraction has been completed
    demoExtracted: boolean;
    setDemoExtracted: (extracted: boolean) => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: ReactNode }) {
    const [isDemo, setIsDemo] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isToggling, setIsToggling] = useState(false);
    const [config, setConfig] = useState<DemoConfig | null>(null);
    const [user, setUser] = useState<DemoUser | null>(null);
    // Track if demo extraction has been completed (persisted in sessionStorage)
    const [demoExtracted, setDemoExtractedState] = useState(() => {
        return sessionStorage.getItem('feedprism_demo_extracted') === 'true';
    });

    const setDemoExtracted = (extracted: boolean) => {
        setDemoExtractedState(extracted);
        if (extracted) {
            sessionStorage.setItem('feedprism_demo_extracted', 'true');
        } else {
            sessionStorage.removeItem('feedprism_demo_extracted');
        }
    };
    const [error, setError] = useState<string | null>(null);

    const refreshDemoStatus = async () => {
        try {
            const [demoConfig, demoUser] = await Promise.all([
                api.getDemoConfig(),
                api.getDemoUser()
            ]);

            setConfig(demoConfig);
            setUser(demoUser);
            setIsDemo(demoConfig.demo_mode);
            setError(null);
        } catch (err) {
            console.error('Failed to check demo mode:', err);
            setError(err instanceof Error ? err.message : 'Failed to check demo mode');
            setIsDemo(false);
        }
    };

    const toggleDemo = async (enabled: boolean) => {
        setIsToggling(true);
        try {
            await api.toggleDemoMode(enabled);
            await refreshDemoStatus();
        } catch (err) {
            console.error('Failed to toggle demo mode:', err);
            setError(err instanceof Error ? err.message : 'Failed to toggle demo mode');
        } finally {
            setIsToggling(false);
        }
    };

    useEffect(() => {
        async function checkDemoMode() {
            setIsLoading(true);
            await refreshDemoStatus();
            setIsLoading(false);
        }

        checkDemoMode();
    }, []);

    return (
        <DemoContext.Provider value={{
            isDemo,
            isLoading,
            isToggling,
            config,
            user,
            error,
            toggleDemo,
            refreshDemoStatus,
            demoExtracted,
            setDemoExtracted
        }}>
            {children}
        </DemoContext.Provider>
    );
}

export function useDemo() {
    const context = useContext(DemoContext);
    if (context === undefined) {
        throw new Error('useDemo must be used within a DemoProvider');
    }
    return context;
}
