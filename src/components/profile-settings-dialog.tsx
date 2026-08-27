import { useEffect, useMemo, useState } from 'react'
import {
    ArrowLeft,
    Check,
    CheckCircle2,
    Cloud,
    Code2,
    Download,
    Gauge,
    Globe2,
    FolderGit2,
    KeyRound,
    Loader2,
    Palette,
    Search,
    Settings,
    Save,
    UserCircle,
} from 'lucide-react'
import type {
    CdnProvider,
    GithubImageHostConfig,
    GithubImageHostConnection,
    GithubImageHostPublicConfig,
} from '@/github-image-host-types'
import { cn } from '@/lib/utils'

type SettingsSection = 'profile' | 'github'

interface ProfileSettingsDialogProps {
    open: boolean
    onClose: () => void
    initialSection?: SettingsSection
}

interface SettingsNavItem {
    id: string
    label: string
    icon: React.ReactNode
}

const emptyGithubConfig: GithubImageHostConfig = {
    owner: '',
    repo: '',
    branch: 'main',
    directory: 'images',
    token: '',
    cdnProvider: 'jsdelivr',
    customCdnPrefix: '',
}

const CDN_OPTIONS: Array<{
    value: CdnProvider
    label: string
    description: string
}> = [
    {
        value: 'jsdelivr',
        label: 'jsDelivr',
        description: '适合公开仓库，访问速度和缓存表现稳定。',
    },
    {
        value: 'statically',
        label: 'Statically',
        description: 'GitHub 静态资源 CDN，适合常规图片访问。',
    },
    {
        value: 'raw',
        label: 'GitHub Raw',
        description: 'GitHub 原始文件地址，不经过第三方 CDN。',
    },
    {
        value: 'custom',
        label: '自定义前缀',
        description: '使用自己的 CDN 或代理前缀拼接资源地址。',
    },
]

const personalSettings: SettingsNavItem[] = [
    { id: 'general', label: '常规', icon: <Settings className="h-4 w-4" /> },
    { id: 'import', label: '导入', icon: <Download className="h-4 w-4" /> },
    { id: 'profile', label: '个人资料', icon: <UserCircle className="h-4 w-4" /> },
    { id: 'appearance', label: '外观', icon: <Palette className="h-4 w-4" /> },
    { id: 'usage', label: '使用情况', icon: <Gauge className="h-4 w-4" /> },
]

const integrationSettings: SettingsNavItem[] = [
    { id: 'github', label: 'GitHub 图床', icon: <Cloud className="h-4 w-4" /> },
    { id: 'cdn', label: 'CDN', icon: <Globe2 className="h-4 w-4" /> },
]

const developerSettings: SettingsNavItem[] = [
    { id: 'code', label: '开发配置', icon: <Code2 className="h-4 w-4" /> },
]

function ConfigRow({
    label,
    value,
    mono,
}: {
    label: string
    value: string
    mono?: boolean
}) {
    return (
        <div className="grid grid-cols-[112px_minmax(0,1fr)] items-start gap-4 py-2.5">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div
                className={cn(
                    'min-w-0 break-all text-sm text-foreground',
                    mono && 'font-mono text-[12px] leading-5',
                    !value && 'text-muted-foreground',
                )}
            >
                {value || '未配置'}
            </div>
        </div>
    )
}

function applyPublicConfig(config: GithubImageHostPublicConfig): GithubImageHostConfig {
    return {
        owner: config.owner,
        repo: config.repo,
        branch: config.branch,
        directory: config.directory,
        token: config.token,
        cdnProvider: config.cdnProvider,
        customCdnPrefix: config.customCdnPrefix,
    }
}

function canTestConnection(config: GithubImageHostConfig) {
    return Boolean(config.owner && config.repo && config.branch && config.token)
}

function getConnectionLabel(
    config: GithubImageHostConfig,
    connection: GithubImageHostConnection | null,
    isTesting: boolean,
) {
    if (!canTestConnection(config)) return '未配置'
    if (isTesting) return '连接中'
    if (connection?.ok) return '已连接'
    if (connection) return '未连接'

    return '待连接'
}

function getConnectionDotClass(
    config: GithubImageHostConfig,
    connection: GithubImageHostConnection | null,
    isTesting: boolean,
) {
    if (!canTestConnection(config)) return 'bg-zinc-300 shadow-[0_0_8px_rgb(212_212_216_/_0.75)]'
    if (isTesting) return 'bg-cyan-300 shadow-[0_0_12px_rgb(103_232_249_/_0.95)]'

    return connection?.ok
        ? 'bg-emerald-300 shadow-[0_0_12px_rgb(110_231_183_/_0.95)]'
        : 'bg-rose-300 shadow-[0_0_12px_rgb(253_164_175_/_0.95)]'
}

function StatusDot({ className }: { className: string }) {
    return (
        <span className="relative flex h-1.5 w-1.5 shrink-0 items-center justify-center">
            <span
                className={cn(
                    'absolute h-1.5 w-1.5 rounded-full opacity-45 animate-ping',
                    className,
                )}
            />
            <span className={cn('relative h-1.5 w-1.5 rounded-full', className)} />
        </span>
    )
}

function Field({
    label,
    children,
}: {
    label: string
    children: React.ReactNode
}) {
    return (
        <label className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-6 border-b border-border px-6 py-4 last:border-b-0">
            <span className="text-sm font-medium text-foreground">{label}</span>
            {children}
        </label>
    )
}

export function ProfileSettingsDialog({
    open,
    onClose,
    initialSection = 'profile',
}: ProfileSettingsDialogProps) {
    const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection)
    const [config, setConfig] = useState(emptyGithubConfig)
    const [hasToken, setHasToken] = useState(false)
    const [connection, setConnection] = useState<GithubImageHostConnection | null>(null)
    const [loading, setLoading] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [notice, setNotice] = useState('')

    const runConnectionCheck = async (nextConfig: GithubImageHostConfig) => {
        if (!canTestConnection(nextConfig)) {
            setConnection(null)
            return
        }

        setIsTesting(true)

        try {
            const result = await window.githubImageHost.testConnection(nextConfig)

            setConnection(result)
        } finally {
            setIsTesting(false)
        }
    }

    useEffect(() => {
        if (!open) return

        let mounted = true

        setActiveSection(initialSection)
        setLoading(true)
        window.githubImageHost
            .getConfig()
            .then((savedConfig) => {
                if (mounted) {
                    const nextConfig = applyPublicConfig(savedConfig)

                    setConfig(nextConfig)
                    setHasToken(savedConfig.hasToken)
                    void runConnectionCheck(nextConfig)
                }
            })
            .finally(() => {
                if (mounted) {
                    setLoading(false)
                }
            })

        return () => {
            mounted = false
        }
    }, [open, initialSection])

    const updateConfig = (patch: Partial<GithubImageHostConfig>) => {
        setConfig((current) => ({ ...current, ...patch }))
        setNotice('')
        setConnection(null)
    }

    const handleSave = async () => {
        setIsSaving(true)
        setNotice('')

        try {
            const saved = await window.githubImageHost.saveConfig(config)
            const nextConfig = applyPublicConfig(saved)

            setConfig(nextConfig)
            setHasToken(saved.hasToken)
            setNotice('GitHub 图床配置已保存。')
            void runConnectionCheck(nextConfig)
        } catch (error) {
            setNotice(error instanceof Error ? error.message : '配置保存失败。')
        } finally {
            setIsSaving(false)
        }
    }

    const repoFullName = useMemo(() => {
        if (!config.owner || !config.repo) return ''

        return `${config.owner}/${config.repo}`
    }, [config.owner, config.repo])

    const connectionLabel = getConnectionLabel(config, connection, isTesting)
    const connectionMessage = connection?.message ?? '保存配置后会自动检测连接状态。'
    const cdnDescription =
        CDN_OPTIONS.find((option) => option.value === config.cdnProvider)?.description ?? ''

    if (!open) return null

    return (
        <div className="flex h-screen overflow-hidden bg-background text-foreground">
            <aside className="flex w-[292px] shrink-0 flex-col border-r border-border bg-sidebar px-2 pb-3 text-sidebar-foreground">
                <div className="h-[64px] shrink-0 [-webkit-app-region:drag]" />

                <button
                    type="button"
                    onClick={onClose}
                    className="mb-4 flex h-9 w-full items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>返回应用</span>
                </button>

                <div className="mb-5 flex h-10 items-center gap-2 rounded-full border border-border bg-background px-3 text-muted-foreground">
                    <Search className="h-4 w-4" />
                    <span className="text-sm">搜索设置...</span>
                </div>

                <nav className="flex-1 overflow-y-auto">
                    <div className="mb-5">
                        <p className="mb-1 px-2 text-sm font-medium text-muted-foreground">
                            个人
                        </p>
                        <div className="space-y-0.5">
                            {personalSettings.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        if (item.id === 'profile') {
                                            setActiveSection('profile')
                                        }
                                    }}
                                    className={cn(
                                        'flex h-9 w-full items-center gap-2 rounded-lg px-2 text-sm transition-colors',
                                        item.id === activeSection
                                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                            : 'text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                    )}
                                >
                                    <span className="text-muted-foreground">{item.icon}</span>
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-5">
                        <p className="mb-1 px-2 text-sm font-medium text-muted-foreground">
                            集成
                        </p>
                        <div className="space-y-0.5">
                            {integrationSettings.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        if (item.id === 'github') {
                                            setActiveSection('github')
                                        }
                                    }}
                                    className={cn(
                                        'flex h-9 w-full items-center gap-2 rounded-lg px-2 text-sm transition-colors',
                                        item.id === activeSection
                                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                            : 'text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                    )}
                                >
                                    <span className="text-muted-foreground">{item.icon}</span>
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="mb-1 px-2 text-sm font-medium text-muted-foreground">
                            编码
                        </p>
                        <div className="space-y-0.5">
                            {developerSettings.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-sm text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                >
                                    <span className="text-muted-foreground">{item.icon}</span>
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </nav>
            </aside>

            <main className="min-w-0 flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-[980px] px-8 pb-16 pt-24">
                    {activeSection === 'profile' ? (
                        <>
                            <h1 className="mb-16 text-3xl font-semibold tracking-normal text-foreground">
                                个人资料
                            </h1>

                            <section className="mb-12">
                                <h2 className="mb-6 text-base font-semibold text-foreground">
                                    本地账户
                                </h2>
                                <div className="rounded-2xl border border-border bg-card">
                                    <div className="flex items-center gap-4 px-6 py-5">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background">
                                            <UserCircle className="h-7 w-7" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium text-foreground">
                                                本地用户
                                            </div>
                                            <div className="mt-1 truncate text-sm text-muted-foreground">
                                                当前信息保存在本机应用缓存中
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="mb-12">
                                <div className="mb-6 flex items-center justify-between">
                                    <h2 className="text-base font-semibold text-foreground">
                                        GitHub 图床信息
                                    </h2>
                                    {hasToken && (
                                        <span className="flex items-center gap-1 text-sm text-emerald-600">
                                            <CheckCircle2 className="h-4 w-4" />
                                            已配置
                                        </span>
                                    )}
                                </div>

                                <div className="rounded-2xl border border-border bg-card px-6">
                                    {loading ? (
                                        <div className="py-10 text-sm text-muted-foreground">
                                            正在读取本地配置...
                                        </div>
                                    ) : (
                                        <>
                                            <ConfigRow label="仓库" value={repoFullName} />
                                            <ConfigRow label="Owner" value={config.owner} />
                                            <ConfigRow label="Repo" value={config.repo} />
                                            <ConfigRow label="Branch" value={config.branch} />
                                            <ConfigRow label="上传目录" value={config.directory} />
                                            <ConfigRow label="CDN" value={config.cdnProvider} />
                                            <ConfigRow
                                                label="自定义 CDN"
                                                value={config.customCdnPrefix}
                                            />
                                            <ConfigRow label="Token" value={config.token} mono />
                                        </>
                                    )}
                                </div>
                            </section>

                            <section>
                                <h2 className="mb-6 text-base font-semibold text-foreground">
                                    重要信息
                                </h2>
                                <div className="rounded-2xl border border-border bg-card">
                                    <div className="flex items-start gap-4 border-b border-border px-6 py-5">
                                        <FolderGit2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium text-foreground">
                                                图床路径
                                            </div>
                                            <div className="mt-1 break-all text-sm text-muted-foreground">
                                                {repoFullName
                                                    ? `${repoFullName}/${config.branch}/${config.directory || ''}`
                                                    : '未配置 GitHub 仓库'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 px-6 py-5">
                                        <KeyRound className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium text-foreground">
                                                访问令牌
                                            </div>
                                            <div className="mt-1 text-sm text-muted-foreground">
                                                Token 仅从本机缓存读取，并按当前需求在设置页明文显示。
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </>
                    ) : (
                        <>
                            <div className="mb-12 flex items-center justify-between gap-4">
                                <div>
                                    <h1 className="text-3xl font-semibold tracking-normal text-foreground">
                                        GitHub 图床
                                    </h1>
                                    <p className="mt-3 text-sm text-muted-foreground">
                                        配置图片上传仓库、访问 Token 和 CDN 链接前缀。
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
                                    <StatusDot
                                        className={getConnectionDotClass(
                                            config,
                                            connection,
                                            isTesting,
                                        )}
                                    />
                                    {connectionLabel}
                                </div>
                            </div>

                            <section className="mb-10">
                                <h2 className="mb-6 text-base font-semibold text-foreground">
                                    连接状态
                                </h2>
                                <div className="rounded-2xl border border-border bg-card px-6 py-5">
                                    <div className="flex items-start justify-between gap-6">
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium text-foreground">
                                                {connectionLabel}
                                            </div>
                                            <div className="mt-1 break-words text-sm text-muted-foreground">
                                                {connectionMessage}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => runConnectionCheck(config)}
                                            disabled={!canTestConnection(config) || isTesting}
                                            className="flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                                        >
                                            {isTesting ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Check className="h-4 w-4" />
                                            )}
                                            测试连接
                                        </button>
                                    </div>
                                </div>
                            </section>

                            <section className="mb-10">
                                <div className="mb-6 flex items-center justify-between">
                                    <h2 className="text-base font-semibold text-foreground">
                                        仓库配置
                                    </h2>
                                    {hasToken && (
                                        <span className="text-sm text-muted-foreground">
                                            Token 已从本地缓存回显
                                        </span>
                                    )}
                                </div>

                                <div className="rounded-2xl border border-border bg-card">
                                    <Field label="Owner">
                                        <input
                                            value={config.owner}
                                            onChange={(event) =>
                                                updateConfig({ owner: event.target.value })
                                            }
                                            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                                            placeholder="octocat"
                                        />
                                    </Field>
                                    <Field label="Repo">
                                        <input
                                            value={config.repo}
                                            onChange={(event) =>
                                                updateConfig({ repo: event.target.value })
                                            }
                                            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                                            placeholder="image-host"
                                        />
                                    </Field>
                                    <Field label="Branch">
                                        <input
                                            value={config.branch}
                                            onChange={(event) =>
                                                updateConfig({ branch: event.target.value })
                                            }
                                            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                                            placeholder="main"
                                        />
                                    </Field>
                                    <Field label="上传目录">
                                        <input
                                            value={config.directory}
                                            onChange={(event) =>
                                                updateConfig({ directory: event.target.value })
                                            }
                                            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                                            placeholder="images"
                                        />
                                    </Field>
                                    <Field label="Token">
                                        <input
                                            type="text"
                                            value={config.token}
                                            onChange={(event) =>
                                                updateConfig({ token: event.target.value })
                                            }
                                            className="h-9 w-full rounded-lg border border-input bg-background px-3 font-mono text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                                            placeholder="GitHub fine-grained token"
                                        />
                                    </Field>
                                </div>
                            </section>

                            <section className="mb-10">
                                <h2 className="mb-6 text-base font-semibold text-foreground">
                                    CDN 链接
                                </h2>
                                <div className="rounded-2xl border border-border bg-card">
                                    <Field label="链接前缀">
                                        <div className="space-y-2">
                                            <select
                                                value={config.cdnProvider}
                                                onChange={(event) =>
                                                    updateConfig({
                                                        cdnProvider: event.target.value as CdnProvider,
                                                    })
                                                }
                                                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                                            >
                                                {CDN_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-muted-foreground">
                                                {cdnDescription}
                                            </p>
                                        </div>
                                    </Field>
                                    {config.cdnProvider === 'custom' && (
                                        <Field label="自定义 CDN">
                                            <input
                                                value={config.customCdnPrefix}
                                                onChange={(event) =>
                                                    updateConfig({
                                                        customCdnPrefix: event.target.value,
                                                    })
                                                }
                                                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                                                placeholder="https://cdn.example.com"
                                            />
                                        </Field>
                                    )}
                                </div>
                            </section>

                            <div className="flex items-center justify-between gap-4">
                                <p
                                    className={cn(
                                        'min-w-0 text-sm',
                                        notice.includes('失败')
                                            ? 'text-destructive'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    {notice || '配置会保存到本机缓存，下次打开自动回显。'}
                                </p>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex h-9 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-60"
                                >
                                    {isSaving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}
                                    保存配置
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    )
}
