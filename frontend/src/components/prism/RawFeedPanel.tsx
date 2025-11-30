/**
 * RawFeedPanel - Left panel showing recent raw emails
 * 
 * Displays the "input" side of the prism visualization.
 */

import { Mail, Clock } from 'lucide-react';
import { formatRelativeTime, truncate } from '../../lib/utils';
import { EmailItemSkeleton, SourceIcon } from '../ui';
import type { EmailSummary } from '../../types';

interface RawFeedPanelProps {
    emails: EmailSummary[];
    loading?: boolean;
    title?: string;
}

export function RawFeedPanel({ emails, loading, title = 'Raw Inbox' }: RawFeedPanelProps) {
    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <EmailItemSkeleton key={i} />
                ))}
            </div>
        );
    }

    if (emails.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center">
                <Mail className="w-8 h-8 text-[var(--color-text-tertiary)] mb-2" />
                <p className="text-sm text-[var(--color-text-tertiary)]">No recent emails</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
                <Mail className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                <span className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide">
                    {title}
                </span>
            </div>

            {emails.map((email) => (
                <div
                    key={email.id}
                    className="p-3 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer group"
                >
                    <div className="flex items-center gap-2 mb-1.5">
                        {/* Gmail Icon as Avatar */}
                        <div className="w-6 h-6 rounded-full bg-white border border-[var(--color-border-light)] flex items-center justify-center flex-shrink-0 shadow-sm">
                            <SourceIcon source="gmail" size="sm" variant="inline" />
                        </div>
                        <span className="text-xs font-medium text-[var(--color-text-primary)] truncate">
                            {email.sender}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-tertiary)] ml-auto flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(email.received_at)}
                        </span>
                    </div>

                    {/* Subject */}
                    <p className="text-sm text-[var(--color-text-primary)] font-medium leading-snug mb-1">
                        {truncate(email.subject, 60)}
                    </p>

                    {/* Snippet */}
                    {email.snippet && (
                        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                            {truncate(email.snippet, 80)}
                        </p>
                    )}

                    {/* Extracted count badge */}
                    {email.extracted_count > 0 && (
                        <div className="mt-2 flex items-center gap-1">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-prism-start)]/10 text-[var(--color-prism-start)] font-medium">
                                {email.extracted_count} item{email.extracted_count > 1 ? 's' : ''} extracted
                            </span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

export default RawFeedPanel;
