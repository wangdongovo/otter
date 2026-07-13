import { cn } from '@/lib/utils'
import { Settings, Paintbrush } from 'lucide-react'

interface NavItem {
    id: string
    label: string
    icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
    {
        id: 'general',
        label: '通用',
        icon: <Settings className="h-4 w-4" />,
    },
    {
        id: 'appearance',
        label: '外观',
        icon: <Paintbrush className="h-4 w-4" />,
    },
]

interface SidebarNavProps {
    activeId: string
    onSelect: (id: string) => void
}

export function SidebarNav({ activeId, onSelect }: SidebarNavProps) {
    return (
        <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-border bg-sidebar">
            {/* 顶部拖拽区 + 搜索框
                pt-[52px]: 为红绿灯（高度约20px）留出空间，加上上边距共52px */}
            <div
                className="px-4 pb-3"
                style={{ paddingTop: '52px', WebkitAppRegion: 'drag' } as React.CSSProperties}
            >
                <div
                    className="flex h-7 items-center gap-2 rounded-md bg-muted px-2.5"
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                    <svg
                        className="h-3 w-3 shrink-0 text-muted-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <span className="text-xs text-muted-foreground select-none">搜索</span>
                </div>
            </div>

            {/* 导航列表 */}
            <nav className="flex-1 overflow-y-auto px-3 pb-4">
                <ul>
                    {NAV_ITEMS.map((item) => (
                        <li key={item.id}>
                            <button
                                onClick={() => onSelect(item.id)}
                                className={cn(
                                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                                    activeId === item.id
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground'
                                )}
                            >
                                <span
                                    className={cn(
                                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                                        activeId === item.id
                                            ? 'text-primary-foreground'
                                            : 'text-muted-foreground'
                                    )}
                                >
                                    {item.icon}
                                </span>
                                {item.label}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    )
}
