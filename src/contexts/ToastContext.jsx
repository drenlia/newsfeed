import { createContext, useContext } from 'react'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'

const ToastContext = createContext(null)

export const ToastProvider = ({ children }) => {
  const toast = useToast()

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
    </ToastContext.Provider>
  )
}

export const useToastContext = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider')
  }
  return context
}
