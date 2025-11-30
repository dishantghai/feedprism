/**
 * BlogsGallery - Grid/List view for blog articles
 * 
 * Features:
 * - Responsive grid layout (3/2/1 columns)
 * - Rich preview cards with images
 * - Grid/List view toggle
 * - Integrated filters and search
 * - Source email links
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Grid3X3,
    List,
    ExternalLink,
    Mail,
    Clock,
    RefreshCw,
    BookOpen,
    Globe
} from 'lucide-react';
import { api } from '../../services/api';
import { FilterBar, SearchBar, type FilterState } from '../search';
import { QuickTagBar } from '../tags';
import { EmailModal } from '../email';
import { ClickableTag } from '../feed/ExtractedItemCard';
import type { FeedItem } from '../../types';
import { cn } from '../../lib/utils';

// Estimate reading time based on description length
function estimateReadingTime(text: string | undefined): string {
    if (!text) return '2 min read';
    const words = text.split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return `${minutes} min read`;
}

// Blog Card for Gallery View
function BlogGalleryCard({
    item,
    viewMode,
    savedTags,
    onSaveTag,
    onViewSource
}: {
    item: FeedItem;
    viewMode: 'grid' | 'list';
    savedTags: string[];
    onSaveTag: (tag: string) => void;
    onViewSource: (emailId: string) => void;
}) {
    if (viewMode === 'list') {
        return (
            <div className="bg-[var(--color-bg-primary)] rounded-xl border border-[var(--color-border-light)] hover:border-blue-300 hover:shadow-md transition-all overflow-hidden">
                <div className="flex">
                    {/* Image */}
                    <div className="w-48 h-36 flex-shrink-0 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                        {item.image_url ? (
                            <img
                                src={item.image_url}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        ) : (
                            <BookOpen className="w-12 h-12 text-blue-300" />
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4">
                        <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1 line-clamp-1 hover:text-blue-600 transition-colors">
                            {item.title}
                        </h3>

                        <div className="flex items-center gap-3 text-xs text-[var(--color-text-tertiary)] mb-2">
                            {item.sender && (
                                <span className="flex items-center gap-1">
                                    <Globe className="w-3 h-3" />
                                    {item.sender}
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {estimateReadingTime(item.description || item.hook)}
                            </span>
                        </div>

                        <p className="text-sm text-[var(--color-text-secondary)] mb-3 line-clamp-2">
                            {item.hook || item.description || 'No preview available'}
                        </p>

                        <div className="flex items-center justify-between">
                            <div className="flex flex-wrap gap-1.5">
                                {item.tags?.slice(0, 3).map((tag, i) => (
                                    <ClickableTag
                                        key={i}
                                        tag={tag}
                                        isSaved={savedTags.includes(tag)}
                                        onSave={onSaveTag}
                                    />
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onViewSource(item.email_id)}
                                    className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] flex items-center gap-1"
                                >
                                    <Mail className="w-3 h-3" />
                                    Source
                                </button>
                                {item.url && (
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shadow-sm"
                                        style={{ backgroundColor: '#1d4ed8', color: '#ffffff' }}
                                    >
                                        Read <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Grid view
    return (
        <div className="bg-[var(--color-bg-primary)] rounded-xl border border-[var(--color-border-light)] hover:border-blue-300 hover:shadow-lg transition-all overflow-hidden group">
            {/* Image */}
            <div className="aspect-[16/9] bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center overflow-hidden">
                {item.image_url ? (
                    <img
                        src={item.image_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                ) : (
                    <BookOpen className="w-16 h-16 text-blue-300" />
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1.5 line-clamp-2 group-hover:text-blue-600 transition-colors min-h-[2.5rem]">
                    {item.title}
                </h3>

                <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)] mb-2">
                    <span className="truncate max-w-[120px]">{item.sender || 'Unknown'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {estimateReadingTime(item.description || item.hook)}
                    </span>
                </div>

                <p className="text-xs text-[var(--color-text-secondary)] mb-3 line-clamp-3 min-h-[3rem]">
                    {item.hook || item.description || 'No preview available'}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-3 min-h-[1.5rem]">
                    {item.tags?.slice(0, 2).map((tag, i) => (
                        <ClickableTag
                            key={i}
                            tag={tag}
                            isSaved={savedTags.includes(tag)}
                            onSave={onSaveTag}
                        />
                    ))}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-light)]">
                    <button
                        onClick={() => onViewSource(item.email_id)}
                        className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] flex items-center gap-1"
                    >
                        <Mail className="w-3 h-3" />
                        Source
                    </button>
                    {item.url && (
                        <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors shadow-sm"
                            style={{ backgroundColor: '#1d4ed8', color: '#ffffff' }}
                        >
                            Read <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

export function BlogsGallery() {
    const [items, setItems] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [filters, setFilters] = useState<FilterState>({
        types: [],
        status: 'any',
        sort: 'recent',
        senders: [],
        tags: []
    });

    // Saved tags
    const [savedTags, setSavedTags] = useState<string[]>(() => {
        const stored = localStorage.getItem('feedprism_saved_tags');
        return stored ? JSON.parse(stored) : [];
    });

    // Search state
    const [searchResults, setSearchResults] = useState<FeedItem[] | null>(null);

    // Email modal
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

    // Fetch blogs
    const fetchBlogs = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const response = await api.getFeed(
                1,  // page
                50, // pageSize
                ['blog'], // types
                undefined, // senders
                filters.tags.length > 0 ? filters.tags : undefined // tags
            );
            setItems(response.items);
        } catch (error) {
            console.error('Failed to fetch blogs:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filters.tags]);

    useEffect(() => {
        fetchBlogs();
    }, [fetchBlogs]);

    // Save tags to localStorage
    useEffect(() => {
        localStorage.setItem('feedprism_saved_tags', JSON.stringify(savedTags));
    }, [savedTags]);

    const toggleSaveTag = useCallback((tag: string) => {
        setSavedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    }, []);

    const toggleTagFilter = useCallback((tag: string) => {
        setFilters(prev => ({
            ...prev,
            tags: prev.tags.includes(tag)
                ? prev.tags.filter(t => t !== tag)
                : [...prev.tags, tag]
        }));
    }, []);

    const clearTagFilters = useCallback(() => {
        setFilters(prev => ({ ...prev, tags: [] }));
    }, []);

    // Get all tags with counts
    const allTagsWithCounts = useMemo(() => {
        const tagCounts = new Map<string, number>();
        for (const item of items) {
            for (const tag of item.tags || []) {
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            }
        }
        return Array.from(tagCounts.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [items]);

    // Filter items
    const filteredItems = useMemo(() => {
        let result = searchResults !== null ? [...searchResults] : [...items];

        // Tag filter
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

        // Sort
        if (filters.sort === 'recent') {
            result.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
        }

        return result;
    }, [items, filters, searchResults]);

    // Search handlers
    const handleSearchResults = useCallback((results: FeedItem[], _query: string) => {
        setSearchResults(results.filter(r => r.item_type === 'blog'));
    }, []);

    const handleSearchClear = useCallback(() => {
        setSearchResults(null);
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-12 bg-[var(--color-bg-tertiary)] rounded-xl animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="aspect-[4/3] bg-[var(--color-bg-tertiary)] rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                        Articles & Newsletters
                    </h2>
                    <p className="text-xs text-[var(--color-text-tertiary)]">
                        {filteredItems.length} articles from your emails
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex items-center bg-[var(--color-bg-tertiary)] rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                'p-1.5 rounded-md transition-colors',
                                viewMode === 'grid'
                                    ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm'
                                    : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
                            )}
                        >
                            <Grid3X3 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                'p-1.5 rounded-md transition-colors',
                                viewMode === 'list'
                                    ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm'
                                    : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
                            )}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={() => fetchBlogs(true)}
                        disabled={refreshing}
                        className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <FilterBar
                filters={filters}
                onFiltersChange={setFilters}
                showTypeFilter={false}
            />

            {/* Quick Tags */}
            {allTagsWithCounts.length > 0 && (
                <QuickTagBar
                    savedTags={allTagsWithCounts}
                    selectedTags={filters.tags}
                    userSavedTags={savedTags}
                    onToggleTag={toggleTagFilter}
                    onRemoveTag={toggleSaveTag}
                    onClearAll={clearTagFilters}
                />
            )}

            {/* Search */}
            <SearchBar
                activeTypes={['blog']}
                activeTags={filters.tags}
                activeSenders={filters.senders}
                onResults={handleSearchResults}
                onClear={handleSearchClear}
                placeholder="Search articles..."
            />

            {/* Gallery */}
            {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-[var(--color-text-tertiary)]">
                    No articles found
                </div>
            ) : (
                <div className={cn(
                    viewMode === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                        : 'space-y-4'
                )}>
                    {filteredItems.map(item => (
                        <BlogGalleryCard
                            key={item.id}
                            item={item}
                            viewMode={viewMode}
                            savedTags={savedTags}
                            onSaveTag={toggleSaveTag}
                            onViewSource={setSelectedEmailId}
                        />
                    ))}
                </div>
            )}

            {/* Email Modal */}
            <EmailModal
                emailId={selectedEmailId || ''}
                isOpen={!!selectedEmailId}
                onClose={() => setSelectedEmailId(null)}
            />
        </div>
    );
}

export default BlogsGallery;
