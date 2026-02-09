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
    primary: 'bg-[#7D735F] text-white hover:bg-[#7D735F]/90 focus:ring-[#7D735F]/50',
    secondary: 'bg-[#B8C9B8]/30 text-[#4A4A4A] hover:bg-[#B8C9B8]/50 focus:ring-[#B8C9B8]/50',
    danger: 'bg-[#D4756A] text-white hover:bg-[#D4756A]/90 focus:ring-[#D4756A]/50',
    success: 'bg-[#A67B5B] text-white hover:bg-[#A67B5B]/90 focus:ring-[#A67B5B]/50',
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
