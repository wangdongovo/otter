import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
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

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* 侧边栏贴窗口边缘，和设计图一致 */}
      <SidebarNav activeId={activeId} onSelect={setActiveId} />

      {/* 右侧内容区 */}
      <main className="flex flex-1 overflow-y-auto bg-background">
        {PAGES[activeId]}
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
