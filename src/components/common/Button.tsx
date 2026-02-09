import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantStyles = {
    primary: 'bg-[#5F8B8B] text-white hover:bg-[#5F8B8B]/90 focus:ring-[#5F8B8B]/50',
    secondary: 'bg-[#8B968B]/20 text-[#1A3A1A] hover:bg-[#8B968B]/30 focus:ring-[#8B968B]/50',
    danger: 'bg-[#C45D5D] text-white hover:bg-[#C45D5D]/90 focus:ring-[#C45D5D]/50',
    success: 'bg-[#0D5D4F] text-white hover:bg-[#0D5D4F]/90 focus:ring-[#0D5D4F]/50',
  }
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
