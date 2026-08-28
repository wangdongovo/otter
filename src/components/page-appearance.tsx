import type React from 'react'
import { Check, Monitor, Moon, Sun, SunMoon, Type } from 'lucide-react'
import { useThemePreference } from '@/lib/theme'
import { cn } from '@/lib/utils'
import type { ThemePreference } from '@/theme-types'

const themeOptions: Array<{
    value: ThemePreference
    label: string
    description: string
    icon: React.ReactNode
}> = [
    {
        value: 'system',
        label: '跟随系统',
        description: '随系统外观自动切换',
        icon: <Monitor className="h-4 w-4" />,
    },
    {
        value: 'light',
        label: '浅色',
        description: '始终使用明亮界面',
        icon: <Sun className="h-4 w-4" />,
    },
    {
        value: 'dark',
        label: '深色',
        description: '始终使用暗色界面',
        icon: <Moon className="h-4 w-4" />,
    },
]

export function PageAppearance() {
    const { preference, resolvedTheme, setPreference } = useThemePreference()

    return (
        <div className="mx-auto flex w-full max-w-[640px] flex-col px-8 pb-14 pt-14">
            <div className="mb-7">
                <div className="flex items-center gap-2.5">
                    <SunMoon className="h-[18px] w-[18px] text-muted-foreground" />
                    <h1 className="text-[22px] font-semibold leading-8 text-foreground">外观</h1>
                </div>
                <p className="mt-2 max-w-[520px] text-sm leading-6 text-muted-foreground">
                    调整主题显示方式。选择跟随系统时，会随系统浅色或深色外观自动切换。
                </p>
            </div>

            <section className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex min-h-[72px] items-center justify-between gap-5 border-b border-border px-4 py-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <SunMoon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">主题</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                当前显示为{resolvedTheme === 'dark' ? '深色' : '浅色'}
                            </p>
                        </div>
                    </div>
                    <div className="grid h-10 shrink-0 grid-cols-3 rounded-xl border border-border bg-muted/40 p-1">
                        {themeOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setPreference(option.value)}
                                className={cn(
                                    'flex h-8 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/25 [&_svg]:h-4 [&_svg]:w-4',
                                    preference === option.value &&
                                        'bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0_/_0.06)]',
                                )}
                                title={option.label}
                            >
                                {option.icon}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="divide-y divide-border">
                    {themeOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setPreference(option.value)}
                            className={cn(
                                'group flex min-h-[58px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent',
                                preference === option.value && 'bg-accent/70',
                            )}
                        >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:text-foreground">
                                {option.icon}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium text-foreground">
                                    {option.label}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                    {option.description}
                                </span>
                            </span>
                            {preference === option.value && (
                                <Check className="h-4 w-4 shrink-0 text-foreground" />
                            )}
                        </button>
                    ))}
                </div>
            </section>

            <section className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
                <button
                    type="button"
                    className="flex min-h-[58px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
                >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Type className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground">字体大小</span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            调整界面文字显示大小
                        </span>
                    </span>
                </button>
            </section>
        </div>
    )
}
