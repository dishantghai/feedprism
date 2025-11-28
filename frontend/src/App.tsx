import { useEffect, useState } from 'react';
import { Sparkles, Calendar, GraduationCap, FileText, Loader2 } from 'lucide-react';
import { api } from './services/api';
import type { MetricsResponse } from './types';

function App() {
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

  return (
    <div className="min-h-screen w-full bg-[var(--color-bg-primary)] flex flex-col items-center justify-center p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-prism-start)] to-[var(--color-prism-end)] flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
            FeedPrism
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Email Intelligence Dashboard
          </p>
        </div>
      </div>

      {/* Status Card */}
      <div className="w-full max-w-md bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-light)] p-6 shadow-[var(--shadow-md)]">
        <h2 className="text-lg font-medium mb-4 text-[var(--color-text-primary)]">
          System Status
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-accent-blue)]" />
            <span className="ml-2 text-[var(--color-text-secondary)]">
              Connecting to backend...
            </span>
          </div>
        ) : error ? (
          <div className="py-4 px-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-red-600 text-sm">{error}</p>
            <p className="text-red-500 text-xs mt-1">
              Make sure the FastAPI backend is running on port 8000
            </p>
          </div>
        ) : metrics ? (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[var(--color-bg-tertiary)] rounded-lg">
                <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
                  {metrics.total_emails_processed}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Emails Processed
                </p>
              </div>
              <div className="p-4 bg-[var(--color-bg-tertiary)] rounded-lg">
                <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
                  {metrics.total_items_extracted}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Items Extracted
                </p>
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide">
                Categories
              </p>
              {metrics.categories.map((cat) => (
                <div
                  key={cat.type}
                  className="flex items-center justify-between py-2 px-3 bg-[var(--color-bg-tertiary)] rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    {cat.type === 'event' && (
                      <Calendar className="w-4 h-4 text-[var(--color-event)]" />
                    )}
                    {cat.type === 'course' && (
                      <GraduationCap className="w-4 h-4 text-[var(--color-course)]" />
                    )}
                    {cat.type === 'blog' && (
                      <FileText className="w-4 h-4 text-[var(--color-blog)]" />
                    )}
                    <span className="text-sm text-[var(--color-text-primary)] capitalize">
                      {cat.type}s
                    </span>
                  </div>
                  <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                    {cat.count}
                  </span>
                </div>
              ))}
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-border-light)]">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-[var(--color-text-secondary)]">
                Backend connected • Last sync: {metrics.last_sync ? new Date(metrics.last_sync).toLocaleTimeString() : 'N/A'}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <p className="mt-8 text-sm text-[var(--color-text-tertiary)]">
        Phase 1 Complete • Ready for Phase 2: Layout & Sidebar
      </p>
    </div>
  );
}

export default App;
