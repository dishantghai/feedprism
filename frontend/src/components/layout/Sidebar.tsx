/**
 * Arc-style Sidebar Component
 * 
 * Features:
 * - Dark theme sidebar (Arc Browser inspired)
 * - Pinned section (Home, Actions, Metrics)
 * - Spaces section (Events, Courses, Blogs)
 * - Command bar trigger (⌘K)
 * - Collapsible on mobile
 */

import { useState } from 'react';
import {
    Search,
    Home,
    Zap,
    BarChart3,
    Calendar,
    GraduationCap,
    FileText,
    Inbox,
    Settings,
    ChevronDown,
    ChevronRight,
    Pin,
    Layers,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ViewType } from '../../types';

interface SidebarProps {
    activeView: ViewType;
    onViewChange: (view: ViewType) => void;
    counts?: {
        events: number;
        courses: number;
        blogs: number;
        actions: number;
    };
}

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    count?: number;
    isActive?: boolean;
    onClick?: () => void;
}

function NavItem({ icon, label, count, isActive, onClick }: NavItemProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors duration-100',
                'hover:bg-[var(--color-sidebar-hover)]',
                isActive
                    ? 'bg-[var(--color-sidebar-active)] text-white'
                    : 'text-[var(--color-sidebar-text)]'
            )}
        >
            <span className="w-4 h-4 flex-shrink-0">{icon}</span>
            <span className="flex-1 text-left truncate">{label}</span>
            {count !== undefined && count > 0 && (
                <span className="text-xs text-[var(--color-sidebar-text-muted)] bg-[var(--color-sidebar-hover)] px-1.5 py-0.5 rounded">
                    {count}
                </span>
            )}
        </button>
    );
}

interface SectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

function Section({ title, icon, children, defaultOpen = true }: SectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="mb-2">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-sidebar-text-muted)] hover:text-[var(--color-sidebar-text)] transition-colors"
            >
                {isOpen ? (
                    <ChevronDown className="w-3 h-3" />
                ) : (
                    <ChevronRight className="w-3 h-3" />
                )}
                <span className="w-3 h-3">{icon}</span>
                <span>{title}</span>
            </button>
            {isOpen && <div className="mt-1 space-y-0.5">{children}</div>}
        </div>
    );
}

export function Sidebar({ activeView, onViewChange, counts }: SidebarProps) {
    return (
        <aside className="w-[var(--sidebar-width)] h-screen flex flex-col border-r border-[var(--color-sidebar-hover)] bg-[linear-gradient(to_right,#0b0d1a_0%,#111326_40%,#1b1f30_80%,#222636_100%)]">
            {/* Logo / Prism Mark */}
            <div className="p-4 flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[radial-gradient(circle_at_30%_0%,_rgba(255,255,255,0.35),_transparent_55%),_linear-gradient(to_br,_var(--color-prism-start),_var(--color-prism-end))] flex items-center justify-center relative overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
                    {/* Prism triangle */}
                    <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[16px] border-b-white/90 drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]" />
                    {/* Beam */}
                    <div className="absolute w-7 h-px bg-gradient-to-r from-white/60 via-white/10 to-transparent rotate-12 -right-0.5 top-3" />
                </div>
                <span className="font-semibold text-white tracking-tight">FeedPrism</span>
            </div>

            {/* Command Bar Trigger */}
            <div className="px-3 mb-4">
                <button
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--color-sidebar-hover)] text-[var(--color-sidebar-text-muted)] text-sm hover:bg-[var(--color-sidebar-active)] hover:text-[var(--color-sidebar-text)] transition-colors"
                    onClick={() => {
                        // TODO: Open command palette
                        console.log('Open command palette');
                    }}
                >
                    <Search className="w-4 h-4" />
                    <span className="flex-1 text-left">Search...</span>
                    <kbd className="text-[10px] bg-[var(--color-sidebar-bg)] px-1.5 py-0.5 rounded border border-[var(--color-sidebar-hover)]">
                        ⌘K
                    </kbd>
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 overflow-y-auto">
                {/* Pinned Section */}
                <Section title="Pinned" icon={<Pin className="w-3 h-3" />}>
                    <NavItem
                        icon={<Home className="w-4 h-4" />}
                        label="Home"
                        isActive={activeView === 'home'}
                        onClick={() => onViewChange('home')}
                    />
                    <NavItem
                        icon={<Zap className="w-4 h-4 text-[var(--color-action)]" />}
                        label="Actions"
                        count={counts?.actions}
                        isActive={activeView === 'actions'}
                        onClick={() => onViewChange('actions')}
                    />
                    <NavItem
                        icon={<BarChart3 className="w-4 h-4" />}
                        label="Metrics"
                        isActive={activeView === 'metrics'}
                        onClick={() => onViewChange('metrics')}
                    />
                </Section>

                {/* Spaces Section */}
                <Section title="Spaces" icon={<Layers className="w-3 h-3" />}>
                    <NavItem
                        icon={<Calendar className="w-4 h-4 text-[var(--color-event)]" />}
                        label="Events"
                        count={counts?.events}
                        isActive={activeView === 'events'}
                        onClick={() => onViewChange('events')}
                    />
                    <NavItem
                        icon={<GraduationCap className="w-4 h-4 text-[var(--color-course)]" />}
                        label="Courses"
                        count={counts?.courses}
                        isActive={activeView === 'courses'}
                        onClick={() => onViewChange('courses')}
                    />
                    <NavItem
                        icon={<FileText className="w-4 h-4 text-[var(--color-blog)]" />}
                        label="Blogs"
                        count={counts?.blogs}
                        isActive={activeView === 'blogs'}
                        onClick={() => onViewChange('blogs')}
                    />
                </Section>

                {/* Divider */}
                <div className="my-3 mx-2 border-t border-[var(--color-sidebar-hover)]" />

                {/* Secondary Nav */}
                <NavItem
                    icon={<Inbox className="w-4 h-4" />}
                    label="Raw Inbox"
                    isActive={activeView === 'inbox'}
                    onClick={() => onViewChange('inbox')}
                />
            </nav>

            {/* Footer */}
            <div className="p-2 border-t border-[var(--color-sidebar-hover)]">
                <NavItem
                    icon={<Settings className="w-4 h-4" />}
                    label="Settings"
                    isActive={activeView === 'settings'}
                    onClick={() => onViewChange('settings')}
                />

                {/* User */}
                <div className="mt-2 px-3 py-2 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--color-prism-start)] to-[var(--color-prism-end)] flex items-center justify-center text-[10px] text-white font-medium">
                        DG
                    </div>
                    <span className="text-xs text-[var(--color-sidebar-text-muted)] truncate">
                        dishant@example.com
                    </span>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
