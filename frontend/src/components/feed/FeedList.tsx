/**
 * FeedList - Container for feed cards with loading/empty states
 * 
 * Fetches and displays feed items grouped by email.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Inbox, RefreshCw, AlertCircle } from 'lucide-react';
import { FeedCard, type EmailGroup } from './FeedCard';
import { DetailModal } from './DetailModal';
import { FilterBar, type FilterState, type StatusFilter, type SortOption } from '../search';
import { FeedCardSkeleton } from '../ui';
import { api } from '../../services/api';
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
    const [items, setItems] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Filter state
    const [filters, setFilters] = useState<FilterState>({
        types: filterType ? [filterType] : [],
        status: 'any' as StatusFilter,
        sort: 'recent' as SortOption,
    });

    // Modal state
    const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
    const [selectedEmailGroup, setSelectedEmailGroup] = useState<EmailGroup | null>(null);

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
            if (filterType) {
                response = await api.getFeedByType(filterType, 1, limit);
            } else {
                response = await api.getFeed(1, limit);
            }
            console.log('Feed response:', response);
            setItems(response.items || []);
        } catch (err) {
            console.error('Failed to fetch feed:', err);
            setError(err instanceof Error ? err.message : 'Failed to load feed');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filterType, limit]);

    useEffect(() => {
        fetchFeed();
    }, [fetchFeed]);

    // Apply filters to items
    const filteredItems = useMemo(() => {
        let result = [...items];

        // Type filter (if not locked by filterType prop)
        if (!filterType && filters.types.length > 0) {
            result = result.filter(item => filters.types.includes(item.item_type));
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

        // Sort
        if (filters.sort === 'recent') {
            result.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
        }
        // 'relevance' sort would require score from search API

        return result;
    }, [items, filters, filterType]);

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
            <div className="py-16 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                    <Inbox className="w-8 h-8 text-[var(--color-text-tertiary)]" />
                </div>
                <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                    No items yet
                </h3>
                <p className="text-sm text-[var(--color-text-tertiary)] max-w-sm mx-auto">
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

            {/* Feed cards */}
            <div className="space-y-4 stagger-children">
                {emailGroups.map((group) => (
                    <FeedCard
                        key={group.email_id}
                        emailGroup={group}
                        onItemClick={handleItemClick}
                        onEmailClick={handleEmailClick}
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
