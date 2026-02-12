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
    'nav.aiSymptomChecker': 'AI ช่วยแนะนำยา',
    'nav.categories': 'หมวดหมู่',
    'nav.products': 'สินค้า',
    'nav.inventory': 'คลังสินค้า',
    'nav.reports': 'รายงาน',
    'nav.settings': 'ตั้งค่า',
    'nav.logout': 'ออกจากระบบ',
    'nav.salesOrders': 'รายการขาย',
    'nav.stockManagement': 'จัดการสต็อก',
    'nav.contacts': 'ผู้ติดต่อ',
    'nav.documents': 'เอกสาร',
    
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
    'products.addProductPrompt': 'กรุณาเพิ่มสินค้าใหม่',
    'products.loading': 'กำลังโหลดสินค้า...',
    'products.sku': 'รหัสสินค้า',
    'products.nameTh': 'ชื่อภาษาไทย',
    'products.nameEn': 'ชื่อภาษาอังกฤษ',
    'products.descriptionTh': 'รายละเอียดภาษาไทย',
    'products.descriptionEn': 'รายละเอียดภาษาอังกฤษ',
    'products.basePrice': 'ราคาขาย',
    'products.costPrice': 'ราคาทุน',
    'products.stockQuantity': 'จำนวนคงเหลือ',
    'products.minStockLevel': 'จำนวนขั้นต่ำ',
    'products.unit': 'หน่วย',
    'products.image': 'รูปภาพ',
    'products.uploadImage': 'อัปโหลดรูปภาพ',
    'products.editProduct': 'แก้ไขสินค้า',
    'products.saveSuccess': 'บันทึกสินค้าสำเร็จ',
    'products.filterByCategory': 'กรองตามหมวดหมู่',
    'products.filterByPrice': 'กรองตามราคา',
    'products.filterByStock': 'กรองตามสต็อก',
    'products.allCategories': 'ทุกหมวดหมู่',
    'products.lowStock': 'สต็อกต่ำ',
    'products.inStock': 'มีสต็อก',
    'products.outOfStock': 'หมดสต็อก',
    'products.priceRange': 'ช่วงราคา',
    'products.minPrice': 'ราคาต่ำสุด',
    'products.maxPrice': 'ราคาสูงสุด',
    'products.clearFilters': 'ล้างตัวกรอง',
    
    // Inventory
    'inventory.title': 'คลังสินค้า',
    'inventory.comingSoon': 'เร็วๆ นี้',
    
    // Reports
    'reports.title': 'รายงาน',
    'reports.comingSoon': 'เร็วๆ นี้',
    
    // AI Symptom Checker
    'ai.title': 'AI ช่วยแนะนำยา',
    'ai.subtitle': 'ระบบช่วยแนะนำยาตามอาการ',
    'ai.disclaimer': '⚠️ ข้อจำกัดความรับผิดชอบ: ระบบนี้เป็นเพียงข้อมูลเบื้องต้น ไม่ใช่การวินิจฉัยโรค หากอาการรุนแรงหรือไม่ดีขึ้น กรุณาพบแพทย์',
    'ai.patientInfo': 'ข้อมูลผู้ป่วย',
    'ai.age': 'อายุ',
    'ai.ageYears': 'ปี',
    'ai.pregnant': 'ท้องหรือให้นมบุตร?',
    'ai.yes': 'ใช่',
    'ai.no': 'ไม่ใช่',
    'ai.allergies': 'แพ้ยาอะไรบ้าง?',
    'ai.allergiesPlaceholder': 'เช่น แพ้เพนนิซิลลิน, แพ้แอสไพริน',
    'ai.currentMeds': 'กำลังกินยาอะไรอยู่?',
    'ai.currentMedsPlaceholder': 'เช่น ยาลดความดัน, ยาเบาหวาน',
    'ai.chronicConditions': 'มีโรคประจำตัวไหม?',
    'ai.chronicConditionsPlaceholder': 'เช่น เบาหวาน, ความดันโลหิตสูง, หอบหืด',
    'ai.symptomDuration': 'มีอาการมานานแค่ไหน?',
    'ai.lessThan1Day': 'น้อยกว่า 1 วัน',
    'ai.1to3Days': '1-3 วัน',
    'ai.3to7Days': '3-7 วัน',
    'ai.moreThan1Week': 'มากกว่า 1 สัปดาห์',
    'ai.symptoms': 'อาการที่พบ',
    'ai.symptomsPlaceholder': 'อธิบายอาการโดยละเอียด เช่น ปวดหัว มีไข้ เจ็บคอ ไอ น้ำมูก',
    'ai.analyze': 'วิเคราะห์และแนะนำยา',
    'ai.analyzing': 'กำลังวิเคราะห์...',
    'ai.results': 'ผลการวิเคราะห์',
    'ai.recommendations': 'ยาที่แนะนำ',
    'ai.warnings': 'คำเตือน',
    'ai.dosage': 'วิธีใช้',
    'ai.price': 'ราคา',
    'ai.stock': 'คงเหลือ',
    'ai.addToCart': 'เพิ่มลงตะกร้า',
    'ai.noResults': 'ไม่พบยาที่เหมาะสม กรุณาปรึกษาเภสัชกรหรือแพทย์',
    'ai.error': 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
    'ai.apiKeyMissing': 'กรุณาตั้งค่า Google Gemini API Key ใน .env',
    'ai.seeDoctor': 'แนะนำให้พบแพทย์',
    'ai.reset': 'เริ่มใหม่',
    
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
    'nav.pos': 'Point of Sale (POS)',
    'nav.aiSymptomChecker': 'AI Symptom Checker',
    'nav.categories': 'Categories',
    'nav.products': 'Products',
    'nav.inventory': 'Inventory',
    'nav.reports': 'Reports',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',
    'nav.salesOrders': 'Sales Orders',
    'nav.stockManagement': 'Stock Management',
    'nav.contacts': 'Contacts',
    'nav.documents': 'Documents',
    
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
    'products.addProductPrompt': 'Please add new products',
    'products.loading': 'Loading products...',
    'products.sku': 'SKU',
    'products.nameTh': 'Thai Name',
    'products.nameEn': 'English Name',
    'products.descriptionTh': 'Thai Description',
    'products.descriptionEn': 'English Description',
    'products.basePrice': 'Sale Price',
    'products.costPrice': 'Cost Price',
    'products.stockQuantity': 'Stock Quantity',
    'products.minStockLevel': 'Min Stock Level',
    'products.unit': 'Unit',
    'products.image': 'Image',
    'products.uploadImage': 'Upload Image',
    'products.editProduct': 'Edit Product',
    'products.saveSuccess': 'Product saved successfully',
    'products.filterByCategory': 'Filter by Category',
    'products.filterByPrice': 'Filter by Price',
    'products.filterByStock': 'Filter by Stock',
    'products.allCategories': 'All Categories',
    'products.lowStock': 'Low Stock',
    'products.inStock': 'In Stock',
    'products.outOfStock': 'Out of Stock',
    'products.priceRange': 'Price Range',
    'products.minPrice': 'Min Price',
    'products.maxPrice': 'Max Price',
    'products.clearFilters': 'Clear Filters',
    
    // Inventory
    'inventory.title': 'Inventory',
    'inventory.comingSoon': 'Coming Soon',
    
    // Reports
    'reports.title': 'Reports',
    'reports.comingSoon': 'Coming Soon',
    
    // AI Symptom Checker
    'ai.title': 'AI Symptom Checker',
    'ai.subtitle': 'AI-powered drug recommendation system',
    'ai.disclaimer': '⚠️ Disclaimer: This system provides preliminary information only and is not a medical diagnosis. If symptoms are severe or persist, please consult a doctor.',
    'ai.patientInfo': 'Patient Information',
    'ai.age': 'Age',
    'ai.ageYears': 'years',
    'ai.pregnant': 'Pregnant or Breastfeeding?',
    'ai.yes': 'Yes',
    'ai.no': 'No',
    'ai.allergies': 'Drug Allergies',
    'ai.allergiesPlaceholder': 'e.g., Penicillin, Aspirin',
    'ai.currentMeds': 'Current Medications',
    'ai.currentMedsPlaceholder': 'e.g., Blood pressure medication, Diabetes medication',
    'ai.chronicConditions': 'Chronic Conditions',
    'ai.chronicConditionsPlaceholder': 'e.g., Diabetes, Hypertension, Asthma',
    'ai.symptomDuration': 'Symptom Duration',
    'ai.lessThan1Day': 'Less than 1 day',
    'ai.1to3Days': '1-3 days',
    'ai.3to7Days': '3-7 days',
    'ai.moreThan1Week': 'More than 1 week',
    'ai.symptoms': 'Symptoms',
    'ai.symptomsPlaceholder': 'Describe symptoms in detail, e.g., headache, fever, sore throat, cough, runny nose',
    'ai.analyze': 'Analyze & Recommend',
    'ai.analyzing': 'Analyzing...',
    'ai.results': 'Analysis Results',
    'ai.recommendations': 'Recommended Medications',
    'ai.warnings': 'Warnings',
    'ai.dosage': 'Dosage',
    'ai.price': 'Price',
    'ai.stock': 'Stock',
    'ai.addToCart': 'Add to Cart',
    'ai.noResults': 'No suitable medication found. Please consult a pharmacist or doctor.',
    'ai.error': 'An error occurred. Please try again.',
    'ai.apiKeyMissing': 'Please set Google Gemini API Key in .env',
    'ai.seeDoctor': 'Recommend seeing a doctor',
    'ai.reset': 'Reset',
    
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
