import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { PanelLeft } from 'lucide-react'
import { SidebarNav } from '@/components/sidebar-nav'
import { PageGeneral } from '@/components/page-general'
import { PageAppearance } from '@/components/page-appearance'
import './index.css'

const PAGES: Record<string, React.ReactNode> = {
  general: <PageGeneral />,
  appearance: <PageAppearance />,
}

const App: React.FC = () => {
  const [activeId, setActiveId] = useState('general')
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* 侧边栏 */}
      <SidebarNav
        activeId={activeId}
        onSelect={setActiveId}
        collapsed={collapsed}
        onToggle={() => setCollapsed(true)}
      />

      {/* 右侧内容区 */}
      <main className="relative flex flex-1 flex-col overflow-hidden bg-background">
        {/* 收起状态下显示展开按钮，放在红绿灯右侧 */}
        {collapsed && (
          <div
            className="absolute left-0 top-0 flex items-center"
            style={{ paddingTop: '14px', paddingLeft: '80px', WebkitAppRegion: 'drag' } as React.CSSProperties}
          >
            <button
              onClick={() => setCollapsed(false)}
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="展开侧边栏"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {PAGES[activeId]}
        </div>
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
