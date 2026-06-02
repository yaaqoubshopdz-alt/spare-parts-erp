/**
 * MainLayout — Sidebar + TopBar + Content area with smooth page transitions.
 */
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAppStore } from '../../../store/app.store';
import WorkspaceSwitcher from '../../../features/sales/components/WorkspaceSwitcher';
import { useWorkspaceStore } from '../../../store/workspaceStore';

interface MainLayoutProps {
  children: React.ReactNode;
}

const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as any } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

const springTransition = { type: 'spring', stiffness: 380, damping: 30 } as const;

export default function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const { direction, sidebarCollapsed, toggleSidebar } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      // Ctrl + Alt combination (using code and key for layout compatibility)
      const isAltKey = e.key === 'Alt' || e.key === 'AltGraph' || e.code === 'AltLeft' || e.code === 'AltRight';
      const isCtrlKey = e.key === 'Control' || e.code === 'ControlLeft' || e.code === 'ControlRight';
      if (e.ctrlKey && e.altKey && (isAltKey || isCtrlKey)) {
        e.preventDefault();
        useWorkspaceStore.getState().toggleSwitcher();
      }

      // Ctrl + 1, 2, 3, 4 direct workspace switching
      if (e.ctrlKey && !e.altKey && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const index = parseInt(e.key, 10) - 1;
        const state = useWorkspaceStore.getState();
        const workspaceList = Object.values(state.workspaces).sort((a, b) => a.id.localeCompare(b.id));
        if (workspaceList[index]) {
          state.switchWorkspace(workspaceList[index].id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  const isOpen = !sidebarCollapsed;
  const collapsedWidth = 64;
  const spacerWidth = collapsedWidth;

  return (
    <div
      className="flex h-screen w-screen overflow-hidden bg-background_primary"
      dir={direction}
    >
      {/* Mobile Backdrop Overlay */}
      {isOpen && !(location.pathname.startsWith('/pos') || location.pathname.startsWith('/purchases/new') || (location.pathname.startsWith('/purchases/') && location.pathname !== '/purchases')) && (
        <div
          onClick={() => toggleSidebar()}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-45 lg:hidden cursor-pointer"
        />
      )}

      {/* Sidebar Spacer — Unified 64px collapsed layout spacer */}
      <motion.div
        animate={{ width: spacerWidth }}
        transition={springTransition}
        className="h-full shrink-0 z-0 hidden lg:block"
      />

      {/* Sidebar - Absolute positioned to prevent layout thrashing on expand (RTL/LTR bidirectional) */}
      <div className={`absolute top-0 ${direction === 'rtl' ? 'right-0' : 'left-0'} h-full z-50 flex items-center pointer-events-none`}>
        <div className="pointer-events-auto h-full">
          <Sidebar />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
        {/* Top Bar */}
        <TopBar />

        {/* Page Content — animated on route change */}
        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageTransition}
              initial="initial"
              animate="animate"
              exit="exit"
              className="h-full flex flex-col"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      {/* Global Workspace Switcher Overlay */}
      <WorkspaceSwitcher />
    </div>
  );
}
