import { Outlet, Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Warehouse, 
  FileText, 
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useState } from 'react'

export default function Layout() {
  const location = useLocation()
  const { user, signOut } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const navigation = [
    { name: 'แดชบอร์ด', href: '/dashboard', icon: LayoutDashboard },
    { name: 'ขายสินค้า (POS)', href: '/pos', icon: ShoppingCart },
    { name: 'สินค้า', href: '/products', icon: Package },
    { name: 'คลังสินค้า', href: '/inventory', icon: Warehouse },
    { name: 'รายงาน', href: '/reports', icon: FileText },
    { name: 'ตั้งค่า', href: '/settings', icon: Settings },
  ]

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-6 bg-blue-600 text-white">
            <h1 className="text-xl font-bold">More Drug Store</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <nav className="px-3 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center mb-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5 mr-3" />
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>

      <div className={`lg:pl-64 flex flex-col flex-1 transition-all duration-300 ${
        sidebarOpen ? 'pl-64' : 'pl-0'
      }`}>
        <header className="bg-white shadow-sm lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">More Drug Store</h1>
            <div className="w-6"></div>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
