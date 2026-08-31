import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewKind =
  | { kind: 'inbox' }
  | { kind: 'today' }
  | { kind: 'planner' }
  | { kind: 'someday' }
  | { kind: 'calendar' }
  | { kind: 'habits' }
  | { kind: 'trash' }
  | { kind: 'settings' }
  | { kind: 'smartFilter'; id: string }
  | { kind: 'project'; projectId: string }

export type SortField = 'manual' | 'priority' | 'start' | 'deadline' | 'alpha' | 'smart'
export interface SortSpec {
  field: SortField
  reverse: boolean
}

interface UIState {
  view: ViewKind
  sidebarCollapsed: boolean
  selectedTaskId: string | null
  search: string
  projectMode: 'list' | 'kanban'
  sort: SortSpec
  setView: (v: ViewKind) => void
  openProject: (projectId: string) => void
  toggleSidebar: () => void
  selectTask: (id: string | null) => void
  setSearch: (s: string) => void
  setProjectMode: (m: 'list' | 'kanban') => void
  setSort: (s: SortSpec) => void
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      view: { kind: 'today' },
      sidebarCollapsed: false,
      selectedTaskId: null,
      search: '',
      projectMode: 'list',
      sort: { field: 'manual', reverse: false },
      setView: (view) => set({ view, selectedTaskId: null }),
      openProject: (projectId) => set({ view: { kind: 'project', projectId }, selectedTaskId: null }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      selectTask: (selectedTaskId) => set({ selectedTaskId }),
      setSearch: (search) => set({ search }),
      setProjectMode: (projectMode) => set({ projectMode }),
      setSort: (sort) => set({ sort }),
    }),
    {
      name: 'fokus-ui',
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed, view: s.view, sort: s.sort }),
    },
  ),
)
