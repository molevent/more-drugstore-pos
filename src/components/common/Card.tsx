import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  title?: string
}

export default function Card({ children, className = '', title }: CardProps) {
  return (
    <div className={`bg-[#FAF9F6] rounded-2xl shadow-lg shadow-[#5F8B8B]/10 border border-[#8B968B]/20 overflow-hidden ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-[#8B968B]/20 bg-gradient-to-r from-[#FEF4E0]/50 to-[#FAF9F6]/50">
          <h3 className="text-lg font-semibold text-[#1A3A1A]">{title}</h3>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}
