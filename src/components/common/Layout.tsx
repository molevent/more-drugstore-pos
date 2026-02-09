import { ReactNode, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Warehouse, 
  FileText, 
  Settings,
  LogOut,
  Menu,
  X,
  Brain,
  Printer,
  Users,
  Receipt,
  Percent,
  CreditCard
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import LanguageSwitcher from './LanguageSwitcher'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { user, signOut } = useAuthStore()
  const { t } = useLanguage()
  
  // Auto-collapse sidebar on mobile/tablet, open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024 // lg breakpoint
    }
    return false
  })

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true)
      } else {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const navigationSections = [
    {
      title: 'หลัก',
      items: [
        { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
        { name: t('nav.pos'), href: '/pos', icon: ShoppingCart },
        { name: 'รายการขายทั้งหมด', href: '/sales-orders', icon: Receipt },
      ]
    },
    {
      title: 'AI & ปรึกษา',
      items: [
        { name: t('nav.aiSymptomChecker'), href: '/ai-symptom-checker', icon: Brain },
        { name: 'ประวัติการปรึกษา', href: '/consultation-history', icon: FileText },
      ]
    },
    {
      title: 'จัดการสต็อก',
      items: [
        { name: 'จัดการสต็อก', href: '/stock-management', icon: Package },
        { name: 'พิมพ์ฉลากยา', href: '/medicine-labels', icon: Printer },
      ]
    },
    {
      title: 'สินค้า',
      items: [
        { name: t('nav.categories'), href: '/categories', icon: Package },
        { name: t('nav.products'), href: '/products', icon: Package },
        { name: 'คลังสินค้า', href: '/warehouse-management', icon: Warehouse },
      ]
    },
    {
      title: 'ผู้ติดต่อ',
      items: [
        { name: 'ผู้ติดต่อ', href: '/contacts', icon: Users },
      ]
    },
    {
      title: 'เอกสาร',
      items: [
        { name: 'ใบสั่งซื้อ', href: '/purchase-orders', icon: FileText },
        { name: 'ใบสำคัญจ่าย', href: '/payment-vouchers', icon: Receipt },
        { name: 'หัก ณ ที่จ่าย', href: '/withholding-tax', icon: Percent },
        { name: 'ค่าใช้จ่าย', href: '/expenses', icon: Receipt },
      ]
    },
    {
      title: 'อื่นๆ',
      items: [
        { name: 'ช่องทางการชำระเงิน', href: '/payment-methods', icon: CreditCard },
        { name: t('nav.reports'), href: '/reports', icon: FileText },
        { name: t('nav.settings'), href: '/settings', icon: Settings },
      ]
    }
  ]

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-[#F8F8F3]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#F5F0E6] shadow-lg transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-20 px-6 bg-[#7D735F] border-b border-[#7D735F]/20">
            <img 
              src="/logo.png" 
              alt="More Drug Store" 
              className="h-16 w-auto object-contain"
            />
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white/80 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <nav className="px-3 space-y-6">
              {navigationSections.map((section, sectionIndex) => (
                <div key={sectionIndex}>
                  <h3 className="px-3 mb-2 text-xs font-semibold text-[#7D735F] uppercase tracking-wider">
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = location.pathname === item.href
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => {
                            // Auto-close sidebar on mobile after clicking
                            if (window.innerWidth < 1024) {
                              setSidebarOpen(false)
                            }
                          }}
                          className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            isActive
                              ? 'bg-[#7D735F] text-white'
                              : 'text-[#4A4A4A] hover:bg-[#F9E4B7]/50'
                          }`}
                        >
                          <item.icon className="h-5 w-5 mr-3" />
                          {item.name}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          <div className="border-t border-[#7D735F]/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-[#4A4A4A]">{user?.full_name}</p>
                <p className="text-xs text-[#7D735F]">{user?.role}</p>
              </div>
              <LanguageSwitcher />
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-3 py-2 text-sm text-[#D4756A] hover:bg-[#D4756A]/10 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4 mr-3" />
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </div>

      <div className="lg:pl-64 flex flex-col flex-1">
        <header className="lg:hidden bg-[#7D735F] shadow-sm border-b border-[#7D735F]/20 sticky top-0 z-30">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-white/80 hover:text-white"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold text-white">More Drug Store</h1>
            <LanguageSwitcher />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
