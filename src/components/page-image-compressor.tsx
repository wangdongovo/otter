import { type ComponentProps, useEffect, useMemo, useState } from 'react'
import {
    ClipboardPaste,
    FileImage,
    FolderOpen,
    ImageDown,
    Images,
    Loader2,
    Play,
    RotateCcw,
    Search,
    Trash2,
    Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SelectedImageFile } from '@/image-compressor-types'
import { cn } from '@/lib/utils'

type OutputFormat = 'jpeg' | 'png' | 'webp'
type CompressStatus = 'queued' | 'reading' | 'compressing' | 'saving' | 'completed' | 'failed'

interface QueueImage extends SelectedImageFile {
    id: string
    status: CompressStatus
    progress: number
    previewUrl?: string
    outputName?: string
    outputPath?: string
    outputSize?: number
    error?: string
}

const OUTPUT_FORMATS: Array<{
    value: OutputFormat
    label: string
    extension: string
    mimeType: string
}> = [
    { value: 'jpeg', label: 'JPEG', extension: 'jpg', mimeType: 'image/jpeg' },
    { value: 'png', label: 'PNG', extension: 'png', mimeType: 'image/png' },
    { value: 'webp', label: 'WebP', extension: 'webp', mimeType: 'image/webp' },
]

const STATUS_LABELS: Record<CompressStatus, string> = {
    queued: '等待中',
    reading: '读取中',
    compressing: '压缩中',
    saving: '保存中',
    completed: '已完成',
    failed: '失败',
}

const STATUS_DOT_CLASSES: Record<CompressStatus, string> = {
    queued: 'bg-muted-foreground/45 ring-muted-foreground/15',
    reading: 'bg-muted-foreground/45 ring-muted-foreground/15',
    compressing: 'bg-emerald-500 ring-emerald-500/20',
    saving: 'bg-emerald-500 ring-emerald-500/20',
    completed: 'bg-emerald-500 ring-emerald-500/20',
    failed: 'bg-destructive ring-destructive/20',
}

function StableButton({ className, ...props }: ComponentProps<typeof Button>) {
    return <Button className={cn('active:translate-y-0', className)} {...props} />
}

function StatusDot({ status }: { status: CompressStatus }) {
    return (
        <span
            className={cn(
                'h-2.5 w-2.5 shrink-0 rounded-full ring-4',
                STATUS_DOT_CLASSES[status],
            )}
        />
    )
}

const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`

    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const formatTimestamp = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, '0')

    return [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate()),
        '-',
        pad(date.getHours()),
        pad(date.getMinutes()),
        pad(date.getSeconds()),
    ].join('')
}

const getBaseName = (fileName: string) => fileName.replace(/\.[^.]+$/, '')

const sanitizeStem = (value: string) =>
    value
        .split('')
        .map((character) =>
            character.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(character) ? '-' : character,
        )
        .join('')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^\.+$/, '')

const getFormatConfig = (format: OutputFormat) =>
    OUTPUT_FORMATS.find((item) => item.value === format) ?? OUTPUT_FORMATS[0]

const waitForFrame = () =>
    new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve())
    })

const loadImage = async (dataUrl: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image()

        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error('图片无法加载'))
        image.src = dataUrl
    })

const canvasToDataUrl = async (
    sourceDataUrl: string,
    mimeType: string,
    quality: number,
) => {
    const image = await loadImage(sourceDataUrl)
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
        throw new Error('无法创建图片画布')
    }

    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    context.drawImage(image, 0, 0)

    return canvas.toDataURL(mimeType, quality)
}

const buildOutputName = (
    image: QueueImage,
    index: number,
    pattern: string,
    prefix: string,
    timestamp: string,
    format: OutputFormat,
    usedNames: Set<string>,
) => {
    const formatConfig = getFormatConfig(format)
    const baseName = getBaseName(image.name)
    const rawStem = pattern
        .replaceAll('{name}', baseName)
        .replaceAll('{prefix}', prefix)
        .replaceAll('{timestamp}', timestamp)
        .replaceAll('{index}', String(index + 1).padStart(2, '0'))
    const initialStem = sanitizeStem(rawStem) || `${prefix}${baseName}` || `image-${index + 1}`
    let outputName = `${initialStem}.${formatConfig.extension}`
    let duplicateIndex = 2

    while (usedNames.has(outputName)) {
        outputName = `${initialStem}-${duplicateIndex}.${formatConfig.extension}`
        duplicateIndex += 1
    }

    usedNames.add(outputName)

    return outputName
}

const resetQueueImage = (item: QueueImage): QueueImage => ({
    ...item,
    status: 'queued',
    progress: 0,
    outputName: undefined,
    outputPath: undefined,
    outputSize: undefined,
    error: undefined,
})

const getStatusText = (item: QueueImage) => {
    if (item.status === 'completed' || item.status === 'failed' || item.status === 'queued') {
        return STATUS_LABELS[item.status]
    }

    return `${STATUS_LABELS[item.status]} ${item.progress}%`
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

export function PageImageCompressor() {
    const [items, setItems] = useState<QueueImage[]>([])
    const [outputDir, setOutputDir] = useState('')
    const [format, setFormat] = useState<OutputFormat>('jpeg')
    const [quality, setQuality] = useState(78)
    const [prefix, setPrefix] = useState('compressed-')
    const [pattern, setPattern] = useState('{prefix}{name}-{timestamp}')
    const [isProcessing, setIsProcessing] = useState(false)
    const [notice, setNotice] = useState('')

    const completedCount = items.filter((item) => item.status === 'completed').length
    const failedCount = items.filter((item) => item.status === 'failed').length
    const totalOriginalSize = items.reduce((total, item) => total + item.size, 0)
    const totalOutputSize = items.reduce((total, item) => total + (item.outputSize ?? 0), 0)
    const currentFormat = getFormatConfig(format)

    const previewName = useMemo(() => {
        if (items.length === 0) return `${prefix}photo-${formatTimestamp(new Date())}.${currentFormat.extension}`

        return buildOutputName(
            items[0],
            0,
            pattern,
            prefix,
            formatTimestamp(new Date()),
            format,
            new Set(),
        )
    }, [currentFormat.extension, format, items, pattern, prefix])

    const updateItem = (id: string, patch: Partial<QueueImage>) => {
        setItems((current) =>
            current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        )
    }

    const addImagesToQueue = (
        selected: Array<SelectedImageFile & { previewUrl?: string }>,
    ) => {
        setItems((current) => {
            const existingPaths = new Set(current.map((item) => item.path))
            const nextItems = selected
                .filter((file) => !existingPaths.has(file.path))
                .map((file) => ({
                    ...file,
                    id: `${file.path}-${file.size}`,
                    status: 'queued' as CompressStatus,
                    progress: 0,
                    previewUrl: file.previewUrl,
                }))

            return [...nextItems, ...current]
        })
    }

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

        setNotice('')
        addImagesToQueue(filesWithPreview)
    }

    const handlePasteImage = async (event?: ClipboardEvent) => {
        const clipboardItems = Array.from(event?.clipboardData?.items ?? [])
        const imageItem = clipboardItems.find((item) => item.type.startsWith('image/'))

        if (!imageItem) {
            const clipboardImage = await window.imageCompressor.readClipboardImage()

            if (!clipboardImage) {
                setNotice('剪贴板里没有可压缩的图片。')
                return
            }

            addImagesToQueue([
                {
                    ...clipboardImage,
                    previewUrl: await window.imageCompressor.readImageDataUrl(clipboardImage.path),
                },
            ])
            setNotice('')
            return
        }

        const file = imageItem.getAsFile()

        if (!file) {
            setNotice('无法读取剪贴板图片。')
            return
        }

        const dataUrl = await readFileAsDataUrl(file)
        const savedImage = await window.imageCompressor.savePastedImage({
            dataUrl,
            fileName: file.name || undefined,
        })

        addImagesToQueue([
            {
                ...savedImage,
                previewUrl: dataUrl,
            },
        ])
        setNotice('')
    }

    useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
            const target = event.target
            const isEditableTarget =
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                (target instanceof HTMLElement && target.isContentEditable)

            if (isProcessing || isEditableTarget) {
                return
            }

            event.preventDefault()
            void handlePasteImage(event)
        }

        window.addEventListener('paste', handlePaste)

        return () => window.removeEventListener('paste', handlePaste)
    }, [isProcessing])

    const handleSelectOutputFolder = async () => {
        const selectedDir = await window.imageCompressor.selectOutputFolder()

        if (selectedDir) {
            setOutputDir(selectedDir)
            setNotice('')
        }
    }

    const handleRemove = (id: string) => {
        setItems((current) => current.filter((item) => item.id !== id))
    }

    const handleShowInFolder = async (item: QueueImage) => {
        try {
            await window.imageCompressor.showImageInFolder(item.outputPath ?? item.path)
        } catch (error) {
            setNotice(error instanceof Error ? error.message : '无法打开文件所在位置。')
        }
    }

    const handleReset = () => {
        setItems((current) => current.map(resetQueueImage))
        setNotice('')
    }

    const handleCompress = async () => {
        if (items.length === 0) {
            setNotice('请先选择要压缩的图片。')
            return
        }

        if (!outputDir) {
            setNotice('请先选择压缩后的保存文件夹。')
            return
        }

        setIsProcessing(true)
        setNotice('')

        const usedNames = new Set<string>()
        const timestamp = formatTimestamp(new Date())

        setItems((current) => current.map(resetQueueImage))

        for (let index = 0; index < items.length; index += 1) {
            const item = items[index]
            const outputName = buildOutputName(
                item,
                index,
                pattern,
                prefix,
                timestamp,
                format,
                usedNames,
            )

            try {
                updateItem(item.id, {
                    status: 'reading',
                    progress: 12,
                    outputName,
                })
                await waitForFrame()

                const sourceDataUrl = await window.imageCompressor.readImageDataUrl(item.path)

                updateItem(item.id, {
                    status: 'compressing',
                    progress: 42,
                })
                await waitForFrame()

                const outputDataUrl = await canvasToDataUrl(
                    sourceDataUrl,
                    currentFormat.mimeType,
                    quality / 100,
                )

                updateItem(item.id, {
                    status: 'saving',
                    progress: 78,
                })
                await waitForFrame()

                const saved = await window.imageCompressor.saveCompressedImage({
                    outputDir,
                    fileName: outputName,
                    dataUrl: outputDataUrl,
                })

                updateItem(item.id, {
                    status: 'completed',
                    progress: 100,
                    outputPath: saved.path,
                    outputSize: saved.size,
                })
            } catch (error) {
                updateItem(item.id, {
                    status: 'failed',
                    progress: 100,
                    error: error instanceof Error ? error.message : '压缩失败',
                })
            }
        }

        setIsProcessing(false)
    }

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-8 pb-10 pt-10">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
                        <ImageDown className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">图片压缩</h1>
                        <p className="text-sm text-muted-foreground">
                            批量压缩图片，转换格式，并保存到指定本地文件夹。
                        </p>
                    </div>
                </div>
            </div>

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/30 p-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-background">
                        <Images className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-medium text-foreground">批量选择图片</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            支持 JPG、PNG、WebP、GIF、BMP，已选择 {items.length} 张。
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <StableButton onClick={handleSelectImages} disabled={isProcessing}>
                            <Upload className="h-4 w-4" />
                            选择图片
                        </StableButton>
                        <StableButton
                            variant="outline"
                            onClick={() => void handlePasteImage()}
                            disabled={isProcessing}
                            title="粘贴图片"
                        >
                            <ClipboardPaste className="h-4 w-4" />
                            粘贴
                        </StableButton>
                        <StableButton
                            variant="outline"
                            onClick={() => setItems([])}
                            disabled={isProcessing || items.length === 0}
                        >
                            <Trash2 className="h-4 w-4" />
                            清空
                        </StableButton>
                    </div>
                </div>

                <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">输出设置</span>
                        <span className="text-xs text-muted-foreground">{currentFormat.label}</span>
                    </div>

                    <label className="flex flex-col gap-2 text-sm">
                        <span className="text-muted-foreground">图片格式</span>
                        <select
                            value={format}
                            onChange={(event) => setFormat(event.target.value as OutputFormat)}
                            disabled={isProcessing}
                            className="h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                            {OUTPUT_FORMATS.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="flex flex-col gap-2 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">压缩质量</span>
                            <span className="font-medium text-foreground">{quality}%</span>
                        </div>
                        <input
                            type="range"
                            min={10}
                            max={100}
                            value={quality}
                            onChange={(event) => setQuality(Number(event.target.value))}
                            disabled={isProcessing || format === 'png'}
                            className="w-full accent-foreground disabled:opacity-40"
                        />
                        {format === 'png' && (
                            <span className="text-xs text-muted-foreground">
                                PNG 转换保留无损画质，质量滑块仅对 JPEG/WebP 生效。
                            </span>
                        )}
                    </label>

                    <label className="flex flex-col gap-2 text-sm">
                        <span className="text-muted-foreground">自定义前缀</span>
                        <input
                            value={prefix}
                            onChange={(event) => setPrefix(event.target.value)}
                            disabled={isProcessing}
                            placeholder="compressed-"
                            className="h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                        />
                    </label>

                    <label className="flex flex-col gap-2 text-sm">
                        <span className="text-muted-foreground">重命名格式</span>
                        <input
                            value={pattern}
                            onChange={(event) => setPattern(event.target.value)}
                            disabled={isProcessing}
                            placeholder="{prefix}{name}-{timestamp}"
                            className="h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                        />
                        <span className="text-xs text-muted-foreground">
                            可用：{'{name}'}、{'{prefix}'}、{'{timestamp}'}、{'{index}'}
                        </span>
                    </label>

                    <div className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                        预览：<span className="text-foreground">{previewName}</span>
                    </div>
                </div>
            </section>

            <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <StableButton variant="outline" onClick={handleSelectOutputFolder} disabled={isProcessing}>
                        <FolderOpen className="h-4 w-4" />
                        选择保存文件夹
                    </StableButton>
                    <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                        {outputDir || '尚未选择输出目录'}
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>总数 {items.length}</span>
                        <span>完成 {completedCount}</span>
                        <span>失败 {failedCount}</span>
                        <span>原始 {formatBytes(totalOriginalSize)}</span>
                        {totalOutputSize > 0 && <span>压缩后 {formatBytes(totalOutputSize)}</span>}
                    </div>
                    <div className="flex gap-2">
                        <StableButton
                            variant="outline"
                            onClick={handleReset}
                            disabled={isProcessing || items.length === 0}
                        >
                            <RotateCcw className="h-4 w-4" />
                            重置状态
                        </StableButton>
                        <StableButton onClick={handleCompress} disabled={isProcessing || items.length === 0}>
                            {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Play className="h-4 w-4" />
                            )}
                            开始压缩
                        </StableButton>
                    </div>
                </div>

                {notice && (
                    <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {notice}
                    </div>
                )}
            </section>

            <section className="flex flex-col gap-2">
                {items.length === 0 ? (
                    <div className="flex h-36 items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">
                        还没有待压缩图片。
                    </div>
                ) : (
                    items.map((item) => (
                        <div
                            key={item.id}
                            className="grid min-h-24 gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[minmax(0,1fr)_130px_120px_76px]"
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
                                        <FileImage className="h-5 w-5 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-medium text-foreground">
                                            {item.name}
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                        <span>{formatBytes(item.size)}</span>
                                        {item.outputName && <span>{item.outputName}</span>}
                                        {item.outputPath && <span className="truncate">{item.outputPath}</span>}
                                        {item.error && <span className="text-destructive">{item.error}</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <StatusDot status={item.status} />
                                <span className="tabular-nums">{getStatusText(item)}</span>
                            </div>

                            <div className="flex items-center text-sm text-muted-foreground">
                                {item.outputSize ? formatBytes(item.outputSize) : '-'}
                            </div>

                            <div className="flex items-center justify-end gap-2">
                                <StableButton
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => handleShowInFolder(item)}
                                    title="打开文件所在位置"
                                >
                                    <Search className="h-4 w-4" />
                                </StableButton>
                                <StableButton
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => handleRemove(item.id)}
                                    disabled={isProcessing}
                                    title="移除"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </StableButton>
                            </div>
                        </div>
                    ))
                )}
            </section>
        </div>
    )
}
