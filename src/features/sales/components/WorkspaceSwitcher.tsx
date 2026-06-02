import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { WorkspaceCard } from './WorkspaceCard';
import { CreatorCard } from './CreatorCard';

export default function WorkspaceSwitcher() {
  const { isSwitcherOpen, setSwitcherOpen, workspaces, activeId, switchWorkspace, createWorkspace, removeWorkspace } = useWorkspaceStore();
  const workspaceList = Object.values(workspaces).sort((a, b) => a.id.localeCompare(b.id));
  
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isSwitcherOpen && activeId) {
      const idx = workspaceList.findIndex(w => w.id === activeId);
      if (idx !== -1) setSelectedIndex(idx);
    }
  }, [isSwitcherOpen, activeId, workspaceList]);

  useEffect(() => {
    if (!isSwitcherOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const totalItems = workspaceList.length + (workspaceList.length < 4 ? 1 : 0);
      if (e.key === 'Escape') {
        setSwitcherOpen(false);
      } else if (e.key === 'ArrowRight' || e.key === 'Tab') {
        setSelectedIndex(prev => (prev + 1) % totalItems);
      } else if (e.key === 'ArrowLeft') {
        setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems);
      } else if (e.key === 'Enter') {
        if (selectedIndex < workspaceList.length) {
          switchWorkspace(workspaceList[selectedIndex].id);
          setSwitcherOpen(false);
        } else if (workspaceList.length < 4) {
          const newId = createWorkspace();
          if (newId) setSwitcherOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSwitcherOpen, selectedIndex, workspaceList, switchWorkspace, createWorkspace, setSwitcherOpen]);

  // macOS Genie stretching & fabric pulling effect
  const containerVariants = {
    hidden: { 
      opacity: 0,
      y: '100vh',
      scaleX: 0.15,
      scaleY: 0.05,
      skewX: 25,
      filter: 'blur(12px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'spring' as const,
        stiffness: 140,
        damping: 18,
        mass: 0.85,
        staggerChildren: 0.07,
        delayChildren: 0.08,
      }
    },
    exit: {
      opacity: 0,
      y: '100vh',
      scaleX: 0.15,
      scaleY: 0.05,
      skewX: -25,
      filter: 'blur(12px)',
      transition: {
        type: 'spring' as const,
        stiffness: 180,
        damping: 24,
      }
    }
  };

  // macOS Mission Control 3D fanned cards
  const itemVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8, 
      y: 100, 
      rotateX: 35,
      z: -120 
    },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0, 
      rotateX: 0,
      z: 0,
      transition: { 
        type: 'spring' as const, 
        stiffness: 180, 
        damping: 18 
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.75, 
      y: 80,
      rotateX: -25,
      z: -60,
      transition: { duration: 0.2 } 
    }
  };

  return (
    <AnimatePresence>
      {isSwitcherOpen && (
        <motion.div
          id="workspace-switcher-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-3xl"
          onClick={() => setSwitcherOpen(false)}
        >
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-6xl px-6"
            onClick={(e) => e.stopPropagation()}
            style={{ perspective: 1200, transformStyle: 'preserve-3d' }}
          >
            <div className="text-center mb-10 text-white font-black text-2xl tracking-wide font-cairo">
              مساحات العمل النشطة
            </div>
            
            <div className="grid grid-cols-2 gap-8" style={{ perspective: 1200, transformStyle: 'preserve-3d' }}>
              <AnimatePresence mode="popLayout">
                {workspaceList.map((w, index) => (
                  <motion.div 
                    key={w.id} 
                    variants={itemVariants}
                    layout
                    className="w-full"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <WorkspaceCard
                      workspace={w}
                      isActive={w.id === activeId}
                      isSelected={index === selectedIndex}
                      onSelect={() => {
                        switchWorkspace(w.id);
                        setSwitcherOpen(false);
                      }}
                      onRemove={() => removeWorkspace(w.id)}
                    />
                  </motion.div>
                ))}
                
                {workspaceList.length < 4 && (
                  <motion.div 
                    key="creator" 
                    variants={itemVariants}
                    layout
                    className="w-full"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <CreatorCard onAdd={() => {
                      const newId = createWorkspace();
                      if (newId) switchWorkspace(newId);
                      setSwitcherOpen(false);
                    }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
