import { UserRole } from '../types/database'

// ============================================================================
// MENU PERMISSIONS - Define which roles can access which menu items
// ============================================================================

export type MenuSection = 
  | 'pos'           // ขายสินค้า (POS)
  | 'sales'         // รายการขาย
  | 'products'      // สินค้า
  | 'website'       // เว็บไซต์ร้าน
  | 'documents'     // เอกสาร
  | 'reports'       // รายงาน
  | 'settings'      // ตั้งค่า
  | 'users'         // การจัดการผู้ใช้
  | 'contacts'      // ผู้ติดต่อ
  | 'work_schedule' // ตารางงาน

interface MenuPermission {
  id: MenuSection
  label: string
  icon: string
  path: string
  allowedRoles: UserRole[]
  subMenus?: {
    label: string
    path: string
    allowedRoles?: UserRole[]
  }[]
}

// Main menu configuration with role-based access
export const MENU_PERMISSIONS: MenuPermission[] = [
  {
    id: 'pos',
    label: 'ขายสินค้า',
    icon: 'ShoppingCart',
    path: '/pos',
    allowedRoles: ['owner', 'manager', 'pharmacist', 'part_time']
  },
  {
    id: 'sales',
    label: 'รายการขาย',
    icon: 'ListOrdered',
    path: '/sales',
    allowedRoles: ['owner', 'manager', 'pharmacist', 'part_time']
  },
  {
    id: 'products',
    label: 'สินค้า',
    icon: 'Package',
    path: '/products',
    allowedRoles: ['owner', 'manager', 'pharmacist', 'part_time']
  },
  {
    id: 'website',
    label: 'เว็บไซต์ร้าน',
    icon: 'Globe',
    path: '/website',
    allowedRoles: ['owner', 'manager', 'pharmacist', 'part_time']
  },
  {
    id: 'documents',
    label: 'เอกสาร',
    icon: 'FileText',
    path: '/documents',
    allowedRoles: ['owner', 'manager', 'accountant'],
    subMenus: [
      { label: 'ใบเสนอราคา', path: '/quotations' },
      { label: 'ใบสั่งซื้อ', path: '/purchase-orders' },
      { label: 'ใบส่งสินค้า', path: '/delivery-notes' },
      { label: 'ใบกำกับภาษี', path: '/tax-invoices' },
      { label: 'เอกสารหัก ณ ที่จ่าย', path: '/withholding-tax' },
      { label: 'สลิปเงินเดือน', path: '/payslips' }
    ]
  },
  {
    id: 'reports',
    label: 'รายงาน',
    icon: 'BarChart3',
    path: '/reports',
    allowedRoles: ['owner', 'manager', 'accountant'],
    subMenus: [
      { label: 'รายงานการขาย', path: '/sales-report' },
      { label: 'รายงานสต็อก', path: '/stock-report' },
      { label: 'รายงานกำไร', path: '/profit-report' },
      { label: 'รายงานสรุปผู้บริหาร', path: '/executive-summary' }
    ]
  },
  {
    id: 'settings',
    label: 'ตั้งค่า',
    icon: 'Settings',
    path: '/settings',
    allowedRoles: ['owner'],  // Only owner can access settings
    subMenus: [
      { label: 'ตั้งค่าร้านค้า', path: '/shop-settings' },
      { label: 'ตั้งค่าช่องทางขาย', path: '/sales-channels' },
      { label: 'ตั้งค่าวิธีชำระเงิน', path: '/payment-methods' },
      { label: 'ตั้งค่าพนักงาน', path: '/employee-settings' },
      { label: 'สิทธิ์การใช้งาน', path: '/permissions' }
    ]
  },
  {
    id: 'users',
    label: 'การจัดการผู้ใช้',
    icon: 'Users',
    path: '/users',
    allowedRoles: ['owner', 'manager']  // Owner and manager can manage users
  }
]

// ============================================================================
// ACTION PERMISSIONS - Define which roles can perform specific actions
// ============================================================================

export type ActionPermission = 
  | 'create_order'
  | 'edit_order'
  | 'delete_order'
  | 'create_product'
  | 'edit_product'
  | 'delete_product'
  | 'adjust_stock'
  | 'view_cost_price'
  | 'view_profit'
  | 'manage_users'
  | 'view_logs'
  | 'export_data'
  | 'delete_data'
  | 'change_settings'
  | 'process_refund'
  | 'apply_discount'
  | 'modify_price'

interface ActionConfig {
  action: ActionPermission
  allowedRoles: UserRole[]
  description: string
}

export const ACTION_PERMISSIONS: ActionConfig[] = [
  { action: 'create_order', allowedRoles: ['owner', 'manager', 'pharmacist', 'part_time'], description: 'สร้างรายการขาย' },
  { action: 'edit_order', allowedRoles: ['owner', 'manager', 'pharmacist'], description: 'แก้ไขรายการขาย' },
  { action: 'delete_order', allowedRoles: ['owner', 'manager'], description: 'ลบรายการขาย' },
  { action: 'create_product', allowedRoles: ['owner', 'manager', 'pharmacist'], description: 'เพิ่มสินค้าใหม่' },
  { action: 'edit_product', allowedRoles: ['owner', 'manager', 'pharmacist'], description: 'แก้ไขข้อมูลสินค้า' },
  { action: 'delete_product', allowedRoles: ['owner', 'manager'], description: 'ลบสินค้า' },
  { action: 'adjust_stock', allowedRoles: ['owner', 'manager', 'pharmacist'], description: 'ปรับยอดสต็อก' },
  { action: 'view_cost_price', allowedRoles: ['owner', 'manager', 'accountant'], description: 'ดูราคาทุน' },
  { action: 'view_profit', allowedRoles: ['owner', 'manager', 'accountant'], description: 'ดูกำไร' },
  { action: 'manage_users', allowedRoles: ['owner'], description: 'จัดการผู้ใช้' },
  { action: 'view_logs', allowedRoles: ['owner', 'manager'], description: 'ดูประวัติการใช้งาน' },
  { action: 'export_data', allowedRoles: ['owner', 'manager', 'accountant'], description: 'ส่งออกข้อมูล' },
  { action: 'delete_data', allowedRoles: ['owner'], description: 'ลบข้อมูลระบบ' },
  { action: 'change_settings', allowedRoles: ['owner'], description: 'เปลี่ยนการตั้งค่า' },
  { action: 'process_refund', allowedRoles: ['owner', 'manager', 'pharmacist'], description: 'ทำรายการคืนเงิน' },
  { action: 'apply_discount', allowedRoles: ['owner', 'manager', 'pharmacist', 'part_time'], description: 'ให้ส่วนลด' },
  { action: 'modify_price', allowedRoles: ['owner', 'manager', 'pharmacist'], description: 'แก้ไขราคาขาย' }
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a user role has permission to access a menu section
 */
export function canAccessMenu(role: UserRole | string | undefined, menuId: MenuSection): boolean {
  if (!role) return false
  // Handle backward compatibility: treat 'admin' as 'owner'
  const normalizedRole = role === 'admin' ? 'owner' : role
  const menu = MENU_PERMISSIONS.find(m => m.id === menuId)
  if (!menu) return false
  return menu.allowedRoles.includes(normalizedRole as UserRole)
}

/**
 * Check if a user role can perform a specific action
 */
export function canPerformAction(role: UserRole | string | undefined, action: ActionPermission): boolean {
  if (!role) return false
  // Handle backward compatibility: treat 'admin' as 'owner'
  const normalizedRole = role === 'admin' ? 'owner' : role
  const permission = ACTION_PERMISSIONS.find(p => p.action === action)
  if (!permission) return false
  return permission.allowedRoles.includes(normalizedRole as UserRole)
}

/**
 * Get all allowed menus for a user role
 */
export function getAllowedMenus(role: UserRole | string | undefined): MenuPermission[] {
  if (!role) return []
  // Handle backward compatibility: treat 'admin' as 'owner'
  const normalizedRole = role === 'admin' ? 'owner' : role
  return MENU_PERMISSIONS.filter(menu => menu.allowedRoles.includes(normalizedRole as UserRole))
}

/**
 * Get role display name in Thai
 */
export function getRoleDisplayName(role: UserRole | string): string {
  // Handle backward compatibility: treat 'admin' as 'owner'
  if (role === 'admin') return 'เจ้าของร้าน'
  const displayNames: Record<UserRole, string> = {
    owner: 'เจ้าของร้าน',
    manager: 'ผู้จัดการร้าน',
    pharmacist: 'เภสัชกร',
    part_time: 'พนักงานไพรท์ไทม์',
    accountant: 'นักบัญชี'
  }
  return displayNames[role as UserRole] || role
}

/**
 * Get role badge color
 */
export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    owner: 'bg-purple-100 text-purple-800',
    manager: 'bg-blue-100 text-blue-800',
    pharmacist: 'bg-green-100 text-green-800',
    part_time: 'bg-yellow-100 text-yellow-800',
    accountant: 'bg-orange-100 text-orange-800'
  }
  return colors[role] || 'bg-gray-100 text-gray-800'
}

/**
 * Check if user is admin level (owner or manager)
 */
export function isAdmin(role: UserRole | string | undefined): boolean {
  if (!role) return false
  // Handle backward compatibility: treat 'admin' as 'owner'
  return role === 'owner' || role === 'manager' || role === 'admin'
}

/**
 * Check if user can view sensitive data (cost, profit)
 */
export function canViewSensitiveData(role: UserRole | string | undefined): boolean {
  if (!role) return false
  // Handle backward compatibility: treat 'admin' as 'owner'
  return role === 'owner' || role === 'manager' || role === 'accountant' || role === 'admin'
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    owner: 'เข้าถึงทุกฟังก์ชั่นในระบบ',
    manager: 'เข้าถึงทุกฟังก์ชั่น ยกเว้นเมนูตั้งค่า',
    pharmacist: 'เข้าถึง POS, รายการขาย, สินค้า, และเว็บไซต์',
    part_time: 'เข้าถึง POS, รายการขาย, สินค้า, และเว็บไซต์',
    accountant: 'เข้าถึงเมนูเอกสารและรายงานเท่านั้น'
  }
  return descriptions[role] || ''
}

/**
 * Filter navigation items based on user role
 */
export function filterNavigationByRole(navigation: any[], role: UserRole | string | undefined): any[] {
  if (!role) return []
  // Handle backward compatibility: treat 'admin' as 'owner'
  const normalizedRole = role === 'admin' ? 'owner' : role
  
  return navigation.filter(item => {
    // Check if menu section is allowed
    const menuId = item.id as MenuSection
    if (menuId && !canAccessMenu(normalizedRole, menuId)) {
      return false
    }
    
    // Filter submenus if any
    if (item.subMenus && item.subMenus.length > 0) {
      item.subMenus = item.subMenus.filter((sub: any) => {
        // Check if submenu has specific role restrictions
        if (sub.allowedRoles) {
          return sub.allowedRoles.includes(normalizedRole)
        }
        return true
      })
    }
    
    return true
  })
}
