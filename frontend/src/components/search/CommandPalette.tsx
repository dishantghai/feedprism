/**
 * CommandPalette - Notion-style command palette (⌘K)
 * 
 * Features:
 * - Full-screen modal overlay
 * - Search input with debounced API calls
 * - Recent items section
 * - Quick actions section
 * - Keyboard navigation (↑/↓, Enter, Escape)
 * - Type filtering
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Search,
    X,
    Calendar,
    GraduationCap,
    FileText,
    Clock,
    ArrowRight,
    Loader2,
    Sparkles,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../services/api';
import type { FeedItem, ItemType, ViewType } from '../../types';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate?: (view: ViewType) => void;
    onSelectItem?: (item: FeedItem) => void;
}

interface QuickAction {
    id: string;
    label: string;
    icon: React.ReactNode;
    action: () => void;
    shortcut?: string;
}

const TYPE_ICONS: Record<ItemType, React.ReactNode> = {
    event: <Calendar className="w-4 h-4 text-[var(--color-event)]" />,
    course: <GraduationCap className="w-4 h-4 text-[var(--color-course)]" />,
    blog: <FileText className="w-4 h-4 text-[var(--color-blog)]" />,
};

export function CommandPalette({ isOpen, onClose, onNavigate, onSelectItem }: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [activeSection, setActiveSection] = useState<'actions' | 'results'>('actions');
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    // Quick actions
    const quickActions: QuickAction[] = [
        {
            id: 'events',
            label: 'Go to Events',
            icon: <Calendar className="w-4 h-4 text-[var(--color-event)]" />,
            action: () => { onNavigate?.('events'); onClose(); },
            shortcut: 'E',
        },
        {
            id: 'courses',
            label: 'Go to Courses',
            icon: <GraduationCap className="w-4 h-4 text-[var(--color-course)]" />,
            action: () => { onNavigate?.('courses'); onClose(); },
            shortcut: 'C',
        },
        {
            id: 'blogs',
            label: 'Go to Blogs',
            icon: <FileText className="w-4 h-4 text-[var(--color-blog)]" />,
            action: () => { onNavigate?.('blogs'); onClose(); },
            shortcut: 'B',
        },
        {
            id: 'home',
            label: 'Go to Home',
            icon: <Sparkles className="w-4 h-4 text-[var(--color-prism-start)]" />,
            action: () => { onNavigate?.('home'); onClose(); },
            shortcut: 'H',
        },
    ];

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
            setActiveSection('actions');
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Debounced search
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setActiveSection('actions');
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const response = await api.quickSearch(query, 8);
                setResults(response.results);
                setActiveSection('results');
                setSelectedIndex(0);
            } catch (err) {
                console.error('Search failed:', err);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Get current list items
    const currentItems = activeSection === 'actions' ? quickActions : results;
    const maxIndex = currentItems.length - 1;

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, maxIndex));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (activeSection === 'actions') {
                    quickActions[selectedIndex]?.action();
                } else if (results[selectedIndex]) {
                    onSelectItem?.(results[selectedIndex]);
                    onClose();
                }
                break;
            case 'Escape':
                e.preventDefault();
                onClose();
                break;
            case 'Tab':
                e.preventDefault();
                if (results.length > 0) {
                    setActiveSection(s => s === 'actions' ? 'results' : 'actions');
                    setSelectedIndex(0);
                }
                break;
        }
    }, [maxIndex, activeSection, selectedIndex, quickActions, results, onSelectItem, onClose]);

    // Scroll selected item into view
    useEffect(() => {
        if (resultsRef.current) {
            const selected = resultsRef.current.querySelector('[data-selected="true"]');
            selected?.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-xl bg-[var(--color-bg-primary)] rounded-xl shadow-2xl border border-[var(--color-border-light)] overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border-light)]">
                    {loading ? (
                        <Loader2 className="w-5 h-5 text-[var(--color-text-tertiary)] animate-spin" />
                    ) : (
                        <Search className="w-5 h-5 text-[var(--color-text-tertiary)]" />
                    )}
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search events, courses, blogs..."
                        className="flex-1 bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none text-base"
                    />
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded transition-colors"
                    >
                        <X className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                    </button>
                </div>

                {/* Results */}
                <div ref={resultsRef} className="max-h-[60vh] overflow-y-auto">
                    {/* Quick Actions (when no query) */}
                    {!query.trim() && (
                        <div className="p-2">
                            <div className="px-3 py-2 text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                                Quick Actions
                            </div>
                            {quickActions.map((action, index) => (
                                <button
                                    key={action.id}
                                    data-selected={activeSection === 'actions' && selectedIndex === index}
                                    onClick={action.action}
                                    onMouseEnter={() => {
                                        setActiveSection('actions');
                                        setSelectedIndex(index);
                                    }}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                                        activeSection === 'actions' && selectedIndex === index
                                            ? 'bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue)]'
                                            : 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
                                    )}
                                >
                                    {action.icon}
                                    <span className="flex-1 text-left text-sm">{action.label}</span>
                                    {action.shortcut && (
                                        <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] border border-[var(--color-border-light)]">
                                            {action.shortcut}
                                        </kbd>
                                    )}
                                    <ArrowRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Search Results */}
                    {query.trim() && results.length > 0 && (
                        <div className="p-2">
                            <div className="px-3 py-2 text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                                Results ({results.length})
                            </div>
                            {results.map((item, index) => (
                                <button
                                    key={item.id}
                                    data-selected={activeSection === 'results' && selectedIndex === index}
                                    onClick={() => {
                                        onSelectItem?.(item);
                                        onClose();
                                    }}
                                    onMouseEnter={() => {
                                        setActiveSection('results');
                                        setSelectedIndex(index);
                                    }}
                                    className={cn(
                                        'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors text-left',
                                        activeSection === 'results' && selectedIndex === index
                                            ? 'bg-[var(--color-accent-blue)]/10'
                                            : 'hover:bg-[var(--color-bg-tertiary)]'
                                    )}
                                >
                                    <div className="mt-0.5">
                                        {TYPE_ICONS[item.item_type]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                                            {item.title}
                                        </p>
                                        <p className="text-xs text-[var(--color-text-tertiary)] truncate mt-0.5">
                                            {item.hook || item.description || `From ${item.sender}`}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] capitalize">
                                                {item.item_type}
                                            </span>
                                            {item.start_time && (
                                                <span className="text-[10px] text-[var(--color-text-tertiary)] flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(item.start_time).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* No Results */}
                    {query.trim() && !loading && results.length === 0 && (
                        <div className="p-8 text-center">
                            <Search className="w-8 h-8 text-[var(--color-text-tertiary)] mx-auto mb-2" />
                            <p className="text-sm text-[var(--color-text-tertiary)]">
                                No results found for "{query}"
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-[var(--color-border-light)] bg-[var(--color-bg-secondary)]">
                    <div className="flex items-center gap-4 text-[10px] text-[var(--color-text-tertiary)]">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1 py-0.5 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border-light)]">↑↓</kbd>
                            Navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1 py-0.5 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border-light)]">↵</kbd>
                            Select
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1 py-0.5 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border-light)]">esc</kbd>
                            Close
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CommandPalette;
