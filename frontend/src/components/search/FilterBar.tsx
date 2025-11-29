/**
 * FilterBar - Filter chips row for feed filtering
 * 
 * Features:
 * - Type filter (Events, Courses, Blogs, All)
 * - Status filter (Upcoming, Past, Any)
 * - Sort dropdown (Recent, Relevance)
 * - Active filter indicators
 */

import { useState } from 'react';
import {
    Calendar,
    GraduationCap,
    FileText,
    Clock,
    ArrowUpDown,
    X,
    ChevronDown,
    Filter,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ItemType } from '../../types';

export type StatusFilter = 'any' | 'upcoming' | 'past';
export type SortOption = 'recent' | 'relevance';

export interface FilterState {
    types: ItemType[];
    status: StatusFilter;
    sort: SortOption;
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
        onFiltersChange({ types: [], status: 'any', sort: 'recent' });
    };

    const hasActiveFilters = filters.types.length > 0 || filters.status !== 'any';

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
