import { useEffect, useRef, useState, useCallback } from 'react'
import './Toast.css'

export const Toast = ({ message, type, onClose, duration = 3000 }) => {
  const onCloseRef = useRef(onClose)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const dragOffsetRef = useRef(0)
  const isDraggingRef = useRef(false)
  const toastRef = useRef(null)
  
  // Update refs when state changes
  useEffect(() => {
    dragOffsetRef.current = dragOffset
  }, [dragOffset])
  
  useEffect(() => {
    isDraggingRef.current = isDragging
  }, [isDragging])
  
  // Update ref when onClose changes
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])
  
  useEffect(() => {
    if (duration > 0 && onCloseRef.current && !isDraggingRef.current) {
      const timer = setTimeout(() => {
        onCloseRef.current()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, isDragging])
  
  // Handle drag start (touch and mouse)
  const handleStart = (clientX) => {
    setIsDragging(true)
    startXRef.current = clientX
    setDragOffset(0)
  }
  
  // Handle drag move
  const handleMove = (clientX) => {
    if (!isDraggingRef.current) return
    
    const deltaX = clientX - startXRef.current
    // Only allow dragging to the right (positive deltaX)
    if (deltaX > 0) {
      setDragOffset(deltaX)
    }
  }
  
  // Handle drag end
  const handleEnd = () => {
    if (!isDraggingRef.current) return
    
    const threshold = 100 // Minimum drag distance to dismiss
    const currentOffset = dragOffsetRef.current
    if (currentOffset > threshold) {
      // Dismiss toast
      onCloseRef.current()
    } else {
      // Snap back
      setDragOffset(0)
    }
    setIsDragging(false)
  }
  
  // Touch event handlers
  const handleTouchStart = (e) => {
    handleStart(e.touches[0].clientX)
  }
  
  const handleTouchMove = (e) => {
    e.preventDefault() // Prevent scrolling while dragging
    handleMove(e.touches[0].clientX)
  }
  
  const handleTouchEnd = () => {
    handleEnd()
  }
  
  // Mouse event handlers - use refs to avoid dependency issues
  const handleMouseMove = useCallback((e) => {
    if (isDraggingRef.current) {
      handleMove(e.clientX)
    }
  }, [])
  
  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      handleEnd()
    }
  }, [])
  
  // Add global mouse event listeners when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])
  
  const handleMouseDown = (e) => {
    handleStart(e.clientX)
  }
  
  // Render message - support both string and JSX
  const renderMessage = () => {
    if (typeof message === 'string') {
      // Check if message contains newlines (for formatted lists)
      if (message.includes('\n')) {
        const lines = message.split('\n')
        return (
          <div className="toast-message-content">
            {lines.map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </div>
        )
      }
      return message
    }
    return message
  }
  
  return (
    <div 
      ref={toastRef}
      className={`toast toast-${type} ${isDragging ? 'dragging' : ''}`}
      style={{ 
        transform: `translateX(${dragOffset}px)`,
        opacity: dragOffset > 0 ? Math.max(0, 1 - dragOffset / 200) : 1
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        // Only close on click if not dragging
        if (!isDragging && dragOffset === 0) {
          onClose()
        }
      }}
    >
      <div className="toast-content">
        <span className="toast-icon">
          {type === 'success' && '✓'}
          {type === 'error' && '✗'}
          {type === 'warning' && '⚠'}
          {type === 'info' && 'ℹ'}
        </span>
        <span className="toast-message">
          {renderMessage()}
        </span>
      </div>
      <button 
        className="toast-close" 
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      >
        ×
      </button>
    </div>
  )
}

export const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
          duration={toast.duration || 3000}
        />
      ))}
    </div>
  )
}
