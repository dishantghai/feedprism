/**
 * SearchBar - Persistent search input with debounced search
 * 
 * Features:
 * - Debounced search (300ms)
 * - Inherits active filters from FilterBar
 * - Shows search results inline
 * - Keyboard navigation (Escape to clear)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import type { FeedItem, ItemType } from '../../types';
import { cn } from '../../lib/utils';

interface SearchBarProps {
    /** Active type filters to scope search */
    activeTypes?: ItemType[];
    /** Active tag filters */
    activeTags?: string[];
    /** Active sender filters */
    activeSenders?: string[];
    /** Callback when search results are ready */
    onResults?: (results: FeedItem[], query: string) => void;
    /** Callback when search is cleared */
    onClear?: () => void;
    /** Placeholder text */
    placeholder?: string;
    /** Additional class names */
    className?: string;
}

export function SearchBar({
    activeTypes = [],
    activeTags = [],
    activeSenders = [],
    onResults,
    onClear,
    placeholder = 'Search events, courses, articles...',
    className,
}: SearchBarProps) {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounced search
    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            onClear?.();
            return;
        }

        setIsSearching(true);
        try {
            const types = activeTypes.length > 0
                ? activeTypes
                : ['event', 'course', 'blog'] as ItemType[];

            const response = await api.search({
                query: searchQuery,
                types,
                tags: activeTags.length > 0 ? activeTags : undefined,
                limit: 50, // Fetch more to allow for client-side sender filtering
            });

            // Filter by senders if specified (client-side since search API doesn't support it)
            let results = response.results;
            if (activeSenders.length > 0) {
                const senderSet = new Set(activeSenders.map(s => s.toLowerCase()));
                results = results.filter(item =>
                    senderSet.has((item.sender_email || '').toLowerCase())
                );
            }

            onResults?.(results, searchQuery);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    }, [activeTypes, activeTags, activeSenders, onResults, onClear]);

    // Handle input change with debounce
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);

        // Clear previous debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // Debounce search
        debounceRef.current = setTimeout(() => {
            performSearch(value);
        }, 300);
    }, [performSearch]);

    // Clear search
    const handleClear = useCallback(() => {
        setQuery('');
        onClear?.();
        inputRef.current?.focus();
    }, [onClear]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Escape to clear
            if (e.key === 'Escape' && query) {
                handleClear();
            }
            // Cmd/Ctrl + K to focus
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [query, handleClear]);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    return (
        <div className={cn(
            'relative flex items-center',
            className
        )}>
            {/* Search icon */}
            <div className="absolute left-3 pointer-events-none">
                {isSearching ? (
                    <Loader2 className="w-4 h-4 text-[var(--color-text-tertiary)] animate-spin" />
                ) : (
                    <Search className={cn(
                        'w-4 h-4 transition-colors',
                        isFocused
                            ? 'text-[var(--color-accent-blue)]'
                            : 'text-[var(--color-text-tertiary)]'
                    )} />
                )}
            </div>

            {/* Input */}
            <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                className={cn(
                    'w-full pl-10 pr-10 py-2.5 text-sm',
                    'bg-[var(--color-bg-tertiary)] border border-[var(--color-border-light)]',
                    'rounded-xl',
                    'placeholder:text-[var(--color-text-tertiary)]',
                    'focus:outline-none focus:border-[var(--color-accent-blue)] focus:ring-2 focus:ring-[var(--color-accent-blue)]/20',
                    'transition-all duration-150'
                )}
                aria-label="Search"
            />

            {/* Clear button */}
            {query && (
                <button
                    onClick={handleClear}
                    className="absolute right-3 p-0.5 rounded-full hover:bg-[var(--color-bg-hover)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
                    aria-label="Clear search"
                >
                    <X className="w-4 h-4" />
                </button>
            )}

            {/* Active filters indicator */}
            {(activeTypes.length > 0 || activeTags.length > 0 || activeSenders.length > 0) && (
                <div className="absolute right-10 flex items-center gap-1">
                    {activeTypes.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 font-medium">
                            {activeTypes.length} type{activeTypes.length > 1 ? 's' : ''}
                        </span>
                    )}
                    {activeTags.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-600 font-medium">
                            {activeTags.length} tag{activeTags.length > 1 ? 's' : ''}
                        </span>
                    )}
                    {activeSenders.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 font-medium">
                            {activeSenders.length} sender{activeSenders.length > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

export default SearchBar;
