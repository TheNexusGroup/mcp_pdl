'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  X,
  Bell
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { Notification } from '@/lib/store/uiSlice'

const getNotificationColors = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        titleText: 'text-green-900',
      }
    case 'error':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        titleText: 'text-red-900',
      }
    case 'warning':
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800',
        titleText: 'text-yellow-900',
      }
    case 'info':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        titleText: 'text-blue-900',
      }
  }
}

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-5 h-5 text-green-600" />
    case 'error':
      return <AlertCircle className="w-5 h-5 text-red-600" />
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-yellow-600" />
    case 'info':
      return <Info className="w-5 h-5 text-blue-600" />
    default:
      return <Bell className="w-5 h-5 text-gray-600" />
  }
}

export function NotificationSystem() {
  const { notifications, removeNotification } = useStore(state => ({
    notifications: state.notifications,
    removeNotification: state.removeNotification,
  }))



  // Sort notifications by timestamp (newest first)
  const sortedNotifications = [...notifications].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  )

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      <AnimatePresence>
        {sortedNotifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

interface NotificationCardProps {
  notification: Notification
  onClose: () => void
}

function NotificationCard({ notification, onClose }: NotificationCardProps) {
  const colors = getNotificationColors(notification.type)

  // Auto-close notification based on its settings
  useEffect(() => {
    if (notification.autoHide !== false) {
      const duration = notification.duration || 5000
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [notification, onClose])

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.95 }}
      transition={{ type: "spring", duration: 0.4 }}
      className={`
        relative p-4 rounded-lg shadow-lg border backdrop-blur-sm
        ${colors.bg} ${colors.border}
        hover:shadow-xl transition-shadow duration-200
      `}
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-grow min-w-0">
          <h4 className={`text-sm font-medium ${colors.titleText} mb-1`}>
            {notification.title}
          </h4>
          <p className={`text-sm ${colors.text} leading-relaxed`}>
            {notification.message}
          </p>
          
          {/* Timestamp */}
          <div className="mt-2 text-xs text-gray-500">
            {notification.timestamp.toLocaleTimeString()}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className={`
            flex-shrink-0 p-1 rounded hover:bg-white/50 transition-colors
            ${colors.text} hover:${colors.titleText}
          `}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar for auto-hide notifications */}
      {notification.autoHide !== false && (
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ 
            duration: (notification.duration || 5000) / 1000,
            ease: "linear"
          }}
          className={`absolute bottom-0 left-0 h-1 ${
            notification.type === 'success' ? 'bg-green-400' :
            notification.type === 'error' ? 'bg-red-400' :
            notification.type === 'warning' ? 'bg-yellow-400' :
            'bg-blue-400'
          } rounded-bl-lg`}
        />
      )}
    </motion.div>
  )
}

// Notification toast trigger component for testing
export function NotificationTrigger() {
  const { addNotification } = useStore(state => ({
    addNotification: state.addNotification,
  }))

  const testNotifications = [
    {
      type: 'success' as const,
      title: 'Export Complete',
      message: 'Project data has been exported successfully as JSON',
    },
    {
      type: 'error' as const,
      title: 'Connection Failed',
      message: 'Unable to connect to the MCP server. Please check your network connection.',
      autoHide: false,
    },
    {
      type: 'warning' as const,
      title: 'Data Sync Warning',
      message: 'Some project data may be out of sync. Consider refreshing.',
    },
    {
      type: 'info' as const,
      title: 'New Feature Available',
      message: 'Interactive roadmaps are now available in the dashboard.',
      duration: 7000,
    },
  ]

  const triggerNotification = (index: number) => {
    const notification = testNotifications[index]
    addNotification(notification)
  }

  return (
    <div className="fixed bottom-4 right-4 space-y-2">
      {testNotifications.map((notification, index) => (
        <button
          key={index}
          onClick={() => triggerNotification(index)}
          className={`
            block w-full px-3 py-2 text-xs rounded-lg border transition-colors
            ${notification.type === 'success' ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' :
              notification.type === 'error' ? 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200' :
              notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200' :
              'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
            }
          `}
        >
          Test {notification.type}
        </button>
      ))}
    </div>
  )
}

// Hook for easily adding notifications from components
export function useNotification() {
  const addNotification = useStore(state => state.addNotification)

  const notify = {
    success: (title: string, message: string, options?: Partial<Notification>) => {
      addNotification({ type: 'success', title, message, ...options })
    },
    error: (title: string, message: string, options?: Partial<Notification>) => {
      addNotification({ type: 'error', title, message, autoHide: false, ...options })
    },
    warning: (title: string, message: string, options?: Partial<Notification>) => {
      addNotification({ type: 'warning', title, message, ...options })
    },
    info: (title: string, message: string, options?: Partial<Notification>) => {
      addNotification({ type: 'info', title, message, ...options })
    },
  }

  return notify
}