import { Heart, TrendingUp } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t mt-auto" style={{ borderColor: 'hsl(var(--border) / 0.6)', backgroundColor: 'hsl(var(--card) / 0.4)' }}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col items-center justify-center gap-5 text-center">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-lg"
              style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(200 100% 60%))' }}
            >
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm">
              <span style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(200 100% 60%))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>LEAD</span>
              <span className="text-foreground">TRADE</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Powered by</span>
            <a href="https://kiro.dev" target="_blank" rel="noopener noreferrer"
              className="font-medium hover:text-foreground transition-colors" style={{ color: 'hsl(var(--primary))' }}>
              Kiro AI
            </a>
            <span className="opacity-40">·</span>
            <a href="https://alpaca.markets" target="_blank" rel="noopener noreferrer"
              className="font-medium hover:text-foreground transition-colors" style={{ color: 'hsl(var(--primary))' }}>
              Alpaca Markets
            </a>
            <span className="opacity-40">·</span>
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer"
              className="font-medium hover:text-foreground transition-colors" style={{ color: 'hsl(var(--primary))' }}>
              Supabase
            </a>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} LEADTRADE · Built with</span>
            <Heart className="h-3 w-3 fill-current" style={{ color: 'hsl(0 84% 60%)' }} />
            <span>by the team</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
