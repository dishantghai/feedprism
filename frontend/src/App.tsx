import { useEffect, useState, useCallback } from 'react';
import { Layout } from './components/layout';
import { PrismOverview } from './components/prism';
import { FeedList } from './components/feed';
import { CommandPalette } from './components/search';
import { MetricsDashboard } from './components/Metrics';
import { BlogsGallery, CoursesCatalog, EventsCalendar } from './components/views';
import { useCommandK } from './hooks';
import { api } from './services/api';
import type { MetricsResponse, ViewType, FeedItem } from './types';

// View title and subtitle mapping
const VIEW_CONFIG: Record<ViewType, { title: string; subtitle: string }> = {
  home: { title: 'Home', subtitle: 'Your intelligent email feed' },
  events: { title: 'Events', subtitle: 'Upcoming events from your emails' },
  courses: { title: 'Courses', subtitle: 'Learning opportunities discovered' },
  blogs: { title: 'Blogs', subtitle: 'Articles and newsletters' },
  actions: { title: 'Actions', subtitle: 'Items requiring your attention' },
  metrics: { title: 'Metrics', subtitle: 'System performance and stats' },
  inbox: { title: 'Raw Inbox', subtitle: 'Unprocessed email feed' },
  settings: { title: 'Settings', subtitle: 'Configure FeedPrism' },
};

function App() {
  const [activeView, setActiveView] = useState<ViewType>('home');
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global ⌘K shortcut
  const openCommandPalette = useCallback(() => setIsCommandPaletteOpen(true), []);
  const closeCommandPalette = useCallback(() => setIsCommandPaletteOpen(false), []);
  useCommandK(openCommandPalette);

  // Handle item selection from command palette
  const handleSelectItem = useCallback((item: FeedItem) => {
    // Navigate to the appropriate view based on item type
    const viewMap: Record<string, ViewType> = {
      event: 'events',
      course: 'courses',
      blog: 'blogs',
    };
    setActiveView(viewMap[item.item_type] || 'home');
    // TODO: Could also scroll to or highlight the specific item
  }, []);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const data = await api.getMetrics();
        setMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  // Extract counts for sidebar badges
  const counts = metrics
    ? {
      events: metrics.categories.find((c) => c.type === 'event')?.count ?? 0,
      courses: metrics.categories.find((c) => c.type === 'course')?.count ?? 0,
      blogs: metrics.categories.find((c) => c.type === 'blog')?.count ?? 0,
      actions: 0, // TODO: Get from API
    }
    : undefined;

  const viewConfig = VIEW_CONFIG[activeView];

  return (
    <>
      <Layout
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenCommandPalette={openCommandPalette}
        title={viewConfig.title}
        subtitle={viewConfig.subtitle}
        counts={counts}
      >
        {/* Content based on active view */}
        {activeView === 'home' && (
          <HomeView loading={loading} error={error} />
        )}
        {activeView === 'events' && <EventsCalendar />}
        {activeView === 'courses' && <CoursesCatalog />}
        {activeView === 'blogs' && <BlogsGallery />}
        {activeView === 'actions' && <PlaceholderView type="actions" />}
        {activeView === 'metrics' && <MetricsDashboard />}
        {activeView === 'inbox' && <PlaceholderView type="inbox" />}
        {activeView === 'settings' && <PlaceholderView type="settings" />}
      </Layout>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        onNavigate={setActiveView}
        onSelectItem={handleSelectItem}
      />
    </>
  );
}

// =============================================================================
// Home View
// =============================================================================

interface HomeViewProps {
  loading: boolean;
  error: string | null;
}

function HomeView({ error }: HomeViewProps) {
  // Show error banner if metrics failed, but still render content
  return (
    <div className="space-y-6">
      {/* Error banner (non-blocking) */}
      {error && (
        <div className="py-3 px-4 bg-red-50 rounded-lg border border-red-200">
          <p className="text-red-600 text-sm">{error}</p>
          <p className="text-red-500 text-xs mt-1">
            Make sure the FastAPI backend is running on port 8000
          </p>
        </div>
      )}

      {/* Prism Overview Section */}
      <PrismOverview />

      {/* Intelligent Feed */}
      <FeedList title="Recent Extractions" showFilters />
    </div>
  );
}

// =============================================================================
// Placeholder View
// =============================================================================

function PlaceholderView({ type }: { type: string }) {
  return (
    <div className="p-12 border-2 border-dashed border-[var(--color-border-light)] rounded-xl text-center">
      <p className="text-[var(--color-text-tertiary)] capitalize">
        {type} view coming soon...
      </p>
    </div>
  );
}

export default App;
