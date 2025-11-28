/**
 * PrismVisual - Center prism image
 * 
 * Shows the prism that transforms raw emails into categorized content.
 * Uses the provided prism image with light beams.
 */

import prismImage from '../../assets/images/prism.png';

interface PrismVisualProps {
    isProcessing?: boolean;
    totalProcessed?: number;
}

export function PrismVisual({ totalProcessed = 0 }: PrismVisualProps) {
    return (
        <div className="flex flex-col items-center justify-center h-full">
            {/* Prism Image */}
            <img
                src={prismImage}
                alt="FeedPrism"
                className="w-full h-auto max-w-[280px] object-contain"
            />

            {/* Label */}
            <div className="mt-2 text-center">
                <p className="text-xs font-medium text-[var(--color-text-primary)]">
                    FeedPrism
                </p>
                <p className="text-[10px] text-[var(--color-text-tertiary)]">
                    {totalProcessed > 0 ? `${totalProcessed} items extracted` : 'AI-powered extraction'}
                </p>
            </div>
        </div>
    );
}

export default PrismVisual;
