import { useEffect, useRef } from 'react';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { useShallow } from 'zustand/react/shallow';

/**
 * دالة ربط ذكية: تقوم بمزامنة الحالة المحلية لصفحة المبيعات (POS)
 * مع الـ WorkspaceStore لضمان الحفاظ على الـ Drafts سينمائياً.
 */
export const useInvoiceIntegration = (
  activeId: string | null,
  localState: any, // كائن الحالة الكامل في POSPage
  onLoad: (data: any) => void // دالة تحديث الحالة المحلية
) => {
  const { workspaces, updateActiveWorkspace } = useWorkspaceStore(
    useShallow((state) => ({
      workspaces: state.workspaces,
      updateActiveWorkspace: state.updateActiveWorkspace,
    }))
  );

  const isUpdating = useRef(false);

  // 1. عند تغير الـ ActiveId، نقوم بتحميل الحالة من الـ Store
  useEffect(() => {
    if (activeId && workspaces[activeId]) {
      isUpdating.current = true;
      onLoad(workspaces[activeId]);
      setTimeout(() => { isUpdating.current = false; }, 0);
    }
  }, [activeId]);

  // 2. تحديث الـ Store عند تغير الحالة المحلية
  useEffect(() => {
    if (activeId && localState && !isUpdating.current) {
       updateActiveWorkspace(activeId, localState);
    }
  }, [localState, activeId]);

  return { isReady: !!activeId };
};
