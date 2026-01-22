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
    'nav.categories': 'หมวดหมู่',
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
    'login.rememberMe': 'จดจำข้อมูลการเข้าสู่ระบบ',
    'login.showPassword': 'แสดงรหัสผ่าน',
    'login.hidePassword': 'ซ่อนรหัสผ่าน',
    'login.submit': 'เข้าสู่ระบบ',
    'login.footer': 'ติดต่อผู้ดูแลระบบหากต้องการรีเซ็ตรหัสผ่านใหม่',
    'login.invalidCredentials': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    'login.error': 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
    
    // Dashboard
    'dashboard.title': 'แดชบอร์ด',
    'dashboard.welcome': 'ยินดีต้อนรับ',
    'dashboard.todaySales': 'ยอดขายวันนี้',
    'dashboard.salesCount': 'รายการขาย',
    'dashboard.totalProducts': 'สินค้าทั้งหมด',
    'dashboard.lowStock': 'สินค้าใกล้หมด',
    'dashboard.recentSales': 'ยอดขายล่าสุด',
    'dashboard.noSalesData': 'ยังไม่มีข้อมูลการขาย',
    'dashboard.noLowStock': 'ไม่มีสินค้าที่ใกล้หมด',
    
    // POS
    'pos.title': 'ขายสินค้า (POS)',
    'pos.search': 'ค้นหาสินค้า...',
    'pos.cart': 'รายการสินค้า',
    'pos.empty': 'ไม่มีสินค้าในตะกร้า',
    'pos.subtotal': 'ยอดรวม',
    'pos.checkout': 'ชำระเงิน',
    'pos.quantity': 'จำนวน',
    'pos.remove': 'ลบ',
    
    // Categories
    'categories.title': 'หมวดหมู่สินค้า',
    'categories.addCategory': 'เพิ่มหมวดหมู่',
    'categories.editCategory': 'แก้ไขหมวดหมู่',
    'categories.deleteCategory': 'ลบหมวดหมู่',
    'categories.nameTh': 'ชื่อภาษาไทย',
    'categories.nameEn': 'ชื่อภาษาอังกฤษ',
    'categories.parentCategory': 'หมวดหมู่หลัก',
    'categories.noParent': 'ไม่มีหมวดหมู่หลัก',
    'categories.sortOrder': 'ลำดับการแสดง',
    'categories.actions': 'จัดการ',
    'categories.edit': 'แก้ไข',
    'categories.delete': 'ลบ',
    'categories.noCategories': 'ไม่พบหมวดหมู่',
    'categories.addCategoryPrompt': 'กรุณาเพิ่มหมวดหมู่สินค้า',
    'categories.loading': 'กำลังโหลดหมวดหมู่...',
    'categories.confirmDelete': 'คุณแน่ใจหรือไม่ที่จะลบหมวดหมู่นี้?',
    'categories.deleteSuccess': 'ลบหมวดหมู่สำเร็จ',
    'categories.saveSuccess': 'บันทึกหมวดหมู่สำเร็จ',
    'categories.modalTitle': 'จัดการหมวดหมู่',
    'categories.hasProducts': 'ไม่สามารถลบหมวดหมู่นี้ได้: มีสินค้า {count} รายการที่ใช้หมวดหมู่นี้อยู่',
    
    // Products
    'products.title': 'สินค้า',
    'products.addProduct': 'เพิ่มสินค้า',
    'products.search': 'ค้นหาสินค้า (ชื่อ, บาร์โค้ด)',
    'products.barcode': 'บาร์โค้ด',
    'products.name': 'ชื่อสินค้า',
    'products.category': 'หมวดหมู่',
    'products.price': 'ราคา',
    'products.stock': 'คงเหลือ',
    'products.actions': 'จัดการ',
    'products.edit': 'แก้ไข',
    'products.noCategory': 'ไม่มีหมวดหมู่',
    'products.noProducts': 'ไม่พบสินค้า',
    'products.addProductPrompt': 'กรุณาเพิ่มสินค้าในระบบ',
    'products.loading': 'กำลังโหลดสินค้า...',
    
    // Inventory
    'inventory.title': 'คลังสินค้า',
    'inventory.comingSoon': 'เร็วๆ นี้',
    
    // Reports
    'reports.title': 'รายงาน',
    'reports.comingSoon': 'เร็วๆ นี้',
    
    // Settings
    'settings.title': 'ตั้งค่า',
    'settings.comingSoon': 'เร็วๆ นี้',
    
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
    'nav.categories': 'Categories',
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
    'login.rememberMe': 'Remember me',
    'login.showPassword': 'Show password',
    'login.hidePassword': 'Hide password',
    'login.submit': 'Sign In',
    'login.footer': 'Contact administrator to reset your password',
    'login.invalidCredentials': 'Invalid email or password',
    'login.error': 'Login failed. Please try again',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome',
    'dashboard.todaySales': 'Today\'s Sales',
    'dashboard.salesCount': 'Sales Count',
    'dashboard.totalProducts': 'Total Products',
    'dashboard.lowStock': 'Low Stock Items',
    'dashboard.recentSales': 'Recent Sales',
    'dashboard.noSalesData': 'No sales data yet',
    'dashboard.noLowStock': 'No low stock items',
    
    // POS
    'pos.title': 'Point of Sale',
    'pos.search': 'Search products...',
    'pos.cart': 'Shopping Cart',
    'pos.empty': 'Cart is empty',
    'pos.subtotal': 'Subtotal',
    'pos.checkout': 'Checkout',
    'pos.quantity': 'Quantity',
    'pos.remove': 'Remove',
    
    // Categories
    'categories.title': 'Product Categories',
    'categories.addCategory': 'Add Category',
    'categories.editCategory': 'Edit Category',
    'categories.deleteCategory': 'Delete Category',
    'categories.nameTh': 'Thai Name',
    'categories.nameEn': 'English Name',
    'categories.parentCategory': 'Parent Category',
    'categories.noParent': 'No Parent',
    'categories.sortOrder': 'Sort Order',
    'categories.actions': 'Actions',
    'categories.edit': 'Edit',
    'categories.delete': 'Delete',
    'categories.noCategories': 'No categories found',
    'categories.addCategoryPrompt': 'Please add product categories',
    'categories.loading': 'Loading categories...',
    'categories.confirmDelete': 'Are you sure you want to delete this category?',
    'categories.deleteSuccess': 'Category deleted successfully',
    'categories.saveSuccess': 'Category saved successfully',
    'categories.modalTitle': 'Manage Category',
    'categories.hasProducts': 'Cannot delete this category: {count} products are using this category',
    
    // Products
    'products.title': 'Products',
    'products.addProduct': 'Add Product',
    'products.search': 'Search products (name, barcode)',
    'products.barcode': 'Barcode',
    'products.name': 'Product Name',
    'products.category': 'Category',
    'products.price': 'Price',
    'products.stock': 'Stock',
    'products.actions': 'Actions',
    'products.edit': 'Edit',
    'products.noCategory': 'No Category',
    'products.noProducts': 'No products found',
    'products.addProductPrompt': 'Please add products to the system',
    'products.loading': 'Loading products...',
    
    // Inventory
    'inventory.title': 'Inventory',
    'inventory.comingSoon': 'Coming Soon',
    
    // Reports
    'reports.title': 'Reports',
    'reports.comingSoon': 'Coming Soon',
    
    // Settings
    'settings.title': 'Settings',
    'settings.comingSoon': 'Coming Soon',
    
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
