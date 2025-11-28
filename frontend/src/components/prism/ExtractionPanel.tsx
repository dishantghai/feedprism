/**
 * ExtractionPanel - Right panel showing extraction state
 * 
 * States:
 * 1. Empty (no unprocessed emails) - shows "All caught up"
 * 2. Ready (has unprocessed emails) - shows Extract button
 * 3. Extracting - shows progress
 * 4. Complete - shows extraction summary
 */

import { Sparkles, Loader2, CheckCircle, AlertCircle, Calendar, GraduationCap, FileText } from 'lucide-react';

export type ExtractionState = 'empty' | 'ready' | 'extracting' | 'complete' | 'error';

interface ExtractionResult {
    events: number;
    courses: number;
    blogs: number;
    emailsProcessed: number;
    errors: number;
}

interface ExtractionPanelProps {
    state: ExtractionState;
    unprocessedCount: number;
    onExtract: () => void;
    progress?: {
        current: number;
        total: number;
        message: string;
        events: number;
        courses: number;
        blogs: number;
    };
    result?: ExtractionResult;
    error?: string;
}

export function ExtractionPanel({
    state,
    unprocessedCount,
    onExtract,
    progress,
    result,
    error,
}: ExtractionPanelProps) {
    // Empty state - all emails processed
    if (state === 'empty') {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    All caught up!
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                    No new emails to process
                </p>
            </div>
        );
    }

    // Ready state - show Extract button
    if (state === 'ready') {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[var(--color-prism-start)]/10 to-[var(--color-prism-end)]/10 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-[var(--color-prism-start)]" />
                </div>
                <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    {unprocessedCount} email{unprocessedCount > 1 ? 's' : ''} ready
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)] mb-4">
                    Extract events, courses & articles
                </p>
                <button
                    onClick={onExtract}
                    className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[var(--color-prism-start)] to-[var(--color-prism-end)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-[var(--color-prism-start)]/25"
                >
                    Extract Content
                </button>
            </div>
        );
    }

    // Extracting state - show progress
    if (state === 'extracting' && progress) {
        const percentage = Math.round((progress.current / progress.total) * 100);

        return (
            <div className="h-full flex flex-col p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--color-prism-start)]" />
                    <span className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide">
                        Extracting...
                    </span>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs text-[var(--color-text-tertiary)] mb-1">
                        <span>Progress</span>
                        <span>{progress.current}/{progress.total}</span>
                    </div>
                    <div className="h-2 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-[var(--color-prism-start)] to-[var(--color-prism-end)] transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                </div>

                {/* Current action */}
                <p className="text-xs text-[var(--color-text-secondary)] mb-4 line-clamp-2">
                    {progress.message}
                </p>

                {/* Running totals */}
                <div className="space-y-2 mt-auto">
                    <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-[var(--color-text-tertiary)]">
                            <Calendar className="w-3 h-3 text-[var(--color-event)]" />
                            Events
                        </span>
                        <span className="font-medium text-[var(--color-text-primary)]">{progress.events}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-[var(--color-text-tertiary)]">
                            <GraduationCap className="w-3 h-3 text-[var(--color-course)]" />
                            Courses
                        </span>
                        <span className="font-medium text-[var(--color-text-primary)]">{progress.courses}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-[var(--color-text-tertiary)]">
                            <FileText className="w-3 h-3 text-[var(--color-blog)]" />
                            Blogs
                        </span>
                        <span className="font-medium text-[var(--color-text-primary)]">{progress.blogs}</span>
                    </div>
                </div>
            </div>
        );
    }

    // Complete state - show results
    if (state === 'complete' && result) {
        const total = result.events + result.courses + result.blogs;

        return (
            <div className="h-full flex flex-col p-4">
                <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-medium text-green-600 uppercase tracking-wide">
                        Complete
                    </span>
                </div>

                {/* Summary */}
                <div className="text-center mb-4">
                    <p className="text-3xl font-bold text-[var(--color-text-primary)]">{total}</p>
                    <p className="text-xs text-[var(--color-text-tertiary)]">items extracted</p>
                </div>

                {/* Breakdown */}
                <div className="space-y-2">
                    {result.events > 0 && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-event)]/10">
                            <span className="flex items-center gap-2 text-xs text-[var(--color-event)]">
                                <Calendar className="w-3.5 h-3.5" />
                                Events
                            </span>
                            <span className="text-sm font-semibold text-[var(--color-event)]">{result.events}</span>
                        </div>
                    )}
                    {result.courses > 0 && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-course)]/10">
                            <span className="flex items-center gap-2 text-xs text-[var(--color-course)]">
                                <GraduationCap className="w-3.5 h-3.5" />
                                Courses
                            </span>
                            <span className="text-sm font-semibold text-[var(--color-course)]">{result.courses}</span>
                        </div>
                    )}
                    {result.blogs > 0 && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-blog)]/10">
                            <span className="flex items-center gap-2 text-xs text-[var(--color-blog)]">
                                <FileText className="w-3.5 h-3.5" />
                                Blogs
                            </span>
                            <span className="text-sm font-semibold text-[var(--color-blog)]">{result.blogs}</span>
                        </div>
                    )}
                </div>

                {/* Emails processed */}
                <div className="mt-auto pt-3 border-t border-[var(--color-border-light)]">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--color-text-tertiary)]">Emails processed</span>
                        <span className="font-medium text-[var(--color-text-primary)]">{result.emailsProcessed}</span>
                    </div>
                    {result.errors > 0 && (
                        <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-red-500">Errors</span>
                            <span className="font-medium text-red-500">{result.errors}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Error state
    if (state === 'error') {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    Extraction failed
                </p>
                <p className="text-xs text-red-500 mt-1">
                    {error || 'An error occurred'}
                </p>
                <button
                    onClick={onExtract}
                    className="mt-4 px-4 py-2 text-xs rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return null;
}

export default ExtractionPanel;
