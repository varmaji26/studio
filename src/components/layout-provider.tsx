
'use client';

import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';

export function LayoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background text-foreground flex">
        {children}
      </div>
    </SidebarProvider>
  );
}
