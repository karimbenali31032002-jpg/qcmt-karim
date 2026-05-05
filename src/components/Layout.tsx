import { auth, signOut } from '@/src/lib/firebase';
import { ViewState } from '@/src/types';
import { Button } from '@/components/ui/button';
import { 
  LogOut, 
  LayoutDashboard, 
  PlusCircle, 
  BarChart3, 
  BookMarked 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  setView: (view: ViewState) => void;
  currentView: ViewState;
}

export function Layout({ children, user, setView, currentView }: LayoutProps) {
  const handleSignOut = () => signOut();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'import', label: 'Import', icon: PlusCircle },
    { id: 'stats', label: 'Stratification', icon: BarChart3 },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E0E0E0] flex flex-col font-sans">
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0F0F0F]/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div 
            className="flex flex-col cursor-pointer group" 
            onClick={() => setView('dashboard')}
          >
            <h1 className="text-xl font-serif italic text-amber-500 mb-0 leading-none transition-colors group-hover:text-amber-400">ResidPrep Elite</h1>
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold">Stratification Intelligence</p>
          </div>

          <nav className="flex items-center gap-2">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-2 h-10 px-4 rounded-full transition-all duration-300",
                  currentView === item.id 
                    ? "bg-white/10 text-amber-500 border border-white/10" 
                    : "text-white/50 hover:text-white hover:bg-white/5"
                )}
                onClick={() => setView(item.id)}
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden md:inline-block text-xs uppercase tracking-widest font-semibold">{item.label}</span>
              </Button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-xs font-medium text-white/80">{user.displayName || 'Utilisateur'}</span>
              <span className="text-[10px] text-amber-500/50 italic font-serif">Candidat Résidanat</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-10 w-10 text-white/30 hover:text-red-400 hover:bg-red-400/10 border border-white/5"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
