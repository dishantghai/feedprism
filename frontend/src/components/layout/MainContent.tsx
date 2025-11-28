/**
 * Main Content Area Component
 * 
 * Wrapper for the main content area with proper styling.
 * Will contain the Prism Overview, Feed, and other views.
 */

import type { ReactNode } from 'react';

interface MainContentProps {
    children: ReactNode;
    title?: string;
    subtitle?: string;
}

export function MainContent({ children, title, subtitle }: MainContentProps) {
    return (
        <main className="flex-1 h-screen overflow-y-auto bg-[var(--color-bg-primary)]">
            <div className="max-w-5xl mx-auto px-6 py-6">
                {/* Header */}
                {(title || subtitle) && (
                    <header className="mb-6">
                        {title && (
                            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                                {title}
                            </h1>
                        )}
                        {subtitle && (
                            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                                {subtitle}
                            </p>
                        )}
                    </header>
                )}

                {/* Content */}
                {children}
            </div>
        </main>
    );
}

export default MainContent;
