/**
 * FilterBar - Filter chips row for feed filtering
 * 
 * Features:
 * - Type filter (Events, Courses, Blogs, All)
 * - Status filter (Upcoming, Past, Any)
 * - Sort dropdown (Recent, Relevance)
 * - Active filter indicators
 */

import { useState, useEffect } from 'react';
import {
    Calendar,
    GraduationCap,
    FileText,
    Clock,
    ArrowUpDown,
    X,
    ChevronDown,
    Filter,
    Mail,
    Search,
} from 'lucide-react';
import { api, type SenderInfo } from '../../services/api';
import { cn } from '../../lib/utils';
import type { ItemType } from '../../types';

export type StatusFilter = 'any' | 'upcoming' | 'past';
export type SortOption = 'recent' | 'relevance';

export interface FilterState {
    types: ItemType[];
    status: StatusFilter;
    sort: SortOption;
    senders: string[];  // Array of sender emails
    tags: string[];     // Array of selected tags
}

interface FilterBarProps {
    filters: FilterState;
    onFiltersChange: (filters: FilterState) => void;
    showTypeFilter?: boolean;
    className?: string;
}

interface FilterChipProps {
    label: string;
    icon?: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
    color?: string;
}

function FilterChip({ label, icon, isActive, onClick, color }: FilterChipProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150',
                isActive
                    ? 'bg-[var(--color-accent-blue)] text-white shadow-sm'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]'
            )}
            style={isActive && color ? { backgroundColor: color } : undefined}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}

interface DropdownProps {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
    icon?: React.ReactNode;
}

function Dropdown({ label, value, options, onChange, icon }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(o => o.value === value);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150',
                    'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
                )}
            >
                {icon}
                <span>{selectedOption?.label || label}</span>
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', isOpen && 'rotate-180')} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-1 z-20 min-w-[140px] bg-[var(--color-bg-primary)] rounded-lg shadow-lg border border-[var(--color-border-light)] py-1 overflow-hidden">
                        {options.map(option => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    'w-full px-3 py-2 text-sm text-left transition-colors',
                                    value === option.value
                                        ? 'bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue)]'
                                        : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// Sender dropdown with search and multi-select
interface SenderDropdownProps {
    selectedSenders: string[];
    onToggleSender: (email: string) => void;
    onClearSenders: () => void;
}

function SenderDropdown({ selectedSenders, onToggleSender, onClearSenders }: SenderDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [senders, setSenders] = useState<SenderInfo[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    // Fetch senders when dropdown opens
    useEffect(() => {
        if (isOpen && senders.length === 0) {
            setLoading(true);
            api.getSenders()
                .then(res => setSenders(res.senders))
                .catch(err => console.error('Failed to fetch senders:', err))
                .finally(() => setLoading(false));
        }
    }, [isOpen, senders.length]);

    // Filter senders by search query
    const filteredSenders = senders.filter(s =>
        s.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedCount = selectedSenders.length;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150',
                    selectedCount > 0
                        ? 'bg-[var(--color-accent-blue)] text-white'
                        : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
                )}
            >
                <Mail className="w-3.5 h-3.5" />
                <span>{selectedCount > 0 ? `${selectedCount} Sender${selectedCount > 1 ? 's' : ''}` : 'Sender'}</span>
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', isOpen && 'rotate-180')} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-1 z-20 w-72 bg-[var(--color-bg-primary)] rounded-lg shadow-lg border border-[var(--color-border-light)] overflow-hidden animate-scale-in">
                        {/* Search box */}
                        <div className="p-2 border-b border-[var(--color-border-light)]">
                            <div className="flex items-center gap-2 px-2 py-1.5 bg-[var(--color-bg-tertiary)] rounded-md">
                                <Search className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search senders..."
                                    className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none"
                                />
                            </div>
                        </div>

                        {/* Sender list */}
                        <div className="max-h-64 overflow-y-auto">
                            {loading ? (
                                <div className="p-4 text-center text-sm text-[var(--color-text-tertiary)]">
                                    Loading senders...
                                </div>
                            ) : filteredSenders.length === 0 ? (
                                <div className="p-4 text-center text-sm text-[var(--color-text-tertiary)]">
                                    No senders found
                                </div>
                            ) : (
                                filteredSenders.slice(0, 15).map(sender => (
                                    <button
                                        key={sender.email}
                                        onClick={() => onToggleSender(sender.email)}
                                        className={cn(
                                            'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                                            selectedSenders.includes(sender.email)
                                                ? 'bg-[var(--color-accent-blue)]/10'
                                                : 'hover:bg-[var(--color-bg-tertiary)]'
                                        )}
                                    >
                                        {/* Checkbox */}
                                        <div className={cn(
                                            'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                                            selectedSenders.includes(sender.email)
                                                ? 'bg-[var(--color-accent-blue)] border-[var(--color-accent-blue)]'
                                                : 'border-[var(--color-border-medium)]'
                                        )}>
                                            {selectedSenders.includes(sender.email) && (
                                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>

                                        {/* Sender info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                                                {sender.display_name}
                                            </p>
                                            <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                                                {sender.email}
                                            </p>
                                        </div>

                                        {/* Count badge */}
                                        <span className="text-xs text-[var(--color-text-tertiary)] bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 rounded">
                                            {sender.count}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        {selectedCount > 0 && (
                            <div className="p-2 border-t border-[var(--color-border-light)]">
                                <button
                                    onClick={() => {
                                        onClearSenders();
                                        setIsOpen(false);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                                >
                                    Clear selection
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export function FilterBar({ filters, onFiltersChange, showTypeFilter = true, className }: FilterBarProps) {
    const typeFilters: { type: ItemType; label: string; icon: React.ReactNode; color: string }[] = [
        { type: 'event', label: 'Events', icon: <Calendar className="w-3.5 h-3.5" />, color: 'var(--color-event)' },
        { type: 'course', label: 'Courses', icon: <GraduationCap className="w-3.5 h-3.5" />, color: 'var(--color-course)' },
        { type: 'blog', label: 'Blogs', icon: <FileText className="w-3.5 h-3.5" />, color: 'var(--color-blog)' },
    ];

    const statusOptions = [
        { value: 'any', label: 'Any Time' },
        { value: 'upcoming', label: 'Upcoming' },
        { value: 'past', label: 'Past' },
    ];

    const sortOptions = [
        { value: 'recent', label: 'Most Recent' },
        { value: 'relevance', label: 'Relevance' },
    ];

    const toggleType = (type: ItemType) => {
        const newTypes = filters.types.includes(type)
            ? filters.types.filter(t => t !== type)
            : [...filters.types, type];
        onFiltersChange({ ...filters, types: newTypes });
    };

    const clearFilters = () => {
        onFiltersChange({ types: [], status: 'any', sort: 'recent', senders: [], tags: [] });
    };

    const hasActiveFilters = filters.types.length > 0 || filters.status !== 'any' || filters.senders.length > 0 || filters.tags.length > 0;

    return (
        <div className={cn('flex items-center gap-2 flex-wrap', className)}>
            {/* Filter Icon */}
            <div className="flex items-center gap-1.5 text-[var(--color-text-tertiary)] mr-1">
                <Filter className="w-4 h-4" />
                <span className="text-xs font-medium">Filters</span>
            </div>

            {/* Type Filters */}
            {showTypeFilter && (
                <div className="flex items-center gap-1.5">
                    <FilterChip
                        label="All"
                        isActive={filters.types.length === 0}
                        onClick={() => onFiltersChange({ ...filters, types: [] })}
                    />
                    {typeFilters.map(({ type, label, icon, color }) => (
                        <FilterChip
                            key={type}
                            label={label}
                            icon={icon}
                            isActive={filters.types.includes(type)}
                            onClick={() => toggleType(type)}
                            color={filters.types.includes(type) ? color : undefined}
                        />
                    ))}
                </div>
            )}

            {/* Divider */}
            <div className="w-px h-5 bg-[var(--color-border-light)] mx-1" />

            {/* Status Filter */}
            <Dropdown
                label="Status"
                value={filters.status}
                options={statusOptions}
                onChange={(value) => onFiltersChange({ ...filters, status: value as StatusFilter })}
                icon={<Clock className="w-3.5 h-3.5" />}
            />

            {/* Sort */}
            <Dropdown
                label="Sort"
                value={filters.sort}
                options={sortOptions}
                onChange={(value) => onFiltersChange({ ...filters, sort: value as SortOption })}
                icon={<ArrowUpDown className="w-3.5 h-3.5" />}
            />

            {/* Sender Filter */}
            <SenderDropdown
                selectedSenders={filters.senders}
                onToggleSender={(email) => {
                    const newSenders = filters.senders.includes(email)
                        ? filters.senders.filter(s => s !== email)
                        : [...filters.senders, email];
                    onFiltersChange({ ...filters, senders: newSenders });
                }}
                onClearSenders={() => onFiltersChange({ ...filters, senders: [] })}
            />

            {/* Clear Filters */}
            {hasActiveFilters && (
                <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                    <X className="w-3 h-3" />
                    Clear
                </button>
            )}
        </div>
    );
}

export default FilterBar;
