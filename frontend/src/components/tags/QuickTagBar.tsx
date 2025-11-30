/**
 * QuickTagBar - Quick access to saved tags for filtering
 * 
 * Shows top saved tags as clickable pills for instant filtering.
 * Includes a dropdown for accessing all saved tags.
 */

import { useState, useRef, useEffect } from 'react';
import { Tag, ChevronDown, X, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TagWithCount {
    tag: string;
    count: number;
}

interface QuickTagBarProps {
    savedTags: TagWithCount[];
    selectedTags: string[];
    userSavedTags?: string[];  // Tags the user explicitly saved
    onToggleTag: (tag: string) => void;
    onRemoveTag?: (tag: string) => void;  // Remove from saved tags
    onClearAll: () => void;
    className?: string;
}

export function QuickTagBar({
    savedTags,
    selectedTags,
    userSavedTags = [],
    onToggleTag,
    onRemoveTag,
    onClearAll,
    className,
}: QuickTagBarProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen]);

    // Top 5 tags for quick access
    const topTags = savedTags.slice(0, 5);

    // Filter tags for dropdown
    const filteredTags = savedTags.filter(({ tag }) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (savedTags.length === 0) {
        return null; // Don't show if no saved tags
    }

    return (
        <div className={cn(
            'flex items-center gap-3 px-4 py-2 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-light)]',
            className
        )}>
            {/* Label */}
            <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-tertiary)] whitespace-nowrap">
                <Tag className="w-3.5 h-3.5" />
                Tags:
            </span>

            {/* Quick tag pills */}
            <div className="flex items-center gap-2 flex-wrap flex-1">
                {topTags.map(({ tag, count }) => {
                    const isUserSaved = userSavedTags.includes(tag);
                    const isSelected = selectedTags.includes(tag);

                    return (
                        <button
                            key={tag}
                            onClick={() => onToggleTag(tag)}
                            className={cn(
                                'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full transition-all group/pill',
                                isSelected
                                    ? 'bg-blue-500 text-white'
                                    : isUserSaved
                                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                        : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
                            )}
                            title={`${count} items - Click to filter`}
                        >
                            {tag}
                            {/* Show X for selected tags OR saved tags on hover */}
                            {isSelected ? (
                                <X className="w-3 h-3" />
                            ) : isUserSaved && onRemoveTag ? (
                                <X
                                    className="w-3 h-3 opacity-50 hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveTag(tag);
                                    }}
                                />
                            ) : null}
                        </button>
                    );
                })}

                {/* More dropdown */}
                {savedTags.length > 5 && (
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
                        >
                            +{savedTags.length - 5} more
                            <ChevronDown className={cn(
                                'w-3 h-3 transition-transform',
                                isDropdownOpen && 'rotate-180'
                            )} />
                        </button>

                        {/* Dropdown */}
                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-64 bg-[var(--color-bg-primary)] border border-[var(--color-border-light)] rounded-lg shadow-lg z-50 animate-fade-in">
                                {/* Search */}
                                <div className="p-2 border-b border-[var(--color-border-light)]">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
                                        <input
                                            type="text"
                                            placeholder="Search tags..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-8 pr-3 py-1.5 text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border-light)] rounded-md focus:outline-none focus:border-blue-400"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {/* Tag list */}
                                <div className="max-h-48 overflow-y-auto p-1">
                                    {filteredTags.map(({ tag, count }) => (
                                        <button
                                            key={tag}
                                            onClick={() => onToggleTag(tag)}
                                            className={cn(
                                                'w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors',
                                                selectedTags.includes(tag)
                                                    ? 'bg-blue-50 text-blue-700'
                                                    : 'hover:bg-[var(--color-bg-tertiary)]'
                                            )}
                                        >
                                            <span className="flex items-center gap-2">
                                                <span className={cn(
                                                    'w-4 h-4 rounded border flex items-center justify-center text-xs',
                                                    selectedTags.includes(tag)
                                                        ? 'bg-blue-500 border-blue-500 text-white'
                                                        : 'border-[var(--color-border-medium)]'
                                                )}>
                                                    {selectedTags.includes(tag) && '✓'}
                                                </span>
                                                {tag}
                                            </span>
                                            <span className="text-xs text-[var(--color-text-tertiary)]">
                                                ({count})
                                            </span>
                                        </button>
                                    ))}
                                    {filteredTags.length === 0 && (
                                        <p className="text-sm text-[var(--color-text-tertiary)] text-center py-4">
                                            No tags found
                                        </p>
                                    )}
                                </div>

                                {/* Footer */}
                                {selectedTags.length > 0 && (
                                    <div className="p-2 border-t border-[var(--color-border-light)]">
                                        <button
                                            onClick={() => {
                                                onClearAll();
                                                setIsDropdownOpen(false);
                                            }}
                                            className="w-full px-3 py-1.5 text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
                                        >
                                            Clear all ({selectedTags.length})
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Clear all button */}
            {selectedTags.length > 0 && (
                <button
                    onClick={onClearAll}
                    className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors whitespace-nowrap"
                >
                    Clear all
                </button>
            )}
        </div>
    );
}

export default QuickTagBar;
