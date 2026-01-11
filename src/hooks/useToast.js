import { useState, useCallback } from 'react'

let toastIdCounter = 0

export const useToast = () => {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = toastIdCounter++
    const toast = { id, message, type, duration }
    
    setToasts(prev => [...prev, toast])
    
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const success = useCallback((message, duration = 3000) => {
    return showToast(message, 'success', duration)
  }, [showToast])

  const error = useCallback((message, duration = 3000) => {
    return showToast(message, 'error', duration)
  }, [showToast])

  const warning = useCallback((message, duration = 3000) => {
    return showToast(message, 'warning', duration)
  }, [showToast])

  const info = useCallback((message, duration = 3000) => {
    return showToast(message, 'info', duration)
  }, [showToast])

  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    warning,
    info
  }
}
