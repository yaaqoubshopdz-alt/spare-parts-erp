import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from './workspaceStore';

describe('WorkspaceStore', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().clearAllWorkspaces();
  });

  it('should initialize with one workspace', () => {
    const state = useWorkspaceStore.getState();
    expect(Object.keys(state.workspaces).length).toBe(1);
  });

  it('should create new workspace if under limit', () => {
    const id = useWorkspaceStore.getState().createWorkspace();
    expect(id).not.toBeNull();
    expect(Object.keys(useWorkspaceStore.getState().workspaces).length).toBe(2);
  });

  it('should not create new workspace if limit 4 is reached', () => {
    useWorkspaceStore.getState().createWorkspace(); // 2
    useWorkspaceStore.getState().createWorkspace(); // 3
    useWorkspaceStore.getState().createWorkspace(); // 4
    const id = useWorkspaceStore.getState().createWorkspace(); // 5
    expect(id).toBeNull();
    expect(Object.keys(useWorkspaceStore.getState().workspaces).length).toBe(4);
  });

  it('should switch active workspace', () => {
    const newId = useWorkspaceStore.getState().createWorkspace()!;
    useWorkspaceStore.getState().switchWorkspace(newId);
    expect(useWorkspaceStore.getState().activeId).toBe(newId);
  });
});
