/**
 * FeedList - Container for feed cards with loading/empty states
 * 
 * Fetches and displays feed items grouped by email.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Inbox, RefreshCw, AlertCircle } from 'lucide-react';
import { FeedCard, type EmailGroup } from './FeedCard';
import { DetailModal } from './DetailModal';
import { FilterBar, SearchBar, type FilterState, type StatusFilter, type SortOption } from '../search';
import { QuickTagBar } from '../tags';
import { FeedCardSkeleton } from '../ui';
import { api } from '../../services/api';
import { useDemo } from '../../contexts';
import type { FeedItem, ItemType } from '../../types';

interface FeedListProps {
    /** Filter by item type (optional) - locks to single type, hides type filter */
    filterType?: ItemType;
    /** Maximum items to show */
    limit?: number;
    /** Title for the feed section */
    title?: string;
    /** Show refresh button */
    showRefresh?: boolean;
    /** Show filter bar */
    showFilters?: boolean;
}

export function FeedList({
    filterType,
    limit = 50,
    title,
    showRefresh = true,
    showFilters = false,
}: FeedListProps) {
    const { isDemo, isLoading: isDemoLoading, demoExtracted } = useDemo();
    const [items, setItems] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Filter state
    const [filters, setFilters] = useState<FilterState>({
        types: filterType ? [filterType] : [],
        status: 'any' as StatusFilter,
        sort: 'recent' as SortOption,
        senders: [],
        tags: [],
    });

    // Saved tags (persisted to localStorage)
    const [savedTags, setSavedTags] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem('feedprism_saved_tags');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    // Persist saved tags
    useEffect(() => {
        localStorage.setItem('feedprism_saved_tags', JSON.stringify(savedTags));
    }, [savedTags]);

    // Toggle save tag (from content cards)
    const toggleSaveTag = useCallback((tag: string) => {
        setSavedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    }, []);

    // Toggle tag filter (from QuickTagBar)
    const toggleTagFilter = useCallback((tag: string) => {
        setFilters(prev => ({
            ...prev,
            tags: prev.tags.includes(tag)
                ? prev.tags.filter(t => t !== tag)
                : [...prev.tags, tag]
        }));
    }, []);

    // Clear tag filters
    const clearTagFilters = useCallback(() => {
        setFilters(prev => ({ ...prev, tags: [] }));
    }, []);

    // Modal state
    const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
    const [selectedEmailGroup, setSelectedEmailGroup] = useState<EmailGroup | null>(null);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FeedItem[] | null>(null);

    // Handle search results
    const handleSearchResults = useCallback((results: FeedItem[], query: string) => {
        console.log('Search results received:', results.length, 'items for query:', query);
        setSearchQuery(query);
        setSearchResults(results);
    }, []);

    // Clear search
    const handleSearchClear = useCallback(() => {
        setSearchQuery('');
        setSearchResults(null);
    }, []);

    // Fetch feed data
    const fetchFeed = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);

        try {
            let response;

            if (isDemo) {
                // Demo mode: only show items after extraction
                if (!demoExtracted) {
                    // Not yet extracted - show empty feed
                    setItems([]);
                    setLoading(false);
                    setRefreshing(false);
                    return;
                }
                // Demo mode: use demo feed endpoint
                const types = filterType
                    ? [filterType]
                    : (filters.types.length > 0 ? filters.types : undefined);
                response = await api.getDemoFeed(1, limit, types);
            } else if (filterType) {
                // Normal mode with type filter
                response = await api.getFeedByType(filterType, 1, limit);
            } else {
                // Normal mode: use sender and tag filters if set
                response = await api.getFeed(
                    1,
                    limit,
                    filters.types.length > 0 ? filters.types : undefined,
                    filters.senders.length > 0 ? filters.senders : undefined,
                    filters.tags.length > 0 ? filters.tags : undefined
                );
            }
            setItems(response.items || []);
        } catch (err) {
            console.error('Failed to fetch feed:', err);
            setError(err instanceof Error ? err.message : 'Failed to load feed');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [isDemo, demoExtracted, filterType, limit, filters.types, filters.senders, filters.tags]);

    useEffect(() => {
        // Wait for demo context to finish loading before fetching
        if (!isDemoLoading) {
            fetchFeed();
        }
    }, [fetchFeed, isDemoLoading, isDemo]);

    // Get all unique tags from items with counts (sorted by frequency)
    const allTagsWithCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        items.forEach(item => {
            item.tags?.forEach(tag => {
                counts[tag] = (counts[tag] || 0) + 1;
            });
        });
        return Object.entries(counts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count);
    }, [items]);

    // Combine saved tags with frequent tags for the QuickTagBar
    // Saved tags come first, then fill with frequent tags
    const tagsForQuickBar = useMemo(() => {
        const counts: Record<string, number> = {};
        items.forEach(item => {
            item.tags?.forEach(tag => {
                counts[tag] = (counts[tag] || 0) + 1;
            });
        });

        // Start with saved tags (with their counts)
        const result: Array<{ tag: string; count: number }> = savedTags.map(tag => ({
            tag,
            count: counts[tag] || 0
        }));

        // Add frequent tags that aren't already saved (up to 10 total)
        const savedSet = new Set(savedTags);
        for (const { tag, count } of allTagsWithCounts) {
            if (result.length >= 10) break;
            if (!savedSet.has(tag)) {
                result.push({ tag, count });
            }
        }

        return result;
    }, [items, savedTags, allTagsWithCounts]);

    // Apply filters to items (also applies to search results)
    const filteredItems = useMemo(() => {
        // Start with search results if available, otherwise use feed items
        console.log('filteredItems recalc - searchResults:', searchResults?.length, 'items:', items.length);
        let result = searchResults !== null ? [...searchResults] : [...items];

        // Type filter (if not locked by filterType prop)
        if (!filterType && filters.types.length > 0) {
            result = result.filter(item => filters.types.includes(item.item_type));
        }

        // Tag filter (for non-search results, search already filters by tags)
        if (searchResults === null && filters.tags.length > 0) {
            result = result.filter(item =>
                item.tags?.some(tag => filters.tags.includes(tag))
            );
        }

        // Sender filter
        if (filters.senders.length > 0) {
            const senderSet = new Set(filters.senders.map(s => s.toLowerCase()));
            result = result.filter(item =>
                senderSet.has((item.sender_email || '').toLowerCase())
            );
        }

        // Status filter (upcoming/past for events)
        if (filters.status !== 'any') {
            const now = new Date();
            result = result.filter(item => {
                if (item.item_type !== 'event' || !item.start_time) return true;
                const eventDate = new Date(item.start_time);
                return filters.status === 'upcoming' ? eventDate >= now : eventDate < now;
            });
        }

        // Sort - keep relevance order for search, otherwise sort by date
        if (searchResults === null && filters.sort === 'recent') {
            result.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
        }

        return result;
    }, [items, filters, filterType, searchResults]);

    // Group items by email
    const emailGroups = useMemo(() => {
        const groups = new Map<string, EmailGroup>();

        for (const item of filteredItems) {
            const existing = groups.get(item.email_id);
            if (existing) {
                existing.items.push(item);
            } else {
                groups.set(item.email_id, {
                    email_id: item.email_id,
                    email_subject: item.email_subject,
                    sender: item.sender,
                    sender_email: item.sender_email,
                    received_at: item.received_at,
                    items: [item],
                });
            }
        }

        // Sort groups by most recent email
        return Array.from(groups.values()).sort((a, b) => {
            return new Date(b.received_at).getTime() - new Date(a.received_at).getTime();
        });
    }, [filteredItems]);

    // Handle item click - show detail modal
    const handleItemClick = (item: FeedItem) => {
        setSelectedItem(item);
        setSelectedEmailGroup(null);
    };

    // Handle email click - show email group modal
    const handleEmailClick = (emailGroup: EmailGroup) => {
        setSelectedEmailGroup(emailGroup);
        setSelectedItem(null);
    };

    // Close modal
    const handleCloseModal = () => {
        setSelectedItem(null);
        setSelectedEmailGroup(null);
    };

    // Loading state
    if (loading) {
        return (
            <div className="space-y-4">
                {title && (
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                            {title}
                        </h2>
                    </div>
                )}
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <FeedCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <div>
                        <p className="text-sm font-medium text-red-700">Failed to load feed</p>
                        <p className="text-xs text-red-600 mt-1">{error}</p>
                    </div>
                </div>
                <button
                    onClick={() => fetchFeed()}
                    className="mt-4 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                >
                    Try again
                </button>
            </div>
        );
    }

    // Empty state
    if (emailGroups.length === 0) {
        return (
            <div className="py-16 flex flex-col items-center justify-center">
                <div className="w-16 h-16 mb-4 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                    <Inbox className="w-8 h-8 text-[var(--color-text-tertiary)]" />
                </div>
                <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2 text-center">
                    No items yet
                </h3>
                <p className="text-sm text-[var(--color-text-tertiary)] max-w-sm text-center">
                    {filterType
                        ? `No ${filterType}s have been extracted yet. Process some emails to see them here.`
                        : 'No content has been extracted yet. Use the Prism Overview to extract content from your emails.'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            {(title || showRefresh) && (
                <div className="flex items-center justify-between">
                    {title && (
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                            {title}
                        </h2>
                    )}
                    {showRefresh && (
                        <button
                            onClick={() => fetchFeed(true)}
                            disabled={refreshing}
                            className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors disabled:opacity-50"
                            title="Refresh feed"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                </div>
            )}

            {/* Filter Bar */}
            {showFilters && (
                <FilterBar
                    filters={filters}
                    onFiltersChange={setFilters}
                    showTypeFilter={!filterType}
                />
            )}

            {/* Quick Tag Bar - show saved tags first, then frequent tags */}
            {tagsForQuickBar.length > 0 && (
                <QuickTagBar
                    savedTags={tagsForQuickBar}
                    selectedTags={filters.tags}
                    userSavedTags={savedTags}
                    onToggleTag={toggleTagFilter}
                    onRemoveTag={toggleSaveTag}
                    onClearAll={clearTagFilters}
                />
            )}

            {/* Search Bar - below filters and tags so it respects them */}
            <SearchBar
                activeTypes={filters.types}
                activeTags={filters.tags}
                activeSenders={filters.senders}
                onResults={handleSearchResults}
                onClear={handleSearchClear}
                placeholder={searchQuery ? `Searching: "${searchQuery}"` : 'Search events, courses, articles...'}
                className="mb-3"
            />

            {/* Feed cards */}
            <div className="space-y-4 stagger-children">
                {emailGroups.map((group) => (
                    <FeedCard
                        key={group.email_id}
                        emailGroup={group}
                        onItemClick={handleItemClick}
                        onEmailClick={handleEmailClick}
                        savedTags={savedTags}
                        onSaveTag={toggleSaveTag}
                    />
                ))}
            </div>

            {/* Summary */}
            <div className="text-center py-6 text-xs text-[var(--color-text-tertiary)]">
                Showing {filteredItems.length} items from {emailGroups.length} emails
                {filteredItems.length !== items.length && ` (${items.length} total)`}
            </div>

            {/* Detail Modal */}
            {(selectedItem || selectedEmailGroup) && (
                <DetailModal
                    item={selectedItem}
                    emailGroup={selectedEmailGroup}
                    onClose={handleCloseModal}
                    onItemClick={handleItemClick}
                />
            )}
        </div>
    );
}

export default FeedList;
