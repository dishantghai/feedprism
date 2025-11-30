/**
 * EmailModal - View source email in a modal popup
 * 
 * Shows the original email content with metadata, HTML body,
 * and actions like "Open in Gmail".
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    ExternalLink,
    Copy,
    Check,
    AlertCircle,
} from 'lucide-react';
import { getEmailDetail } from '../../services/api';
import { SourceIcon } from '../ui';
import { Skeleton } from '../ui/Skeleton';

interface EmailModalProps {
    emailId: string;
    isOpen: boolean;
    onClose: () => void;
}

interface EmailData {
    id: string;
    subject: string;
    sender: string;
    sender_email: string;
    received_at: string;
    body_html?: string | null;
    body_text?: string | null;
    gmail_link?: string | null;
    extracted_count: number;
}

export function EmailModal({ emailId, isOpen, onClose }: EmailModalProps) {
    const [email, setEmail] = useState<EmailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Fetch email data
    useEffect(() => {
        if (!isOpen || !emailId) return;

        setLoading(true);
        setError(null);

        getEmailDetail(emailId, true)
            .then((data: EmailData) => {
                setEmail(data);
            })
            .catch((err: Error) => {
                console.error('Failed to fetch email:', err);
                setError('Failed to load email. It may have been deleted.');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [emailId, isOpen]);

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
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    // Copy Gmail link
    const handleCopyLink = () => {
        if (email?.gmail_link) {
            navigator.clipboard.writeText(email.gmail_link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!isOpen) return null;

    // Use portal to render modal at document body level (prevents flickering from parent re-renders)
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-3xl max-h-[90vh] bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl overflow-hidden animate-pop-in flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-light)] bg-[var(--color-bg-secondary)]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white border border-[var(--color-border-light)] flex items-center justify-center shadow-sm">
                            <SourceIcon source="gmail" size="md" variant="inline" />
                        </div>
                        <div>
                            <h2 className="text-sm font-medium text-[var(--color-text-primary)]">
                                Source Email
                            </h2>
                            <p className="text-xs text-[var(--color-text-tertiary)]">
                                View original email content
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <EmailModalSkeleton />
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                            <AlertCircle className="w-12 h-12 text-[var(--color-text-tertiary)] mb-4" />
                            <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                                Unable to load email
                            </h3>
                            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                                {error}
                            </p>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] bg-[var(--color-bg-tertiary)] rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    ) : email ? (
                        <>
                            {/* Email Metadata */}
                            <div className="px-6 py-4 border-b border-[var(--color-border-light)] space-y-2">
                                <div className="flex items-start gap-2">
                                    <span className="text-xs font-medium text-[var(--color-text-tertiary)] w-14 pt-0.5">From</span>
                                    <div className="flex-1">
                                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                                            {email.sender}
                                        </span>
                                        <span className="text-sm text-[var(--color-text-tertiary)] ml-1">
                                            &lt;{email.sender_email}&gt;
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-[var(--color-text-tertiary)] w-14">Date</span>
                                    <span className="text-sm text-[var(--color-text-secondary)]">
                                        {new Date(email.received_at).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-start gap-2 pt-2">
                                    <span className="text-xs font-medium text-[var(--color-text-tertiary)] w-14 pt-0.5">Subject</span>
                                    <h3 className="text-base font-semibold text-[var(--color-text-primary)] flex-1">
                                        {email.subject}
                                    </h3>
                                </div>
                            </div>

                            {/* Email Body */}
                            <div className="px-6 py-4">
                                {email.body_html ? (
                                    <div
                                        className="email-body-html prose prose-sm max-w-none text-[var(--color-text-primary)]"
                                        dangerouslySetInnerHTML={{ __html: email.body_html }}
                                    />
                                ) : email.body_text ? (
                                    <pre className="whitespace-pre-wrap font-mono text-sm text-[var(--color-text-primary)] leading-relaxed">
                                        {email.body_text}
                                    </pre>
                                ) : (
                                    <p className="text-sm text-[var(--color-text-tertiary)] italic">
                                        Email body not available
                                    </p>
                                )}
                            </div>
                        </>
                    ) : null}
                </div>

                {/* Footer Actions */}
                {email && !loading && !error && (
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border-light)] bg-[var(--color-bg-secondary)]">
                        <button
                            onClick={handleCopyLink}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4 text-green-500" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    Copy Link
                                </>
                            )}
                        </button>
                        {email.gmail_link && (
                            <a
                                href={email.gmail_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                                style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
                            >
                                <ExternalLink className="w-4 h-4" />
                                Open in Gmail
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}

// Loading skeleton
function EmailModalSkeleton() {
    return (
        <div className="p-6 space-y-4">
            {/* Metadata skeleton */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Skeleton className="w-14 h-4" />
                    <Skeleton className="w-48 h-4" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="w-14 h-4" />
                    <Skeleton className="w-32 h-4" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="w-14 h-4" />
                    <Skeleton className="w-64 h-5" />
                </div>
            </div>

            {/* Body skeleton */}
            <div className="pt-4 space-y-3">
                <Skeleton className="w-full h-4" />
                <Skeleton className="w-full h-4" />
                <Skeleton className="w-3/4 h-4" />
                <Skeleton className="w-full h-4" />
                <Skeleton className="w-5/6 h-4" />
                <Skeleton className="w-full h-4" />
                <Skeleton className="w-2/3 h-4" />
            </div>
        </div>
    );
}

export default EmailModal;
