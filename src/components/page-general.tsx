import { useEffect, useMemo, useState } from 'react'
import { Clock, Database, Globe2, MonitorDown, RefreshCw, RotateCcw, SlidersHorizontal } from 'lucide-react'
import type { AppUpdateStatus } from '@/app-update-types'
import { SettingsGroup, SettingsItem } from '@/components/settings-item'
import { StatusDot, type StatusDotTone } from '@/components/status-dot'
import { cn } from '@/lib/utils'

const defaultUpdateStatus: AppUpdateStatus = {
    state: 'idle',
    currentVersion: '',
    message: '暂未检查更新。',
}

const updateStateTone: Record<AppUpdateStatus['state'], StatusDotTone> = {
    idle: 'neutral',
    checking: 'info',
    available: 'warning',
    'not-available': 'success',
    downloaded: 'success',
    error: 'danger',
    unsupported: 'neutral',
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
        <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-8 pb-16 pt-24">
            <div className="flex items-start gap-2.5 pb-2">
                <SlidersHorizontal className="mt-1 h-5 w-5 text-muted-foreground" />
                <div>
                    <h1 className="text-xl font-semibold text-foreground">通用</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                    管理应用的整体设置和偏好，例如语言、显示和储存等。
                    </p>
                </div>
            </div>

            <SettingsGroup className="w-full">
                <div
                    className="flex w-full items-center gap-3 rounded-t-lg bg-card px-3.5 py-3 text-left"
                >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <MonitorDown className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">软件更新</p>
                            <StatusDot
                                tone={updateStateTone[updateStatus.state]}
                                animated={updateStatus.state === 'checking'}
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
                    icon={<Database className="h-4 w-4" />}
                    label="储存空间"
                    description="管理应用占用的磁盘空间"
                    last
                />
            </SettingsGroup>

            <SettingsGroup className="w-full">
                <SettingsItem
                    icon={<Globe2 className="h-4 w-4" />}
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
