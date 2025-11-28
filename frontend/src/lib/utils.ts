/**
 * Utility functions for FeedPrism
 */

import { clsx, type ClassValue } from 'clsx';

/**
 * Merge class names with clsx
 */
export function cn(...inputs: ClassValue[]): string {
    return clsx(inputs);
}

/**
 * Format a date string to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

/**
 * Format a date string to a readable format
 */
export function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
}

/**
 * Get initials from a name or email
 */
export function getInitials(name: string): string {
    const parts = name.split(/[\s@.]+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

/**
 * Get color class for item type
 */
export function getTypeColor(type: string): string {
    switch (type) {
        case 'event':
            return 'text-[var(--color-event)]';
        case 'course':
            return 'text-[var(--color-course)]';
        case 'blog':
            return 'text-[var(--color-blog)]';
        case 'action':
            return 'text-[var(--color-action)]';
        default:
            return 'text-[var(--color-text-secondary)]';
    }
}

/**
 * Get background color class for item type badge
 */
export function getTypeBadgeClass(type: string): string {
    switch (type) {
        case 'event':
            return 'badge-event';
        case 'course':
            return 'badge-course';
        case 'blog':
            return 'badge-blog';
        case 'action':
            return 'badge-action';
        default:
            return 'bg-[var(--color-bg-tertiary)]';
    }
}

/**
 * Get icon name for item type (for Lucide icons)
 */
export function getTypeIcon(type: string): string {
    switch (type) {
        case 'event':
            return 'Calendar';
        case 'course':
            return 'GraduationCap';
        case 'blog':
            return 'FileText';
        case 'action':
            return 'Zap';
        default:
            return 'File';
    }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;

    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Check if running on Mac (for keyboard shortcuts)
 */
export function isMac(): boolean {
    return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

/**
 * Get keyboard shortcut display text
 */
export function getShortcutText(key: string): string {
    const modifier = isMac() ? '⌘' : 'Ctrl';
    return `${modifier}${key}`;
}
