/**
 * Skeleton - Reusable loading skeleton components
 * 
 * Provides consistent loading states across the app with shimmer animation.
 */

import { cn } from '../../lib/utils';

interface SkeletonProps {
    className?: string;
}

/**
 * Base skeleton element with shimmer animation
 */
export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                'skeleton rounded',
                className
            )}
        />
    );
}

/**
 * Skeleton for stat/metric cards
 */
export function StatCardSkeleton() {
    return (
        <div className="p-4 bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-light)] animate-pulse">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-[var(--color-border-medium)]" />
                <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-8 w-20" />
        </div>
    );
}

/**
 * Skeleton for email list items
 */
export function EmailItemSkeleton() {
    return (
        <div className="p-3 rounded-lg bg-[var(--color-bg-tertiary)] animate-pulse">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[var(--color-border-medium)]" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-12 ml-auto" />
            </div>
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-3 w-2/3" />
        </div>
    );
}

/**
 * Skeleton for feed cards (email groups)
 */
export function FeedCardSkeleton() {
    return (
        <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border-light)] overflow-hidden animate-pulse">
            {/* Email header skeleton */}
            <div className="px-4 py-3 border-b border-[var(--color-border-light)]">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[var(--color-border-medium)]" />
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-3 w-48" />
                    </div>
                    <div className="flex gap-1">
                        <Skeleton className="h-5 w-14 rounded" />
                        <Skeleton className="h-5 w-14 rounded" />
                    </div>
                </div>
            </div>

            {/* Content skeleton */}
            <div className="p-4 space-y-3">
                <div className="rounded-xl border border-[var(--color-border-light)] p-4 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="flex gap-2 pt-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Skeleton for blog cards (larger format)
 */
export function BlogCardSkeleton() {
    return (
        <div className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-secondary)] overflow-hidden animate-pulse">
            {/* Image skeleton */}
            <div className="w-full h-52 bg-[var(--color-border-medium)]" />

            {/* Content */}
            <div className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex gap-2 pt-2">
                    <Skeleton className="h-5 w-12 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                </div>
            </div>
        </div>
    );
}

/**
 * Skeleton for detail modal content
 */
export function DetailModalSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Image */}
            <div className="w-full h-52 rounded-xl bg-[var(--color-border-medium)]" />

            {/* Title */}
            <Skeleton className="h-8 w-3/4" />

            {/* Meta */}
            <div className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
            </div>

            {/* Description */}
            <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>

            {/* Tags */}
            <div className="flex gap-2">
                <Skeleton className="h-6 w-12 rounded-md" />
                <Skeleton className="h-6 w-16 rounded-md" />
                <Skeleton className="h-6 w-14 rounded-md" />
            </div>

            {/* CTA */}
            <Skeleton className="h-12 w-40 rounded-xl" />
        </div>
    );
}

/**
 * Skeleton for sidebar count badges
 */
export function SidebarCountSkeleton() {
    return <Skeleton className="h-5 w-8 rounded-full" />;
}

/**
 * Skeleton for metrics grid
 */
export function MetricsGridSkeleton() {
    return (
        <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <StatCardSkeleton key={i} />
                ))}
            </div>

            {/* Tags section */}
            <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-light)] p-4 animate-pulse">
                <Skeleton className="h-4 w-20 mb-3" />
                <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Skeleton key={i} className="h-6 w-16 rounded-md" />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Skeleton;
