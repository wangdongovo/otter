import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SettingsItemProps {
    icon?: React.ReactNode
    label: string
    description?: string
    onClick?: () => void
    className?: string
    /** 是否是分组中的第一项（上圆角） */
    first?: boolean
    /** 是否是分组中的最后一项（下圆角） */
    last?: boolean
}

export function SettingsItem({
    icon,
    label,
    description,
    onClick,
    className,
    first,
    last,
}: SettingsItemProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'group flex w-full items-center gap-3 bg-card px-4 py-3 text-left transition-colors hover:bg-accent',
                first && 'rounded-t-xl',
                last && 'rounded-b-xl',
                !first && 'border-t border-border',
                className
            )}
        >
            {icon && (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    {icon}
                </span>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{label}</p>
                {description && (
                    <p className="text-xs text-muted-foreground truncate">{description}</p>
                )}
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </button>
    )
}

interface SettingsGroupProps {
    children: React.ReactNode
    className?: string
}

export function SettingsGroup({ children, className }: SettingsGroupProps) {
    return (
        <div className={cn('overflow-hidden rounded-xl border border-border', className)}>
            {children}
        </div>
    )
}
