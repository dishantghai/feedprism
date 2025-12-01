import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    icon?: React.ReactNode;
    color?: 'default' | 'primary' | 'success' | 'warning' | 'error';
}

const StatCard: React.FC<StatCardProps> = ({
    label,
    value,
    trend,
    trendValue,
    icon,
    color: _color = 'default'
}) => {
    const getTrendIcon = () => {
        switch (trend) {
            case 'up': return <ArrowUpRight size={16} />;
            case 'down': return <ArrowDownRight size={16} />;
            case 'neutral': return <Minus size={16} />;
            default: return null;
        }
    };

    const getTrendColor = () => {
        switch (trend) {
            case 'up': return 'text-green-600';
            case 'down': return 'text-red-600';
            case 'neutral': return 'text-gray-500';
            default: return 'text-gray-500';
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{label}</h3>
                {icon && <div className="text-gray-400">{icon}</div>}
            </div>

            <div className="flex items-end gap-3">
                <div className="text-3xl font-bold text-gray-900">{value}</div>

                {trend && (
                    <div className={`flex items-center gap-1 text-sm font-medium mb-1 ${getTrendColor()}`}>
                        {getTrendIcon()}
                        <span>{trendValue}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatCard;
