import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon, TrendingUp, Menu, X } from "lucide-react";

export default function NavigationBar() {
    const [isDark, setIsDark] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const menu = [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Trade', href: '/trade' },
        { name: 'Leaderboard', href: '/leaderboard' }
    ];

    // Initialize theme on mount
    useEffect(() => {
        setMounted(true);
        
        // Get current theme from DOM (set by the script in layout)
        const isDarkMode = document.documentElement.classList.contains('dark');
        setIsDark(isDarkMode);
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDark;
        const root = document.documentElement;
        
        if (newTheme) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        
        setIsDark(newTheme);
        localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    };

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
                            <a
                                key={item.name}
                                href={item.href}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                            >
                                {item.name}
                            </a>
                        ))}
                    </div>

                    {/* Right side - Theme toggle and Auth buttons */}
                    <div className="flex items-center space-x-2">
                        {/* Simple Theme Toggle */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleTheme}
                            className="h-9 w-9 px-0"
                        >
                            {isDark ? (
                                <Sun className="h-4 w-4" />
                            ) : (
                                <Moon className="h-4 w-4" />
                            )}
                            <span className="sr-only">Toggle theme</span>
                        </Button>

                        {/* Auth Buttons - Desktop */}
                        <div className="hidden md:flex items-center space-x-2">
                            <a href="/signin">
                                <Button variant="ghost" size="sm">
                                    Sign In
                                </Button>
                            </a>
                            <a href="/signup">
                                <Button size="sm">
                                    Sign Up
                                </Button>
                            </a>
                        </div>

                        {/* Mobile Menu Button */}
                        <Button
                            variant="ghost"
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
                                <a
                                    key={item.name}
                                    href={item.href}
                                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {item.name}
                                </a>
                            ))}
                            <div className="flex flex-col space-y-2 pt-2 border-t">
                                <a href="/signin" onClick={() => setMobileMenuOpen(false)}>
                                    <Button variant="ghost" size="sm" className="w-full justify-start">
                                        Sign In
                                    </Button>
                                </a>
                                <a href="/signup" onClick={() => setMobileMenuOpen(false)}>
                                    <Button size="sm" className="w-full">
                                        Sign Up
                                    </Button>
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}