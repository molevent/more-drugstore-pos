import { ReactNode, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  ListOrdered,
  ShoppingCart, 
  Boxes, 
  Settings,
  LogOut,
  Menu,
  X,
  Users,
  Wallet,
  Package,
  FileText
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
        { name: t('nav.pos'), href: '/pos', icon: ShoppingCart },
        { name: t('nav.salesOrders'), href: '/sales-orders', icon: ListOrdered },
      ]
    },
    {
      title: 'สินค้า',
      items: [
        { name: t('nav.products'), href: '/products', icon: Boxes },
        { name: t('nav.stockManagement'), href: '/stock-management', icon: Package },
      ]
    },
    {
      title: 'ผู้ติดต่อ',
      items: [
        { name: t('nav.contacts'), href: '/contacts', icon: Users },
      ]
    },
    {
      title: 'เอกสาร',
      items: [
        { name: 'ใบเสนอราคา', href: '/quotations', icon: FileText },
      ]
    },
    {
      title: 'บัญชี',
      items: [
        { name: t('nav.documents'), href: '/expenses', icon: Wallet },
      ]
    },
    {
      title: 'ตั้งค่า',
      items: [
        { name: t('nav.settings'), href: '/settings', icon: Settings },
      ]
    }
  ]

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <img 
              src="/logo.png" 
              alt="More Drug Store" 
              className="h-12 w-auto object-contain"
            />
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4 px-3">
            <nav className="space-y-1">
              {navigationSections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="mb-2">
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = location.pathname === item.href
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => {
                            if (window.innerWidth < 1024) {
                              setSidebarOpen(false)
                            }
                          }}
                          className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all border-2 ${
                            isActive
                              ? 'bg-[#F5F0E6] text-gray-900 border-[#7D735F] shadow-md'
                              : 'text-gray-700 border-transparent hover:border-[#7D735F]'
                          }`}
                        >
                          <item.icon className={`h-5 w-5 ${isActive ? 'text-gray-900' : 'text-gray-500'}`} />
                          <span className="flex-1">{item.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
              <LanguageSwitcher />
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4 mr-3" />
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </div>

      <div className="lg:pl-64 flex flex-col flex-1">
        <header className="lg:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">More Drug Store</h1>
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
