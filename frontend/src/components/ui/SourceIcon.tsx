/**
 * SourceIcon - Shows the email source platform (Gmail, Outlook, etc.)
 * 
 * Displays a recognizable icon indicating where content was extracted from.
 * Currently supports Gmail with extensibility for future sources.
 */

import { memo } from 'react';
import { Mail } from 'lucide-react';
import { cn } from '../../lib/utils';

export type EmailSource = 'gmail' | 'outlook' | 'apple_mail' | 'other';

interface SourceIconProps {
    source?: EmailSource;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'badge' | 'inline';
    showLabel?: boolean;
    className?: string;
}

// Gmail icon SVG component
const GmailIcon = memo(({ size = 16, className }: { size?: number; className?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path
            d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.545l8.073-6.052C21.69 2.28 24 3.434 24 5.457z"
            fill="#EA4335"
        />
    </svg>
));
GmailIcon.displayName = 'GmailIcon';

// Outlook icon (placeholder for future)
const OutlookIcon = memo(({ size = 16, className }: { size?: number; className?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path
            d="M24 7.387v10.478c0 .23-.08.424-.238.583a.794.794 0 01-.584.238h-8.322v-6.29l1.756 1.217a.379.379 0 00.478-.012l.012-.012 5.822-4.262a.379.379 0 00.054-.53.379.379 0 00-.054-.054l-.478-.33V7.387h1.554zm-10.144 0v11.299H.822a.794.794 0 01-.584-.238A.794.794 0 010 17.865V7.387h13.856zm9.322-.822H14.7l4.478 3.1 4.478-3.1h-.478zM9.178 10.5c-.478-.478-1.076-.717-1.794-.717-.717 0-1.315.239-1.793.717-.478.478-.717 1.076-.717 1.794 0 .717.239 1.315.717 1.793.478.478 1.076.717 1.793.717.718 0 1.316-.239 1.794-.717.478-.478.717-1.076.717-1.793 0-.718-.239-1.316-.717-1.794zm-.956 2.87a1.16 1.16 0 01-.838.359c-.33 0-.61-.12-.838-.36a1.16 1.16 0 01-.36-.837c0-.33.12-.61.36-.838a1.16 1.16 0 01.838-.36c.33 0 .61.12.838.36.227.228.36.508.36.838 0 .33-.12.61-.36.837z"
            fill="#0078D4"
        />
    </svg>
));
OutlookIcon.displayName = 'OutlookIcon';

// Wrapper for Lucide icons to match our interface
const MailIcon = memo(({ size = 16, className }: { size?: number; className?: string }) => (
    <Mail size={size} className={className} />
));
MailIcon.displayName = 'MailIcon';

// Source configuration
const sourceConfig: Record<EmailSource, {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
    bgColor: string;
    label: string;
}> = {
    gmail: {
        icon: GmailIcon,
        color: '#EA4335',
        bgColor: 'rgba(234, 67, 53, 0.1)',
        label: 'Gmail',
    },
    outlook: {
        icon: OutlookIcon,
        color: '#0078D4',
        bgColor: 'rgba(0, 120, 212, 0.1)',
        label: 'Outlook',
    },
    apple_mail: {
        icon: MailIcon,
        color: '#007AFF',
        bgColor: 'rgba(0, 122, 255, 0.1)',
        label: 'Mail',
    },
    other: {
        icon: MailIcon,
        color: '#787774',
        bgColor: 'rgba(120, 119, 116, 0.1)',
        label: 'Email',
    },
};

const sizeMap = {
    sm: 14,
    md: 16,
    lg: 20,
};

export const SourceIcon = memo(function SourceIcon({
    source = 'gmail',
    size = 'sm',
    variant = 'badge',
    showLabel = false,
    className,
}: SourceIconProps) {
    const config = sourceConfig[source] || sourceConfig.other;
    const IconComponent = config.icon;
    const iconSize = sizeMap[size];

    if (variant === 'inline') {
        return (
            <span
                className={cn(
                    'inline-flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity',
                    className
                )}
                title={`From ${config.label}`}
            >
                <IconComponent size={iconSize} />
                {showLabel && (
                    <span className="text-xs text-[var(--color-text-tertiary)]">
                        {config.label}
                    </span>
                )}
            </span>
        );
    }

    // Badge variant
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors',
                'bg-[var(--color-bg-tertiary)] border border-[var(--color-border-light)]',
                'hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-border-medium)]',
                className
            )}
            style={{ backgroundColor: config.bgColor }}
            title={`From ${config.label}`}
        >
            <IconComponent size={iconSize} />
            {showLabel && (
                <span style={{ color: config.color }}>
                    {config.label}
                </span>
            )}
        </span>
    );
});

export default SourceIcon;
