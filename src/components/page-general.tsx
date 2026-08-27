import { useEffect, useMemo, useState } from 'react'
import { Settings, Monitor, HardDrive, Globe, Clock, RefreshCw, RotateCcw } from 'lucide-react'
import type { AppUpdateStatus } from '@/app-update-types'
import { SettingsGroup, SettingsItem } from '@/components/settings-item'
import { cn } from '@/lib/utils'

const defaultUpdateStatus: AppUpdateStatus = {
    state: 'idle',
    currentVersion: '',
    message: '暂未检查更新。',
}

const updateStateClassName: Record<AppUpdateStatus['state'], string> = {
    idle: 'bg-muted-foreground',
    checking: 'bg-sky-500 shadow-[0_0_0_4px_rgb(14_165_233_/_0.14)]',
    available: 'bg-amber-500 shadow-[0_0_0_4px_rgb(245_158_11_/_0.16)]',
    'not-available': 'bg-emerald-500 shadow-[0_0_0_4px_rgb(16_185_129_/_0.16)]',
    downloaded: 'bg-emerald-500 shadow-[0_0_0_4px_rgb(16_185_129_/_0.2)]',
    error: 'bg-rose-500 shadow-[0_0_0_4px_rgb(244_63_94_/_0.16)]',
    unsupported: 'bg-muted-foreground',
}

export function PageGeneral() {
    const [updateStatus, setUpdateStatus] = useState(defaultUpdateStatus)
    const [isChecking, setIsChecking] = useState(false)

    useEffect(() => {
        let mounted = true

        window.appUpdater.getStatus().then((status) => {
            if (mounted) {
                setUpdateStatus(status)
            }
        })

        const unsubscribe = window.appUpdater.onStatusChange((status) => {
            setUpdateStatus(status)
            setIsChecking(status.state === 'checking')
        })

        return () => {
            mounted = false
            unsubscribe()
        }
    }, [])

    const updateDescription = useMemo(() => {
        const version = updateStatus.currentVersion
            ? `当前版本 ${updateStatus.currentVersion}`
            : '当前版本读取中'

        return `${version} · ${updateStatus.message}`
    }, [updateStatus])

    const handleCheckForUpdates = async () => {
        setIsChecking(true)

        try {
            const status = await window.appUpdater.checkForUpdates()
            setUpdateStatus(status)
            setIsChecking(status.state === 'checking')
        } catch (error) {
            setIsChecking(false)
            setUpdateStatus({
                state: 'error',
                currentVersion: updateStatus.currentVersion,
                message: '检查更新失败。',
                error: error instanceof Error ? error.message : '未知错误',
            })
        }
    }

    const handleQuitAndInstall = async () => {
        await window.appUpdater.quitAndInstall()
    }

    return (
        <div className="flex flex-col items-center px-10 pt-10 pb-10 gap-6 max-w-2xl mx-auto w-full">
            {/* 页面标题区 */}
            <div className="flex flex-col items-center gap-2 pb-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                    <Settings className="h-9 w-9 text-muted-foreground" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">通用</h1>
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                    管理应用的整体设置和偏好，例如语言、显示和储存等。
                </p>
            </div>

            {/* 设置分组 1 */}
            <SettingsGroup className="w-full">
                <div
                    className="flex w-full items-center gap-3 rounded-t-xl bg-card px-4 py-3 text-left"
                >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Monitor className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">软件更新</p>
                            <span
                                className={cn(
                                    'h-1.5 w-1.5 rounded-full',
                                    updateStateClassName[updateStatus.state],
                                    updateStatus.state === 'checking' && 'animate-pulse',
                                )}
                            />
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                            {updateDescription}
                        </p>
                    </div>
                    {updateStatus.state === 'downloaded' ? (
                        <button
                            type="button"
                            onClick={handleQuitAndInstall}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            title="重启安装"
                        >
                            <RotateCcw className="h-4 w-4" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleCheckForUpdates}
                            disabled={isChecking}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                            title="检查更新"
                        >
                            <RefreshCw
                                className={cn('h-4 w-4', isChecking && 'animate-spin')}
                            />
                        </button>
                    )}
                </div>
                <SettingsItem
                    icon={<HardDrive className="h-4 w-4" />}
                    label="储存空间"
                    description="管理应用占用的磁盘空间"
                    last
                />
            </SettingsGroup>

            {/* 设置分组 2 */}
            <SettingsGroup className="w-full">
                <SettingsItem
                    icon={<Globe className="h-4 w-4" />}
                    label="语言与地区"
                    description="首选语言、日期与数字格式"
                    first
                />
                <SettingsItem
                    icon={<Clock className="h-4 w-4" />}
                    label="日期与时间"
                    description="时区、时间格式"
                    last
                />
            </SettingsGroup>
        </div>
    )
}
