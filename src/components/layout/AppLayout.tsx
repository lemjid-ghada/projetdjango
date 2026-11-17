import { useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { FloatingChatbot } from '../ui/FloatingChatbot';
import { StudentCommandPalette } from '../ui/StudentCommandPalette';
import { PremiumModal } from '../ui/PremiumModal';
import { useAuth } from '../../context/AuthContext';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const { user } = useAuth();
  const showChatbot = user?.role === 'ENSEIGNANT' || user?.role === 'ETUDIANT';

  useEffect(() => {
    if (user?.role !== 'ETUDIANT') return;
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteOpen(open => !open);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [user?.role]);

  useEffect(() => {
    const openPremiumModal = () => setPremiumModalOpen(true);
    window.addEventListener('open-premium-modal', openPremiumModal);
    return () => window.removeEventListener('open-premium-modal', openPremiumModal);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fc] dark:bg-slate-950">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          onCommandPalette={() => setCommandPaletteOpen(true)}
          onPremiumClick={() => setPremiumModalOpen(true)}
        />
        <main className="relative flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7 xl:px-8">
          <div className="pointer-events-none absolute -right-28 -top-32 h-80 w-80 rounded-full bg-indigo-200/20 blur-3xl dark:bg-indigo-500/5" />
          <div className="pointer-events-none absolute -bottom-40 -left-20 h-80 w-80 rounded-full bg-violet-200/20 blur-3xl dark:bg-violet-500/5" />
          <div className="relative z-10 mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
      {showChatbot && <FloatingChatbot />}
      {user?.role === 'ETUDIANT' && (
        <StudentCommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
        />
      )}
      {user?.role === 'ETUDIANT' && (
        <PremiumModal
          open={premiumModalOpen}
          onClose={() => setPremiumModalOpen(false)}
        />
      )}
    </div>
  );
}
