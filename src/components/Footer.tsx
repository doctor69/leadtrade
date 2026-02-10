import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t bg-card/50 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Built with</span>
            <Heart className="h-4 w-4 text-red-500 fill-red-500" />
            <span>by the LEADTRADE team</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Powered by</span>
            <a 
              href="https://kiro.dev" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Kiro AI
            </a>
            <span>•</span>
            <a 
              href="https://alpaca.markets" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Alpaca Markets
            </a>
            <span>•</span>
            <a 
              href="https://supabase.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Supabase
            </a>
          </div>

          <div className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} LEADTRADE. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
