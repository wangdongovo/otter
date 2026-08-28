import { cn } from '@/lib/utils'

export type StatusDotTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

interface StatusDotProps {
    tone?: StatusDotTone
    animated?: boolean
    className?: string
}

const toneClassName: Record<StatusDotTone, string> = {
    neutral: 'bg-muted-foreground/60',
    info: 'bg-sky-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-destructive',
}

export function StatusDot({
    tone = 'neutral',
    animated = false,
    className,
}: StatusDotProps) {
    const dotClassName = cn(toneClassName[tone], className)

    return (
        <span className="relative flex h-1.5 w-1.5 shrink-0 items-center justify-center">
            {animated && (
                <span
                    className={cn(
                        'absolute h-1.5 w-1.5 animate-ping rounded-full opacity-45',
                        dotClassName,
                    )}
                />
            )}
            <span className={cn('relative h-1.5 w-1.5 rounded-full', dotClassName)} />
        </span>
    )
}
