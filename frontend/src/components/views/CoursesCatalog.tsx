/**
 * CoursesCatalog - Catalog view for courses
 * 
 * Features:
 * - Full-width course cards
 * - Provider branding
 * - Level/duration/cost filters
 * - Integrated search and tags
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    GraduationCap,
    User,
    Clock,
    ExternalLink,
    Mail,
    RefreshCw,
    Filter
} from 'lucide-react';
import { api } from '../../services/api';
import { FilterBar, SearchBar, type FilterState } from '../search';
import { QuickTagBar } from '../tags';
import { EmailModal } from '../email';
import { ClickableTag } from '../feed/ExtractedItemCard';
import type { FeedItem } from '../../types';
import { cn } from '../../lib/utils';

// Provider branding
const providerConfig: Record<string, { bgColor: string; textColor: string }> = {
    'coursera': { bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
    'udemy': { bgColor: 'bg-purple-50', textColor: 'text-purple-700' },
    'edx': { bgColor: 'bg-teal-50', textColor: 'text-teal-700' },
    'linkedin': { bgColor: 'bg-sky-50', textColor: 'text-sky-700' },
    'udacity': { bgColor: 'bg-cyan-50', textColor: 'text-cyan-700' },
    'skillshare': { bgColor: 'bg-emerald-50', textColor: 'text-emerald-700' },
    'pluralsight': { bgColor: 'bg-orange-50', textColor: 'text-orange-700' },
    'default': { bgColor: 'bg-green-50', textColor: 'text-green-700' }
};

// Level config
const levelConfig: Record<string, { color: string; bgColor: string }> = {
    'beginner': { color: 'text-green-700', bgColor: 'bg-green-100' },
    'intermediate': { color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
    'advanced': { color: 'text-red-700', bgColor: 'bg-red-100' },
    'all levels': { color: 'text-blue-700', bgColor: 'bg-blue-100' },
    'all': { color: 'text-blue-700', bgColor: 'bg-blue-100' }
};

function getProviderStyle(provider: string | undefined) {
    if (!provider) return providerConfig.default;
    const key = provider.toLowerCase();
    return providerConfig[key] || providerConfig.default;
}

function getLevelStyle(level: string | undefined) {
    if (!level) return null;
    const key = level.toLowerCase();
    return levelConfig[key] || levelConfig['all'];
}

// Course Catalog Card
function CourseCatalogCard({
    item,
    savedTags,
    onSaveTag,
    onViewSource
}: {
    item: FeedItem;
    savedTags: string[];
    onSaveTag: (tag: string) => void;
    onViewSource: (emailId: string) => void;
}) {
    const providerStyle = getProviderStyle(item.provider);
    const levelStyle = getLevelStyle(item.level);

    return (
        <div className="bg-[var(--color-bg-primary)] rounded-xl border border-[var(--color-border-light)] hover:border-green-300 hover:shadow-md transition-all overflow-hidden">
            <div className="flex">
                {/* Provider Badge */}
                <div className={cn(
                    'w-24 flex-shrink-0 flex flex-col items-center justify-center p-4',
                    providerStyle.bgColor
                )}>
                    <GraduationCap className={cn('w-10 h-10 mb-2', providerStyle.textColor)} />
                    <span className={cn('text-xs font-semibold text-center leading-tight', providerStyle.textColor)}>
                        {item.provider || 'Course'}
                    </span>
                </div>

                {/* Content */}
                <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1.5 line-clamp-1 hover:text-green-600 transition-colors">
                                {item.title}
                            </h3>

                            {/* Meta row */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-text-tertiary)] mb-2">
                                {item.instructor && (
                                    <span className="flex items-center gap-1 text-[var(--color-text-secondary)]">
                                        <User className="w-3.5 h-3.5" />
                                        {item.instructor}
                                    </span>
                                )}
                                {levelStyle && (
                                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', levelStyle.bgColor, levelStyle.color)}>
                                        {item.level}
                                    </span>
                                )}
                                {item.duration && (
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {item.duration}
                                    </span>
                                )}
                                {item.is_free ? (
                                    <span className="text-green-600 font-medium">Free</span>
                                ) : item.cost ? (
                                    <span>{item.cost}</span>
                                ) : null}
                                {item.certificate_offered && (
                                    <span className="text-amber-600">🏆 Certificate</span>
                                )}
                            </div>

                            {/* Description */}
                            {(item.hook || item.description) && (
                                <p className="text-sm text-[var(--color-text-secondary)] mb-3 line-clamp-2">
                                    {item.hook || item.description}
                                </p>
                            )}

                            {/* What you'll learn */}
                            {item.what_you_learn && item.what_you_learn.length > 0 && (
                                <ul className="text-xs text-[var(--color-text-secondary)] mb-3 space-y-0.5">
                                    {item.what_you_learn.slice(0, 2).map((point, i) => (
                                        <li key={i} className="flex items-start gap-1.5">
                                            <span className="text-green-500 font-bold">→</span>
                                            <span className="line-clamp-1">{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1.5">
                                {item.tags?.slice(0, 4).map((tag, i) => (
                                    <ClickableTag
                                        key={i}
                                        tag={tag}
                                        isSaved={savedTags.includes(tag)}
                                        onSave={onSaveTag}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-end gap-2">
                            {item.url && (
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                                >
                                    Enroll Now <ExternalLink className="w-4 h-4" />
                                </a>
                            )}
                            <button
                                onClick={() => onViewSource(item.email_id)}
                                className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] flex items-center gap-1"
                            >
                                <Mail className="w-3.5 h-3.5" />
                                View Source
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function CoursesCatalog() {
    const [items, setItems] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        types: [],
        status: 'any',
        sort: 'recent',
        senders: [],
        tags: []
    });

    // Level filter
    const [levelFilter, setLevelFilter] = useState<string | null>(null);

    // Saved tags
    const [savedTags, setSavedTags] = useState<string[]>(() => {
        const stored = localStorage.getItem('feedprism_saved_tags');
        return stored ? JSON.parse(stored) : [];
    });

    // Search state
    const [searchResults, setSearchResults] = useState<FeedItem[] | null>(null);

    // Email modal
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

    // Fetch courses
    const fetchCourses = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const response = await api.getFeed(
                1,
                50,
                ['course'],
                undefined,
                filters.tags.length > 0 ? filters.tags : undefined
            );
            setItems(response.items);
        } catch (error) {
            console.error('Failed to fetch courses:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filters.tags]);

    useEffect(() => {
        fetchCourses();
    }, [fetchCourses]);

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

    // Get unique levels
    const uniqueLevels = useMemo(() => {
        const levels = new Set<string>();
        for (const item of items) {
            if (item.level) levels.add(item.level);
        }
        return Array.from(levels);
    }, [items]);

    // Filter items
    const filteredItems = useMemo(() => {
        let result = searchResults !== null ? [...searchResults] : [...items];

        // Level filter
        if (levelFilter) {
            result = result.filter(item =>
                item.level?.toLowerCase() === levelFilter.toLowerCase()
            );
        }

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
    }, [items, filters, searchResults, levelFilter]);

    // Search handlers
    const handleSearchResults = useCallback((results: FeedItem[], _query: string) => {
        setSearchResults(results.filter(r => r.item_type === 'course'));
    }, []);

    const handleSearchClear = useCallback(() => {
        setSearchResults(null);
    }, []);

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-40 bg-[var(--color-bg-tertiary)] rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                        Course Catalog
                    </h2>
                    <p className="text-xs text-[var(--color-text-tertiary)]">
                        {filteredItems.length} courses from your emails
                    </p>
                </div>

                <button
                    onClick={() => fetchCourses(true)}
                    disabled={refreshing}
                    className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
                </button>
            </div>

            {/* Level Filter Pills */}
            {uniqueLevels.length > 0 && (
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setLevelFilter(null)}
                            className={cn(
                                'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                                levelFilter === null
                                    ? 'bg-green-600 text-white'
                                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
                            )}
                        >
                            All Levels
                        </button>
                        {uniqueLevels.map(level => (
                            <button
                                key={level}
                                onClick={() => setLevelFilter(level)}
                                className={cn(
                                    'px-3 py-1 text-xs font-medium rounded-full transition-colors capitalize',
                                    levelFilter === level
                                        ? 'bg-green-600 text-white'
                                        : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
                                )}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </div>
            )}

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
                activeTypes={['course']}
                activeTags={filters.tags}
                activeSenders={filters.senders}
                onResults={handleSearchResults}
                onClear={handleSearchClear}
                placeholder="Search courses..."
            />

            {/* Course List */}
            {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-[var(--color-text-tertiary)]">
                    No courses found
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredItems.map(item => (
                        <CourseCatalogCard
                            key={item.id}
                            item={item}
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

export default CoursesCatalog;
