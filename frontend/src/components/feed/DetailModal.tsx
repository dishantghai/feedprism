/**
 * DetailModal - Arc-style popup for item details
 * 
 * Shows full details of an extracted item or email group
 * in a modal overlay with smooth animations.
 */

import { useEffect, useCallback } from 'react';
import {
    X,
    Calendar,
    BookOpen,
    FileText,
    Clock,
    MapPin,
    User,
    ExternalLink,
    Mail,
    Tag,
} from 'lucide-react';
import { formatRelativeTime, getTypeColor, getInitials } from '../../lib/utils';
import type { FeedItem } from '../../types';
import type { EmailGroup } from './FeedCard';
import { ExtractedItemCard } from './ExtractedItemCard';

interface DetailModalProps {
    item?: FeedItem | null;
    emailGroup?: EmailGroup | null;
    onClose: () => void;
    onItemClick?: (item: FeedItem) => void;
}

export function DetailModal({ item, emailGroup, onClose, onItemClick }: DetailModalProps) {
    // Handle escape key
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        },
        [onClose]
    );

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [handleKeyDown]);

    // Determine what to show
    const showItem = item && !emailGroup;
    const showEmailGroup = emailGroup;

    if (!showItem && !showEmailGroup) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl max-h-[85vh] bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl overflow-hidden animate-slideUp">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[var(--color-bg-primary)] border-b border-[var(--color-border-light)]">
                    <div className="flex items-center gap-3">
                        {showItem && (
                            <>
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: `${getTypeColor(item.item_type)}15` }}
                                >
                                    {item.item_type === 'event' && (
                                        <Calendar className="w-5 h-5" style={{ color: getTypeColor('event') }} />
                                    )}
                                    {item.item_type === 'course' && (
                                        <BookOpen className="w-5 h-5" style={{ color: getTypeColor('course') }} />
                                    )}
                                    {item.item_type === 'blog' && (
                                        <FileText className="w-5 h-5" style={{ color: getTypeColor('blog') }} />
                                    )}
                                </div>
                                <div>
                                    <span
                                        className="text-xs font-medium uppercase tracking-wide"
                                        style={{ color: getTypeColor(item.item_type) }}
                                    >
                                        {item.item_type}
                                    </span>
                                </div>
                            </>
                        )}
                        {showEmailGroup && (
                            <>
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-prism-start)] to-[var(--color-prism-end)] flex items-center justify-center text-sm text-white font-medium">
                                    {getInitials(emailGroup.sender)}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                                        {emailGroup.sender}
                                    </p>
                                    <p className="text-xs text-[var(--color-text-tertiary)]">
                                        {formatRelativeTime(emailGroup.received_at)}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-6">
                    {showItem && <ItemDetail item={item} />}
                    {showEmailGroup && (
                        <EmailGroupDetail
                            emailGroup={emailGroup}
                            onItemClick={onItemClick}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// Item detail view
function ItemDetail({ item }: { item: FeedItem }) {
    const typeColor = getTypeColor(item.item_type);

    return (
        <div className="space-y-6">
            {/* Title */}
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] leading-tight">
                {item.title}
            </h1>

            {/* Meta info */}
            <div className="flex flex-wrap gap-4 text-sm text-[var(--color-text-secondary)]">
                {/* Event-specific */}
                {item.item_type === 'event' && (
                    <>
                        {item.start_time && (
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" style={{ color: typeColor }} />
                                <span>{new Date(item.start_time).toLocaleString()}</span>
                            </div>
                        )}
                        {item.location && (
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" style={{ color: typeColor }} />
                                <span>{item.location}</span>
                            </div>
                        )}
                        {item.organizer && (
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4" style={{ color: typeColor }} />
                                <span>{item.organizer}</span>
                            </div>
                        )}
                    </>
                )}

                {/* Course-specific */}
                {item.item_type === 'course' && item.provider && (
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" style={{ color: typeColor }} />
                        <span>{item.provider}</span>
                    </div>
                )}

                {/* Blog-specific */}
                {item.item_type === 'blog' && (
                    <>
                        {item.author && (
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4" style={{ color: typeColor }} />
                                <span>{item.author}</span>
                            </div>
                        )}
                        {item.source && (
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4" style={{ color: typeColor }} />
                                <span>{item.source}</span>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Description */}
            {item.description && (
                <div className="prose prose-sm max-w-none">
                    <p className="text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">
                        {item.description}
                    </p>
                </div>
            )}

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                        <Tag className="w-3 h-3" />
                        <span>Tags</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {item.tags.map((tag) => (
                            <span
                                key={tag}
                                className="px-2 py-1 text-xs rounded-md bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Source email */}
            <div className="pt-4 border-t border-[var(--color-border-light)]">
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)] mb-2">
                    <Mail className="w-3 h-3" />
                    <span>Extracted from</span>
                </div>
                <div className="p-3 rounded-lg bg-[var(--color-bg-tertiary)]">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        {item.email_subject}
                    </p>
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                        From {item.sender} • {formatRelativeTime(item.received_at)}
                    </p>
                </div>
            </div>

            {/* Action button */}
            {item.url && (
                <div className="pt-4">
                    <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--color-prism-start)] to-[var(--color-prism-end)] text-white font-medium hover:opacity-90 transition-opacity shadow-lg"
                    >
                        {item.item_type === 'event' && 'Register for Event'}
                        {item.item_type === 'course' && 'Enroll in Course'}
                        {item.item_type === 'blog' && 'Read Full Article'}
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            )}
        </div>
    );
}

// Email group detail view
function EmailGroupDetail({
    emailGroup,
    onItemClick,
}: {
    emailGroup: EmailGroup;
    onItemClick?: (item: FeedItem) => void;
}) {
    return (
        <div className="space-y-6">
            {/* Email subject */}
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)] leading-tight">
                {emailGroup.email_subject}
            </h1>

            {/* Extracted items */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                    <span>{emailGroup.items.length} items extracted</span>
                </div>

                {emailGroup.items.map((item) => (
                    <ExtractedItemCard
                        key={item.id}
                        item={item}
                        onClick={() => onItemClick?.(item)}
                    />
                ))}
            </div>
        </div>
    );
}

export default DetailModal;
