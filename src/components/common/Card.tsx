import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  title?: string
}

export default function Card({ children, className = '', title }: CardProps) {
  return (
    <div className={`bg-white rounded-2xl shadow-lg shadow-[#7D735F]/10 border border-[#B8C9B8]/30 overflow-hidden ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-[#B8C9B8]/30 bg-gradient-to-r from-[#F5F0E6] to-white">
          <h3 className="text-lg font-semibold text-[#4A4A4A]">{title}</h3>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}
