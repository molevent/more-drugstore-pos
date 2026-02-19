import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  title?: string
  onClick?: () => void
}

export default function Card({ children, className = '', title, onClick }: CardProps) {
  // Check if className contains overflow-visible or overflow-auto, if so, don't apply overflow-hidden
  const hasOverflowOverride = className.includes('overflow-')
  const hasPaddingOverride = className.includes('p-') || className.includes('padding')
  const baseClasses = `bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 outline-none ${hasOverflowOverride ? '' : 'overflow-hidden'} ${className}`
  
  return (
    <div 
      className={baseClasses}
      onClick={onClick}
    >
      {title && (
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      <div className={hasPaddingOverride ? '' : 'p-6'}>{children}</div>
    </div>
  )
}
