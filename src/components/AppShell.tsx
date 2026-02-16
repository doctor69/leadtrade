/**
 * LEADTRADE - Social Copy Trading Platform
 * Copyright (c) 2025 doctor
 * 
 * Licensed under the Fair Source License.
 * Non-commercial use permitted. Commercial use requires a paid license.
 * See LICENSE file for details or contact license@leadtrade.app
 */

import React from 'react';
import { ThemeProvider } from './ThemeProvider';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import NavigationBar from './ui/navbar';
import Footer from './Footer';
import '../styles/global.css';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <NavigationBar />
        <main className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 max-w-7xl flex-1">
          {children}
        </main>
        <Footer />
        <PWAInstallPrompt />
      </div>
    </ThemeProvider>
  );
}