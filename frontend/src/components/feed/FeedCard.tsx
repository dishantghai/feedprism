/**
 * FeedCard - Email grouping with balanced context
 * 
 * Shows email source with enough context while keeping focus on content.
 * Provides a clear container for items from the same email.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, ExternalLink, Mail } from 'lucide-react';
import { formatRelativeTime } from '../../lib/utils';
import { ExtractedItemCard } from './ExtractedItemCard';
import { SourceIcon } from '../ui';
import { EmailModal } from '../email';
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
    savedTags?: string[];
    onSaveTag?: (tag: string) => void;
}

export function FeedCard({ emailGroup, onItemClick, onEmailClick, savedTags = [], onSaveTag }: FeedCardProps) {
    const { email_id, email_subject, sender, received_at, items } = emailGroup;
    const [showAll, setShowAll] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);

    // Show max 3 items initially
    const visibleItems = showAll ? items : items.slice(0, 3);
    const hasMore = items.length > 3;

    // Count items by type for summary
    const typeCounts = items.reduce((acc, item) => {
        acc[item.item_type] = (acc[item.item_type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border-light)] overflow-hidden hover-lift">
            {/* Email Header */}
            <div
                onClick={() => onEmailClick?.(emailGroup)}
                className="px-4 py-3 border-b border-[var(--color-border-light)] cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors group"
            >
                <div className="flex items-center gap-3">
                    {/* Gmail Source Icon as Avatar */}
                    <div className="w-9 h-9 rounded-full bg-white border border-[var(--color-border-light)] flex items-center justify-center flex-shrink-0 shadow-sm">
                        <SourceIcon source="gmail" size="md" variant="inline" />
                    </div>

                    {/* Email Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                                {sender}
                            </span>
                            <span className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1 flex-shrink-0">
                                <Clock className="w-3 h-3" />
                                {formatRelativeTime(received_at)}
                            </span>
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">
                            {email_subject}
                        </p>
                    </div>

                    {/* Item count badges */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {typeCounts.event && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                {typeCounts.event} event{typeCounts.event > 1 ? 's' : ''}
                            </span>
                        )}
                        {typeCounts.course && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                                {typeCounts.course} course{typeCounts.course > 1 ? 's' : ''}
                            </span>
                        )}
                        {typeCounts.blog && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                                {typeCounts.blog} article{typeCounts.blog > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    <ExternalLink className="w-4 h-4 text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
            </div>

            {/* Content Items - blogs get full cards for better engagement, others stay compact */}
            <div className="p-3 space-y-3">
                {visibleItems.map((item) => (
                    <ExtractedItemCard
                        key={item.id}
                        item={item}
                        onClick={() => onItemClick?.(item)}
                        compact={item.item_type !== 'blog'}
                        showEmailAttribution={false}
                        savedTags={savedTags}
                        onSaveTag={onSaveTag}
                    />
                ))}

                {/* Show more/less toggle */}
                {hasMore && (
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="flex items-center justify-center gap-1.5 w-full py-2.5 text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] rounded-lg transition-colors"
                    >
                        {showAll ? (
                            <>
                                <ChevronUp className="w-4 h-4" />
                                Show less
                            </>
                        ) : (
                            <>
                                <ChevronDown className="w-4 h-4" />
                                Show {items.length - 3} more items
                            </>
                        )}
                    </button>
                )}

                {/* View Source Email button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowEmailModal(true);
                    }}
                    className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-medium text-[var(--color-accent-blue)] hover:bg-[var(--color-accent-blue)]/5 rounded-lg transition-colors"
                >
                    <Mail className="w-3.5 h-3.5" />
                    View Source Email
                </button>
            </div>

            {/* Email Modal */}
            <EmailModal
                emailId={email_id}
                isOpen={showEmailModal}
                onClose={() => setShowEmailModal(false)}
            />
        </div>
    );
}

export default FeedCard;
