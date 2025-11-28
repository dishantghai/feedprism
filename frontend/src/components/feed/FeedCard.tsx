/**
 * FeedCard - Email card with nested extracted items
 * 
 * Groups extracted items by source email, showing email header
 * and nested items in a Notion-style block format.
 */

import { Mail, Clock, ChevronRight, Calendar, BookOpen, FileText } from 'lucide-react';
import { formatRelativeTime, getInitials, getTypeColor } from '../../lib/utils';
import { ExtractedItemCard } from './ExtractedItemCard';
import type { FeedItem } from '../../types';

export interface EmailGroup {
    email_id: string;
    email_subject: string;
    sender: string;
    sender_email: string;
    received_at: string;
    items: FeedItem[];
}

interface FeedCardProps {
    emailGroup: EmailGroup;
    onItemClick?: (item: FeedItem) => void;
    onEmailClick?: (emailGroup: EmailGroup) => void;
}

export function FeedCard({ emailGroup, onItemClick, onEmailClick }: FeedCardProps) {
    const { email_subject, sender, received_at, items } = emailGroup;

    // Count items by type
    const typeCounts = items.reduce(
        (acc, item) => {
            acc[item.item_type] = (acc[item.item_type] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );

    // Check if any item is urgent
    const hasUrgentItem = items.some((item) => {
        if (!item.start_time) return false;
        const eventDate = new Date(item.start_time);
        const now = new Date();
        const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 2;
    });

    return (
        <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-light)] overflow-hidden hover:border-[var(--color-border-medium)] transition-colors">
            {/* Email Header */}
            <div
                onClick={() => onEmailClick?.(emailGroup)}
                className="p-4 cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors group"
            >
                <div className="flex items-start gap-3">
                    {/* Sender Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-prism-start)] to-[var(--color-prism-end)] flex items-center justify-center text-sm text-white font-medium flex-shrink-0">
                        {getInitials(sender)}
                    </div>

                    {/* Email Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-[var(--color-text-primary)]">
                                {sender}
                            </span>
                            <span className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatRelativeTime(received_at)}
                            </span>
                            {hasUrgentItem && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-red-100 text-red-600">
                                    Action needed
                                </span>
                            )}
                        </div>

                        <h3 className="text-sm text-[var(--color-text-primary)] font-medium line-clamp-1 group-hover:text-[var(--color-prism-start)] transition-colors">
                            {email_subject}
                        </h3>

                        {/* Type badges */}
                        <div className="flex items-center gap-2 mt-2">
                            {typeCounts.event && (
                                <TypeBadge type="event" count={typeCounts.event} />
                            )}
                            {typeCounts.course && (
                                <TypeBadge type="course" count={typeCounts.course} />
                            )}
                            {typeCounts.blog && (
                                <TypeBadge type="blog" count={typeCounts.blog} />
                            )}
                        </div>
                    </div>

                    {/* Expand indicator */}
                    <ChevronRight className="w-5 h-5 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-secondary)] transition-colors flex-shrink-0" />
                </div>
            </div>

            {/* Extracted Items */}
            <div className="px-4 pb-4 space-y-2">
                {items.slice(0, 3).map((item) => (
                    <ExtractedItemCard
                        key={item.id}
                        item={item}
                        onClick={() => onItemClick?.(item)}
                        compact={items.length > 2}
                    />
                ))}

                {/* Show more indicator */}
                {items.length > 3 && (
                    <button
                        onClick={() => onEmailClick?.(emailGroup)}
                        className="w-full py-2 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
                    >
                        +{items.length - 3} more items
                    </button>
                )}
            </div>
        </div>
    );
}

// Type badge component
function TypeBadge({ type, count }: { type: string; count: number }) {
    const color = getTypeColor(type);
    const Icon = {
        event: Calendar,
        course: BookOpen,
        blog: FileText,
    }[type] || Mail;

    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{
                backgroundColor: `${color}15`,
                color: color,
            }}
        >
            <Icon className="w-3 h-3" />
            {count} {type}{count > 1 ? 's' : ''}
        </span>
    );
}

export default FeedCard;
