import { Paintbrush, Sun, Moon, Type } from 'lucide-react'
import { SettingsGroup, SettingsItem } from '@/components/settings-item'

export function PageAppearance() {
    return (
        <div className="flex flex-col items-center px-10 pt-10 pb-10 gap-6 max-w-2xl mx-auto w-full">
            {/* 页面标题区 */}
            <div className="flex flex-col items-center gap-2 pb-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                    <Paintbrush className="h-9 w-9 text-muted-foreground" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">外观</h1>
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                    自定义应用的视觉风格，包括主题模式和字体显示。
                </p>
            </div>

            {/* 设置分组 1 */}
            <SettingsGroup className="w-full">
                <SettingsItem
                    icon={<Sun className="h-4 w-4" />}
                    label="浅色模式"
                    description="使用亮色主题"
                    first
                />
                <SettingsItem
                    icon={<Moon className="h-4 w-4" />}
                    label="深色模式"
                    description="使用暗色主题"
                    last
                />
            </SettingsGroup>

            {/* 设置分组 2 */}
            <SettingsGroup className="w-full">
                <SettingsItem
                    icon={<Type className="h-4 w-4" />}
                    label="字体大小"
                    description="调整界面文字显示大小"
                    first
                    last
                />
            </SettingsGroup>
        </div>
    )
}
