import type React from 'react'
import {
    Cloud,
    ImageDown,
    PanelLeft,
    Sparkles,
    UserCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
    id: string
    label: string
    icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
    {
        id: 'imageCompressor',
        label: '图片压缩',
        icon: <ImageDown className="h-4 w-4" />,
    },
    {
        id: 'githubImageHost',
        label: 'GitHub 图床',
        icon: <Cloud className="h-4 w-4" />,
    },
]

interface SidebarNavProps {
    activeId: string
    onSelect: (id: string) => void
    collapsed: boolean
    onToggle: () => void
    onProfileClick: () => void
}

export function SidebarNav({
    activeId,
    onSelect,
    collapsed,
    onToggle,
    onProfileClick,
}: SidebarNavProps) {
    return (
        <aside
            className={cn(
                'relative flex h-full shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out',
                collapsed ? 'w-0 overflow-hidden' : 'w-[260px]'
            )}
        >
            <div className="flex h-[52px] shrink-0 items-center pl-[84px] pr-3 [-webkit-app-region:drag]">
                <button
                    type="button"
                    onClick={onToggle}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [-webkit-app-region:no-drag]"
                    title="收起侧边栏"
                >
                    <PanelLeft className="h-[17px] w-[17px]" />
                </button>
            </div>

            <div className="space-y-1 px-2">
                <button
                    type="button"
                    onClick={() => onSelect('imageCompressor')}
                    className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                >
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
                        <Sparkles className="h-4 w-4" />
                    </span>
                    <span className="flex-1 truncate text-left font-medium">Otter</span>
                </button>
            </div>

            <nav className="mt-4 flex-1 overflow-y-auto px-2 pb-4">
                <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">工作区</p>
                <ul className="space-y-0.5">
                    {NAV_ITEMS.map((item) => (
                        <li key={item.id}>
                            <button
                                type="button"
                                onClick={() => onSelect(item.id)}
                                className={cn(
                                    'flex h-9 w-full items-center gap-2 rounded-lg px-2 text-sm transition-colors',
                                    activeId === item.id
                                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                                )}
                            >
                                <span
                                    className={cn(
                                        'flex h-6 w-6 shrink-0 items-center justify-center',
                                        activeId === item.id
                                            ? 'text-sidebar-accent-foreground'
                                            : 'text-muted-foreground'
                                    )}
                                >
                                    {item.icon}
                                </span>
                                <span className="truncate">{item.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="px-2 pb-2">
                <button
                    type="button"
                    onClick={onProfileClick}
                    className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-sm text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                    <UserCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-left">个人工作台</span>
                </button>
            </div>
        </aside>
    )
}
