/**
 * ExtractedItemCard - Individual extracted item display
 * 
 * Shows a single event, course, or blog with type-specific styling.
 */

import { Calendar, MapPin, User, BookOpen, FileText, ExternalLink, Clock } from 'lucide-react';
import { formatRelativeTime, getTypeColor } from '../../lib/utils';
import type { FeedItem } from '../../types';

interface ExtractedItemCardProps {
    item: FeedItem;
    onClick?: () => void;
    compact?: boolean;
}

export function ExtractedItemCard({ item, onClick, compact = false }: ExtractedItemCardProps) {
    const typeColor = getTypeColor(item.item_type);

    // Type-specific icon
    const TypeIcon = {
        event: Calendar,
        course: BookOpen,
        blog: FileText,
    }[item.item_type];

    // Format event time if available
    const eventTime = item.start_time ? formatRelativeTime(item.start_time) : null;

    // Check if event is upcoming (within 7 days)
    const isUrgent = item.start_time && (() => {
        const eventDate = new Date(item.start_time);
        const now = new Date();
        const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 2;
    })();

    if (compact) {
        return (
            <div
                onClick={onClick}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer group"
            >
                {/* Type indicator */}
                <div
                    className="w-1 h-8 rounded-full flex-shrink-0"
                    style={{ backgroundColor: typeColor }}
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-prism-start)]">
                        {item.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                        <span className="capitalize">{item.item_type}</span>
                        {eventTime && (
                            <>
                                <span>•</span>
                                <span className={isUrgent ? 'text-red-500 font-medium' : ''}>
                                    {eventTime}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Action indicator */}
                <ExternalLink className="w-4 h-4 text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            className="p-3 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer group border-l-2"
            style={{ borderLeftColor: typeColor }}
        >
            {/* Header */}
            <div className="flex items-start gap-3">
                {/* Type icon */}
                <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${typeColor}15` }}
                >
                    <TypeIcon className="w-4 h-4" style={{ color: typeColor }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h4 className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-prism-start)] transition-colors line-clamp-2">
                        {item.title}
                    </h4>

                    {/* Description */}
                    {item.description && (
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-2">
                            {item.description}
                        </p>
                    )}

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-[var(--color-text-tertiary)]">
                        {/* Event-specific: time and location */}
                        {item.item_type === 'event' && (
                            <>
                                {item.start_time && (
                                    <span className={`flex items-center gap-1 ${isUrgent ? 'text-red-500 font-medium' : ''}`}>
                                        <Clock className="w-3 h-3" />
                                        {eventTime}
                                    </span>
                                )}
                                {item.location && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {item.location}
                                    </span>
                                )}
                                {item.organizer && (
                                    <span className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {item.organizer}
                                    </span>
                                )}
                            </>
                        )}

                        {/* Course-specific: provider */}
                        {item.item_type === 'course' && item.provider && (
                            <span className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                {item.provider}
                            </span>
                        )}

                        {/* Blog-specific: author/source */}
                        {item.item_type === 'blog' && (
                            <>
                                {item.author && (
                                    <span className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {item.author}
                                    </span>
                                )}
                                {item.source && (
                                    <span className="flex items-center gap-1">
                                        <FileText className="w-3 h-3" />
                                        {item.source}
                                    </span>
                                )}
                            </>
                        )}
                    </div>

                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {item.tags.slice(0, 3).map((tag) => (
                                <span
                                    key={tag}
                                    className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)]"
                                >
                                    {tag}
                                </span>
                            ))}
                            {item.tags.length > 3 && (
                                <span className="px-1.5 py-0.5 text-[10px] text-[var(--color-text-tertiary)]">
                                    +{item.tags.length - 3}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Urgency badge */}
                {isUrgent && (
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-red-100 text-red-600 flex-shrink-0">
                        Soon
                    </span>
                )}
            </div>

            {/* Action button */}
            {item.url && (
                <div className="mt-3 pt-2 border-t border-[var(--color-border-light)]">
                    <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-prism-start)] hover:underline"
                    >
                        {item.item_type === 'event' && 'Register'}
                        {item.item_type === 'course' && 'Enroll'}
                        {item.item_type === 'blog' && 'Read More'}
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            )}
        </div>
    );
}

export default ExtractedItemCard;
