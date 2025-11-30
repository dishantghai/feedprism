/**
 * EventsCalendar - Calendar view for events
 * 
 * Features:
 * - Day, Week, Month, Year views
 * - Event dots/blocks on calendar
 * - Click to see events for a day
 * - Full event cards with CTAs
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    MapPin,
    ExternalLink,
    Mail,
    RefreshCw,
    CalendarDays
} from 'lucide-react';
import { api } from '../../services/api';
import { EmailModal } from '../email';
import { ClickableTag } from '../feed/ExtractedItemCard';
import type { FeedItem } from '../../types';
import { cn } from '../../lib/utils';

type ViewMode = 'day' | 'week' | 'month' | 'year';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

// Parse event date
function parseEventDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
}

// Format time
function formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Check if same day
function isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

// Get days in month
function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

// Get first day of month (0 = Sunday)
function getFirstDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 1).getDay();
}

// Event Card for Calendar
function CalendarEventCard({
    item,
    compact = false,
    savedTags,
    onSaveTag,
    onViewSource
}: {
    item: FeedItem;
    compact?: boolean;
    savedTags: string[];
    onSaveTag: (tag: string) => void;
    onViewSource: (emailId: string) => void;
}) {
    const eventDate = parseEventDate(item.start_time);

    if (compact) {
        return (
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200 text-xs">
                <div className="w-1 h-8 bg-blue-500 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-blue-900 truncate">{item.title}</p>
                    <p className="text-blue-600">
                        {eventDate ? formatTime(eventDate) : 'TBD'}
                        {item.location && ` • ${item.location}`}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[var(--color-bg-primary)] rounded-xl border border-[var(--color-border-light)] hover:border-blue-300 hover:shadow-md transition-all overflow-hidden">
            <div className="flex">
                {/* Date Badge */}
                <div className="w-20 flex-shrink-0 bg-gradient-to-b from-blue-500 to-blue-600 flex flex-col items-center justify-center p-3 text-white">
                    {eventDate ? (
                        <>
                            <span className="text-xs uppercase opacity-80">
                                {DAYS[eventDate.getDay()]}
                            </span>
                            <span className="text-2xl font-bold">
                                {eventDate.getDate()}
                            </span>
                            <span className="text-xs uppercase opacity-80">
                                {MONTHS[eventDate.getMonth()].slice(0, 3)}
                            </span>
                        </>
                    ) : (
                        <span className="text-sm">TBD</span>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 p-4">
                    <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1 line-clamp-1">
                        {item.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-tertiary)] mb-2">
                        {eventDate && (
                            <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {formatTime(eventDate)}
                            </span>
                        )}
                        {item.location && (
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {item.location}
                            </span>
                        )}
                    </div>

                    {item.description && (
                        <p className="text-sm text-[var(--color-text-secondary)] mb-3 line-clamp-2">
                            {item.description}
                        </p>
                    )}

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {item.tags?.slice(0, 3).map((tag, i) => (
                            <ClickableTag
                                key={i}
                                tag={tag}
                                isSaved={savedTags.includes(tag)}
                                onSave={onSaveTag}
                            />
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {item.url && (
                            <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                                style={{ backgroundColor: '#1d4ed8', color: '#ffffff' }}
                            >
                                Register <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        )}
                        <button
                            onClick={() => onViewSource(item.email_id)}
                            className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] flex items-center gap-1"
                        >
                            <Mail className="w-3.5 h-3.5" />
                            Source
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Month View Component
function MonthView({
    year,
    month,
    events,
    selectedDate,
    onSelectDate
}: {
    year: number;
    month: number;
    events: FeedItem[];
    selectedDate: Date | null;
    onSelectDate: (date: Date) => void;
}) {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();

    // Group events by day
    const eventsByDay = useMemo(() => {
        const map = new Map<number, FeedItem[]>();
        for (const event of events) {
            const date = parseEventDate(event.start_time);
            if (date && date.getFullYear() === year && date.getMonth() === month) {
                const day = date.getDate();
                if (!map.has(day)) map.set(day, []);
                map.get(day)!.push(event);
            }
        }
        return map;
    }, [events, year, month]);

    const cells = [];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        cells.push(<div key={`empty-${i}`} className="h-24 bg-[var(--color-bg-tertiary)]/30" />);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isToday = isSameDay(date, today);
        const isSelected = selectedDate && isSameDay(date, selectedDate);
        const dayEvents = eventsByDay.get(day) || [];

        cells.push(
            <div
                key={day}
                onClick={() => onSelectDate(date)}
                className={cn(
                    'h-24 p-1.5 border-t border-[var(--color-border-light)] cursor-pointer transition-colors',
                    isSelected ? 'bg-blue-50' : 'hover:bg-[var(--color-bg-hover)]',
                    isToday && 'ring-2 ring-blue-500 ring-inset'
                )}
            >
                <div className={cn(
                    'text-sm font-medium mb-1',
                    isToday ? 'text-blue-600' : 'text-[var(--color-text-primary)]'
                )}>
                    {day}
                </div>

                {/* Event dots */}
                <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((event, i) => (
                        <div
                            key={i}
                            className="text-[10px] px-1 py-0.5 bg-blue-100 text-blue-700 rounded truncate"
                        >
                            {event.title}
                        </div>
                    ))}
                    {dayEvents.length > 3 && (
                        <div className="text-[10px] text-[var(--color-text-tertiary)]">
                            +{dayEvents.length - 3} more
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[var(--color-bg-primary)] rounded-xl border border-[var(--color-border-light)] overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-7 bg-[var(--color-bg-tertiary)]">
                {DAYS.map(day => (
                    <div key={day} className="py-2 text-center text-xs font-medium text-[var(--color-text-tertiary)]">
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7">
                {cells}
            </div>
        </div>
    );
}

// Week View Component
function WeekView({
    startDate,
    events,
    savedTags,
    onSaveTag,
    onViewSource
}: {
    startDate: Date;
    events: FeedItem[];
    savedTags: string[];
    onSaveTag: (tag: string) => void;
    onViewSource: (emailId: string) => void;
}) {
    const days = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        days.push(date);
    }

    const today = new Date();

    return (
        <div className="bg-[var(--color-bg-primary)] rounded-xl border border-[var(--color-border-light)] overflow-hidden">
            <div className="grid grid-cols-7 divide-x divide-[var(--color-border-light)]">
                {days.map((date, i) => {
                    const dayEvents = events.filter(e => {
                        const eventDate = parseEventDate(e.start_time);
                        return eventDate && isSameDay(eventDate, date);
                    });
                    const isToday = isSameDay(date, today);

                    return (
                        <div key={i} className="min-h-[300px]">
                            {/* Day header */}
                            <div className={cn(
                                'p-2 text-center border-b border-[var(--color-border-light)]',
                                isToday ? 'bg-blue-50' : 'bg-[var(--color-bg-tertiary)]'
                            )}>
                                <div className="text-xs text-[var(--color-text-tertiary)]">
                                    {DAYS[date.getDay()]}
                                </div>
                                <div className={cn(
                                    'text-lg font-semibold',
                                    isToday ? 'text-blue-600' : 'text-[var(--color-text-primary)]'
                                )}>
                                    {date.getDate()}
                                </div>
                            </div>

                            {/* Events */}
                            <div className="p-1.5 space-y-1.5">
                                {dayEvents.map((event, j) => (
                                    <CalendarEventCard
                                        key={j}
                                        item={event}
                                        compact
                                        savedTags={savedTags}
                                        onSaveTag={onSaveTag}
                                        onViewSource={onViewSource}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Day View Component
function DayView({
    date,
    events,
    savedTags,
    onSaveTag,
    onViewSource
}: {
    date: Date;
    events: FeedItem[];
    savedTags: string[];
    onSaveTag: (tag: string) => void;
    onViewSource: (emailId: string) => void;
}) {
    const dayEvents = events.filter(e => {
        const eventDate = parseEventDate(e.start_time);
        return eventDate && isSameDay(eventDate, date);
    }).sort((a, b) => {
        const dateA = parseEventDate(a.start_time);
        const dateB = parseEventDate(b.start_time);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
    });

    return (
        <div className="space-y-4">
            <div className="text-center py-4 bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-light)]">
                <div className="text-sm text-[var(--color-text-tertiary)]">
                    {DAYS[date.getDay()]}
                </div>
                <div className="text-3xl font-bold text-[var(--color-text-primary)]">
                    {date.getDate()}
                </div>
                <div className="text-sm text-[var(--color-text-secondary)]">
                    {MONTHS[date.getMonth()]} {date.getFullYear()}
                </div>
            </div>

            {dayEvents.length === 0 ? (
                <div className="text-center py-12 text-[var(--color-text-tertiary)]">
                    No events on this day
                </div>
            ) : (
                <div className="space-y-4">
                    {dayEvents.map((event, i) => (
                        <CalendarEventCard
                            key={i}
                            item={event}
                            savedTags={savedTags}
                            onSaveTag={onSaveTag}
                            onViewSource={onViewSource}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// Year View Component
function YearView({
    year,
    events,
    onSelectMonth
}: {
    year: number;
    events: FeedItem[];
    onSelectMonth: (month: number) => void;
}) {
    // Count events per month
    const eventsByMonth = useMemo(() => {
        const counts = new Array(12).fill(0);
        for (const event of events) {
            const date = parseEventDate(event.start_time);
            if (date && date.getFullYear() === year) {
                counts[date.getMonth()]++;
            }
        }
        return counts;
    }, [events, year]);

    return (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
            {MONTHS.map((month, i) => (
                <div
                    key={month}
                    onClick={() => onSelectMonth(i)}
                    className="p-4 bg-[var(--color-bg-primary)] rounded-xl border border-[var(--color-border-light)] hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                >
                    <div className="text-sm font-medium text-[var(--color-text-primary)] mb-2">
                        {month}
                    </div>
                    <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                        <span className="text-lg font-semibold text-blue-600">
                            {eventsByMonth[i]}
                        </span>
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                            event{eventsByMonth[i] !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

// Main Calendar Component
export function EventsCalendar() {
    const [items, setItems] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // Saved tags
    const [savedTags, setSavedTags] = useState<string[]>(() => {
        const stored = localStorage.getItem('feedprism_saved_tags');
        return stored ? JSON.parse(stored) : [];
    });

    // Email modal
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

    // Fetch events
    const fetchEvents = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const response = await api.getFeed(1, 100, ['event']);
            setItems(response.items);
        } catch (error) {
            console.error('Failed to fetch events:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    // Save tags
    useEffect(() => {
        localStorage.setItem('feedprism_saved_tags', JSON.stringify(savedTags));
    }, [savedTags]);

    const toggleSaveTag = useCallback((tag: string) => {
        setSavedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    }, []);

    // Navigation
    const navigate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);

        switch (viewMode) {
            case 'day':
                newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
                break;
            case 'week':
                newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
                break;
            case 'month':
                newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
                break;
            case 'year':
                newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
                break;
        }

        setCurrentDate(newDate);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
        setSelectedDate(new Date());
    };

    // Get week start (Sunday)
    const getWeekStart = (date: Date): Date => {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay());
        return d;
    };

    // Get title based on view
    const getTitle = (): string => {
        switch (viewMode) {
            case 'day':
                return `${MONTHS[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
            case 'week':
                const weekStart = getWeekStart(currentDate);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                return `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
            case 'month':
                return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
            case 'year':
                return String(currentDate.getFullYear());
        }
    };

    // Events for selected date
    const selectedDateEvents = useMemo(() => {
        if (!selectedDate) return [];
        return items.filter(e => {
            const eventDate = parseEventDate(e.start_time);
            return eventDate && isSameDay(eventDate, selectedDate);
        });
    }, [items, selectedDate]);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-12 bg-[var(--color-bg-tertiary)] rounded-xl animate-pulse" />
                <div className="h-96 bg-[var(--color-bg-tertiary)] rounded-xl animate-pulse" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                        Events Calendar
                    </h2>
                    <p className="text-xs text-[var(--color-text-tertiary)]">
                        {items.length} events from your emails
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex items-center bg-[var(--color-bg-tertiary)] rounded-lg p-1">
                        {(['day', 'week', 'month', 'year'] as ViewMode[]).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={cn(
                                    'px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize',
                                    viewMode === mode
                                        ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm'
                                        : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
                                )}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => fetchEvents(true)}
                        disabled={refreshing}
                        className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
                    </button>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-light)] p-3">
                <button
                    onClick={() => navigate('prev')}
                    className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                        {getTitle()}
                    </h3>
                    <button
                        onClick={goToToday}
                        className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        Today
                    </button>
                </div>

                <button
                    onClick={() => navigate('next')}
                    className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Calendar View */}
            {viewMode === 'month' && (
                <MonthView
                    year={currentDate.getFullYear()}
                    month={currentDate.getMonth()}
                    events={items}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                />
            )}

            {viewMode === 'week' && (
                <WeekView
                    startDate={getWeekStart(currentDate)}
                    events={items}
                    savedTags={savedTags}
                    onSaveTag={toggleSaveTag}
                    onViewSource={setSelectedEmailId}
                />
            )}

            {viewMode === 'day' && (
                <DayView
                    date={currentDate}
                    events={items}
                    savedTags={savedTags}
                    onSaveTag={toggleSaveTag}
                    onViewSource={setSelectedEmailId}
                />
            )}

            {viewMode === 'year' && (
                <YearView
                    year={currentDate.getFullYear()}
                    events={items}
                    onSelectMonth={(month) => {
                        const newDate = new Date(currentDate);
                        newDate.setMonth(month);
                        setCurrentDate(newDate);
                        setViewMode('month');
                    }}
                />
            )}

            {/* Selected Date Events (for month view) */}
            {viewMode === 'month' && selectedDate && selectedDateEvents.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                        Events on {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()}
                    </h3>
                    {selectedDateEvents.map((event, i) => (
                        <CalendarEventCard
                            key={i}
                            item={event}
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

export default EventsCalendar;
