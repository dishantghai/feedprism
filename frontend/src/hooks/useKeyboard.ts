/**
 * useKeyboard - Global keyboard shortcut hook
 * 
 * Handles global keyboard shortcuts like ⌘K for command palette.
 */

import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
    key: string;
    metaKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    callback: () => void;
}

export function useKeyboard(shortcuts: KeyboardShortcut[]) {
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // Don't trigger shortcuts when typing in inputs
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            // Allow Escape to work in inputs
            if (event.key !== 'Escape') {
                return;
            }
        }

        for (const shortcut of shortcuts) {
            const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
            const metaMatch = shortcut.metaKey ? event.metaKey : true;
            const ctrlMatch = shortcut.ctrlKey ? event.ctrlKey : true;
            const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;

            // For ⌘K, check either meta (Mac) or ctrl (Windows/Linux)
            const isCmdK = shortcut.key.toLowerCase() === 'k' && (shortcut.metaKey || shortcut.ctrlKey);
            if (isCmdK) {
                if (keyMatch && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    shortcut.callback();
                    return;
                }
            } else if (keyMatch && metaMatch && ctrlMatch && shiftMatch) {
                event.preventDefault();
                shortcut.callback();
                return;
            }
        }
    }, [shortcuts]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

/**
 * useCommandK - Convenience hook for ⌘K shortcut
 */
export function useCommandK(callback: () => void) {
    useKeyboard([
        { key: 'k', metaKey: true, callback },
        { key: 'k', ctrlKey: true, callback },
    ]);
}

export default useKeyboard;
