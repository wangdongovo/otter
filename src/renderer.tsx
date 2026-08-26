import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { PanelLeft } from 'lucide-react'
import { SidebarNav } from '@/components/sidebar-nav'
import { PageGeneral } from '@/components/page-general'
import { PageAppearance } from '@/components/page-appearance'
import { PageImageCompressor } from '@/components/page-image-compressor'
import './index.css'

const PAGES: Record<string, React.ReactNode> = {
  general: <PageGeneral />,
  imageCompressor: <PageImageCompressor />,
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
        {/* 收起状态：展开按钮放在红绿灯右侧同行 */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            style={{
              position: 'absolute',
              left: '88px',
              top: '8px',
              WebkitAppRegion: 'no-drag',
            } as React.CSSProperties}
            className="z-10 flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="展开侧边栏"
          >
            <PanelLeft className="h-[18px] w-[18px]" />
          </button>
        )}

        <div className="flex-1 overflow-y-scroll">
          {PAGES[activeId]}
        </div>
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
