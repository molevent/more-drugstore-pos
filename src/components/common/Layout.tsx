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
  Calendar,
  Globe
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import LanguageSwitcher from './LanguageSwitcher'
import HelpModal from './HelpModal'
import { canAccessMenu, getRoleDisplayName } from '../../utils/permissions'
import { UserRole } from '../../types'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { user, signOut } = useAuthStore()
  const { t } = useLanguage()
  const [showHelpModal, setShowHelpModal] = useState(false)
  
  // Expose showHelpModal to children via a context or window object for simplicity
  // We'll use a custom event for cross-component communication
  useEffect(() => {
    const handleOpenHelp = () => setShowHelpModal(true)
    window.addEventListener('open-help-modal', handleOpenHelp)
    return () => window.removeEventListener('open-help-modal', handleOpenHelp)
  }, [])
  
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

  // Get user role for permission checking
  const userRole = user?.role as UserRole | undefined

  // Filter navigation based on user role
  const navigationSections = [
    {
      title: 'หลัก',
      items: [
        { name: t('nav.pos'), href: '/pos', icon: ShoppingCart, id: 'pos' as const },
        { name: t('nav.salesOrders'), href: '/sales-orders', icon: ListOrdered, id: 'sales' as const },
      ].filter(item => canAccessMenu(userRole, item.id))
    },
    {
      title: 'สินค้า',
      items: [
        { name: t('nav.products'), href: '/products', icon: Boxes, id: 'products' as const },
        { name: 'เว็บไซต์ร้าน', href: '/store', icon: Globe, id: 'website' as const },
      ].filter(item => canAccessMenu(userRole, item.id))
    },
    {
      title: 'ผู้ติดต่อ',
      items: [
        { name: t('nav.contacts'), href: '/contacts', icon: Users, id: 'contacts' as const },
      ].filter(item => canAccessMenu(userRole, item.id))
    },
    {
      title: 'เอกสาร',
      items: [
        { name: t('nav.documents'), href: '/expenses', icon: Wallet, id: 'documents' as const },
        { name: 'ตารางเข้างาน', href: '/work-schedule', icon: Calendar, id: 'work_schedule' as const },
      ].filter(item => canAccessMenu(userRole, item.id))
    },
    {
      title: 'ตั้งค่า',
      items: [
        { name: t('nav.settings'), href: '/settings', icon: Settings, id: 'settings' as const },
        ...(userRole === 'owner' ? [{ name: t('settings.userManagement'), href: '/users', icon: Users, id: 'users' as const }] : []),
      ].filter(item => canAccessMenu(userRole, item.id))
    }
  ].filter(section => section.items.length > 0)

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
      `}</style>
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden no-print"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-56 bg-white transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 no-print`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4">
            <img 
              src="/logo.png" 
              alt="Logo" 
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
                  {section.title && (
                    <h3 className="text-xs font-medium text-[#8B7355] uppercase tracking-wider px-3 mb-1">
                      {section.title}
                    </h3>
                  )}
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = location.pathname === item.href
                      return (
                        <Link
                          key={item.name}
                          to={item.href ?? '/'}
                          onClick={() => {
                            if (window.innerWidth < 1024) {
                              setSidebarOpen(false)
                            }
                          }}
                          className={`flex items-center gap-3 px-3 py-2.5 text-base font-medium rounded-xl transition-all border-2 ${
                            isActive
                              ? 'bg-[#C5C9E8] text-[#4A5568] border-[#8B9DC3] shadow-md'
                              : 'text-[#5C4A32] border-transparent hover:border-[#B8D4E3] hover:bg-[#F5EFE6]'
                          }`}
                        >
                          <item.icon className={`h-5 w-5 ${isActive ? 'text-[#4A5568]' : 'text-[#8B7355]'}`} />
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
          <div className="border-t border-[#E8E0D5] p-4 bg-[#F5EFE6]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#5C4A32] truncate">{user?.full_name}</p>
                <p className="text-xs text-[#8B7355]">{userRole ? getRoleDisplayName(userRole) : ''}</p>
              </div>
              <LanguageSwitcher />
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-3 py-2 text-sm text-[#5C4A32] hover:bg-[#E8E0D5] rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4 mr-3" />
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </div>

      <div className="lg:pl-56 flex flex-col flex-1">
        <header className="lg:hidden bg-white shadow-sm sticky top-0 z-30 no-print">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div></div>
            <div className="no-print">
              <LanguageSwitcher />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 relative overflow-visible">
          {children}
        </main>
      </div>

      {/* Help Modal */}
      <HelpModal
        pageRoute={location.pathname}
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </div>
  )
}
