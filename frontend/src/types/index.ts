/**
 * FeedPrism TypeScript Types
 * Matches backend Pydantic models in app/models/api.py
 */

// =============================================================================
// Feed Types
// =============================================================================

export type ItemType = 'event' | 'course' | 'blog';

export interface FeedItem {
    id: string;
    email_id: string;
    email_subject: string;
    sender: string;
    sender_email: string;
    received_at: string;
    item_type: ItemType;
    title: string;
    description?: string;
    tags: string[];
    url?: string;

    // Type-specific fields
    start_time?: string;    // events
    location?: string;      // events
    organizer?: string;     // events
    provider?: string;      // courses
    author?: string;        // blogs
    source?: string;        // blogs

    // Metadata
    score?: number;
    extracted_at?: string;
}

export interface FeedResponse {
    items: FeedItem[];
    total: number;
    page: number;
    page_size: number;
    has_more: boolean;
}

// =============================================================================
// Email Types
// =============================================================================

export interface EmailSummary {
    id: string;
    subject: string;
    sender: string;
    sender_email: string;
    received_at: string;
    snippet?: string;
    extracted_count: number;
}

export interface EmailDetail extends EmailSummary {
    body_preview?: string;
    extracted_items: ExtractedItem[];
}

export interface ExtractedItem {
    id: string;
    type: ItemType;
    title: string;
    description?: string;
    tags: string[];
    url?: string;
    extracted_at?: string;
}

// =============================================================================
// Search Types
// =============================================================================

export interface SearchRequest {
    query: string;
    types?: ItemType[];
    tags?: string[];
    date_from?: string;
    date_to?: string;
    limit?: number;
}

export interface SearchResponse {
    results: FeedItem[];
    total: number;
    query: string;
}

// =============================================================================
// Metrics Types
// =============================================================================

export interface CategoryCount {
    type: string;
    count: number;
    icon: string;
}

export interface MetricsResponse {
    total_emails_processed: number;
    total_items_extracted: number;
    categories: CategoryCount[];
    top_tags: Record<string, number>;
    last_sync?: string;

    // Quality metrics
    precision?: number;
    mrr?: number;
    avg_latency_ms?: number;
    dedup_rate?: number;
}

export interface PrismStats {
    recent_emails: EmailSummary[];
    category_counts: CategoryCount[];
    total_extracted: number;
    last_sync?: string;
}

// =============================================================================
// UI State Types
// =============================================================================

export type ViewType = 'home' | 'events' | 'courses' | 'blogs' | 'actions' | 'metrics' | 'inbox' | 'settings';

export interface FilterState {
    types: ItemType[];
    tags: string[];
    search: string;
    sortBy: 'recent' | 'relevance';
}

export interface SidebarState {
    isCollapsed: boolean;
    activeView: ViewType;
}
