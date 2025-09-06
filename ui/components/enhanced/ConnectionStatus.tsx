'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { ConnectionStatus as ConnectionStatusType } from '@/lib/store/websocketSlice'

interface ConnectionStatusProps {
  status: ConnectionStatusType
  className?: string
  showLabel?: boolean
  showDetails?: boolean
}

export function ConnectionStatus({ 
  status, 
  className = '', 
  showLabel = true, 
  showDetails = false 
}: ConnectionStatusProps) {
  const getStatusConfig = (status: ConnectionStatusType) => {
    switch (status) {
      case 'connected':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          label: 'Connected',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
          pulse: true,
        }
      case 'connecting':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          label: 'Connecting',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-200',
          pulse: false,
        }
      case 'disconnected':
        return {
          icon: <WifiOff className="w-4 h-4" />,
          label: 'Offline',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
          pulse: false,
        }
      case 'error':
        return {
          icon: <XCircle className="w-4 h-4" />,
          label: 'Connection Error',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200',
          pulse: false,
        }
      default:
        return {
          icon: <WifiOff className="w-4 h-4" />,
          label: 'Unknown',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
          pulse: false,
        }
    }
  }

  const config = getStatusConfig(status)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center space-x-2 ${className}`}
    >
      <div className="relative">
        <div className={`
          flex items-center justify-center w-8 h-8 rounded-full border
          ${config.bgColor} ${config.borderColor} ${config.color}
        `}>
          {config.icon}
        </div>
        
        {/* Pulse animation for connected status */}
        {config.pulse && status === 'connected' && (
          <motion.div
            animate={{ 
              scale: [1, 1.4, 1],
              opacity: [0.7, 0, 0.7] 
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 rounded-full bg-green-400"
          />
        )}
      </div>

      {showLabel && (
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${config.color}`}>
            {config.label}
          </span>
          
          {showDetails && (
            <span className="text-xs text-gray-500">
              {status === 'connected' && 'Real-time updates active'}
              {status === 'connecting' && 'Establishing connection...'}
              {status === 'disconnected' && 'Using cached data'}
              {status === 'error' && 'Check network connection'}
            </span>
          )}
        </div>
      )}
    </motion.div>
  )
}

// Extended status indicator with more details
export function DetailedConnectionStatus({ 
  status, 
  lastUpdateTime, 
  messageCount = 0,
  className = '' 
}: ConnectionStatusProps & {
  lastUpdateTime?: Date
  messageCount?: number
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  const getStatusConfig = (status: ConnectionStatusType) => {
    switch (status) {
      case 'connected':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          label: 'Connected',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
          pulse: true,
        }
      case 'connecting':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          label: 'Connecting',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-200',
          pulse: false,
        }
      case 'disconnected':
        return {
          icon: <WifiOff className="w-4 h-4" />,
          label: 'Offline',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200',
          pulse: false,
        }
      case 'reconnecting':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          label: 'Reconnecting',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-200',
          pulse: false,
        }
      case 'error':
        return {
          icon: <XCircle className="w-4 h-4" />,
          label: 'Error',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200',
          pulse: false,
        }
    }
  }
  
  const config = getStatusConfig(status)

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-lg border ${config.bgColor} ${config.borderColor} ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-full 
              ${config.bgColor} ${config.color}
            `}>
              {config.icon}
            </div>
            
            {status === 'connected' && (
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0, 0.5] 
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity 
                }}
                className="absolute inset-0 rounded-full bg-green-400"
              />
            )}
          </div>

          <div>
            <h4 className={`font-medium ${config.color}`}>
              {config.label}
            </h4>
            <div className="text-xs text-gray-600 space-y-1">
              {status === 'connected' && (
                <>
                  <div>Real-time synchronization active</div>
                  {messageCount > 0 && (
                    <div>{messageCount} messages received</div>
                  )}
                  {lastUpdateTime && mounted && (
                    <div>Last update: {lastUpdateTime.toLocaleTimeString()}</div>
                  )}
                </>
              )}
              
              {status === 'connecting' && (
                <div>Establishing WebSocket connection...</div>
              )}
              
              {status === 'disconnected' && (
                <div>Using cached data - changes may not be real-time</div>
              )}
              
              {status === 'error' && (
                <div>Connection failed - check network settings</div>
              )}
            </div>
          </div>
        </div>

        {/* Status indicator dot */}
        <div className={`w-3 h-3 rounded-full ${
          status === 'connected' ? 'bg-green-500' :
          status === 'connecting' ? 'bg-blue-500' :
          status === 'error' ? 'bg-red-500' :
          'bg-gray-400'
        }`}>
          {status === 'connected' && (
            <motion.div
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-full h-full bg-green-400 rounded-full"
            />
          )}
        </div>
      </div>
    </motion.div>
  )
}