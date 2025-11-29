/**
 * Main Layout Component
 * 
 * Combines Sidebar and MainContent into the app shell.
 */

import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import type { ViewType } from '../../types';

interface LayoutProps {
    children: ReactNode;
    activeView: ViewType;
    onViewChange: (view: ViewType) => void;
    onOpenCommandPalette?: () => void;
    title?: string;
    subtitle?: string;
    counts?: {
        events: number;
        courses: number;
        blogs: number;
        actions: number;
    };
}

export function Layout({
    children,
    activeView,
    onViewChange,
    onOpenCommandPalette,
    title,
    subtitle,
    counts,
}: LayoutProps) {
    return (
        <div className="flex h-screen w-full overflow-hidden">
            <Sidebar
                activeView={activeView}
                onViewChange={onViewChange}
                onOpenCommandPalette={onOpenCommandPalette}
                counts={counts}
            />
            <MainContent title={title} subtitle={subtitle}>
                {children}
            </MainContent>
        </div>
    );
}

export default Layout;
