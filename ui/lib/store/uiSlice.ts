import { StateCreator } from 'zustand'

export interface UIState {
  loading: boolean
  error: string | null
  activeTab: string
  searchTerm: string
  filters: {
    dateRange: [Date | null, Date | null]
    status: string[]
    assignee: string[]
    phase: number[]
  }
  sidebarCollapsed: boolean
  notifications: Notification[]
}

export interface UIActions {
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setActiveTab: (tab: string) => void
  setSearchTerm: (term: string) => void
  updateFilters: (filters: Partial<UIState['filters']>) => void
  toggleSidebar: () => void
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearAllNotifications: () => void
}

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: Date
  autoHide?: boolean
  duration?: number
}

export type UISlice = UIState & UIActions

export const createUISlice: StateCreator<
  UISlice,
  [['zustand/immer', never], ['zustand/subscribeWithSelector', never], ['zustand/devtools', never]],
  [],
  UISlice
> = (set) => ({
  // State
  loading: false,
  error: null,
  activeTab: 'timeline',
  searchTerm: '',
  filters: {
    dateRange: [null, null],
    status: [],
    assignee: [],
    phase: [],
  },
  sidebarCollapsed: false,
  notifications: [],

  // Actions
  setLoading: (loading) => {
    set((state) => {
      state.loading = loading
    })
  },

  setError: (error) => {
    set((state) => {
      state.error = error
    })
  },

  setActiveTab: (tab) => {
    set((state) => {
      state.activeTab = tab
    })
  },

  setSearchTerm: (term) => {
    set((state) => {
      state.searchTerm = term
    })
  },

  updateFilters: (filters) => {
    set((state) => {
      state.filters = { ...state.filters, ...filters }
    })
  },

  toggleSidebar: () => {
    set((state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed
    })
  },

  addNotification: (notification) => {
    const id = crypto.randomUUID()
    set((state) => {
      state.notifications.push({
        ...notification,
        id,
        timestamp: new Date(),
      })
    })

    // Auto-remove notification if specified
    if (notification.autoHide !== false) {
      const duration = notification.duration || 5000
      setTimeout(() => {
        set((state) => {
          state.notifications = state.notifications.filter((n) => n.id !== id)
        })
      }, duration)
    }
  },

  removeNotification: (id) => {
    set((state) => {
      state.notifications = state.notifications.filter((n) => n.id !== id)
    })
  },

  clearAllNotifications: () => {
    set((state) => {
      state.notifications = []
    })
  },
})