/**
 * LINE Integration Service
 * 
 * Provides LINE Messaging API integration via Supabase Edge Function proxy.
 * LINE Notify was deprecated on March 31, 2025 — this uses LINE Messaging API instead.
 * - Broadcast messages to all LINE Official Account followers
 * - Push messages to specific users
 * - Payment due date alerts
 * - Configurable via localStorage
 *
 * Setup:
 * 1. Create LINE Official Account at https://manager.line.biz/
 * 2. Enable Messaging API in LINE Developers Console
 * 3. Get Channel Access Token (long-lived)
 * 4. Set token in Settings → LINE Notify page
 */

import { supabase } from './supabase'

// ─── Config helpers ──────────────────────────────────────────

const LINE_CONFIG_KEY = 'line_messaging_config'

export interface LineNotifyConfig {
  channelAccessToken: string
  enabled: boolean
  alertDaysBefore: number  // alert N days before due date
  alertOnDueDay: boolean
  alertOverdue: boolean
}

const DEFAULT_CONFIG: LineNotifyConfig = {
  channelAccessToken: '',
  enabled: false,
  alertDaysBefore: 1,
  alertOnDueDay: true,
  alertOverdue: true,
}

export function getLineNotifyConfig(): LineNotifyConfig {
  try {
    const saved = localStorage.getItem(LINE_CONFIG_KEY)
    if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) }
  } catch { /* ignore */ }
  return { ...DEFAULT_CONFIG }
}

export function saveLineNotifyConfig(config: LineNotifyConfig): void {
  localStorage.setItem(LINE_CONFIG_KEY, JSON.stringify(config))
}

// ─── Send LINE Message via Edge Function ─────────────────────

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/line-notify`
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export async function sendLineMessage(
  message: string,
  options?: { channelAccessToken?: string; mode?: 'broadcast' | 'push'; userId?: string }
): Promise<{ success: boolean; error?: string }> {
  const config = getLineNotifyConfig()
  const token = options?.channelAccessToken || config.channelAccessToken

  if (!token) {
    return { success: false, error: 'ไม่พบ LINE Channel Access Token กรุณาตั้งค่าก่อน' }
  }

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        message,
        channelAccessToken: token,
        mode: options?.mode || 'broadcast',
        userId: options?.userId,
      })
    })

    const result = await response.json()

    if (response.ok && result.status === 200) {
      return { success: true }
    } else {
      return { success: false, error: result.message || `LINE API error: ${response.status}` }
    }
  } catch (err: any) {
    console.error('LINE Messaging API error:', err)
    return { success: false, error: err.message || 'เกิดข้อผิดพลาดในการส่ง LINE' }
  }
}

// Backward-compatible alias
export const sendLineNotify = sendLineMessage

// ─── Credit term rules ──────────────────────────────────────

export interface CreditTermRule {
  vendor_match: string
  days: number
}

const CREDIT_TERMS_KEY = 'line_credit_terms'

export function getCreditTerms(): CreditTermRule[] {
  try {
    const saved = localStorage.getItem(CREDIT_TERMS_KEY)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  // Default rules
  return [
    { vendor_match: 'ฟาร์มาแคร์', days: 7 },
  ]
}

export function saveCreditTerms(terms: CreditTermRule[]): void {
  localStorage.setItem(CREDIT_TERMS_KEY, JSON.stringify(terms))
}

// ─── Payment due date alerts ─────────────────────────────────

interface PaymentDueAlert {
  vendor: string
  expense_date: string
  amount: number
  description: string
  due_date: string
  days_remaining: number
  is_overdue: boolean
}

export async function checkPaymentDueAlerts(): Promise<PaymentDueAlert[]> {
  const creditTerms = getCreditTerms()
  if (creditTerms.length === 0) return []

  // Fetch recent expenses (last 90 days)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('id, vendor, expense_date, document_date, amount, description, payment_voucher_id')
    .gte('expense_date', ninetyDaysAgo.toISOString().split('T')[0])
    .order('expense_date', { ascending: false })

  if (error || !expenses) return []

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const alerts: PaymentDueAlert[] = []

  for (const exp of expenses) {
    if (!exp.vendor || exp.payment_voucher_id) continue // skip paid or no vendor

    const rule = creditTerms.find(r => exp.vendor.includes(r.vendor_match))
    if (!rule) continue

    const baseDate = new Date(exp.document_date || exp.expense_date)
    const dueDate = new Date(baseDate)
    dueDate.setDate(dueDate.getDate() + rule.days)
    dueDate.setHours(0, 0, 0, 0)

    const diffTime = dueDate.getTime() - today.getTime()
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    alerts.push({
      vendor: exp.vendor,
      expense_date: exp.document_date || exp.expense_date,
      amount: exp.amount,
      description: exp.description,
      due_date: dueDate.toISOString().split('T')[0],
      days_remaining: daysRemaining,
      is_overdue: daysRemaining < 0,
    })
  }

  // Sort: overdue first, then by days remaining
  alerts.sort((a, b) => a.days_remaining - b.days_remaining)
  return alerts
}

export function formatPaymentDueMessage(alerts: PaymentDueAlert[]): string {
  if (alerts.length === 0) return ''

  const lines: string[] = ['\n📋 แจ้งเตือนกำหนดชำระเงิน']
  lines.push(`📅 วันที่: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`)
  lines.push('─────────────────')

  for (const alert of alerts) {
    const amount = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(alert.amount)

    if (alert.is_overdue) {
      lines.push(`🔴 เลยกำหนด ${Math.abs(alert.days_remaining)} วัน`)
    } else if (alert.days_remaining === 0) {
      lines.push(`🟡 ครบกำหนดวันนี้`)
    } else {
      lines.push(`🟢 อีก ${alert.days_remaining} วัน`)
    }

    lines.push(`🏢 ${alert.vendor}`)
    lines.push(`💰 ยอด: ฿${amount}`)
    lines.push(`📄 ${alert.description}`)
    lines.push(`📆 กำหนดชำระ: ${new Date(alert.due_date).toLocaleDateString('th-TH')}`)
    lines.push('─────────────────')
  }

  const totalAmount = alerts.reduce((sum, a) => sum + a.amount, 0)
  const formattedTotal = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(totalAmount)
  lines.push(`💰 รวมยอดทั้งหมด: ฿${formattedTotal}`)

  return lines.join('\n')
}

export async function sendPaymentDueAlerts(): Promise<{ success: boolean; alertCount: number; error?: string }> {
  const config = getLineNotifyConfig()
  if (!config.enabled || !config.channelAccessToken) {
    return { success: false, alertCount: 0, error: 'LINE ยังไม่ได้เปิดใช้งาน' }
  }

  const allAlerts = await checkPaymentDueAlerts()

  // Filter by config
  const filteredAlerts = allAlerts.filter(alert => {
    if (alert.is_overdue && config.alertOverdue) return true
    if (alert.days_remaining === 0 && config.alertOnDueDay) return true
    if (alert.days_remaining > 0 && alert.days_remaining <= config.alertDaysBefore) return true
    return false
  })

  if (filteredAlerts.length === 0) {
    return { success: true, alertCount: 0 }
  }

  const message = formatPaymentDueMessage(filteredAlerts)
  const result = await sendLineNotify(message)

  return {
    success: result.success,
    alertCount: filteredAlerts.length,
    error: result.error,
  }
}

// ─── Staff leave alerts ──────────────────────────────────────

export async function checkStaffLeaveAlerts(): Promise<{ success: boolean; leaveCount: number; error?: string }> {
  const config = getLineNotifyConfig()
  if (!config.enabled || !config.channelAccessToken) {
    return { success: false, leaveCount: 0, error: 'LINE ยังไม่ได้เปิดใช้งาน' }
  }

  const today = new Date().toISOString().split('T')[0]

  // Query work_shifts for today where notes = 'ลา'
  const { data: leaveShifts, error } = await supabase
    .from('work_shifts')
    .select('employee_name, position, work_date, notes')
    .eq('work_date', today)
    .eq('notes', 'ลา')

  if (error || !leaveShifts || leaveShifts.length === 0) {
    return { success: true, leaveCount: 0 }
  }

  // Also get who IS working today for context
  const { data: workingShifts } = await supabase
    .from('work_shifts')
    .select('employee_name, position, start_time, end_time')
    .eq('work_date', today)
    .neq('notes', 'ลา')

  const dateStr = new Date().toLocaleDateString('th-TH', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  })

  const lines: string[] = [
    `\n🏖️ แจ้งเตือนพนักงานลาวันนี้`,
    `📅 ${dateStr}`,
    '─────────────────',
  ]

  leaveShifts.forEach((s: any) => {
    lines.push(`🏖️ ${s.employee_name}${s.position ? ` (${s.position})` : ''} — ลา`)
  })

  lines.push('─────────────────')
  lines.push(`📊 ลาวันนี้: ${leaveShifts.length} คน`)

  if (workingShifts && workingShifts.length > 0) {
    lines.push('')
    lines.push('👥 พนักงานที่เข้างานวันนี้:')
    workingShifts.forEach((s: any) => {
      lines.push(`  ✅ ${s.employee_name}${s.position ? ` (${s.position})` : ''} ${s.start_time}-${s.end_time}`)
    })
  }

  const message = lines.join('\n')
  const result = await sendLineMessage(message)

  return {
    success: result.success,
    leaveCount: leaveShifts.length,
    error: result.error,
  }
}

// ─── Auto-check on app load (once per day) ───────────────────

const LAST_ALERT_KEY = 'line_last_alert_date'
const LAST_LEAVE_ALERT_KEY = 'line_last_leave_alert_date'

export async function autoCheckPaymentDueAlerts(): Promise<void> {
  const config = getLineNotifyConfig()
  if (!config.enabled || !config.channelAccessToken) return

  const today = new Date().toISOString().split('T')[0]
  const lastAlertDate = localStorage.getItem(LAST_ALERT_KEY)

  if (lastAlertDate !== today) {
    const result = await sendPaymentDueAlerts()
    if (result.success) {
      localStorage.setItem(LAST_ALERT_KEY, today)
      if (result.alertCount > 0) {
        console.log(`LINE: ส่งแจ้งเตือนชำระเงิน ${result.alertCount} รายการ`)
      }
    }
  }

  // Also check staff leave alerts (separate key so they fire independently)
  const lastLeaveDate = localStorage.getItem(LAST_LEAVE_ALERT_KEY)
  if (lastLeaveDate !== today) {
    const leaveResult = await checkStaffLeaveAlerts()
    if (leaveResult.success) {
      localStorage.setItem(LAST_LEAVE_ALERT_KEY, today)
      if (leaveResult.leaveCount > 0) {
        console.log(`LINE: แจ้งเตือนพนักงานลา ${leaveResult.leaveCount} คน`)
      }
    }
  }
}

// ─── Utility functions ───────────────────────────────────────

export function openLINEWithText(text: string): void {
  const encodedText = encodeURIComponent(text)
  const lineUrl = `https://line.me/R/share?text=${encodedText}`
  window.open(lineUrl, '_blank')
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}
