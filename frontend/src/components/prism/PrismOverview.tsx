/**
 * PrismOverview - Main container for the prism visualization (Demo Mode)
 * 
 * Flow:
 * 1. On load: Fetch unprocessed emails from Gmail (last N hours)
 * 2. Left: Show unprocessed emails
 * 3. Center: Prism image
 * 4. Right: Extract button OR progress OR results
 * 
 * On page reload, resets to show new unprocessed emails.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, ChevronUp, Sparkles, RefreshCw } from 'lucide-react';
import { RawFeedPanel } from './RawFeedPanel';
import { PrismVisual } from './PrismVisual';
import { ExtractionPanel, type ExtractionState } from './ExtractionPanel';
import { api, type ExtractionEvent, type UnprocessedEmailsResponse } from '../../services/api';
import { useDemo } from '../../contexts';

interface PrismOverviewProps {
    defaultExpanded?: boolean;
}

interface ExtractionProgress {
    current: number;
    total: number;
    message: string;
    events: number;
    courses: number;
    blogs: number;
}

interface ExtractionResult {
    events: number;
    courses: number;
    blogs: number;
    emailsProcessed: number;
    errors: number;
}

export function PrismOverview({ defaultExpanded = true }: PrismOverviewProps) {
    const { isDemo, isLoading: isDemoLoading, setDemoExtracted } = useDemo();

    const [isExpanded, setIsExpanded] = useState(() => {
        const saved = localStorage.getItem('feedprism-prism-expanded');
        return saved !== null ? saved === 'true' : defaultExpanded;
    });

    // Demo mode simulation state
    const [demoSimulating, setDemoSimulating] = useState(false);
    const [demoProgress, setDemoProgress] = useState<ExtractionProgress | null>(null);
    const [demoResult, setDemoResult] = useState<ExtractionResult | null>(null);
    const [demoExtractionState, setDemoExtractionState] = useState<ExtractionState>('ready');

    // Email state
    const [unprocessedData, setUnprocessedData] = useState<UnprocessedEmailsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Extraction state
    const [extractionState, setExtractionState] = useState<ExtractionState>('ready');
    const [progress, setProgress] = useState<ExtractionProgress | null>(null);
    const [result, setResult] = useState<ExtractionResult | null>(null);
    const [, setAbortExtraction] = useState<(() => void) | null>(null);

    // Fetch unprocessed emails on mount
    const fetchUnprocessedEmails = useCallback(async (resetState = true) => {
        // Don't reset state if extraction is in progress
        if (extractionState === 'extracting') return;

        setLoading(true);
        if (resetState) {
            setError(null);
            setExtractionState('ready');
            setProgress(null);
            setResult(null);
        }

        try {
            const data = await api.getUnprocessedEmails();
            setUnprocessedData(data);

            if (resetState) {
                if (data.unprocessed_count === 0) {
                    setExtractionState('empty');
                } else {
                    setExtractionState('ready');
                }
            }
        } catch (err) {
            console.error('Failed to fetch unprocessed emails:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch emails');
            if (resetState) {
                setExtractionState('error');
            }
        } finally {
            setLoading(false);
        }
    }, [extractionState]);

    // Polling interval ref for extraction status
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Check extraction status and start polling if extraction is in progress
    const checkExtractionStatus = useCallback(async () => {
        try {
            const status = await api.getExtractionStatus();

            if (status.is_extracting && status.progress) {
                // Extraction is running - sync state
                setExtractionState('extracting');
                setProgress({
                    current: status.progress.current,
                    total: status.progress.total,
                    message: status.progress.message,
                    events: status.progress.events,
                    courses: status.progress.courses,
                    blogs: status.progress.blogs,
                });
                return true; // Still extracting
            }
            return false; // Not extracting
        } catch (err) {
            console.error('Failed to check extraction status:', err);
            return false;
        }
    }, []);

    // Start polling for extraction status
    const startPolling = useCallback(() => {
        if (pollingRef.current) return; // Already polling

        pollingRef.current = setInterval(async () => {
            const stillExtracting = await checkExtractionStatus();
            if (!stillExtracting) {
                // Extraction finished - stop polling and refresh
                if (pollingRef.current) {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                }
                // Refresh to get final state
                fetchUnprocessedEmails(true);
            }
        }, 2000); // Poll every 2 seconds
    }, [checkExtractionStatus, fetchUnprocessedEmails]);

    // Stop polling
    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }, []);

    // Fetch demo emails from API
    const fetchDemoEmails = useCallback(async () => {
        try {
            // Reset demo state first to get fresh emails
            await api.resetDemoState();

            // Then fetch unprocessed demo emails
            const response = await api.getDemoUnprocessedEmails();

            // Convert to same format as real emails
            setUnprocessedData({
                emails: response.emails.map(e => ({
                    id: e.id,
                    subject: e.subject,
                    sender: e.sender,
                    sender_email: e.sender_email,
                    received_at: e.received_at,
                    snippet: e.snippet
                })),
                unprocessed_count: response.unprocessed_count,
                total_fetched: response.total_demo_emails,
                processed_count: response.total_demo_emails - response.unprocessed_count,
                hours_back: response.hours_back
            });

            if (response.unprocessed_count === 0) {
                setDemoExtractionState('empty');
            } else {
                setDemoExtractionState('ready');
            }
        } catch (err) {
            console.error('Failed to fetch demo emails:', err);
            // Fall back to hardcoded demo emails
        }
    }, []);

    // On mount: check if extraction is already running, then fetch emails
    useEffect(() => {
        // Wait for demo context to finish loading
        if (isDemoLoading) {
            return;
        }

        if (isDemo) {
            // Demo mode: fetch demo emails from API (with reset)
            setLoading(true);
            fetchDemoEmails().finally(() => setLoading(false));
            return;
        }

        const init = async () => {
            const isExtracting = await checkExtractionStatus();
            if (isExtracting) {
                // Start polling to track progress
                startPolling();
            } else {
                // No extraction running - fetch emails normally
                fetchUnprocessedEmails(true);
            }
        };
        init();

        // Cleanup polling on unmount
        return () => stopPolling();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDemo, isDemoLoading]);

    // Persist collapse state
    useEffect(() => {
        localStorage.setItem('feedprism-prism-expanded', String(isExpanded));
    }, [isExpanded]);

    // Handle extraction
    const handleExtract = useCallback(() => {
        if (!unprocessedData || unprocessedData.emails.length === 0) return;

        const emailIds = unprocessedData.emails.map((e) => e.id);

        setExtractionState('extracting');
        setProgress({
            current: 0,
            total: emailIds.length,
            message: 'Starting extraction...',
            events: 0,
            courses: 0,
            blogs: 0,
        });

        const abort = api.startExtraction(
            emailIds,
            // onEvent
            (event: ExtractionEvent) => {
                console.log('SSE Event:', event);

                if (event.type === 'progress' || event.type === 'ingest') {
                    setProgress({
                        current: event.data.current || 0,
                        total: event.data.total || emailIds.length,
                        message: event.data.message,
                        events: event.data.events_total || event.data.events || 0,
                        courses: event.data.courses_total || event.data.courses || 0,
                        blogs: event.data.blogs_total || event.data.blogs || 0,
                    });
                } else if (event.type === 'fetch' || event.type === 'parse' || event.type === 'extract') {
                    setProgress((prev) => prev ? {
                        ...prev,
                        current: event.data.current || prev.current,
                        total: event.data.total || prev.total,
                        message: event.data.message,
                    } : null);
                } else if (event.type === 'complete') {
                    setResult({
                        events: event.data.events || 0,
                        courses: event.data.courses || 0,
                        blogs: event.data.blogs || 0,
                        emailsProcessed: event.data.emails_processed || 0,
                        errors: event.data.errors || 0,
                    });
                    setExtractionState('complete');
                } else if (event.type === 'error') {
                    console.error('Extraction error:', event.data.error);
                }
            },
            // onError
            (err) => {
                console.error('Extraction failed:', err);
                setError(err.message);
                setExtractionState('error');
            },
            // onComplete
            () => {
                setAbortExtraction(null);
            }
        );

        setAbortExtraction(() => abort);
    }, [unprocessedData]);

    // Demo mode: Simulate extraction with pre-loaded data
    const handleDemoExtract = useCallback(() => {
        if (demoSimulating) return;

        setDemoSimulating(true);
        setDemoExtractionState('extracting');

        // Simulated extraction steps
        const steps = [
            { message: 'Fetching sample newsletters...', events: 0, courses: 0, blogs: 0 },
            { message: 'Parsing "Last Week in AI"...', events: 1, courses: 0, blogs: 2 },
            { message: 'Extracting from "Coursera Weekly"...', events: 1, courses: 3, blogs: 2 },
            { message: 'Processing "Tech Events Digest"...', events: 4, courses: 3, blogs: 2 },
            { message: 'Analyzing "Dev Newsletter"...', events: 4, courses: 5, blogs: 5 },
            { message: 'Finalizing extraction...', events: 5, courses: 6, blogs: 7 },
        ];

        let stepIndex = 0;
        const totalSteps = steps.length;

        const interval = setInterval(() => {
            if (stepIndex < totalSteps) {
                const step = steps[stepIndex];
                setDemoProgress({
                    current: stepIndex + 1,
                    total: totalSteps,
                    message: step.message,
                    events: step.events,
                    courses: step.courses,
                    blogs: step.blogs,
                });
                stepIndex++;
            } else {
                clearInterval(interval);
                setDemoResult({
                    events: 5,
                    courses: 6,
                    blogs: 7,
                    emailsProcessed: 6,
                    errors: 0,
                });
                setDemoExtractionState('complete');
                setDemoSimulating(false);
                // Mark demo extraction as complete - this will trigger feed to show items
                setDemoExtracted(true);
            }
        }, 800); // 800ms per step for realistic feel

        return () => clearInterval(interval);
    }, [demoSimulating, setDemoExtracted]);

    // Reset demo extraction
    const resetDemoExtraction = useCallback(() => {
        setDemoExtractionState('ready');
        setDemoProgress(null);
        setDemoResult(null);
        setDemoSimulating(false);
    }, []);

    // Convert unprocessed emails to EmailSummary format for RawFeedPanel
    const emails = unprocessedData?.emails.map((e) => ({
        id: e.id,
        subject: e.subject,
        sender: e.sender,
        sender_email: e.sender_email,
        received_at: e.received_at,
        snippet: e.snippet ?? undefined,
        extracted_count: 0, // These are unprocessed
    })) || [];

    // Use demo state or real state based on mode
    const activeExtractionState = isDemo ? demoExtractionState : extractionState;
    const activeProgress = isDemo ? demoProgress : progress;
    const activeResult = isDemo ? demoResult : result;
    const activeOnExtract = isDemo ? handleDemoExtract : handleExtract;

    const totalExtracted = activeResult
        ? activeResult.events + activeResult.courses + activeResult.blogs
        : 0;

    // In demo mode, use emails from API (fetched via fetchDemoEmails)
    // In normal mode, use emails from unprocessedData
    const displayEmails = emails;
    const displayCount = unprocessedData?.unprocessed_count || 0;

    return (
        <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-light)] overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--color-border-light)]">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[var(--color-prism-start)] to-[var(--color-prism-end)] flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                        Prism Overview
                    </span>
                    {!isExpanded && (
                        <span className="text-xs text-[var(--color-text-tertiary)] ml-2">
                            {displayCount} unprocessed emails
                        </span>
                    )}
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                    )}
                </button>

                <div className="flex items-center gap-2">
                    {/* Reset/Refresh button */}
                    <button
                        onClick={() => {
                            if (isDemo) {
                                // Reset demo state and refetch
                                resetDemoExtraction();
                                setLoading(true);
                                fetchDemoEmails().finally(() => setLoading(false));
                            } else {
                                fetchUnprocessedEmails(true);
                            }
                        }}
                        disabled={loading || (isDemo ? demoSimulating : extractionState === 'extracting')}
                        className="p-1.5 rounded-md hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors disabled:opacity-50"
                        title={isDemo ? "Reset demo & refresh" : "Refresh emails"}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Expandable content */}
            <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'opacity-100' : 'max-h-0 opacity-0'
                    }`}
            >
                <div className="px-4 pb-4 pt-2">
                    {/* Three-column layout */}
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch h-[320px]">
                        {/* Left: Emails - scrollable */}
                        <div className="min-w-0 overflow-y-auto pr-2 custom-scrollbar h-full">
                            <RawFeedPanel
                                emails={displayEmails}
                                loading={loading}
                                title={`Unprocessed (${unprocessedData?.hours_back || 8}h)`}
                            />
                        </div>

                        {/* Center: Prism visual */}
                        <div className="hidden md:flex items-center justify-center w-[240px] flex-shrink-0">
                            <PrismVisual totalProcessed={totalExtracted} />
                        </div>

                        {/* Right: Extraction panel */}
                        <div className="min-w-0 bg-[var(--color-bg-tertiary)] rounded-lg h-full flex items-center justify-center">
                            <ExtractionPanel
                                state={activeExtractionState}
                                unprocessedCount={displayCount}
                                onExtract={activeOnExtract}
                                progress={activeProgress || undefined}
                                result={activeResult || undefined}
                                error={error || undefined}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PrismOverview;
