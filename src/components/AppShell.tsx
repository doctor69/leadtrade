import React from 'react';
import { ThemeProvider } from './ThemeProvider';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { OfflineStatusIndicator } from './OfflineStatusIndicator';
import NavigationBar from './ui/navbar';
import '../styles/global.css';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="fixed top-16 right-4 z-40">
          <OfflineStatusIndicator compact />
        </div>
        <main className="container mx-auto px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8 max-w-7xl">
          <div className="w-full">
            <OfflineStatusIndicator className="mb-4" />
            {children}
          </div>
        </main>
        <PWAInstallPrompt />
      </div>
    </ThemeProvider>
  );
}