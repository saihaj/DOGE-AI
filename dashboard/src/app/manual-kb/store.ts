import { create } from 'zustand';

export type KBEntries = {
  id: string;
  title: string;
  content: string;
};

// Define the store's state and actions
type DrawerState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  openDrawer: (state?: KBEntries | null) => void;
  closeDrawer: () => void;
  state: KBEntries | null;
  type: 'create' | 'edit';
  clearState: () => void;
};

// Create and export the store
export const drawerStore = create<DrawerState>(set => ({
  open: false,
  type: 'create',
  setOpen: (open: boolean) => set({ open }),
  openDrawer: (state?: KBEntries | null) =>
    set({ open: true, state, type: state ? 'edit' : 'create' }),
  closeDrawer: () => set({ open: false, state: null, type: 'edit' }),
  state: null,
  clearState: () => set({ state: null, type: 'edit' }),
}));

// Export the hook for use in React components
export const useDrawerStore = drawerStore;
