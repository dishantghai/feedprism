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
};

export default api;
