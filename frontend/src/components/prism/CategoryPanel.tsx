/**
 * CategoryPanel - Right panel showing categorized output
 * 
 * Displays the "output" side of the prism visualization with category counts.
 */

import { Calendar, GraduationCap, FileText, Zap } from 'lucide-react';
import type { CategoryCount } from '../../types';

interface CategoryPanelProps {
    categories: CategoryCount[];
    loading?: boolean;
}

const CATEGORY_CONFIG: Record<string, { icon: typeof Calendar; label: string; colorClass: string }> = {
    event: {
        icon: Calendar,
        label: 'Events',
        colorClass: 'text-[var(--color-event)] bg-[var(--color-event)]/10',
    },
    course: {
        icon: GraduationCap,
        label: 'Courses',
        colorClass: 'text-[var(--color-course)] bg-[var(--color-course)]/10',
    },
    blog: {
        icon: FileText,
        label: 'Blogs',
        colorClass: 'text-[var(--color-blog)] bg-[var(--color-blog)]/10',
    },
    action: {
        icon: Zap,
        label: 'Actions',
        colorClass: 'text-[var(--color-action)] bg-[var(--color-action)]/10',
    },
};

export function CategoryPanel({ categories, loading }: CategoryPanelProps) {
    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 rounded-lg bg-[var(--color-bg-tertiary)] animate-pulse">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[var(--color-border-medium)]" />
                            <div className="flex-1">
                                <div className="h-3 w-16 bg-[var(--color-border-medium)] rounded mb-1" />
                                <div className="h-4 w-8 bg-[var(--color-border-medium)] rounded" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Ensure we have all categories, even if count is 0
    const allCategories = ['event', 'course', 'blog'].map((type) => {
        const found = categories.find((c) => c.type === type);
        return found || { type, count: 0, icon: type };
    });

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                <span className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide">
                    Extracted
                </span>
            </div>

            {allCategories.map((category) => {
                const config = CATEGORY_CONFIG[category.type] || CATEGORY_CONFIG.event;
                const Icon = config.icon;

                return (
                    <div
                        key={category.type}
                        className="p-2 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer group"
                    >
                        <div className="flex items-center gap-2">
                            {/* Icon */}
                            <div className={`w-7 h-7 rounded-md flex items-center justify-center ${config.colorClass}`}>
                                <Icon className="w-3.5 h-3.5" />
                            </div>

                            {/* Label and count */}
                            <div className="flex-1 flex items-center justify-between">
                                <p className="text-xs text-[var(--color-text-secondary)]">
                                    {config.label}
                                </p>
                                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                                    {category.count}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Total */}
            <div className="mt-2 pt-2 border-t border-[var(--color-border-light)]">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--color-text-tertiary)]">Total</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">
                        {allCategories.reduce((sum, c) => sum + c.count, 0)}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default CategoryPanel;
