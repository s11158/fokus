import { create } from 'zustand'

interface CaptureState {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

export const useCapture = create<CaptureState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}))
