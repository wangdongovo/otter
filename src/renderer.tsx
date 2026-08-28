import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { PanelLeft } from 'lucide-react'
import { SidebarNav } from '@/components/sidebar-nav'
import { PageImageCompressor } from '@/components/page-image-compressor'
import { PageGithubImageHost } from '@/components/page-github-image-host'
import { ProfileSettingsDialog } from '@/components/profile-settings-dialog'
import { cn } from '@/lib/utils'
import { initializeTheme, useThemePreference } from '@/lib/theme'
import './index.css'

const PAGE_TITLES: Record<string, string> = {
  imageCompressor: '图片压缩',
  githubImageHost: 'GitHub 图床',
}

const App: React.FC = () => {
  useThemePreference()

  const [activeId, setActiveId] = useState('imageCompressor')
  const [collapsed, setCollapsed] = useState(false)
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false)
  const [settingsSection, setSettingsSection] = useState<'profile' | 'github'>('profile')

  const openSettings = (section: 'profile' | 'github') => {
    setSettingsSection(section)
    setProfileSettingsOpen(true)
  }

  const pages: Record<string, React.ReactNode> = {
    imageCompressor: <PageImageCompressor />,
    githubImageHost: (
      <PageGithubImageHost onOpenGithubSettings={() => openSettings('github')} />
    ),
  }

  if (profileSettingsOpen) {
    return (
      <ProfileSettingsDialog
        open
        initialSection={settingsSection}
        onClose={() => setProfileSettingsOpen(false)}
      />
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <SidebarNav
        activeId={activeId}
        onSelect={setActiveId}
        collapsed={collapsed}
        onToggle={() => setCollapsed(true)}
        onProfileClick={() => openSettings('profile')}
      />

      <main className="relative flex flex-1 flex-col overflow-hidden bg-background">
        <header className="flex h-[52px] shrink-0 items-center px-3 [-webkit-app-region:drag]">
          <div
            className={cn(
              'flex min-w-0 items-center gap-1 transition-[padding] duration-200',
              collapsed && 'pl-[72px]'
            )}
          >
            {collapsed && (
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [-webkit-app-region:no-drag]"
                title="展开侧边栏"
              >
                <PanelLeft className="h-[17px] w-[17px]" />
              </button>
            )}
            <button
              type="button"
              className="ml-1 flex max-w-[240px] items-center gap-1.5 truncate rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent [-webkit-app-region:no-drag]"
            >
              <span className="truncate">{PAGE_TITLES[activeId]}</span>
            </button>
          </div>

        </header>

        <div className="flex-1 overflow-y-auto">
          {pages[activeId]}
        </div>
      </main>

    </div>
  )
}

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root was not found')
}

initializeTheme()
createRoot(rootElement).render(<App />)
