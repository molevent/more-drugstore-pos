import { useState, useCallback, useEffect } from 'react'
import { X, Calculator, Delete } from 'lucide-react'

interface CalculatorModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CalculatorModal({ isOpen, onClose }: CalculatorModalProps) {
  const [display, setDisplay] = useState('0')
  const [previousValue, setPreviousValue] = useState<number | null>(null)
  const [operation, setOperation] = useState<string | null>(null)
  const [shouldResetDisplay, setShouldResetDisplay] = useState(false)

  const handleNumber = useCallback((num: string) => {
    if (shouldResetDisplay) {
      setDisplay(num)
      setShouldResetDisplay(false)
    } else {
      setDisplay(prev => prev === '0' ? num : prev + num)
    }
  }, [shouldResetDisplay])

  const handleOperation = useCallback((op: string) => {
    const current = parseFloat(display)
    if (previousValue === null) {
      setPreviousValue(current)
    } else if (operation) {
      const result = calculate(previousValue, current, operation)
      setPreviousValue(result)
      setDisplay(result.toString())
    }
    setOperation(op)
    setShouldResetDisplay(true)
  }, [display, previousValue, operation])

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case '+': return a + b
      case '-': return a - b
      case '×': return a * b
      case '÷': return b !== 0 ? a / b : 0
      default: return b
    }
  }

  const handleEquals = useCallback(() => {
    if (operation && previousValue !== null) {
      const current = parseFloat(display)
      const result = calculate(previousValue, current, operation)
      setDisplay(result.toString())
      setPreviousValue(null)
      setOperation(null)
      setShouldResetDisplay(true)
    }
  }, [display, operation, previousValue])

  const handleClear = useCallback(() => {
    setDisplay('0')
    setPreviousValue(null)
    setOperation(null)
    setShouldResetDisplay(false)
  }, [])

  const handleDelete = useCallback(() => {
    setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0')
  }, [])

  const handleDecimal = useCallback(() => {
    if (shouldResetDisplay) {
      setDisplay('0.')
      setShouldResetDisplay(false)
    } else if (!display.includes('.')) {
      setDisplay(prev => prev + '.')
    }
  }, [display, shouldResetDisplay])

  const handlePercentage = useCallback(() => {
    const current = parseFloat(display)
    const result = current / 100
    setDisplay(result.toString())
    setShouldResetDisplay(true)
  }, [display])

  // Keyboard support
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleNumber(e.key)
      if (e.key === '.') handleDecimal()
      if (e.key === '+' || e.key === '-') handleOperation(e.key)
      if (e.key === '*') handleOperation('×')
      if (e.key === '/') handleOperation('÷')
      if (e.key === '%') handlePercentage()
      if (e.key === 'Enter' || e.key === '=') handleEquals()
      if (e.key === 'Escape') handleClear()
      if (e.key === 'Backspace') handleDelete()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleNumber, handleDecimal, handleOperation, handlePercentage, handleEquals, handleClear, handleDelete])

  if (!isOpen) return null

  const buttons = [
    { label: 'C', onClick: handleClear, className: 'bg-red-50 text-red-600 hover:bg-red-100' },
    { label: '⌫', onClick: handleDelete, icon: Delete, className: 'bg-gray-50 text-gray-600 hover:bg-gray-100' },
    { label: '%', onClick: handlePercentage, className: 'bg-[#B8C9B8]/20 text-gray-700 hover:bg-[#B8C9B8]/30' },
    { label: '÷', onClick: () => handleOperation('÷'), className: 'bg-[#B8C9B8]/20 text-gray-700 hover:bg-[#B8C9B8]/30' },
    { label: '7', onClick: () => handleNumber('7'), className: 'bg-white text-gray-800 hover:bg-gray-50' },
    { label: '8', onClick: () => handleNumber('8'), className: 'bg-white text-gray-800 hover:bg-gray-50' },
    { label: '9', onClick: () => handleNumber('9'), className: 'bg-white text-gray-800 hover:bg-gray-50' },
    { label: '×', onClick: () => handleOperation('×'), className: 'bg-[#B8C9B8]/20 text-gray-700 hover:bg-[#B8C9B8]/30' },
    { label: '4', onClick: () => handleNumber('4'), className: 'bg-white text-gray-800 hover:bg-gray-50' },
    { label: '5', onClick: () => handleNumber('5'), className: 'bg-white text-gray-800 hover:bg-gray-50' },
    { label: '6', onClick: () => handleNumber('6'), className: 'bg-white text-gray-800 hover:bg-gray-50' },
    { label: '-', onClick: () => handleOperation('-'), className: 'bg-[#B8C9B8]/20 text-gray-700 hover:bg-[#B8C9B8]/30' },
    { label: '1', onClick: () => handleNumber('1'), className: 'bg-white text-gray-800 hover:bg-gray-50' },
    { label: '2', onClick: () => handleNumber('2'), className: 'bg-white text-gray-800 hover:bg-gray-50' },
    { label: '3', onClick: () => handleNumber('3'), className: 'bg-white text-gray-800 hover:bg-gray-50' },
    { label: '+', onClick: () => handleOperation('+'), className: 'bg-[#B8C9B8]/20 text-gray-700 hover:bg-[#B8C9B8]/30' },
    { label: '0', onClick: () => handleNumber('0'), className: 'bg-white text-gray-800 hover:bg-gray-50' },
    { label: '.', onClick: handleDecimal, className: 'bg-white text-gray-800 hover:bg-gray-50' },
    { label: '=', onClick: handleEquals, className: 'bg-[#B8C9B8] text-gray-800 hover:bg-[#A8B9A8] col-span-2' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-[#B8C9B8]/30">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#B8C9B8]/20 to-[#B8C9B8]/10 px-4 py-3 border-b border-[#B8C9B8]/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#B8C9B8] rounded-lg flex items-center justify-center">
              <Calculator className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-800">เครื่องคิดเลข</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 bg-white rounded-lg flex items-center justify-center hover:bg-[#B8C9B8]/20 transition-colors border border-[#B8C9B8]/30"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Display */}
        <div className="bg-gray-50 p-4">
          <div className="bg-white rounded-xl p-4 border border-[#B8C9B8]/30 shadow-inner">
            <div className="text-right">
              <div className="text-xs text-gray-400 h-4">
                {previousValue !== null && operation ? `${previousValue} ${operation}` : ''}
              </div>
              <div className="text-3xl font-bold text-gray-800 tracking-tight overflow-hidden text-ellipsis">
                {display}
              </div>
            </div>
          </div>
        </div>

        {/* Keypad */}
        <div className="p-4 bg-gray-50">
          <div className="grid grid-cols-4 gap-2">
            {buttons.map((btn, index) => {
              const Icon = btn.icon
              return (
                <button
                  key={index}
                  onClick={btn.onClick}
                  className={`
                    h-14 rounded-xl font-semibold text-lg transition-all active:scale-95 shadow-sm border border-gray-200
                    ${btn.className}
                  `}
                >
                  {Icon ? <Icon className="w-5 h-5 mx-auto" /> : btn.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Hint */}
        <div className="px-4 pb-3 bg-gray-50">
          <p className="text-xs text-gray-400 text-center">
            ใช้คีย์บอร์ดได้: 0-9, + - × ÷ %, Enter =, Esc C, ⌫ Backspace
          </p>
        </div>
      </div>
    </div>
  )
}
