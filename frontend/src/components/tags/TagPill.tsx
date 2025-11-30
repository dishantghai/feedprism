/**
 * TagPill - Interactive tag with save/unsave functionality
 * 
 * Displays a tag as a pill that can be saved/unsaved.
 * Saved tags are highlighted and can be used for filtering.
 */

import { memo } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TagPillProps {
    tag: string;
    isSaved?: boolean;
    onToggleSave?: (tag: string) => void;
    onClick?: (tag: string) => void;
    showSaveIcon?: boolean;
    size?: 'sm' | 'md';
    className?: string;
}

export const TagPill = memo(function TagPill({
    tag,
    isSaved = false,
    onToggleSave,
    onClick,
    showSaveIcon = true,
    size = 'sm',
    className,
}: TagPillProps) {
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onClick) {
            onClick(tag);
        } else if (onToggleSave) {
            onToggleSave(tag);
        }
    };

    const handleSaveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleSave?.(tag);
    };

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
    };

    return (
        <span
            onClick={handleClick}
            className={cn(
                'inline-flex items-center gap-1 rounded-full font-medium cursor-pointer transition-all duration-150',
                sizeClasses[size],
                isSaved
                    ? 'bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border-light)] hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-border-medium)]',
                className
            )}
        >
            {tag}
            {showSaveIcon && onToggleSave && (
                <button
                    onClick={handleSaveClick}
                    className={cn(
                        'p-0.5 rounded-full transition-colors',
                        isSaved
                            ? 'text-blue-600 hover:text-blue-800'
                            : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100'
                    )}
                    title={isSaved ? 'Unsave tag' : 'Save tag'}
                >
                    <Star
                        className={cn(
                            'w-3 h-3',
                            isSaved ? 'fill-current' : ''
                        )}
                    />
                </button>
            )}
        </span>
    );
});

export default TagPill;
