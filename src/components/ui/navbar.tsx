/**
 * LEADTRADE - Social Copy Trading Platform
 * Copyright (c) 2025 doctor
 *
 * Licensed under the Fair Source License.
 * Non-commercial use permitted. Commercial use requires a paid license.
 * See LICENSE file for details or contact license@leadtrade.app
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TrendingUp, Menu, X, Palette, Settings } from "lucide-react";
import { ThemeCustomizer } from "./ThemeCustomizer";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger
} from "./dropdown-menu";
import { safeNavigate } from "@/lib/navigation";

export default function NavigationBar() {
    const [mounted, setMounted] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentPath, setCurrentPath] = useState('');
    const [scrolled, setScrolled] = useState(false);

    const menu = [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Trade', href: '/trade' },
        { name: 'Funding', href: '/funding' },
        { name: 'Leaderboard', href: '/leaderboard' }
    ];

    useEffect(() => {
        setMounted(true);
        setCurrentPath(window.location.pathname);

        const handleLocationChange = () => setCurrentPath(window.location.pathname);
        window.addEventListener('popstate', handleLocationChange);
        window.addEventListener('astro:page-load', handleLocationChange);

        const pathCheckInterval = setInterval(() => {
            if (window.location.pathname !== currentPath) {
                setCurrentPath(window.location.pathname);
            }
        }, 100);

        const handleScroll = () => setScrolled(window.scrollY > 8);
        window.addEventListener('scroll', handleScroll, { passive: true });

        const checkLoginStatus = async () => {
            if (typeof window !== 'undefined') {
                try {
                    const { supabase } = await import('@/lib/supabase');
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {
                        localStorage.setItem('sb-access-token', session.access_token);
                        localStorage.setItem('sb-refresh-token', session.refresh_token);
                        localStorage.setItem('sb-token-expires-at', session.expires_at?.toString() || '');
                        setIsLoggedIn(true);
                    } else {
                        const accessToken = localStorage.getItem('sb-access-token');
                        setIsLoggedIn(!!accessToken);
                    }
                } catch {
                    const accessToken = localStorage.getItem('sb-access-token');
                    setIsLoggedIn(!!accessToken);
                }
            }
        };
        checkLoginStatus();
        window.addEventListener('storage', checkLoginStatus);

        return () => {
            window.removeEventListener('storage', checkLoginStatus);
            window.removeEventListener('popstate', handleLocationChange);
            window.removeEventListener('astro:page-load', handleLocationChange);
            window.removeEventListener('scroll', handleScroll);
            clearInterval(pathCheckInterval);
        };
    }, [currentPath]);

    // Swipe-to-close mobile menu
    useEffect(() => {
        if (!mobileMenuOpen) return;
        let startY = 0, startX = 0;
        const onTouchStart = (e: TouchEvent) => { startY = e.touches[0].clientY; startX = e.touches[0].clientX; };
        const onTouchMove = (e: TouchEvent) => {
            if (!startY || !startX) return;
            const diffY = startY - e.touches[0].clientY;
            const diffX = startX - e.touches[0].clientX;
            if (diffY > 50 && Math.abs(diffX) < 100) setMobileMenuOpen(false);
        };
        const onTouchEnd = () => { startY = 0; startX = 0; };
        document.addEventListener('touchstart', onTouchStart);
        document.addEventListener('touchmove', onTouchMove);
        document.addEventListener('touchend', onTouchEnd);
        return () => {
            document.removeEventListener('touchstart', onTouchStart);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        };
    }, [mobileMenuOpen]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && mobileMenuOpen) setMobileMenuOpen(false);
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [mobileMenuOpen]);

    if (!mounted) return null;

    const handleLogout = async () => {
        try {
            const { supabase } = await import('@/lib/supabase');
            await supabase.auth.signOut();
        } catch { /* ignore */ }
        localStorage.removeItem('sb-access-token');
        localStorage.removeItem('sb-refresh-token');
        localStorage.removeItem('sb-token-expires-at');
        localStorage.removeItem('sb-token-refreshed-at');
        setIsLoggedIn(false);
        safeNavigate('/');
    };

    const visibleMenu = menu.filter(item =>
        isLoggedIn ? true : item.name === 'Leaderboard'
    );

    return (
        <nav
            className="sticky top-0 z-50 transition-all duration-300"
            style={{
                backgroundColor: scrolled
                    ? 'hsl(var(--card) / 0.85)'
                    : 'hsl(var(--card) / 0.95)',
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                borderBottom: '1px solid hsl(var(--border) / 0.6)',
                boxShadow: scrolled
                    ? '0 4px 24px hsl(0 0% 0% / 0.12)'
                    : '0 1px 0 hsl(var(--border) / 0.4)',
            }}
        >
            <div className="container mx-auto px-4 max-w-7xl">
                <div className="flex items-center justify-between h-16">

                    {/* Logo */}
                    <div className="flex items-center gap-2.5">
                        <div
                            className="flex items-center justify-center w-8 h-8 rounded-lg"
                            style={{
                                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(200 100% 60%))',
                                boxShadow: '0 2px 8px hsl(var(--primary) / 0.4)',
                            }}
                        >
                            <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        <button
                            onClick={() => safeNavigate(isLoggedIn ? '/dashboard' : '/')}
                            className="text-xl font-bold tracking-tight hover:opacity-80 transition-opacity"
                        >
                            <span style={{
                                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(200 100% 60%))',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}>
                                LEAD
                            </span>
                            <span className="text-foreground">TRADE</span>
                        </button>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1">
                        {visibleMenu.map((item) => {
                            const isActive = currentPath === item.href;
                            return (
                                <div key={`desktop-${item.name}`} className="relative">
                                    <button
                                        onClick={() => {
                                            safeNavigate(item.href);
                                            setCurrentPath(item.href);
                                        }}
                                        className="relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
                                        style={{
                                            color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                                            backgroundColor: isActive ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.color = 'hsl(var(--foreground))';
                                                e.currentTarget.style.backgroundColor = 'hsl(var(--primary) / 0.08)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.color = 'hsl(var(--muted-foreground))';
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        {item.name}
                                        {isActive && (
                                            <span
                                                className="absolute -bottom-[0.65rem] left-2 right-2 h-[2px] rounded-full"
                                                style={{
                                                    background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(200 100% 60%))',
                                                }}
                                            />
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-2">
                        {/* Auth — Desktop */}
                        <div className="hidden md:flex items-center gap-2">
                            {isLoggedIn ? (
                                <Button variant="outline" size="sm" onClick={handleLogout}>
                                    Logout
                                </Button>
                            ) : (
                                <>
                                    <Button variant="ghost" size="sm" onClick={() => safeNavigate('/signin')}>
                                        Sign In
                                    </Button>
                                    <Button size="sm" onClick={() => safeNavigate('/signup')}
                                        style={{
                                            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(200 100% 60%))',
                                            boxShadow: '0 2px 8px hsl(var(--primary) / 0.35)',
                                            border: 'none',
                                        }}
                                    >
                                        Sign Up
                                    </Button>
                                </>
                            )}
                        </div>

                        {/* Mobile Trade button */}
                        {isLoggedIn && (
                            <Button
                                size="sm"
                                className="md:hidden"
                                onClick={() => safeNavigate('/trade')}
                                style={{
                                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(200 100% 60%))',
                                    border: 'none',
                                }}
                            >
                                Trade
                            </Button>
                        )}

                        {/* Theme Customizer */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="hidden md:flex"
                                    aria-label="Open theme customizer"
                                >
                                    <Palette className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-96 max-h-[80vh] overflow-y-auto p-0">
                                <div className="p-4">
                                    <ThemeCustomizer />
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Settings */}
                        <Button
                            variant="outline"
                            size="icon"
                            className="hidden md:flex"
                            onClick={() => safeNavigate('/settings')}
                            aria-label="Open settings"
                        >
                            <Settings className="h-4 w-4" />
                        </Button>

                        {/* Hamburger */}
                        <Button
                            variant="outline"
                            size="icon"
                            className="md:hidden min-h-[44px] min-w-[44px]"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                        >
                            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>

                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden animate-fade-in"
                            onClick={() => setMobileMenuOpen(false)}
                        />

                        {/* Panel */}
                        <div
                            className="fixed top-16 left-0 right-0 z-50 md:hidden animate-slide-in"
                            style={{
                                backgroundColor: 'hsl(var(--card) / 0.97)',
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                borderBottom: '1px solid hsl(var(--border) / 0.6)',
                                boxShadow: '0 8px 32px hsl(0 0% 0% / 0.15)',
                            }}
                        >
                            <div className="px-4 py-4 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto">
                                {visibleMenu.map((item) => {
                                    const isActive = currentPath === item.href;
                                    return (
                                        <button
                                            key={`mobile-${item.name}`}
                                            className="flex w-full items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px]"
                                            style={{
                                                color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
                                                backgroundColor: isActive ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                                                WebkitTapHighlightColor: 'transparent',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isActive) e.currentTarget.style.backgroundColor = 'hsl(var(--primary) / 0.08)';
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                            onTouchStart={(e) => { e.currentTarget.style.backgroundColor = 'hsl(var(--primary) / 0.12)'; }}
                                            onTouchEnd={(e) => {
                                                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                            onClick={() => {
                                                setMobileMenuOpen(false);
                                                safeNavigate(item.href);
                                                setCurrentPath(item.href);
                                            }}
                                        >
                                            {item.name}
                                        </button>
                                    );
                                })}

                                <div className="pt-2 border-t border-border/50 space-y-1">
                                    {/* Mobile Theme Customizer */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="w-full justify-start min-h-[44px] rounded-xl">
                                                <Palette className="h-4 w-4 mr-2" />
                                                Theme Customizer
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-80 max-h-[60vh] overflow-y-auto">
                                            <div className="p-4"><ThemeCustomizer /></div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* Mobile Settings */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start min-h-[44px] rounded-xl"
                                        onClick={() => { setMobileMenuOpen(false); safeNavigate('/settings'); }}
                                    >
                                        <Settings className="h-4 w-4 mr-2" />
                                        Settings
                                    </Button>

                                    {/* Mobile Auth */}
                                    {isLoggedIn ? (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="w-full justify-start min-h-[44px] rounded-xl"
                                            onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                                        >
                                            Logout
                                        </Button>
                                    ) : (
                                        <div className="flex gap-2 pt-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 min-h-[44px] rounded-xl"
                                                onClick={() => { setMobileMenuOpen(false); safeNavigate('/signin'); }}
                                            >
                                                Sign In
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="flex-1 min-h-[44px] rounded-xl border-none"
                                                style={{
                                                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(200 100% 60%))',
                                                }}
                                                onClick={() => { setMobileMenuOpen(false); safeNavigate('/signup'); }}
                                            >
                                                Sign Up
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </nav>
    );
}
