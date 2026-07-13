import { Settings, Monitor, HardDrive, Globe, Clock } from 'lucide-react'
import { SettingsGroup, SettingsItem } from '@/components/settings-item'

export function PageGeneral() {
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
                <SettingsItem
                    icon={<Monitor className="h-4 w-4" />}
                    label="关于"
                    description="版本、设备信息"
                    first
                />
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
