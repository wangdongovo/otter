import React from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@/components/ui/button';
import './index.css';

const App: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-4xl font-bold">💖 Hello World!</h1>
      <p className="text-muted-foreground">Welcome to your Electron application.</p>
      <div className="flex gap-3">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="destructive">Destructive</Button>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);

