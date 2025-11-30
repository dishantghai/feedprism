/**
 * FeedPrism API Client
 * 
 * Handles all communication with the FastAPI backend.
 * Uses the Vite proxy configured in vite.config.ts
 */

import type {
    FeedResponse,
    FeedItem,
    EmailSummary,
    EmailDetail,
    SearchRequest,
    SearchResponse,
    MetricsResponse,
    PrismStats,
    ItemType,
} from '../types';

const API_BASE = '/api';

// =============================================================================
// Helper Functions
// =============================================================================

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        ...options,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
}

// =============================================================================
// Feed API
// =============================================================================

export async function getFeed(
    page = 1,
    pageSize = 20,
    types?: ItemType[]
): Promise<FeedResponse> {
    const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
    });

    if (types && types.length > 0) {
        params.set('types', types.join(','));
    }

    return fetchJson<FeedResponse>(`${API_BASE}/feed?${params}`);
}

export async function getFeedByType(
    type: ItemType,
    page = 1,
    pageSize = 20
): Promise<FeedResponse> {
    const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
    });

    return fetchJson<FeedResponse>(`${API_BASE}/feed/by-type/${type}?${params}`);
}

export async function getFeedItem(
    itemId: string,
    itemType: ItemType
): Promise<FeedItem> {
    return fetchJson<FeedItem>(`${API_BASE}/feed/${itemId}?item_type=${itemType}`);
}

// =============================================================================
// Email API
// =============================================================================

export async function getRecentEmails(limit = 10): Promise<EmailSummary[]> {
    return fetchJson<EmailSummary[]>(`${API_BASE}/emails/recent?limit=${limit}`);
}

export async function getPrismStats(): Promise<PrismStats> {
    return fetchJson<PrismStats>(`${API_BASE}/emails/prism-stats`);
}

export async function getEmailDetail(emailId: string): Promise<EmailDetail> {
    return fetchJson<EmailDetail>(`${API_BASE}/emails/${emailId}`);
}

// =============================================================================
// Search API
// =============================================================================

export async function search(request: SearchRequest): Promise<SearchResponse> {
    return fetchJson<SearchResponse>(`${API_BASE}/search`, {
        method: 'POST',
        body: JSON.stringify(request),
    });
}

export async function quickSearch(
    query: string,
    limit = 10
): Promise<SearchResponse> {
    const params = new URLSearchParams({
        q: query,
        limit: String(limit),
    });

    return fetchJson<SearchResponse>(`${API_BASE}/search/quick?${params}`);
}

// =============================================================================
// Metrics API
// =============================================================================

export async function getMetrics(days = 30): Promise<MetricsResponse> {
    return fetchJson<MetricsResponse>(`${API_BASE}/metrics?days=${days}`);
}

export async function getHealthCheck(): Promise<{
    status: string;
    qdrant: string;
    timestamp: string;
}> {
    return fetchJson(`${API_BASE}/metrics/health`);
}

// =============================================================================
// Pipeline API
// =============================================================================

export interface UnprocessedEmailsResponse {
    unprocessed_count: number;
    total_fetched: number;
    processed_count: number;
    hours_back: number;
    emails: Array<{
        id: string;
        subject: string;
        sender: string;
        sender_email: string;
        received_at: string;
        snippet: string | null;
        body_text?: string;
        body_html?: string;
    }>;
}

export interface PipelineSettings {
    email_fetch_hours_back: number;
    llm_model: string;
    embedding_model: string;
}

export interface ExtractionEvent {
    type: 'start' | 'fetch' | 'parse' | 'extract' | 'ingest' | 'progress' | 'skip' | 'error' | 'complete';
    data: {
        current?: number;
        total?: number;
        message: string;
        email_id?: string;
        subject?: string;
        events?: number;
        courses?: number;
        blogs?: number;
        events_total?: number;
        courses_total?: number;
        blogs_total?: number;
        total_extracted?: number;
        emails_processed?: number;
        errors?: number;
        error?: string;
        reason?: string;
    };
}

export async function getUnprocessedEmails(hoursBack?: number): Promise<UnprocessedEmailsResponse> {
    const params = hoursBack ? `?hours_back=${hoursBack}` : '';
    return fetchJson<UnprocessedEmailsResponse>(`${API_BASE}/pipeline/unprocessed-emails${params}`);
}

export async function getPipelineSettings(): Promise<PipelineSettings> {
    return fetchJson<PipelineSettings>(`${API_BASE}/pipeline/settings`);
}

/**
 * Extraction status response from backend.
 */
export interface ExtractionStatusResponse {
    is_extracting: boolean;
    progress: {
        current: number;
        total: number;
        events: number;
        courses: number;
        blogs: number;
        message: string;
        emails_processed: number;
        errors: number;
    } | null;
    started_at: string | null;
}

/**
 * Get current extraction pipeline status.
 * Used to sync frontend state on page load or after SSE disconnection.
 */
export async function getExtractionStatus(): Promise<ExtractionStatusResponse> {
    return fetchJson<ExtractionStatusResponse>(`${API_BASE}/pipeline/extraction-status`);
}

/**
 * Start extraction pipeline with SSE streaming.
 * Returns an EventSource that emits progress events.
 */
export function startExtraction(
    emailIds: string[],
    onEvent: (event: ExtractionEvent) => void,
    onError: (error: Error) => void,
    onComplete: () => void
): () => void {
    const controller = new AbortController();

    fetch(`${API_BASE}/pipeline/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailIds),
        signal: controller.signal,
    })
        .then(async (response) => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Parse SSE events from buffer
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                let currentEvent: string | null = null;
                let currentData: string | null = null;

                for (const line of lines) {
                    if (line.startsWith('event: ')) {
                        currentEvent = line.slice(7);
                    } else if (line.startsWith('data: ')) {
                        currentData = line.slice(6);
                    } else if (line === '' && currentEvent && currentData) {
                        try {
                            const parsed: ExtractionEvent = {
                                type: currentEvent as ExtractionEvent['type'],
                                data: JSON.parse(currentData),
                            };
                            onEvent(parsed);

                            if (parsed.type === 'complete') {
                                onComplete();
                            }
                        } catch (e) {
                            console.error('Failed to parse SSE event:', e);
                        }
                        currentEvent = null;
                        currentData = null;
                    }
                }
            }
        })
        .catch((error) => {
            if (error.name !== 'AbortError') {
                onError(error);
            }
        });

    // Return abort function
    return () => controller.abort();
}

/**
 * Get list of all processed email IDs from Qdrant.
 */
export interface ProcessedEmailsResponse {
    count: number;
    email_ids: string[];
}

export async function getProcessedEmails(): Promise<ProcessedEmailsResponse> {
    return fetchJson<ProcessedEmailsResponse>(`${API_BASE}/pipeline/processed-emails`);
}

/**
 * Start re-extraction pipeline for existing emails.
 * Deletes existing items and re-extracts with latest logic.
 */
export function startReExtraction(
    emailIds: string[] | null,
    onEvent: (event: ExtractionEvent) => void,
    onError: (error: Error) => void,
    onComplete: () => void
): () => void {
    const controller = new AbortController();

    fetch(`${API_BASE}/pipeline/re-extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailIds),
        signal: controller.signal,
    })
        .then(async (response) => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Parse SSE events from buffer
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                let currentEvent: string | null = null;
                let currentData: string | null = null;

                for (const line of lines) {
                    if (line.startsWith('event: ')) {
                        currentEvent = line.slice(7);
                    } else if (line.startsWith('data: ')) {
                        currentData = line.slice(6);
                    } else if (line === '' && currentEvent && currentData) {
                        try {
                            const parsed: ExtractionEvent = {
                                type: currentEvent as ExtractionEvent['type'],
                                data: JSON.parse(currentData),
                            };
                            onEvent(parsed);

                            if (parsed.type === 'complete') {
                                onComplete();
                            }
                        } catch (e) {
                            console.error('Failed to parse SSE event:', e);
                        }
                        currentEvent = null;
                        currentData = null;
                    }
                }
            }
        })
        .catch((error) => {
            if (error.name !== 'AbortError') {
                onError(error);
            }
        });

    // Return abort function
    return () => controller.abort();
}

// =============================================================================
// Export all as api object for convenience
// =============================================================================

export const api = {
    // Feed
    getFeed,
    getFeedByType,
    getFeedItem,

    // Emails
    getRecentEmails,
    getPrismStats,
    getEmailDetail,

    // Search
    search,
    quickSearch,

    // Metrics
    getMetrics,
    getHealthCheck,

    // Pipeline
    getUnprocessedEmails,
    getPipelineSettings,
    getExtractionStatus,
    startExtraction,
    getProcessedEmails,
    startReExtraction,
};

export default api;
