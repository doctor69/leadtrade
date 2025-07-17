import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TrendingUp, Menu, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function NavigationBar() {
    const [mounted, setMounted] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const menu = [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Trade', href: '/trade' },
        { name: 'Leaderboard', href: '/leaderboard' }
    ];

    // Initialize and check login status on mount
    useEffect(() => {
        setMounted(true);
        
        // Check if user is logged in by checking localStorage tokens
        const checkLoginStatus = () => {
            if (typeof window !== 'undefined') {
                const accessToken = localStorage.getItem('sb-access-token');
                setIsLoggedIn(!!accessToken);
            }
        };
        
        checkLoginStatus();
        
        // Listen for storage changes to update login status
        window.addEventListener('storage', checkLoginStatus);
        return () => window.removeEventListener('storage', checkLoginStatus);
    }, []);

    if (!mounted) {
        return null; // Prevent hydration mismatch
    }

    return (
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center space-x-2">
                        <TrendingUp className="h-8 w-8 text-primary" />
                        <a href="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                            LEADTRADE
                        </a>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-1">
                        {menu.map((item) => (
                            <a key={item.name} href={item.href}>
                                <Button variant="outline" size="sm">
                                    {item.name}
                                </Button>
                            </a>
                        ))}
                    </div>

                    {/* Right side - Theme toggle and Auth buttons */}
                    <div className="flex items-center space-x-2">
                        {/* Simple Theme Toggle */}
                        <SimpleThemeToggle />

                        {/* Auth Buttons - Desktop */}
                        <div className="hidden md:flex items-center space-x-2">
                            {!isLoggedIn ? (
                                <>
                                    <a href="/signin">
                                        <Button variant="outline" size="sm">
                                            Sign In
                                        </Button>
                                    </a>
                                    <a href="/signup">
                                        <Button variant="outline" size="sm">
                                            Sign Up
                                        </Button>
                                    </a>
                                </>
                            ) : (
                                <a href="/api/auth/signout">
                                    <Button variant="outline" size="sm">
                                        Sign Out
                                    </Button>
                                </a>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="md:hidden h-9 w-9 px-0"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? (
                                <X className="h-4 w-4" />
                            ) : (
                                <Menu className="h-4 w-4" />
                            )}
                            <span className="sr-only">Toggle menu</span>
                        </Button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t py-4">
                        <div className="flex flex-col space-y-2">
                            {menu.map((item) => (
                                <a key={item.name} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                                    <Button variant="outline" size="sm" className="w-full justify-start">
                                        {item.name}
                                    </Button>
                                </a>
                            ))}
                            <div className="flex flex-col space-y-2 pt-2 border-t">
                                {!isLoggedIn ? (
                                    <>
                                        <a href="/signin" onClick={() => setMobileMenuOpen(false)}>
                                            <Button variant="outline" size="sm" className="w-full justify-start">
                                                Sign In
                                            </Button>
                                        </a>
                                        <a href="/signup" onClick={() => setMobileMenuOpen(false)}>
                                            <Button variant="outline" size="sm" className="w-full justify-start">
                                                Sign Up
                                            </Button>
                                        </a>
                                    </>
                                ) : (
                                    <a href="/api/auth/signout" onClick={() => setMobileMenuOpen(false)}>
                                        <Button variant="outline" size="sm" className="w-full justify-start">
                                            Sign Out
                                        </Button>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}