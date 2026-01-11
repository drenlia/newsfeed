import { useEffect, useRef } from 'react'
import './Toast.css'

export const Toast = ({ message, type, onClose, duration = 3000 }) => {
  const onCloseRef = useRef(onClose)
  
  // Update ref when onClose changes
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])
  
  useEffect(() => {
    if (duration > 0 && onCloseRef.current) {
      const timer = setTimeout(() => {
        onCloseRef.current()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration])

  return (
    <div className={`toast toast-${type}`} onClick={onClose}>
      <div className="toast-content">
        <span className="toast-icon">
          {type === 'success' && '✓'}
          {type === 'error' && '✗'}
          {type === 'warning' && '⚠'}
          {type === 'info' && 'ℹ'}
        </span>
        <span className="toast-message">{message}</span>
      </div>
      <button className="toast-close" onClick={onClose}>×</button>
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
