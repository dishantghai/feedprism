/**
 * ExtractedItemCard - Clean, informative content cards
 * 
 * Refined design that balances visual appeal with information density:
 * - Uses hook/excerpt for compelling previews
 * - Shows images when available
 * - Clean typography with subtle type indicators
 */

import { useState } from 'react';
import {
    Calendar,
    MapPin,
    Clock,
    ExternalLink,
    FileText,
    GraduationCap,
    Globe,
    ArrowRight,
    User,
    Mail,
    CalendarPlus,
    Star
} from 'lucide-react';
import { EmailModal } from '../email';
import { cn } from '../../lib/utils';
import type { FeedItem } from '../../types';

interface ExtractedItemCardProps {
    item: FeedItem;
    onClick?: () => void;
    compact?: boolean;
    showEmailAttribution?: boolean;
    savedTags?: string[];
    onSaveTag?: (tag: string) => void;
}

// Clickable tag component
function ClickableTag({
    tag,
    isSaved,
    onSave
}: {
    tag: string;
    isSaved: boolean;
    onSave?: (tag: string) => void;
}) {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onSave?.(tag);
            }}
            className={cn(
                'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-all cursor-pointer group/tag',
                isSaved
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] hover:bg-blue-50 hover:text-blue-600'
            )}
            title={isSaved ? 'Click to unsave tag' : 'Click to save tag'}
        >
            {tag}
            <Star className={cn(
                'w-2.5 h-2.5 transition-all',
                isSaved
                    ? 'fill-blue-500 text-blue-500'
                    : 'opacity-0 group-hover/tag:opacity-100 text-blue-400'
            )} />
        </button>
    );
}

// Parse date for event display
function parseEventDate(dateStr: string | null | undefined): { day: string; month: string; weekday: string; time: string } | null {
    if (!dateStr) return null;
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        return {
            day: date.getDate().toString(),
            month: date.toLocaleDateString('en-US', { month: 'short' }),
            weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
            time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        };
    } catch {
        return null;
    }
}

// Check if event is soon (within 3 days)
function isEventSoon(dateStr: string | null | undefined): boolean {
    if (!dateStr) return false;
    try {
        const eventDate = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 3;
    } catch {
        return false;
    }
}

// Get event type label
function getEventTypeLabel(eventType: string | undefined): string {
    const labels: Record<string, string> = {
        webinar: 'Webinar',
        conference: 'Conference',
        workshop: 'Workshop',
        talk: 'Talk',
        meetup: 'Meetup',
        hackathon: 'Hackathon'
    };
    return eventType ? labels[eventType] || 'Event' : 'Event';
}

// Extract domain from URL
function extractDomain(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return null;
    }
}

export function ExtractedItemCard({
    item,
    onClick,
    compact = false,
    showEmailAttribution = true,
    savedTags = [],
    onSaveTag
}: ExtractedItemCardProps) {
    // Render based on item type
    // Events always get full card treatment (no compact mode) - they need CTAs
    if (item.item_type === 'event') {
        return <EventCard item={item} onClick={onClick} savedTags={savedTags} onSaveTag={onSaveTag} />;
    }

    if (item.item_type === 'course') {
        return <CourseCard item={item} onClick={onClick} compact={compact} showEmailAttribution={showEmailAttribution} savedTags={savedTags} onSaveTag={onSaveTag} />;
    }

    return <BlogCard item={item} onClick={onClick} compact={compact} showEmailAttribution={showEmailAttribution} savedTags={savedTags} onSaveTag={onSaveTag} />;
}

// =============================================================================
// Event Card - Calendar-style with date badge
// =============================================================================

function EventCard({ item, onClick, savedTags = [], onSaveTag }: {
    item: FeedItem;
    onClick?: () => void;
    savedTags?: string[];
    onSaveTag?: (tag: string) => void;
}) {
    const [showEmailModal, setShowEmailModal] = useState(false);
    const eventDate = parseEventDate(item.start_time);
    const isSoon = isEventSoon(item.start_time);

    // Generate Google Calendar link
    const getCalendarLink = () => {
        if (!item.start_time) return null;
        const start = new Date(item.start_time);
        const end = item.end_time ? new Date(item.end_time) : new Date(start.getTime() + 60 * 60 * 1000);
        const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: item.title,
            dates: `${formatDate(start)}/${formatDate(end)}`,
            details: item.description || '',
            location: item.location || '',
        });
        return `https://calendar.google.com/calendar/render?${params}`;
    };

    // Events always get the full card treatment - they need CTAs
    // No compact mode for events - they're too important to minimize

    return (
        <>
            <div
                onClick={onClick}
                className="bg-[var(--color-bg-primary)] rounded-xl border border-[var(--color-border-light)] hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group overflow-hidden"
            >
                <div className="flex">
                    {/* Date Badge - Left side (more compact) */}
                    <div className={`w-18 flex-shrink-0 flex flex-col items-center justify-center py-3 px-3 ${isSoon
                        ? 'bg-gradient-to-b from-red-500 to-red-600 text-white'
                        : 'bg-gradient-to-b from-blue-500 to-blue-600 text-white'
                        }`}>
                        {eventDate ? (
                            <>
                                <span className="text-[10px] font-medium opacity-90 uppercase">{eventDate.weekday}</span>
                                <span className="text-2xl font-bold leading-tight">{eventDate.day}</span>
                                <span className="text-xs font-medium opacity-90">{eventDate.month}</span>
                            </>
                        ) : (
                            <Calendar className="w-7 h-7 opacity-80" />
                        )}
                        {isSoon && (
                            <span className="mt-1 text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-full uppercase">
                                Soon
                            </span>
                        )}
                    </div>

                    {/* Content - Right side (more compact) */}
                    <div className="flex-1 p-3">
                        {/* Title + badges row */}
                        <div className="flex items-start gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug flex-1">
                                {item.title}
                            </h3>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                {item.event_type && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                        {getEventTypeLabel(item.event_type)}
                                    </span>
                                )}
                                {item.is_free && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                                        Free
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Time + Location row */}
                        <div className="flex items-center gap-3 text-xs text-[var(--color-text-tertiary)] mb-2">
                            {eventDate && (
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {eventDate.time}
                                </span>
                            )}
                            {item.location && (
                                <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    <span className="truncate max-w-[150px]">{item.location}</span>
                                </span>
                            )}
                        </div>

                        {/* Description - 2 lines max */}
                        {(item.hook || item.description) && (
                            <p className="text-xs text-[var(--color-text-secondary)] mb-2 line-clamp-2 leading-relaxed">
                                {item.hook || item.description}
                            </p>
                        )}

                        {/* Tags - clickable to save */}
                        {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                {item.tags.slice(0, 3).map((tag, index) => (
                                    <ClickableTag
                                        key={index}
                                        tag={tag}
                                        isSaved={savedTags.includes(tag)}
                                        onSave={onSaveTag}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Action buttons - compact row */}
                        <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-border-light)]">
                            {item.url && (
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                                    style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
                                >
                                    Register <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                            {getCalendarLink() && (
                                <a
                                    href={getCalendarLink()!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors"
                                    style={{ backgroundColor: '#f3f4f6', color: '#374151', borderColor: '#d1d5db' }}
                                >
                                    <CalendarPlus className="w-3 h-3" />
                                    Calendar
                                </a>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowEmailModal(true);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors ml-auto"
                            >
                                <Mail className="w-3 h-3" />
                                Source
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Email Modal */}
            <EmailModal
                emailId={item.email_id}
                isOpen={showEmailModal}
                onClose={() => setShowEmailModal(false)}
            />
        </>
    );
}

// =============================================================================
// Course Card - Learning-focused with provider highlight
// =============================================================================

function CourseCard({ item, onClick, compact, showEmailAttribution, savedTags = [], onSaveTag }: {
    item: FeedItem;
    onClick?: () => void;
    compact: boolean;
    showEmailAttribution: boolean;
    savedTags?: string[];
    onSaveTag?: (tag: string) => void;
}) {

    if (compact) {
        return (
            <div
                onClick={onClick}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer group"
            >
                {/* Image or icon */}
                {item.image_url ? (
                    <img
                        src={item.image_url}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                ) : (
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="w-5 h-5 text-green-600" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{item.title}</p>
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                        <span>{item.provider || 'Course'}</span>
                        {item.duration && <span>• {item.duration}</span>}
                        {item.is_free && <span className="text-green-600">Free</span>}
                    </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100" />
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            className="bg-[var(--color-bg-primary)] rounded-xl border border-[var(--color-border-light)] hover:border-green-300 hover:shadow-md transition-all cursor-pointer group overflow-hidden"
        >
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3">
                <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-white" />
                    <span className="text-sm font-medium text-white/90">
                        {item.provider || 'Online Course'}
                    </span>
                </div>
            </div>

            <div className="p-4">
                <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2 line-clamp-2 group-hover:text-green-600 transition-colors">
                    {item.title}
                </h3>

                {/* Hook or description */}
                {(item.hook || item.description) && (
                    <p className="text-sm text-[var(--color-text-secondary)] mb-3 line-clamp-2">
                        {item.hook || item.description}
                    </p>
                )}

                {/* What you'll learn */}
                {item.what_you_learn && item.what_you_learn.length > 0 && (
                    <ul className="text-xs text-[var(--color-text-secondary)] mb-3 space-y-1">
                        {item.what_you_learn.slice(0, 2).map((point, index) => (
                            <li key={index} className="flex items-start gap-1.5">
                                <span className="text-green-500 mt-0.5">•</span>
                                <span className="line-clamp-1">{point}</span>
                            </li>
                        ))}
                    </ul>
                )}

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-tertiary)] mb-3">
                    {item.duration && <span>{item.duration}</span>}
                    {item.level && <span className="capitalize">{item.level}</span>}
                    {item.is_free && <span className="text-green-600 font-medium">Free</span>}
                    {item.certificate_offered && <span>Certificate</span>}
                </div>

                {/* Tags - clickable to save */}
                {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                        {item.tags.slice(0, 3).map((tag, index) => (
                            <ClickableTag
                                key={index}
                                tag={tag}
                                isSaved={savedTags.includes(tag)}
                                onSave={onSaveTag}
                            />
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-light)]">
                    {showEmailAttribution && (
                        <span className="text-xs text-[var(--color-text-tertiary)] truncate max-w-[150px]">
                            via {item.sender}
                        </span>
                    )}
                    {item.url && (
                        <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 hover:text-green-700"
                        >
                            Enroll <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// Blog Card - Article preview with prominent image and rich excerpt
// =============================================================================

function BlogCard({ item, onClick, compact, showEmailAttribution, savedTags = [], onSaveTag }: {
    item: FeedItem;
    onClick?: () => void;
    compact: boolean;
    showEmailAttribution: boolean;
    savedTags?: string[];
    onSaveTag?: (tag: string) => void;
}) {
    const domain = extractDomain(item.url);
    // Hook and description are now displayed separately for better engagement
    const hookText = item.hook;
    const descriptionText = item.description;

    // Generate subtle background color based on category
    const categoryColors: Record<string, string> = {
        'AI': 'bg-blue-50 border-blue-200',
        'Tech': 'bg-purple-50 border-purple-200',
        'Career': 'bg-green-50 border-green-200',
        'Startup': 'bg-orange-50 border-orange-200',
        'default': 'bg-gray-50 border-gray-200'
    };
    const cardColor = categoryColors[item.category || 'default'] || categoryColors.default;

    if (compact) {
        return (
            <div
                onClick={onClick}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer group"
            >
                {/* Larger thumbnail for compact view */}
                {item.image_url ? (
                    <img
                        src={item.image_url}
                        alt=""
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                ) : (
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-purple-500" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] line-clamp-2 leading-snug">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[var(--color-text-tertiary)]">
                        <span>{item.source || item.author || 'Article'}</span>
                        {item.reading_time && (
                            <>
                                <span>•</span>
                                <span>{item.reading_time}</span>
                            </>
                        )}
                    </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 flex-shrink-0" />
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            className={`rounded-xl border ${cardColor} hover:shadow-lg transition-all cursor-pointer group overflow-hidden`}
        >
            {/* Featured Image - prominent display (≥200px height per F-004) */}
            {item.image_url && (
                <div className="relative w-full h-52 overflow-hidden bg-gray-100">
                    <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 animate-fade-in"
                        loading="lazy"
                        onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }}
                    />
                    {/* Gradient overlay for better text readability if needed */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    {/* Category badge on image */}
                    {item.category && (
                        <span className="absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full bg-white/90 text-[var(--color-text-secondary)] shadow-sm">
                            {item.category}
                        </span>
                    )}
                </div>
            )}

            <div className="p-5">
                {/* Header: Source + Author + Reading time */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                        {item.source && (
                            <span className="font-semibold text-[var(--color-text-secondary)]">
                                {item.source}
                            </span>
                        )}
                        {item.author && (
                            <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {item.author}
                                {item.author_title && (
                                    <span className="text-[var(--color-text-tertiary)]">
                                        · {item.author_title}
                                    </span>
                                )}
                            </span>
                        )}
                    </div>
                    {item.reading_time && (
                        <span className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.reading_time}
                        </span>
                    )}
                </div>

                {/* Title - larger and more prominent */}
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3 line-clamp-2 group-hover:text-[var(--color-accent-blue)] transition-colors leading-tight">
                    {item.title}
                </h3>

                {/* Hook - bold italic tagline for engagement (F-004) */}
                {hookText && (
                    <p className="text-sm font-semibold italic text-[var(--color-text-primary)] mb-2 line-clamp-2">
                        "{hookText}"
                    </p>
                )}

                {/* Description - up to 3 lines with ellipsis */}
                {descriptionText && (
                    <p className="text-sm text-[var(--color-text-secondary)] line-clamp-3 mb-4 leading-relaxed">
                        {descriptionText}
                    </p>
                )}

                {/* Key points if available - show more */}
                {item.key_points && item.key_points.length > 0 && (
                    <ul className="text-sm text-[var(--color-text-secondary)] mb-4 space-y-1.5">
                        {item.key_points.slice(0, 3).map((point, index) => (
                            <li key={index} className="flex items-start gap-2">
                                <span className="text-[var(--color-accent-blue)] mt-0.5 font-bold">→</span>
                                <span className="line-clamp-1">{point}</span>
                            </li>
                        ))}
                    </ul>
                )}

                {/* Tags - clickable to save */}
                {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        {!item.image_url && item.category && (
                            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]">
                                {item.category}
                            </span>
                        )}
                        {item.tags.slice(0, 4).map((tag, index) => (
                            <ClickableTag
                                key={index}
                                tag={tag}
                                isSaved={savedTags.includes(tag)}
                                onSave={onSaveTag}
                            />
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-light)]">
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                        {domain && (
                            <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                {domain}
                            </span>
                        )}
                        {showEmailAttribution && (
                            <span className="truncate max-w-[120px]">
                                via {item.sender}
                            </span>
                        )}
                    </div>
                    {item.url && (
                        <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-accent-blue)] hover:underline transition-all hover:gap-2"
                        >
                            Read article <ExternalLink className="w-3.5 h-3.5 transition-transform hover:translate-x-0.5" />
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ExtractedItemCard;
