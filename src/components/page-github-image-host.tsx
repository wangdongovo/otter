import { type ComponentProps, useEffect, useState } from 'react'
import {
    Check,
    Copy,
    GitBranch,
    Image as ImageIcon,
    ImageUp,
    Link,
    Loader2,
    SlidersHorizontal,
    Trash2,
    Upload,
} from 'lucide-react'
import { StatusDot, type StatusDotTone } from '@/components/status-dot'
import { Button } from '@/components/ui/button'
import type { SelectedImageFile } from '@/image-compressor-types'
import type {
    CdnProvider,
    GithubImageHostConfig,
    GithubImageHostConnection,
    GithubImageHostPublicConfig,
    GithubImageUploadRecord,
} from '@/github-image-host-types'
import { cn } from '@/lib/utils'

type UploadStatus = 'queued' | 'uploading' | 'completed' | 'failed'

interface UploadItem extends SelectedImageFile {
    id: string
    status: UploadStatus
    previewUrl?: string
    url?: string
    error?: string
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

const defaultForm: GithubImageHostConfig = {
    owner: '',
    repo: '',
    branch: 'main',
    directory: 'images',
    token: '',
    cdnProvider: 'jsdelivr',
    customCdnPrefix: '',
}

const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`

    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const getStatusDotTone = (status: UploadStatus): StatusDotTone => {
    if (status === 'completed') return 'success'
    if (status === 'failed') return 'danger'
    if (status === 'uploading') return 'info'

    return 'neutral'
}

const getConnectionDotTone = (
    connection: GithubImageHostConnection | null,
    isChecking: boolean,
    isConfigured: boolean,
): StatusDotTone => {
    if (!isConfigured) return 'neutral'
    if (isChecking) return 'info'
    if (!connection) return 'neutral'

    return connection.ok ? 'success' : 'danger'
}

function StableButton({
    className,
    ...props
}: ComponentProps<typeof Button>) {
    return <Button className={cn('active:translate-y-0', className)} {...props} />
}

const applyPublicConfig = (
    config: GithubImageHostPublicConfig,
): GithubImageHostConfig => ({
    owner: config.owner,
    repo: config.repo,
    branch: config.branch,
    directory: config.directory,
    token: config.token,
    cdnProvider: config.cdnProvider,
    customCdnPrefix: config.customCdnPrefix,
})

interface PageGithubImageHostProps {
    onOpenGithubSettings: () => void
}

export function PageGithubImageHost({ onOpenGithubSettings }: PageGithubImageHostProps) {
    const [form, setForm] = useState<GithubImageHostConfig>(defaultForm)
    const [connection, setConnection] = useState<GithubImageHostConnection | null>(null)
    const [items, setItems] = useState<UploadItem[]>([])
    const [records, setRecords] = useState<GithubImageUploadRecord[]>([])
    const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
    const [isTesting, setIsTesting] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [notice, setNotice] = useState('')
    const [noticeTone, setNoticeTone] = useState<'neutral' | 'success' | 'error'>('neutral')
    const [copiedId, setCopiedId] = useState('')

    const canTestConnection = (config: GithubImageHostConfig) =>
        Boolean(config.owner && config.repo && config.branch && config.token)

    const runConnectionCheck = async (config: GithubImageHostConfig) => {
        if (!canTestConnection(config)) {
            setConnection(null)
            return
        }

        setIsTesting(true)

        try {
            const result = await window.githubImageHost.testConnection(config)

            setConnection(result)
        } finally {
            setIsTesting(false)
        }
    }

    useEffect(() => {
        const load = async () => {
            const [config, uploadRecords] = await Promise.all([
                window.githubImageHost.getConfig(),
                window.githubImageHost.listRecords(),
            ])

            setForm(applyPublicConfig(config))
            setRecords(uploadRecords)
            void runConnectionCheck(applyPublicConfig(config))
        }

        void load()
    }, [])

    useEffect(() => {
        const loadPreviews = async () => {
            const entries = await Promise.all(
                records.map(async (record) => {
                    const previewUrl = await window.githubImageHost
                        .getRecordPreview(record.id)
                        .catch((): null => null)

                    return [record.id, previewUrl] as const
                }),
            )

            setPreviewUrls(
                Object.fromEntries(
                    entries.filter((entry): entry is readonly [string, string] =>
                        Boolean(entry[1]),
                    ),
                ),
            )
        }

        if (records.length > 0) {
            void loadPreviews()
        } else {
            setPreviewUrls({})
        }
    }, [records])

    const handleSelectImages = async () => {
        const selected = await window.imageCompressor.selectImageFiles()

        if (selected.length === 0) return

        const filesWithPreview = await Promise.all(
            selected.map(async (file) => {
                try {
                    return {
                        ...file,
                        previewUrl: await window.imageCompressor.readImageDataUrl(file.path),
                    }
                } catch {
                    return {
                        ...file,
                        previewUrl: '',
                    }
                }
            }),
        )

        addItemsToQueue(filesWithPreview)
        setNotice('')
        setNoticeTone('neutral')
    }

    const addItemsToQueue = (
        selected: Array<SelectedImageFile & { previewUrl?: string }>,
    ) => {
        setItems((current) => {
            const existing = new Set(current.map((item) => item.path))
            const nextItems = selected
                .filter((file) => !existing.has(file.path))
                .map((file) => ({
                    ...file,
                    id: `${file.path}-${file.size}`,
                    status: 'queued' as UploadStatus,
                    previewUrl: file.previewUrl,
                }))

            return [...nextItems, ...current]
        })
    }

    const updateItem = (id: string, patch: Partial<UploadItem>) => {
        setItems((current) =>
            current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        )
    }

    const handleUploadItem = async (item: UploadItem) => {
        setIsUploading(true)
        setNotice('')
        setNoticeTone('neutral')

        try {
            updateItem(item.id, { status: 'uploading', error: undefined })

            const record = await window.githubImageHost.uploadImage({
                filePath: item.path,
                fileName: item.name,
            })

            updateItem(item.id, {
                status: 'completed',
                url: record.cdnUrl,
            })
            setRecords((current) => [record, ...current])
        } catch (error) {
            updateItem(item.id, {
                status: 'failed',
                error: error instanceof Error ? error.message : '上传失败',
            })
        }

        setIsUploading(false)
    }

    const readFileAsDataUrl = (file: File) =>
        new Promise<string>((resolve, reject) => {
            const reader = new FileReader()

            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result)
                } else {
                    reject(new Error('无法读取粘贴图片。'))
                }
            }
            reader.onerror = () => reject(new Error('无法读取粘贴图片。'))
            reader.readAsDataURL(file)
        })

    const createUploadItem = (
        image: SelectedImageFile,
        previewUrl?: string,
    ): UploadItem => ({
        ...image,
        id: `${image.path}-${image.size}`,
        status: 'queued',
        previewUrl,
    })

    const handlePasteImage = async (event?: ClipboardEvent) => {
        const clipboardItems = Array.from(event?.clipboardData?.items ?? [])
        const imageItem = clipboardItems.find((item) => item.type.startsWith('image/'))

        if (imageItem) {
            const file = imageItem.getAsFile()

            if (file) {
                const dataUrl = await readFileAsDataUrl(file)
                const savedImage = await window.githubImageHost.savePastedImage({
                    dataUrl,
                    fileName: file.name || undefined,
                })
                const uploadItem = createUploadItem(savedImage, dataUrl)

                addItemsToQueue([uploadItem])
                await handleUploadItem(uploadItem)
                return
            }
        }

        const pastedImage = await window.githubImageHost.readClipboardImage()

        if (!pastedImage) {
            setNotice('剪贴板里没有可上传的图片。')
            setNoticeTone('error')
            return
        }

        const dataUrl = await window.imageCompressor.readImageDataUrl(pastedImage.path)
        const pastedItem = createUploadItem(pastedImage, dataUrl)

        addItemsToQueue([pastedItem])
        await handleUploadItem(pastedItem)
    }

    useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
            const target = event.target
            const isEditableTarget =
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                (target instanceof HTMLElement && target.isContentEditable)

            if (isEditableTarget || isUploading) {
                return
            }

            event.preventDefault()
            void handlePasteImage(event)
        }

        window.addEventListener('paste', handlePaste)

        return () => window.removeEventListener('paste', handlePaste)
    }, [isUploading])

    const handleCopy = async (id: string, url: string) => {
        await navigator.clipboard.writeText(url)
        setCopiedId(id)
        window.setTimeout(() => setCopiedId(''), 1200)
    }

    const handleDeleteRecord = async (id: string) => {
        const nextRecords = await window.githubImageHost.deleteRecord(id)

        setRecords(nextRecords)
    }

    const repoSummary =
        form.owner && form.repo ? `${form.owner}/${form.repo}` : '尚未配置仓库'
    const pathSummary = `${form.branch || 'main'} / ${form.directory || 'images'}`
    const cdnLabel =
        CDN_OPTIONS.find((option) => option.value === form.cdnProvider)?.label ?? 'jsDelivr'
    const isConnectionConfigured = canTestConnection(form)
    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-8 pb-8 pt-8">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-2.5">
                    <GitBranch className="mt-1 h-5 w-5 text-muted-foreground" />
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">GitHub 图床</h1>
                        <p className="mt-1 text-sm text-muted-foreground">上传图片，生成 CDN 链接。</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <StatusDot
                        tone={getConnectionDotTone(
                            connection,
                            isTesting,
                            isConnectionConfigured,
                        )}
                        animated={isTesting}
                    />
                    <StableButton
                        variant="ghost"
                        size="icon-sm"
                        onClick={onOpenGithubSettings}
                        title="GitHub 配置"
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                    </StableButton>
                </div>
            </div>

            <section className="flex flex-col gap-3">
                <div className="grid gap-3 rounded-lg border border-border bg-card p-3 md:grid-cols-4">
                    <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-muted-foreground" />
                        <div className="min-w-0">
                            <div className="text-xs text-muted-foreground">仓库</div>
                            <div className="truncate text-sm font-medium text-foreground">
                                {repoSummary}
                            </div>
                        </div>
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">分支 / 目录</div>
                        <div className="truncate text-sm font-medium text-foreground">
                            {pathSummary}
                        </div>
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">CDN</div>
                        <div className="truncate text-sm font-medium text-foreground">
                            {cdnLabel}
                        </div>
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">Token</div>
                        <div className="truncate text-sm font-medium text-foreground">
                            {form.token ? '已保存' : '未配置'}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Upload className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">批量上传</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {items.length} 个文件
                        </span>
                    </div>

                    <div
                        role="button"
                        tabIndex={isUploading ? -1 : 0}
                        onClick={() => {
                            if (!isUploading) {
                                void handleSelectImages()
                            }
                        }}
                        onKeyDown={(event) => {
                            if (isUploading) return
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                void handleSelectImages()
                            }
                        }}
                        className={cn(
                            'group relative flex min-h-48 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border bg-muted/15 p-8 transition-colors hover:border-foreground/25 hover:bg-muted/35 focus-visible:outline-none focus-visible:border-ring/60 focus-visible:ring-1 focus-visible:ring-ring/25',
                            isUploading && 'pointer-events-none cursor-default opacity-60',
                        )}
                        title="选择图片"
                    >
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-background transition-colors group-hover:bg-accent">
                            <ImageUp className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-foreground" />
                        </div>
                    </div>

                    {notice && (
                        <div
                            className={cn(
                                'rounded-lg px-3 py-2 text-sm',
                                noticeTone === 'success' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                                noticeTone === 'error' && 'bg-destructive/10 text-destructive',
                                noticeTone === 'neutral' && 'bg-muted text-muted-foreground',
                            )}
                        >
                            {notice}
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        {items.length === 0 ? (
                            <div className="flex h-24 items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">
                                暂无上传队列。
                            </div>
                        ) : (
                            items.map((item) => (
                                <div
                                    key={item.id}
                            className="grid gap-3 rounded-lg border border-border bg-background/40 p-3 md:grid-cols-[minmax(0,1fr)_32px_88px]"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                                            {item.previewUrl ? (
                                                <img
                                                    src={item.previewUrl}
                                                    alt={item.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-medium text-foreground">
                                                {item.name}
                                            </div>
                                            <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                                                <span>{formatBytes(item.size)}</span>
                                                {item.url && <span className="truncate">{item.url}</span>}
                                                {item.error && (
                                                    <span className="text-destructive">{item.error}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center">
                                        <StatusDot
                                            tone={getStatusDotTone(item.status)}
                                            animated={item.status === 'uploading'}
                                        />
                                    </div>
                                    <div className="flex items-center justify-end gap-1">
                                        <StableButton
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => handleUploadItem(item)}
                                            disabled={isUploading || item.status === 'completed'}
                                            title="上传"
                                        >
                                            {item.status === 'uploading' ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Upload className="h-4 w-4" />
                                            )}
                                        </StableButton>
                                        <StableButton
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() =>
                                                setItems((current) =>
                                                    current.filter((nextItem) => nextItem.id !== item.id),
                                                )
                                            }
                                            disabled={isUploading}
                                            title="移除"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </StableButton>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">已上传记录</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                        本地保存 {records.length} 条成功上传地址
                    </span>
                </div>

                {records.length === 0 ? (
                    <div className="flex h-36 items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">
                        还没有上传成功的图片。
                    </div>
                ) : (
                    <div className="columns-2 gap-3 md:columns-3 xl:columns-4">
                        {records.map((record) => (
                            <div
                                key={record.id}
                                className="group relative mb-3 break-inside-avoid overflow-hidden rounded-lg border border-border bg-muted"
                            >
                                <img
                                    src={previewUrls[record.id] ?? record.cdnUrl}
                                    alt={record.originalName}
                                    className="block h-auto w-full object-cover"
                                    loading="lazy"
                                />
                                <div className="pointer-events-none absolute inset-0 bg-foreground/0 transition-colors group-hover:bg-foreground/10" />
                                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                    <StableButton
                                        variant="secondary"
                                        size="icon-sm"
                                        onClick={() => handleCopy(record.id, record.cdnUrl)}
                                        title="复制链接"
                                        className="bg-background/90 shadow-sm hover:bg-background"
                                    >
                                        {copiedId === record.id ? (
                                            <Check className="h-4 w-4" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </StableButton>
                                    <StableButton
                                        variant="secondary"
                                        size="icon-sm"
                                        onClick={() => handleDeleteRecord(record.id)}
                                        title="删除本地记录"
                                        className="bg-background/90 shadow-sm hover:bg-background"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </StableButton>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
