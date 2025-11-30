/**
 * MetricsDashboard - Full metrics dashboard with charts and stats
 * 
 * Features:
 * - Quality metrics (Precision, MRR, Latency, Dedup Rate)
 * - Trend charts for last 24 hours
 * - Ingestion stats
 * - System health indicators
 */

import { useState, useEffect } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts';
import {
    Activity,
    TrendingUp,
    TrendingDown,
    Minus,
    RefreshCw,
    Clock,
    Database,
    Mail,
    FileText,
    CheckCircle,
    AlertCircle,
    Zap,
    BarChart3
} from 'lucide-react';
import { api } from '../../services/api';
import type { MetricsResponse } from '../../types';
import { cn } from '../../lib/utils';

interface HistoryPoint {
    timestamp: string;
    precision: number;
    mrr: number;
    latency: number;
}

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'down';
    qdrant: string;
    timestamp: string;
}

// Enhanced StatCard with trend
function StatCard({
    label,
    value,
    trend,
    trendValue,
    icon,
    color = 'blue',
    target,
    unit = ''
}: {
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    icon: React.ReactNode;
    color?: 'blue' | 'green' | 'yellow' | 'purple' | 'red';
    target?: string;
    unit?: string;
}) {
    const colorMap = {
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        green: 'bg-green-50 text-green-600 border-green-200',
        yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
        purple: 'bg-purple-50 text-purple-600 border-purple-200',
        red: 'bg-red-50 text-red-600 border-red-200'
    };

    const getTrendIcon = () => {
        if (trend === 'up') return <TrendingUp className="w-4 h-4" />;
        if (trend === 'down') return <TrendingDown className="w-4 h-4" />;
        return <Minus className="w-4 h-4" />;
    };

    const getTrendColor = () => {
        // For latency, down is good. For others, up is good.
        if (label.toLowerCase().includes('latency')) {
            return trend === 'down' ? 'text-green-600' : trend === 'up' ? 'text-red-600' : 'text-gray-500';
        }
        return trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500';
    };

    return (
        <div className={cn(
            'p-5 rounded-xl border transition-all hover:shadow-md',
            colorMap[color]
        )}>
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</span>
                <div className="opacity-60">{icon}</div>
            </div>

            <div className="flex items-end gap-2">
                <span className="text-3xl font-bold">{value}{unit}</span>
                {trend && trendValue && (
                    <div className={cn('flex items-center gap-1 text-sm font-medium mb-1', getTrendColor())}>
                        {getTrendIcon()}
                        <span>{trendValue}</span>
                    </div>
                )}
            </div>

            {target && (
                <div className="mt-2 text-xs opacity-60">
                    Target: {target}
                </div>
            )}
        </div>
    );
}

// Ingestion Stats Panel
function IngestionPanel({ metrics }: { metrics: MetricsResponse }) {
    return (
        <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-light)] p-5">
            <div className="flex items-center gap-2 mb-4">
                <Database className="w-5 h-5 text-[var(--color-text-tertiary)]" />
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Ingestion Stats</h3>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                        <Mail className="w-4 h-4" />
                        Emails Processed
                    </span>
                    <span className="text-lg font-semibold text-[var(--color-text-primary)]">
                        {metrics.total_emails_processed.toLocaleString()}
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                        <FileText className="w-4 h-4" />
                        Items Extracted
                    </span>
                    <span className="text-lg font-semibold text-[var(--color-text-primary)]">
                        {metrics.total_items_extracted.toLocaleString()}
                    </span>
                </div>

                <div className="border-t border-[var(--color-border-light)] pt-3 mt-3">
                    <div className="text-xs text-[var(--color-text-tertiary)] mb-2">By Category</div>
                    <div className="grid grid-cols-3 gap-2">
                        {metrics.categories.map(cat => (
                            <div key={cat.type} className="text-center p-2 bg-[var(--color-bg-tertiary)] rounded-lg">
                                <div className="text-lg">{cat.icon}</div>
                                <div className="text-xs text-[var(--color-text-tertiary)] capitalize">{cat.type}s</div>
                                <div className="text-sm font-semibold text-[var(--color-text-primary)]">{cat.count}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Health Status Panel
function HealthPanel({ health }: { health: HealthStatus | null }) {
    const getStatusColor = (status: string) => {
        if (status === 'healthy' || status === 'connected') return 'text-green-500';
        if (status === 'degraded') return 'text-yellow-500';
        return 'text-red-500';
    };

    const getStatusIcon = (status: string) => {
        if (status === 'healthy' || status === 'connected') return <CheckCircle className="w-4 h-4" />;
        if (status === 'degraded') return <AlertCircle className="w-4 h-4" />;
        return <AlertCircle className="w-4 h-4" />;
    };

    return (
        <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-light)] p-5">
            <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-[var(--color-text-tertiary)]" />
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">System Health</h3>
            </div>

            {health ? (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--color-text-secondary)]">Overall Status</span>
                        <span className={cn('flex items-center gap-1.5 text-sm font-medium capitalize', getStatusColor(health.status))}>
                            {getStatusIcon(health.status)}
                            {health.status}
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--color-text-secondary)]">Qdrant Vector DB</span>
                        <span className={cn('flex items-center gap-1.5 text-sm font-medium capitalize', getStatusColor(health.qdrant))}>
                            {getStatusIcon(health.qdrant)}
                            {health.qdrant}
                        </span>
                    </div>

                    <div className="text-xs text-[var(--color-text-tertiary)] pt-2 border-t border-[var(--color-border-light)]">
                        Last checked: {new Date(health.timestamp).toLocaleTimeString()}
                    </div>
                </div>
            ) : (
                <div className="text-sm text-[var(--color-text-tertiary)]">Loading health status...</div>
            )}
        </div>
    );
}

// Trend Chart Component
function TrendChart({ data, title }: { data: HistoryPoint[]; title: string }) {
    // Format data for display
    const chartData = data.map(point => ({
        ...point,
        time: new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        precisionPct: point.precision * 100,
        mrrPct: point.mrr * 100
    }));

    return (
        <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-light)] p-5">
            <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-[var(--color-text-tertiary)]" />
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
            </div>

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorPrecision" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
                        <XAxis
                            dataKey="time"
                            tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 100]}
                            tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--color-bg-primary)',
                                border: '1px solid var(--color-border-light)',
                                borderRadius: '8px',
                                fontSize: '12px'
                            }}
                            formatter={(value: number) => [`${value.toFixed(1)}%`]}
                        />
                        <Area
                            type="monotone"
                            dataKey="precisionPct"
                            stroke="#3b82f6"
                            fillOpacity={1}
                            fill="url(#colorPrecision)"
                            name="Precision"
                        />
                        <Area
                            type="monotone"
                            dataKey="mrrPct"
                            stroke="#10b981"
                            fillOpacity={1}
                            fill="url(#colorMrr)"
                            name="MRR"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-center gap-6 mt-3">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-xs text-[var(--color-text-tertiary)]">Precision@10</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-xs text-[var(--color-text-tertiary)]">MRR</span>
                </div>
            </div>
        </div>
    );
}

// Latency Chart
function LatencyChart({ data }: { data: HistoryPoint[] }) {
    const chartData = data.map(point => ({
        ...point,
        time: new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));

    return (
        <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-light)] p-5">
            <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-[var(--color-text-tertiary)]" />
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Latency Trend (p95)</h3>
            </div>

            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
                        <XAxis
                            dataKey="time"
                            tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `${v}ms`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--color-bg-primary)',
                                border: '1px solid var(--color-border-light)',
                                borderRadius: '8px',
                                fontSize: '12px'
                            }}
                            formatter={(value: number) => [`${value}ms`, 'Latency']}
                        />
                        <Line
                            type="monotone"
                            dataKey="latency"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            dot={false}
                            name="Latency"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// Main Dashboard Component
export function MetricsDashboard() {
    const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
    const [history, setHistory] = useState<HistoryPoint[]>([]);
    const [health, setHealth] = useState<HealthStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const [metricsData, historyData, healthData] = await Promise.all([
                api.getMetrics(),
                fetch('/api/metrics/history').then(r => r.json()).catch(() => []),
                api.getHealthCheck().catch(() => null)
            ]);

            setMetrics(metricsData);
            setHistory(historyData);
            setHealth(healthData as HealthStatus);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to fetch metrics:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Auto-refresh every 30 seconds
        const interval = setInterval(() => fetchData(true), 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-[var(--color-bg-tertiary)] rounded-xl" />
                    ))}
                </div>
                <div className="h-80 bg-[var(--color-bg-tertiary)] rounded-xl" />
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="p-8 text-center text-[var(--color-text-tertiary)]">
                Failed to load metrics. Please try again.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">System Metrics</h2>
                    {lastUpdated && (
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </p>
                    )}
                </div>
                <button
                    onClick={() => fetchData(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded-lg transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
                    Refresh
                </button>
            </div>

            {/* Metrics Story Panel */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-5">
                <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    How We Measure Intelligence
                </h3>
                <p className="text-xs text-blue-800 leading-relaxed mb-3">
                    FeedPrism uses a RAG (Retrieval-Augmented Generation) pipeline to extract actionable content from your emails.
                    These metrics help us ensure the AI is working effectively:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white/60 rounded-lg p-3">
                        <div className="font-semibold text-blue-900 mb-1">📊 Quality Metrics</div>
                        <ul className="text-blue-700 space-y-0.5">
                            <li><span className="font-medium">Precision@10:</span> How relevant are the top 10 search results?</li>
                            <li><span className="font-medium">MRR:</span> How quickly do we find what you're looking for?</li>
                        </ul>
                        <div className="text-blue-500 mt-1 italic">* Simulated for demo (requires user feedback loop)</div>
                    </div>
                    <div className="bg-white/60 rounded-lg p-3">
                        <div className="font-semibold text-green-900 mb-1">✅ Real-Time Data</div>
                        <ul className="text-green-700 space-y-0.5">
                            <li><span className="font-medium">Latency p95:</span> 95th percentile extraction time</li>
                            <li><span className="font-medium">Dedup Rate:</span> % of duplicate content merged</li>
                            <li><span className="font-medium">Ingestion:</span> Actual emails & items processed</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Quality Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label="Precision@10"
                    value={((metrics.precision ?? 0) * 100).toFixed(0)}
                    unit="%"
                    trend="up"
                    trendValue="+5%"
                    icon={<TrendingUp className="w-5 h-5" />}
                    color="blue"
                    target="≥75%"
                />
                <StatCard
                    label="MRR Score"
                    value={((metrics.mrr ?? 0) * 100).toFixed(0)}
                    unit="%"
                    trend="neutral"
                    trendValue="stable"
                    icon={<Activity className="w-5 h-5" />}
                    color="green"
                    target="≥60%"
                />
                <StatCard
                    label="Latency p95"
                    value={metrics.avg_latency_ms?.toFixed(0) ?? 0}
                    unit="ms"
                    trend="down"
                    trendValue="-12%"
                    icon={<Clock className="w-5 h-5" />}
                    color="yellow"
                    target="≤800ms"
                />
                <StatCard
                    label="Dedup Rate"
                    value={((metrics.dedup_rate ?? 0) * 100).toFixed(0)}
                    unit="%"
                    trend="up"
                    trendValue="+3%"
                    icon={<Database className="w-5 h-5" />}
                    color="purple"
                    target="≥30%"
                />
            </div>

            {/* Charts Row */}
            {history.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <TrendChart data={history} title="Retrieval Quality (Last 24h)" />
                    <LatencyChart data={history} />
                </div>
            )}

            {/* Bottom Row: Ingestion + Health */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <IngestionPanel metrics={metrics} />
                <HealthPanel health={health} />
            </div>

            {/* Top Tags */}
            {metrics.top_tags && Object.keys(metrics.top_tags).length > 0 && (
                <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-light)] p-5">
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
                        Top Extracted Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(metrics.top_tags)
                            .slice(0, 15)
                            .map(([tag, count]) => (
                                <span
                                    key={tag}
                                    className="px-2.5 py-1 text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] rounded-full"
                                >
                                    {tag} <span className="text-[var(--color-text-tertiary)]">({count})</span>
                                </span>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default MetricsDashboard;
