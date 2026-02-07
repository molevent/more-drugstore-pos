import { useState } from 'react'
import { HelpCircle } from 'lucide-react'

interface TooltipProps {
  text: string
  children?: React.ReactNode
}

export default function Tooltip({ text, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="relative inline-flex items-center gap-1">
      {children}
      <button
        type="button"
        className="text-gray-400 hover:text-blue-500 transition-colors"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      
      {isVisible && (
        <div className="absolute z-50 left-full ml-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg w-64 break-words">
          {text}
          <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
        </div>
      )}
    </div>
  )
}

// Label with Tooltip component
interface LabelWithTooltipProps {
  label: string
  tooltip: string
  required?: boolean
}

export function LabelWithTooltip({ label, tooltip, required }: LabelWithTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
      {label}
      {required && <span className="text-red-500">*</span>}
      <button
        type="button"
        className="text-gray-400 hover:text-blue-500 transition-colors"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      
      {isVisible && (
        <div className="absolute z-50 left-full ml-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg w-56 break-words">
          {tooltip}
          <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
        </div>
      )}
    </label>
  )
}
