import { supabase } from './supabase'
import { ActivityLog } from '../types'

// ============================================================================
// ACTIVITY LOGGING SERVICE
// ============================================================================

/**
 * Log a user activity
 */
export async function logActivity(
  action: string,
  entityType?: string,
  entityId?: string,
  details?: Record<string, any>
): Promise<ActivityLog | null> {
  try {
    const { data, error } = await supabase.rpc('log_activity', {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_details: details
    })

    if (error) throw error
    return data
  } catch (err) {
    console.error('Failed to log activity:', err)
    return null
  }
}

/**
 * Get activity logs with filters
 */
export async function getActivityLogs(
  filters?: {
    userId?: string
    action?: string
    entityType?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  }
): Promise<{ logs: ActivityLog[], count: number }> {
  try {
    let query = supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId)
    }

    if (filters?.action) {
      query = query.eq('action', filters.action)
    }

    if (filters?.entityType) {
      query = query.eq('entity_type', filters.entityType)
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate)
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate)
    }

    const limit = filters?.limit || 50
    const offset = filters?.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    return {
      logs: data || [],
      count: count || 0
    }
  } catch (err) {
    console.error('Failed to fetch activity logs:', err)
    return { logs: [], count: 0 }
  }
}

/**
 * Get activity logs for a specific user
 */
export async function getUserActivityLogs(
  userId: string,
  limit: number = 50
): Promise<ActivityLog[]> {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Failed to fetch user activity logs:', err)
    return []
  }
}

/**
 * Get recent activity logs (for dashboard/admin view)
 */
export async function getRecentActivityLogs(
  limit: number = 100
): Promise<ActivityLog[]> {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Failed to fetch recent activity logs:', err)
    return []
  }
}

/**
 * Get activity statistics
 */
export async function getActivityStats(
  startDate: string,
  endDate: string
): Promise<{
  totalActions: number
  actionsByType: Record<string, number>
  actionsByUser: Record<string, number>
  mostActiveUsers: Array<{ userId: string; count: number }>
}> {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (error) throw error

    const logs = data || []

    // Calculate statistics
    const actionsByType: Record<string, number> = {}
    const actionsByUser: Record<string, number> = {}

    logs.forEach(log => {
      // Count by action type
      actionsByType[log.action] = (actionsByType[log.action] || 0) + 1

      // Count by user
      actionsByUser[log.user_id] = (actionsByUser[log.user_id] || 0) + 1
    })

    // Get most active users
    const mostActiveUsers = Object.entries(actionsByUser)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalActions: logs.length,
      actionsByType,
      actionsByUser,
      mostActiveUsers
    }
  } catch (err) {
    console.error('Failed to fetch activity stats:', err)
    return {
      totalActions: 0,
      actionsByType: {},
      actionsByUser: {},
      mostActiveUsers: []
    }
  }
}

// ============================================================================
// COMMON ACTIVITY ACTIONS (for consistency)
// ============================================================================

export const ActivityActions = {
  // Auth actions
  LOGIN: 'login',
  LOGOUT: 'logout',
  PASSWORD_CHANGE: 'password_change',
  
  // Order actions
  CREATE_ORDER: 'create_order',
  UPDATE_ORDER: 'update_order',
  DELETE_ORDER: 'delete_order',
  PRINT_ORDER: 'print_order',
  PROCESS_REFUND: 'process_refund',
  
  // Product actions
  CREATE_PRODUCT: 'create_product',
  UPDATE_PRODUCT: 'update_product',
  DELETE_PRODUCT: 'delete_product',
  ADJUST_STOCK: 'adjust_stock',
  
  // User actions
  CREATE_USER: 'create_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',
  ACTIVATE_USER: 'activate_user',
  DEACTIVATE_USER: 'deactivate_user',
  
  // Document actions
  CREATE_QUOTATION: 'create_quotation',
  UPDATE_QUOTATION: 'update_quotation',
  PRINT_QUOTATION: 'print_quotation',
  
  // Report actions
  GENERATE_REPORT: 'generate_report',
  EXPORT_DATA: 'export_data',
  
  // Settings actions
  UPDATE_SETTINGS: 'update_settings',
  UPDATE_PAYMENT_METHOD: 'update_payment_method',
  UPDATE_SALES_CHANNEL: 'update_sales_channel',
  
  // Website actions
  UPDATE_WEBSITE: 'update_website',
  PUBLISH_PRODUCT: 'publish_product',
  UNPUBLISH_PRODUCT: 'unpublish_product',
} as const

// ============================================================================
// ACTIVITY LOG FORMATTERS
// ============================================================================

/**
 * Get display name for an action
 */
export function getActionDisplayName(action: string): string {
  const displayNames: Record<string, string> = {
    [ActivityActions.LOGIN]: 'เข้าสู่ระบบ',
    [ActivityActions.LOGOUT]: 'ออกจากระบบ',
    [ActivityActions.PASSWORD_CHANGE]: 'เปลี่ยนรหัสผ่าน',
    [ActivityActions.CREATE_ORDER]: 'สร้างรายการขาย',
    [ActivityActions.UPDATE_ORDER]: 'แก้ไขรายการขาย',
    [ActivityActions.DELETE_ORDER]: 'ลบรายการขาย',
    [ActivityActions.PRINT_ORDER]: 'พิมพ์รายการขาย',
    [ActivityActions.PROCESS_REFUND]: 'ทำรายการคืนเงิน',
    [ActivityActions.CREATE_PRODUCT]: 'เพิ่มสินค้า',
    [ActivityActions.UPDATE_PRODUCT]: 'แก้ไขสินค้า',
    [ActivityActions.DELETE_PRODUCT]: 'ลบสินค้า',
    [ActivityActions.ADJUST_STOCK]: 'ปรับยอดสต็อก',
    [ActivityActions.CREATE_USER]: 'สร้างผู้ใช้',
    [ActivityActions.UPDATE_USER]: 'แก้ไขผู้ใช้',
    [ActivityActions.DELETE_USER]: 'ลบผู้ใช้',
    [ActivityActions.ACTIVATE_USER]: 'เปิดใช้งานผู้ใช้',
    [ActivityActions.DEACTIVATE_USER]: 'ระงับผู้ใช้',
    [ActivityActions.CREATE_QUOTATION]: 'สร้างใบเสนอราคา',
    [ActivityActions.UPDATE_QUOTATION]: 'แก้ไขใบเสนอราคา',
    [ActivityActions.PRINT_QUOTATION]: 'พิมพ์ใบเสนอราคา',
    [ActivityActions.GENERATE_REPORT]: 'สร้างรายงาน',
    [ActivityActions.EXPORT_DATA]: 'ส่งออกข้อมูล',
    [ActivityActions.UPDATE_SETTINGS]: 'แก้ไขตั้งค่า',
  }
  
  return displayNames[action] || action
}

/**
 * Format activity log for display
 */
export function formatActivityLog(log: ActivityLog): {
  title: string
  description: string
  timestamp: string
  icon: string
} {
  const action = getActionDisplayName(log.action)
  
  let title = action
  let description = ''
  let icon = 'Activity'
  
  // Customize based on action type
  switch (log.action) {
    case ActivityActions.LOGIN:
      icon = 'LogIn'
      description = 'เข้าสู่ระบบ'
      break
    case ActivityActions.LOGOUT:
      icon = 'LogOut'
      description = 'ออกจากระบบ'
      break
    case ActivityActions.CREATE_ORDER:
    case ActivityActions.UPDATE_ORDER:
      icon = 'ShoppingCart'
      description = log.details?.order_number 
        ? `เลขที่ ${log.details.order_number}` 
        : 'รายการขาย'
      break
    case ActivityActions.CREATE_PRODUCT:
    case ActivityActions.UPDATE_PRODUCT:
      icon = 'Package'
      description = log.details?.product_name || 'สินค้า'
      break
    case ActivityActions.CREATE_USER:
    case ActivityActions.UPDATE_USER:
      icon = 'User'
      description = log.details?.full_name || 'ผู้ใช้'
      break
    case ActivityActions.GENERATE_REPORT:
      icon = 'BarChart'
      description = log.details?.report_type || 'รายงาน'
      break
    case ActivityActions.EXPORT_DATA:
      icon = 'Download'
      description = log.details?.export_type || 'ข้อมูล'
      break
    default:
      icon = 'Activity'
  }
  
  return {
    title,
    description,
    timestamp: new Date(log.created_at).toLocaleString('th-TH'),
    icon
  }
}
