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
import { formatRelativeTime, getTypeColor } from '../../lib/utils';
import { SourceIcon } from '../ui';
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
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl max-h-[85vh] bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl overflow-hidden animate-pop-in">
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
                                <div className="w-10 h-10 rounded-full bg-white border border-[var(--color-border-light)] flex items-center justify-center shadow-sm">
                                    <SourceIcon source="gmail" size="md" variant="inline" />
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

                    <div className="flex items-center gap-2">
                        {/* Source indicator */}
                        <SourceIcon source="gmail" size="md" variant="badge" showLabel />

                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
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
            {/* Blog Featured Image - prominent display at top (F-004) */}
            {item.item_type === 'blog' && item.image_url && (
                <div className="relative w-full h-52 rounded-xl overflow-hidden bg-gray-100 -mt-2">
                    <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover animate-fade-in"
                        onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }}
                    />
                    {item.category && (
                        <span className="absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full bg-white/90 text-[var(--color-text-secondary)] shadow-sm">
                            {item.category}
                        </span>
                    )}
                </div>
            )}

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
                                <span>{item.author}{item.author_title && ` · ${item.author_title}`}</span>
                            </div>
                        )}
                        {item.source && (
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4" style={{ color: typeColor }} />
                                <span>{item.source}</span>
                            </div>
                        )}
                        {item.reading_time && (
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" style={{ color: typeColor }} />
                                <span>{item.reading_time}</span>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Blog Hook - bold italic tagline (F-004) */}
            {item.item_type === 'blog' && item.hook && (
                <p className="text-base font-semibold italic text-[var(--color-text-primary)] border-l-4 border-[var(--color-prism-start)] pl-4 py-2 bg-[var(--color-bg-tertiary)] rounded-r-lg">
                    "{item.hook}"
                </p>
            )}

            {/* Description */}
            {item.description && (
                <div className="prose prose-sm max-w-none">
                    <p className="text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">
                        {item.description}
                    </p>
                </div>
            )}

            {/* Blog Key Points (F-004) */}
            {item.item_type === 'blog' && item.key_points && item.key_points.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide">Key Takeaways</h3>
                    <ul className="space-y-2">
                        {item.key_points.map((point, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                                <span className="text-[var(--color-prism-start)] font-bold mt-0.5">→</span>
                                <span>{point}</span>
                            </li>
                        ))}
                    </ul>
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
    // Get counts by type
    const typeCounts = emailGroup.items.reduce(
        (acc, item) => {
            acc[item.item_type] = (acc[item.item_type] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );

    return (
        <div className="space-y-6">
            {/* Email Header Section */}
            <div className="bg-gradient-to-br from-[var(--color-bg-tertiary)] to-[var(--color-bg-secondary)] rounded-xl p-5 border border-[var(--color-border-light)]">
                <div className="flex items-start gap-4">
                    {/* Gmail Icon as Avatar */}
                    <div className="w-12 h-12 rounded-full bg-white border border-[var(--color-border-light)] flex items-center justify-center flex-shrink-0 shadow-sm">
                        <SourceIcon source="gmail" size="lg" variant="inline" />
                    </div>

                    <div className="flex-1 min-w-0">
                        {/* Sender info */}
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-base font-semibold text-[var(--color-text-primary)]">
                                {emailGroup.sender}
                            </span>
                        </div>
                        <p className="text-xs text-[var(--color-text-tertiary)] mb-3">
                            {emailGroup.sender_email} • {new Date(emailGroup.received_at).toLocaleString()}
                        </p>

                        {/* Subject */}
                        <h1 className="text-lg font-medium text-[var(--color-text-primary)] leading-snug">
                            {emailGroup.email_subject}
                        </h1>
                    </div>
                </div>

                {/* Extraction Summary */}
                <div className="mt-4 pt-4 border-t border-[var(--color-border-light)]">
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-[var(--color-text-tertiary)]">Extracted:</span>
                        <div className="flex items-center gap-2">
                            {typeCounts.event && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                    <Calendar className="w-3 h-3" />
                                    {typeCounts.event} event{typeCounts.event > 1 ? 's' : ''}
                                </span>
                            )}
                            {typeCounts.course && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                    <BookOpen className="w-3 h-3" />
                                    {typeCounts.course} course{typeCounts.course > 1 ? 's' : ''}
                                </span>
                            )}
                            {typeCounts.blog && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                    <FileText className="w-3 h-3" />
                                    {typeCounts.blog} article{typeCounts.blog > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Extracted Items Section */}
            <div>
                <h2 className="text-sm font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide mb-4">
                    Extracted Content
                </h2>
                <div className="space-y-4">
                    {emailGroup.items.map((item) => (
                        <ExtractedItemCard
                            key={item.id}
                            item={item}
                            onClick={() => onItemClick?.(item)}
                            showEmailAttribution={false}
                        />
                    ))}
                </div>
            </div>

            {/* Original Email Preview Placeholder */}
            <div className="pt-4 border-t border-[var(--color-border-light)]">
                <details className="group">
                    <summary className="flex items-center gap-2 cursor-pointer text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]">
                        <Mail className="w-4 h-4" />
                        <span>View original email</span>
                        <span className="text-xs">(coming soon)</span>
                    </summary>
                    <div className="mt-4 p-4 bg-[var(--color-bg-tertiary)] rounded-lg text-sm text-[var(--color-text-tertiary)]">
                        Original email content will be displayed here in a future update.
                        This will show the full email body as it was received.
                    </div>
                </details>
            </div>
        </div>
    );
}

export default DetailModal;
