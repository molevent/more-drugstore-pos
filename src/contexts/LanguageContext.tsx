import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../services/supabase'

type Language = 'th' | 'en'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => Promise<void>
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const translations: Record<Language, Record<string, string>> = {
  th: {
    // Navigation
    'nav.dashboard': 'แดชบอร์ด',
    'nav.pos': 'ขายสินค้า (POS)',
    'nav.products': 'สินค้า',
    'nav.inventory': 'คลังสินค้า',
    'nav.reports': 'รายงาน',
    'nav.settings': 'ตั้งค่า',
    'nav.logout': 'ออกจากระบบ',
    
    // Login
    'login.title': 'More Drug Store',
    'login.subtitle': 'ระบบขายหน้าร้านสำหรับร้านขายยา',
    'login.email': 'อีเมล',
    'login.password': 'รหัสผ่าน',
    'login.submit': 'เข้าสู่ระบบ',
    'login.footer': 'ติดต่อผู้ดูแลระบบหากต้องการรีเซ็ตรหัสผ่านใหม่',
    
    // Dashboard
    'dashboard.welcome': 'ยินดีต้อนรับ',
    'dashboard.totalSales': 'ยอดขายรวม',
    'dashboard.totalProducts': 'สินค้าทั้งหมด',
    'dashboard.lowStock': 'สินค้าใกล้หมด',
    'dashboard.todayRevenue': 'รายได้วันนี้',
    
    // POS
    'pos.title': 'ขายสินค้า (POS)',
    'pos.search': 'ค้นหาสินค้า...',
    'pos.cart': 'รายการสินค้า',
    'pos.empty': 'ไม่มีสินค้าในตะกร้า',
    'pos.subtotal': 'ยอดรวม',
    'pos.checkout': 'ชำระเงิน',
    'pos.quantity': 'จำนวน',
    'pos.remove': 'ลบ',
    
    // Products
    'products.title': 'จัดการสินค้า',
    'products.search': 'ค้นหาสินค้า...',
    'products.name': 'ชื่อสินค้า',
    'products.sku': 'รหัสสินค้า',
    'products.category': 'หมวดหมู่',
    'products.price': 'ราคา',
    'products.stock': 'คงเหลือ',
    'products.actions': 'จัดการ',
    'products.noCategory': 'ไม่มีหมวดหมู่',
    
    // Common
    'common.loading': 'กำลังโหลด...',
    'common.save': 'บันทึก',
    'common.cancel': 'ยกเลิก',
    'common.edit': 'แก้ไข',
    'common.delete': 'ลบ',
    'common.confirm': 'ยืนยัน',
    'common.search': 'ค้นหา',
    'common.filter': 'กรอง',
    'common.export': 'ส่งออก',
    'common.import': 'นำเข้า',
    'common.add': 'เพิ่ม',
    'common.baht': '฿',
  },
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.pos': 'Point of Sale',
    'nav.products': 'Products',
    'nav.inventory': 'Inventory',
    'nav.reports': 'Reports',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',
    
    // Login
    'login.title': 'More Drug Store',
    'login.subtitle': 'Pharmacy Point of Sale System',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.submit': 'Sign In',
    'login.footer': 'Contact administrator to reset your password',
    
    // Dashboard
    'dashboard.welcome': 'Welcome',
    'dashboard.totalSales': 'Total Sales',
    'dashboard.totalProducts': 'Total Products',
    'dashboard.lowStock': 'Low Stock Items',
    'dashboard.todayRevenue': 'Today\'s Revenue',
    
    // POS
    'pos.title': 'Point of Sale',
    'pos.search': 'Search products...',
    'pos.cart': 'Shopping Cart',
    'pos.empty': 'Cart is empty',
    'pos.subtotal': 'Subtotal',
    'pos.checkout': 'Checkout',
    'pos.quantity': 'Quantity',
    'pos.remove': 'Remove',
    
    // Products
    'products.title': 'Product Management',
    'products.search': 'Search products...',
    'products.name': 'Product Name',
    'products.sku': 'SKU',
    'products.category': 'Category',
    'products.price': 'Price',
    'products.stock': 'Stock',
    'products.actions': 'Actions',
    'products.noCategory': 'No Category',
    
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.confirm': 'Confirm',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.add': 'Add',
    'common.baht': '฿',
  },
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStore()
  const [language, setLanguageState] = useState<Language>('th')

  useEffect(() => {
    if (user?.language) {
      setLanguageState(user.language as Language)
    }
  }, [user])

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang)
    
    if (user?.id) {
      try {
        await supabase
          .from('users')
          .update({ language: lang })
          .eq('id', user.id)
        
        // Update local user state
        useAuthStore.getState().setUser({ ...user, language: lang })
      } catch (error) {
        console.error('Failed to save language preference:', error)
      }
    }
  }

  const t = (key: string): string => {
    return translations[language][key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}
