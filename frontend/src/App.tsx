import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Layout } from './components/layout';
import { PrismOverview } from './components/prism';
import { FeedList } from './components/feed';
import { api } from './services/api';
import type { MetricsResponse, ViewType } from './types';

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
    <Layout
      activeView={activeView}
      onViewChange={setActiveView}
      title={viewConfig.title}
      subtitle={viewConfig.subtitle}
      counts={counts}
    >
      {/* Content based on active view */}
      {activeView === 'home' && (
        <HomeView loading={loading} error={error} />
      )}
      {activeView === 'events' && <FeedList filterType="event" title="Events" />}
      {activeView === 'courses' && <FeedList filterType="course" title="Courses" />}
      {activeView === 'blogs' && <FeedList filterType="blog" title="Blogs" />}
      {activeView === 'actions' && <PlaceholderView type="actions" />}
      {activeView === 'metrics' && (
        <MetricsView metrics={metrics} loading={loading} error={error} />
      )}
      {activeView === 'inbox' && <PlaceholderView type="inbox" />}
      {activeView === 'settings' && <PlaceholderView type="settings" />}
    </Layout>
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
      <FeedList title="Recent Extractions" />
    </div>
  );
}

// =============================================================================
// Metrics View
// =============================================================================

interface MetricsViewProps {
  metrics: MetricsResponse | null;
  loading: boolean;
  error: string | null;
}

function MetricsView({ metrics, loading, error }: MetricsViewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-accent-blue)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 px-4 bg-red-50 rounded-lg border border-red-200">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quality Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Precision"
          value={`${((metrics?.precision ?? 0) * 100).toFixed(0)}%`}
          icon={<span className="text-green-500">●</span>}
        />
        <StatCard
          label="MRR"
          value={`${((metrics?.mrr ?? 0) * 100).toFixed(0)}%`}
          icon={<span className="text-green-500">●</span>}
        />
        <StatCard
          label="Avg Latency"
          value={`${metrics?.avg_latency_ms?.toFixed(0) ?? 0}ms`}
          icon={<span className="text-yellow-500">●</span>}
        />
        <StatCard
          label="Dedup Rate"
          value={`${((metrics?.dedup_rate ?? 0) * 100).toFixed(0)}%`}
          icon={<span className="text-blue-500">●</span>}
        />
      </div>

      {/* Top Tags */}
      {metrics?.top_tags && Object.keys(metrics.top_tags).length > 0 && (
        <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-light)] p-4">
          <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
            Top Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(metrics.top_tags)
              .slice(0, 10)
              .map(([tag, count]) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] rounded-md"
                >
                  {tag} ({count})
                </span>
              ))}
          </div>
        </div>
      )}
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

// =============================================================================
// Stat Card Component
// =============================================================================

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="p-4 bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-light)]">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-[var(--color-text-tertiary)]">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
        {value}
      </p>
    </div>
  );
}

export default App;
