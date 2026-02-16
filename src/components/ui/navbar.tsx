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

    const menu = [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Trade', href: '/trade' },
        { name: 'Funding', href: '/funding' },
        { name: 'Leaderboard', href: '/leaderboard' }
    ];

    // Initialize and check login status on mount
    useEffect(() => {
        setMounted(true);
        setCurrentPath(window.location.pathname);

        // Update currentPath when URL changes (for client-side navigation)
        const handleLocationChange = () => {
            setCurrentPath(window.location.pathname);
        };

        // Listen for popstate (back/forward buttons)
        window.addEventListener('popstate', handleLocationChange);

        // Listen for custom navigation events
        window.addEventListener('astro:page-load', handleLocationChange);

        // Poll for URL changes (fallback for static sites)
        const pathCheckInterval = setInterval(() => {
            if (window.location.pathname !== currentPath) {
                setCurrentPath(window.location.pathname);
            }
        }, 100);

        // Check if user is logged in via Supabase
        const checkLoginStatus = async () => {
            if (typeof window !== 'undefined') {
                try {
                    const { supabase } = await import('@/lib/supabase');
                    const { data: { session } } = await supabase.auth.getSession();

                    if (session) {
                        // Store tokens if we have a valid session
                        localStorage.setItem('sb-access-token', session.access_token);
                        localStorage.setItem('sb-refresh-token', session.refresh_token);
                        localStorage.setItem('sb-token-expires-at', session.expires_at?.toString() || '');
                        setIsLoggedIn(true);
                    } else {
                        // Fallback to checking stored tokens
                        const accessToken = localStorage.getItem('sb-access-token');
                        setIsLoggedIn(!!accessToken);
                    }
                } catch (error) {
                    console.error('Session check error:', error);
                    // Fallback to checking stored tokens
                    const accessToken = localStorage.getItem('sb-access-token');
                    setIsLoggedIn(!!accessToken);
                }
            }
        };

        checkLoginStatus();

        // Listen for storage changes to update login status
        window.addEventListener('storage', checkLoginStatus);

        return () => {
            window.removeEventListener('storage', checkLoginStatus);
            window.removeEventListener('popstate', handleLocationChange);
            window.removeEventListener('astro:page-load', handleLocationChange);
            clearInterval(pathCheckInterval);
        };
    }, [currentPath]);

    // Handle swipe gestures for mobile menu
    useEffect(() => {
        if (!mobileMenuOpen) return;

        let startY = 0;
        let startX = 0;

        const handleTouchStart = (e: TouchEvent) => {
            startY = e.touches[0].clientY;
            startX = e.touches[0].clientX;
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!startY || !startX) return;

            const currentY = e.touches[0].clientY;
            const currentX = e.touches[0].clientX;
            const diffY = startY - currentY;
            const diffX = startX - currentX;

            // Swipe up to close menu (more than 50px)
            if (diffY > 50 && Math.abs(diffX) < 100) {
                setMobileMenuOpen(false);
            }
        };

        const handleTouchEnd = () => {
            startY = 0;
            startX = 0;
        };

        document.addEventListener('touchstart', handleTouchStart);
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [mobileMenuOpen]);

    // Close mobile menu on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && mobileMenuOpen) {
                setMobileMenuOpen(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [mobileMenuOpen]);

    if (!mounted) {
        return null; // Prevent hydration mismatch
    }

    return (
        <nav className="border-b bg-card/100 shadow-sm sticky top-0 z-50" style={{ backgroundColor: 'hsl(var(--card))' }}>
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center space-x-2">
                        <TrendingUp className="h-8 w-8 text-primary" />
                        <button
                            onClick={() => safeNavigate(isLoggedIn ? '/dashboard' : '/')}
                            className="text-2xl font-bold text-foreground hover:opacity-80 transition-opacity"
                        >
                            <span className="text-primary">LEAD</span>TRADE
                        </button>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-1">
                        {menu
                            .filter(item => {
                                // Show all items when logged in, only public items when not logged in
                                if (isLoggedIn) {
                                    return true; // Show all menu items
                                } else {
                                    return item.name === 'Leaderboard'; // Only show leaderboard for non-logged in users
                                }
                            })
                            .map((item) => {
                                // Use currentPath state which updates on mount and navigation
                                const isActive = currentPath === item.href;
                                return (
                                    <div key={`desktop-${item.name}`} className="relative">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                safeNavigate(item.href);
                                                setCurrentPath(item.href);
                                            }}
                                            className="cursor-pointer"
                                        >
                                            {item.name}
                                        </Button>
                                        {isActive ? (
                                            <div
                                                className="absolute -bottom-[0.6rem] left-0 right-0 h-[3px] rounded-full"
                                                style={{ backgroundColor: 'hsl(var(--primary))', zIndex: 100 }}
                                            />
                                        ) : null}
                                    </div>
                                );
                            })}
                    </div>

                    {/* Right side - Auth buttons, Theme Customizer, and Settings */}
                    <div className="flex items-center space-x-2">
                        {/* Auth buttons - Desktop */}
                        <div className="hidden md:flex items-center space-x-2">
                            {isLoggedIn ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                        // Sign out from Supabase and clear tokens
                                        try {
                                            const { supabase } = await import('@/lib/supabase');
                                            await supabase.auth.signOut();
                                        } catch (error) {
                                            console.error('Supabase sign out error:', error);
                                        }
                                        localStorage.removeItem('sb-access-token');
                                        localStorage.removeItem('sb-refresh-token');
                                        localStorage.removeItem('sb-token-expires-at');
                                        localStorage.removeItem('sb-token-refreshed-at');
                                        setIsLoggedIn(false);
                                        safeNavigate('/');
                                    }}
                                >
                                    Logout
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => safeNavigate('/signin')}
                                    >
                                        Sign In
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => safeNavigate('/signup')}
                                    >
                                        Sign Up
                                    </Button>
                                </>
                            )}
                        </div>

                        {/* Mobile - Show Trade button for logged in users */}
                        {isLoggedIn && (
                            <Button
                                variant="default"
                                size="sm"
                                className="md:hidden"
                                onClick={() => safeNavigate('/trade')}
                            >
                                Trade
                            </Button>
                        )}

                        {/* Theme Customizer Dropdown - icon only, modal-like dropdown */}
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

                        {/* Settings Button */}
                        <Button
                            variant="outline"
                            size="icon"
                            className="hidden md:flex"
                            onClick={() => safeNavigate('/settings')}
                            aria-label="Open settings"
                        >
                            <Settings className="h-4 w-4" />
                        </Button>

                        {/* Mobile menu button */}
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

                {/* Mobile menu overlay */}
                {mobileMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
                            onClick={() => setMobileMenuOpen(false)}
                        />

                        {/* Mobile menu panel - Fixed opacity issue with explicit styles */}
                        <div 
                            className="fixed top-16 left-0 right-0 border-b shadow-lg z-50 md:hidden animate-in slide-in-from-top-2 duration-200"
                            style={{ 
                                backgroundColor: 'hsl(var(--background))',
                                opacity: 1
                            }}
                        >
                            <div 
                                className="px-4 py-4 space-y-2 max-h-[calc(100vh-4rem)] overflow-y-auto"
                                style={{ 
                                    backgroundColor: 'hsl(var(--background))',
                                    opacity: 1
                                }}
                            >
                                {menu
                                    .filter(item => {
                                        // Show all items when logged in, only public items when not logged in
                                        if (isLoggedIn) {
                                            return true; // Show all menu items
                                        } else {
                                            return item.name === 'Leaderboard'; // Only show leaderboard for non-logged in users
                                        }
                                    })
                                    .map((item) => {
                                        // Use currentPath state which updates on mount and navigation
                                        const isActive = currentPath === item.href;
                                        return (
                                            <div key={`mobile-${item.name}`} className="relative">
                                                <button
                                                    className={`flex w-full items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 min-h-[44px] ${
                                                        isActive 
                                                            ? 'bg-primary/10 text-primary' 
                                                            : 'text-foreground active:bg-primary/20 active:text-primary'
                                                    }`}
                                                    style={{
                                                        WebkitTapHighlightColor: 'transparent'
                                                    }}
                                                    onTouchStart={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'hsl(var(--primary) / 0.2)';
                                                        e.currentTarget.style.color = 'hsl(var(--primary))';
                                                    }}
                                                    onTouchEnd={(e) => {
                                                        if (!isActive) {
                                                            e.currentTarget.style.backgroundColor = '';
                                                            e.currentTarget.style.color = '';
                                                        }
                                                    }}
                                                    onClick={() => {
                                                        setMobileMenuOpen(false);
                                                        safeNavigate(item.href);
                                                        setCurrentPath(item.href);
                                                    }}
                                                >
                                                    {item.name}
                                                </button>
                                                {isActive && (
                                                    <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary" />
                                                )}
                                            </div>
                                        );
                                    })}

                                {/* Mobile Theme Customizer */}
                                <div className="pt-2 border-t">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="w-full justify-start min-h-[44px]"
                                            >
                                                <Palette className="h-4 w-4 mr-2" />
                                                Theme Customizer
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-80 max-h-[60vh] overflow-y-auto">
                                            <div className="p-4">
                                                <ThemeCustomizer />
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Mobile Settings */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start min-h-[44px]"
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        safeNavigate('/settings');
                                    }}
                                >
                                    <Settings className="h-4 w-4 mr-2" />
                                    Settings
                                </Button>

                                {/* Mobile Logout - Only show if logged in */}
                                {isLoggedIn && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="w-full justify-start min-h-[44px]"
                                        onClick={async () => {
                                            setMobileMenuOpen(false);
                                            // Sign out from Supabase and clear tokens
                                            try {
                                                const { supabase } = await import('@/lib/supabase');
                                                await supabase.auth.signOut();
                                            } catch (error) {
                                                console.error('Supabase sign out error:', error);
                                            }
                                            localStorage.removeItem('sb-access-token');
                                            localStorage.removeItem('sb-refresh-token');
                                            localStorage.removeItem('sb-token-expires-at');
                                            localStorage.removeItem('sb-token-refreshed-at');
                                            setIsLoggedIn(false);
                                            safeNavigate('/');
                                        }}
                                    >
                                        Logout
                                    </Button>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </nav>
    );
}