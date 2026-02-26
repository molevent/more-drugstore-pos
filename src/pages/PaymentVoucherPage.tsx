import { useState, useEffect, useRef } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { FileText, Plus, Search, Trash2, Edit2, BookOpen, Printer, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ArrowLeft, AlertTriangle, Clock, CheckCircle, Upload, CheckSquare, Square, Eye } from 'lucide-react'
import { getExpenseCategories, syncPaymentVouchersToFlowAccount } from '../services/flowaccount'

interface CreditAlert {
  id: string
  vendor: string
  expense_date: string
  document_date?: string
  amount: number
  description: string
  due_date: string
  days_remaining: number
  is_overdue: boolean
  is_paid: boolean
}

// Credit term rules per supplier
const CREDIT_TERMS: { vendor_match: string; days: number }[] = [
  { vendor_match: 'ฟาร์มาแคร์', days: 7 },
]

interface PaymentVoucher {
  id: string
  voucher_date: string
  voucher_number: string
  payee_name: string
  payee_tax_id?: string
  amount: number
  amount_in_words?: string
  description: string
  payment_method: string
  bank_name?: string
  bank_account?: string
  check_number?: string
  approved_by?: string
  notes?: string
  created_at: string
  updated_at: string
  flowaccount_id?: number
  flowaccount_synced_at?: string
}

export default function PaymentVoucherPage() {
  const [vouchers, setVouchers] = useState<PaymentVoucher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingVoucher, setEditingVoucher] = useState<PaymentVoucher | null>(null)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printVoucher, setPrintVoucher] = useState<PaymentVoucher | null>(null)
  const [printLinkedExpenses, setPrintLinkedExpenses] = useState<any[]>([])
  const [showExpenseDetail, setShowExpenseDetail] = useState(false)
  const [detailExpenses, setDetailExpenses] = useState<any[]>([])
  const [detailVoucherNumber, setDetailVoucherNumber] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const printRef = useRef<HTMLDivElement>(null)
  
  const [formData, setFormData] = useState({
    voucher_date: new Date().toISOString().split('T')[0],
    voucher_number: '',
    payee_name: '',
    payee_tax_id: '',
    amount: '',
    amount_in_words: '',
    description: '',
    payment_method: 'เงินสด',
    bank_name: '',
    bank_account: '',
    check_number: '',
    approved_by: '',
    notes: ''
  })

  const [creditAlerts, setCreditAlerts] = useState<CreditAlert[]>([])

  // FA Sync states
  const [syncingToFa, setSyncingToFa] = useState(false)
  const [syncProgress, setSyncProgress] = useState('')
  const [selectedSyncIds, setSelectedSyncIds] = useState<Set<string>>(new Set())
  const [faCategories, setFaCategories] = useState<any[]>([])
  const [selectedFaCategory, setSelectedFaCategory] = useState<any>(null)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [loadingFaCategories, setLoadingFaCategories] = useState(false)

  useEffect(() => {
    fetchVouchers()
    fetchCreditAlerts()
  }, [])

  const fetchVouchers = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('payment_vouchers')
        .select('*')
        .order('voucher_date', { ascending: false })

      if (error) throw error
      setVouchers(data || [])
    } catch (err) {
      console.error('Error fetching vouchers:', err)
      setError('ไม่สามารถโหลดข้อมูลใบสำคัญจ่ายได้')
    } finally {
      setLoading(false)
    }
  }

  const fetchCreditAlerts = async () => {
    try {
      // Fetch recent expenses (last 60 days) that might have credit terms
      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('id, vendor, expense_date, document_date, amount, description, payment_voucher_id')
        .gte('expense_date', sixtyDaysAgo.toISOString().split('T')[0])
        .order('expense_date', { ascending: false })

      if (error) throw error

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const alerts: CreditAlert[] = []
      for (const exp of (expenses || [])) {
        if (!exp.vendor) continue
        const rule = CREDIT_TERMS.find(r => exp.vendor.includes(r.vendor_match))
        if (!rule) continue

        const baseDate = new Date(exp.document_date || exp.expense_date)
        const dueDate = new Date(baseDate)
        dueDate.setDate(dueDate.getDate() + rule.days)
        dueDate.setHours(0, 0, 0, 0)

        const diffTime = dueDate.getTime() - today.getTime()
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        alerts.push({
          id: exp.id,
          vendor: exp.vendor,
          expense_date: exp.document_date || exp.expense_date,
          amount: exp.amount,
          description: exp.description,
          due_date: dueDate.toISOString().split('T')[0],
          days_remaining: daysRemaining,
          is_overdue: daysRemaining < 0,
          is_paid: !!exp.payment_voucher_id,
        })
      }

      // Sort: overdue first, then by days remaining ascending
      alerts.sort((a, b) => {
        if (a.is_paid !== b.is_paid) return a.is_paid ? 1 : -1
        return a.days_remaining - b.days_remaining
      })

      setCreditAlerts(alerts)
    } catch (err) {
      console.error('Error fetching credit alerts:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const voucherData = {
        voucher_date: formData.voucher_date,
        voucher_number: formData.voucher_number,
        payee_name: formData.payee_name,
        payee_tax_id: formData.payee_tax_id || null,
        amount: parseFloat(formData.amount) || 0,
        amount_in_words: formData.amount_in_words || null,
        description: formData.description,
        payment_method: formData.payment_method,
        bank_name: formData.bank_name || null,
        bank_account: formData.bank_account || null,
        check_number: formData.check_number || null,
        approved_by: formData.approved_by || null,
        notes: formData.notes || null
      }

      if (editingVoucher) {
        const { error } = await supabase
          .from('payment_vouchers')
          .update(voucherData)
          .eq('id', editingVoucher.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('payment_vouchers')
          .insert([voucherData])
        
        if (error) throw error
      }

      setShowModal(false)
      resetForm()
      fetchVouchers()
    } catch (error) {
      console.error('Error saving voucher:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบใบสำคัญจ่ายนี้?')) return
    
    try {
      // First, clear payment_voucher_id from any linked expenses
      const { error: updateError } = await supabase
        .from('expenses')
        .update({ payment_voucher_id: null })
        .eq('payment_voucher_id', id)
      
      if (updateError) {
        console.error('Error unlinking voucher from expenses:', updateError)
      }

      const { error } = await supabase
        .from('payment_vouchers')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      fetchVouchers()
    } catch (error) {
      console.error('Error deleting voucher:', error)
      alert('เกิดข้อผิดพลาดในการลบ')
    }
  }

  const handleEdit = (voucher: PaymentVoucher) => {
    setEditingVoucher(voucher)
    setFormData({
      voucher_date: voucher.voucher_date,
      voucher_number: voucher.voucher_number,
      payee_name: voucher.payee_name,
      payee_tax_id: voucher.payee_tax_id || '',
      amount: voucher.amount.toString(),
      amount_in_words: voucher.amount_in_words || '',
      description: voucher.description,
      payment_method: voucher.payment_method,
      bank_name: voucher.bank_name || '',
      bank_account: voucher.bank_account || '',
      check_number: voucher.check_number || '',
      approved_by: voucher.approved_by || '',
      notes: voucher.notes || ''
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      voucher_date: new Date().toISOString().split('T')[0],
      voucher_number: '',
      payee_name: '',
      payee_tax_id: '',
      amount: '',
      amount_in_words: '',
      description: '',
      payment_method: 'เงินสด',
      bank_name: '',
      bank_account: '',
      check_number: '',
      approved_by: '',
      notes: ''
    })
    setEditingVoucher(null)
  }

  // FA Sync helpers
  const toggleSyncSelect = (id: string) => {
    setSelectedSyncIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedSyncIds.size === filteredVouchers.length) {
      setSelectedSyncIds(new Set())
    } else {
      setSelectedSyncIds(new Set(filteredVouchers.map(v => v.id)))
    }
  }

  const fetchFaCategories = async () => {
    setLoadingFaCategories(true)
    try {
      const result = await getExpenseCategories()
      const cats: any[] = []
      const processCat = (cat: any) => {
        cats.push({
          systemCode: cat.systemCode || '',
          categoryId: cat.categoryId || cat.id || '',
          creditId: cat.creditId || '',
          debitId: cat.debitId || '',
          nameLocal: cat.nameLocal || cat.name || '',
          nameForeign: cat.nameForeign || '',
          chart_of_accounts_code: cat.chart_of_accounts_code || ''
        })
        if (cat.children) cat.children.forEach((c: any) => processCat(c))
      }
      if (Array.isArray(result)) {
        result.forEach((cat: any) => processCat(cat))
      } else if (result?.data) {
        const rawCats = result.data.list || result.data || []
        if (Array.isArray(rawCats)) rawCats.forEach((cat: any) => processCat(cat))
      }
      setFaCategories(cats)
      const defaultCat = cats.find(c => c.nameForeign === 'General expenses') || cats[0]
      if (defaultCat) setSelectedFaCategory(defaultCat)
    } catch (err) {
      console.error('Error fetching FA categories:', err)
      alert('ดึงหมวดหมู่ค่าใช้จ่ายจาก FlowAccount ล้มเหลว: ' + (err as Error).message)
    } finally {
      setLoadingFaCategories(false)
    }
  }

  const handleOpenSyncModal = () => {
    const toSync = filteredVouchers.filter(v => selectedSyncIds.has(v.id))
    if (toSync.length === 0) {
      alert('กรุณาเลือกรายการใบสำคัญจ่ายที่ต้องการ sync')
      return
    }
    fetchFaCategories()
    setShowSyncModal(true)
  }

  const handleSyncToFa = async () => {
    if (!selectedFaCategory) {
      alert('กรุณาเลือกหมวดหมู่ค่าใช้จ่ายใน FlowAccount')
      return
    }
    const toSync = filteredVouchers.filter(v => selectedSyncIds.has(v.id))
    if (toSync.length === 0) return
    if (!confirm(`ต้องการ sync ${toSync.length} ใบสำคัญจ่ายไปยัง FlowAccount?`)) return

    setShowSyncModal(false)
    setSyncingToFa(true)
    setSyncProgress('กำลังเตรียมข้อมูล...')

    try {
      const result = await syncPaymentVouchersToFlowAccount(
        toSync,
        {
          systemCode: selectedFaCategory.systemCode,
          categoryId: selectedFaCategory.categoryId,
          creditId: selectedFaCategory.creditId,
          debitId: selectedFaCategory.debitId
        },
        (_current, _total, action) => setSyncProgress(action)
      )

      for (const r of result.results) {
        if (r.faId) {
          await supabase
            .from('payment_vouchers')
            .update({
              flowaccount_id: r.faId,
              flowaccount_synced_at: new Date().toISOString()
            })
            .eq('id', r.localId)
        }
      }

      setSyncProgress('')
      alert(`Sync ใบสำคัญจ่ายเสร็จสิ้น!\n\n✅ สร้างใหม่: ${result.created}\n📝 อัปเดต: ${result.updated}\n❌ ล้มเหลว: ${result.failed}`)
      setSelectedSyncIds(new Set())
      fetchVouchers()
    } catch (err: any) {
      console.error('Sync error:', err)
      alert('เกิดข้อผิดพลาดในการ sync: ' + err.message)
    } finally {
      setSyncingToFa(false)
      setSyncProgress('')
    }
  }

  // View linked expenses for a voucher
  const handleViewExpenses = async (voucher: PaymentVoucher) => {
    try {
      const { data } = await supabase
        .from('expenses')
        .select('id, description, amount, expense_date, document_date, receipt_number, category, vendor, vat_amount, payment_method')
        .eq('payment_voucher_id', voucher.id)
        .order('document_date', { ascending: true })
      setDetailExpenses(data || [])
      setDetailVoucherNumber(voucher.voucher_number)
      setShowExpenseDetail(true)
    } catch {
      alert('ไม่สามารถโหลดรายการค่าใช้จ่ายได้')
    }
  }

  // Fetch linked expenses for a voucher and open print modal
  const handleOpenPrint = async (voucher: PaymentVoucher) => {
    setPrintVoucher(voucher)
    try {
      const { data } = await supabase
        .from('expenses')
        .select('id, description, amount, expense_date, document_date, receipt_number, category, vendor, vat_amount')
        .eq('payment_voucher_id', voucher.id)
        .order('document_date', { ascending: true })
      setPrintLinkedExpenses(data || [])
    } catch {
      setPrintLinkedExpenses([])
    }
    setShowPrintModal(true)
  }

  const filteredVouchers = vouchers.filter(voucher =>
    voucher.voucher_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voucher.payee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voucher.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalAmount = filteredVouchers.reduce((sum, voucher) => sum + voucher.amount, 0)

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <a
            href="/expenses"
            className="p-2 text-gray-400 hover:text-[#7D735F] hover:bg-[#F5F0E6] rounded-full transition-all"
            title="กลับไปหน้าเอกสาร"
          >
            <ArrowLeft className="h-5 w-5" />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-7 w-7 text-[#7D735F]" />
              ใบสำคัญจ่าย
            </h1>
            <p className="text-gray-600 mt-1">บันทึกและจัดการใบสำคัญจ่าย</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-help-modal'))}
            className="p-2 text-gray-400 hover:text-[#7D735F] hover:bg-[#F5F0E6] rounded-full transition-all"
            title="คู่มือการใช้งาน"
          >
            <BookOpen className="h-5 w-5" />
          </button>
          <button
            onClick={handleOpenSyncModal}
            disabled={syncingToFa || selectedSyncIds.size === 0}
            className="flex items-center gap-1 px-3 py-2 bg-[#2B9CD8] hover:bg-[#2488C0] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            title="Sync ใบสำคัญจ่ายไป FlowAccount"
          >
            <Upload className="h-4 w-4" />
            {syncingToFa ? syncProgress || 'กำลัง sync...' : `Sync FA${selectedSyncIds.size > 0 ? ` (${selectedSyncIds.size})` : ''}`}
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="mb-6 bg-gradient-to-r from-[#EDF1F5] to-[#E4EAF0] border-[#7B96B2]/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#7B96B2] font-medium">ยอดรวมใบสำคัญจ่าย</p>
            <p className="text-3xl font-bold text-[#4A6178]">
              ฿{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">จำนวนรายการ</p>
            <p className="text-xl font-semibold text-gray-800">{filteredVouchers.length}</p>
          </div>
        </div>
      </Card>

      {/* Credit Term Alerts */}
      {creditAlerts.filter(a => !a.is_paid).length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50/50">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h3 className="font-semibold text-amber-800">แจ้งเตือนเครดิต - รายการที่ยังไม่ชำระ</h3>
          </div>
          <div className="space-y-2">
            {creditAlerts.filter(a => !a.is_paid).map(alert => {
              const isOverdue = alert.is_overdue
              const isDueSoon = !isOverdue && alert.days_remaining <= 2
              const isDueToday = alert.days_remaining === 0

              return (
                <div
                  key={alert.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm ${
                    isOverdue
                      ? 'bg-red-100 border border-red-200'
                      : isDueToday
                      ? 'bg-orange-100 border border-orange-200'
                      : isDueSoon
                      ? 'bg-amber-100 border border-amber-200'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className={`h-4 w-4 flex-shrink-0 ${
                      isOverdue ? 'text-red-600' : isDueSoon || isDueToday ? 'text-amber-600' : 'text-gray-500'
                    }`} />
                    <span className="font-medium truncate">{alert.vendor}</span>
                    <span className="text-gray-500 hidden sm:inline">—</span>
                    <span className="text-gray-600 truncate hidden sm:inline">{alert.description}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 pl-6 sm:pl-0">
                    <span className="text-gray-700 font-medium">฿{alert.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                    <span className="text-xs text-gray-500">
                      วันที่เอกสาร: {new Date(alert.expense_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${
                      isOverdue
                        ? 'bg-red-600 text-white'
                        : isDueToday
                        ? 'bg-orange-500 text-white'
                        : isDueSoon
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {isOverdue
                        ? `เกินกำหนด ${Math.abs(alert.days_remaining)} วัน`
                        : isDueToday
                        ? 'ครบกำหนดวันนี้!'
                        : `อีก ${alert.days_remaining} วัน (${new Date(alert.due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })})`
                      }
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          {creditAlerts.filter(a => a.is_paid).length > 0 && (
            <div className="mt-3 pt-3 border-t border-amber-200">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                ชำระแล้ว {creditAlerts.filter(a => a.is_paid).length} รายการ
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <div className="flex items-center gap-2 bg-[#E8EBF0] rounded-full px-4 py-3 border border-transparent focus-within:border-[#7B96B2] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#7B96B2]/20 transition-all">
            <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาใบสำคัญจ่าย..."
              className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-base"
            />
          </div>
        </div>
        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              viewMode === 'list'
                ? 'bg-[#7B96B2] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            รายการ
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              viewMode === 'calendar'
                ? 'bg-[#7B96B2] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <CalendarIcon className="h-4 w-4" />
            ปฏิทิน
          </button>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มใบสำคัญจ่าย
        </Button>
      </div>

      {/* Vouchers List or Calendar View */}
      {error ? (
        <Card className="p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchVouchers}
            className="px-4 py-2 bg-[#7B96B2] text-white rounded-lg hover:bg-[#6A869F]"
          >
            ลองใหม่
          </button>
        </Card>
      ) : viewMode === 'list' ? (
        <Card>
          {loading ? (
            <p className="text-center text-gray-600 py-8">กำลังโหลด...</p>
          ) : filteredVouchers.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">ไม่มีรายการใบสำคัญจ่าย</p>
              <p className="text-sm text-gray-500 mt-1">คลิก "เพิ่มใบสำคัญจ่าย" เพื่อบันทึก</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-3 text-center w-10">
                      <button onClick={toggleSelectAll} className="p-1 hover:bg-gray-200 rounded">
                        {selectedSyncIds.size === filteredVouchers.length && filteredVouchers.length > 0
                          ? <CheckSquare className="h-4 w-4 text-[#2B9CD8]" />
                          : <Square className="h-4 w-4 text-gray-400" />}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">เลขที่</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">วันที่</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ผู้รับเงิน</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">รายการ</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">จำนวนเงิน</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">การชำระเงิน</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">พิมพ์</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredVouchers.map((voucher) => (
                    <tr key={voucher.id} className={`hover:bg-gray-50 ${selectedSyncIds.has(voucher.id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-2 py-3 text-center w-10">
                        <button onClick={() => toggleSyncSelect(voucher.id)} className="p-1 hover:bg-gray-200 rounded">
                          {selectedSyncIds.has(voucher.id)
                            ? <CheckSquare className="h-4 w-4 text-[#2B9CD8]" />
                            : <Square className="h-4 w-4 text-gray-400" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-1">
                          {voucher.voucher_number}
                          {voucher.flowaccount_id && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700" title={`FA ID: ${voucher.flowaccount_id}`}>
                              FA ✓
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(voucher.voucher_date).toLocaleDateString('th-TH')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{voucher.payee_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{voucher.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                        ฿{voucher.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">
                        {voucher.payment_method}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenPrint(voucher)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="พิมพ์ใบสำคัญจ่าย"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleViewExpenses(voucher)}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="ดูรายการค่าใช้จ่าย"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(voucher)}
                            className="p-1.5 text-[#7B96B2] hover:bg-[#7B96B2]/10 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(voucher.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        /* Calendar View */
        <Card>
          {loading ? (
            <p className="text-center text-gray-600 py-8">กำลังโหลด...</p>
          ) : (
            <div className="p-4">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h3 className="text-lg font-semibold text-gray-900">
                  {currentMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Monthly Total */}
              {(() => {
                const year = currentMonth.getFullYear()
                const month = currentMonth.getMonth()
                const monthVouchers = filteredVouchers.filter(v => {
                  const vDate = new Date(v.voucher_date)
                  return vDate.getFullYear() === year && vDate.getMonth() === month
                })
                const monthTotal = monthVouchers.reduce((sum, v) => sum + v.amount, 0)
                
                return (
                  <div className="bg-[#7B96B2]/15 rounded-lg p-3 mb-4 flex justify-between items-center">
                    <span className="text-[#4A6178] font-medium">ยอดรวมในเดือนนี้</span>
                    <span className="text-xl font-bold text-[#4A6178]">
                      ฿{monthTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )
              })()}

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day Headers */}
                {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(day => (
                  <div key={day} className="text-center py-2 text-sm font-medium text-gray-600">
                    {day}
                  </div>
                ))}

                {/* Calendar Days */}
                {(() => {
                  const year = currentMonth.getFullYear()
                  const month = currentMonth.getMonth()
                  const firstDay = new Date(year, month, 1).getDay()
                  const daysInMonth = new Date(year, month + 1, 0).getDate()
                  const days = []

                  // Empty cells for days before the first day of the month
                  for (let i = 0; i < firstDay; i++) {
                    days.push(<div key={`empty-${i}`} className="h-24" />)
                  }

                  // Days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const dayVouchers = filteredVouchers.filter(v => v.voucher_date === dateStr)
                    const hasVouchers = dayVouchers.length > 0
                    const totalDayAmount = dayVouchers.reduce((sum, v) => sum + v.amount, 0)

                    days.push(
                      <div
                        key={day}
                        className={`h-24 border rounded-lg p-2 ${
                          hasVouchers ? 'bg-[#7B96B2]/10 border-[#7B96B2]/30' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="text-sm font-medium text-gray-900">{day}</div>
                        {hasVouchers && (
                          <div className="mt-1">
                            <div className="text-xs text-[#7B96B2] font-medium">
                              {dayVouchers.length} รายการ
                            </div>
                            <div className="text-xs text-gray-600">
                              ฿{totalDayAmount.toLocaleString('th-TH')}
                            </div>
                            {dayVouchers.map(v => (
                              <div
                                key={v.id}
                                className="mt-1 text-xs bg-white rounded px-1 py-0.5 truncate cursor-pointer hover:bg-[#7B96B2]/15"
                                onClick={() => {
                                  setPrintVoucher(v)
                                  setShowPrintModal(true)
                                }}
                              >
                                {v.voucher_number}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  }

                  return days
                })()}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingVoucher ? 'แก้ไขใบสำคัญจ่าย' : 'เพิ่มใบสำคัญจ่าย'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่ *</label>
                  <input
                    type="text"
                    required
                    value={formData.voucher_number}
                    onChange={(e) => setFormData({ ...formData, voucher_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="PV-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ *</label>
                  <input
                    type="date"
                    required
                    value={formData.voucher_date}
                    onChange={(e) => setFormData({ ...formData, voucher_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ผู้รับเงิน *</label>
                <input
                  type="text"
                  required
                  value={formData.payee_name}
                  onChange={(e) => setFormData({ ...formData, payee_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="ชื่อผู้รับเงิน"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เลขประจำตัวผู้เสียภาษี</label>
                  <input
                    type="text"
                    value={formData.payee_tax_id}
                    onChange={(e) => setFormData({ ...formData, payee_tax_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="เลข 13 หลัก"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วิธีการชำระเงิน *</label>
                  <select
                    required
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="เงินสด">เงินสด</option>
                    <option value="โอนเงิน">โอนเงิน</option>
                    <option value="เช็ค">เช็ค</option>
                  </select>
                </div>
              </div>

              {formData.payment_method === 'โอนเงิน' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อธนาคาร</label>
                    <input
                      type="text"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="ชื่อธนาคาร"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่บัญชี</label>
                    <input
                      type="text"
                      value={formData.bank_account}
                      onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="เลขที่บัญชี"
                    />
                  </div>
                </div>
              )}

              {formData.payment_method === 'เช็ค' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่เช็ค</label>
                  <input
                    type="text"
                    value={formData.check_number}
                    onChange={(e) => setFormData({ ...formData, check_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="เลขที่เช็ค"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รายการ *</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="รายละเอียดการจ่ายเงิน"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนเงิน *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนเงินตัวอักษร</label>
                  <input
                    type="text"
                    value={formData.amount_in_words}
                    onChange={(e) => setFormData({ ...formData, amount_in_words: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="หนึ่งพันบาทถ้วน"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">อนุมัติโดย</label>
                <input
                  type="text"
                  value={formData.approved_by}
                  onChange={(e) => setFormData({ ...formData, approved_by: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="ชื่อผู้อนุมัติ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="flex-1"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                >
                  {editingVoucher ? 'บันทึกการแก้ไข' : 'บันทึก'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Print Modal */}
      {showPrintModal && printVoucher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[800px]">
            {/* Print Content - A4 Style */}
            <div ref={printRef} className="p-8 bg-white">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  {/* Logo */}
                  <div className="w-20 h-20 rounded-full border-2 border-gray-400 flex items-center justify-center bg-white">
                    <div className="text-center text-xs text-gray-600">
                      <div className="font-bold">Sa-ang</div>
                      <div className="text-[8px]">PHARMACY</div>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">หจก. สระอางพาณิชย์</h2>
                    <p className="text-sm text-gray-600">สำนักงานใหญ่</p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="flex gap-2 mb-1">
                    <span className="text-gray-600">เลขที่</span>
                    <span className="font-medium">{printVoucher.voucher_number}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-600">วันที่</span>
                    <span className="font-medium">{printVoucher.voucher_date}</span>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="bg-[#7B96B2]/15 py-2 px-4 mb-4">
                <h1 className="text-xl font-bold text-center text-gray-800">
                  ใบสำคัญจ่าย {printVoucher.voucher_number}
                </h1>
              </div>

              {/* Payee Info */}
              <div className="mb-6 text-sm">
                <div className="flex gap-2 mb-1">
                  <span className="text-gray-600">จ่ายให้ :</span>
                  <span className="font-medium">{printVoucher.payee_name}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-600">โดย :</span>
                  <span className="font-medium">S/A {printVoucher.payee_tax_id || '-'}</span>
                </div>
              </div>

              {/* Table */}
              <table className="w-full text-sm mb-6">
                <thead>
                  <tr className="border-b-2 border-gray-800">
                    <th className="py-2 px-2 text-left text-gray-600 font-normal">วันที่เอกสาร</th>
                    <th className="py-2 px-2 text-left text-gray-600 font-normal">รายการ</th>
                    <th className="py-2 px-2 text-left text-gray-600 font-normal">เลขที่เอกสาร</th>
                    <th className="py-2 px-2 text-right text-gray-600 font-normal">ยอดรับสินค้าหรือบริการ</th>
                    <th className="py-2 px-2 text-right text-gray-600 font-normal">ภาษีมูลค่าเพิ่ม</th>
                    <th className="py-2 px-2 text-right text-gray-600 font-normal">จำนวนเงินรวม</th>
                  </tr>
                </thead>
                <tbody>
                  {printLinkedExpenses.length > 0 ? (
                    printLinkedExpenses.map((exp, idx) => {
                      const vatAmt = exp.vat_amount || 0
                      const preVat = exp.amount - vatAmt
                      return (
                        <tr key={idx} className="border-b border-gray-300">
                          <td className="py-2 px-2">{exp.document_date || exp.expense_date || printVoucher.voucher_date}</td>
                          <td className="py-2 px-2">{exp.description}</td>
                          <td className="py-2 px-2">{exp.receipt_number || '-'}</td>
                          <td className="py-2 px-2 text-right">
                            {preVat.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {vatAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {exp.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr className="border-b border-gray-300">
                      <td className="py-2 px-2">{printVoucher.voucher_date}</td>
                      <td className="py-2 px-2">{printVoucher.description}</td>
                      <td className="py-2 px-2">{printVoucher.voucher_number}</td>
                      <td className="py-2 px-2 text-right">
                        {printVoucher.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-2 text-right">0.00</td>
                      <td className="py-2 px-2 text-right">
                        {printVoucher.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                  {(() => {
                    const totalAmt = printLinkedExpenses.length > 0
                      ? printLinkedExpenses.reduce((s: number, e: any) => s + (e.amount || 0), 0)
                      : printVoucher.amount
                    const totalVat = printLinkedExpenses.length > 0
                      ? printLinkedExpenses.reduce((s: number, e: any) => s + (e.vat_amount || 0), 0)
                      : 0
                    const totalPreVat = totalAmt - totalVat
                    return (
                      <tr className="border-t-2 border-gray-800 font-medium bg-gray-50">
                        <td className="py-2 px-2" colSpan={3}></td>
                        <td className="py-2 px-2 text-right">
                          {totalPreVat.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {totalVat.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {totalAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )
                  })()}
                </tbody>
              </table>

              {/* Notes and Summary */}
              <div className="flex justify-between mt-8 text-sm">
                {/* Left - Notes */}
                <div className="w-1/2 pr-8">
                  <div className="mb-3">
                    <span className="text-gray-600">หมายเหตุ :</span>
                    <div className="border-b border-gray-300 mt-1 h-6"></div>
                  </div>
                  <div className="mb-3">
                    <span className="text-gray-600">ผู้ติดต่อ</span>
                    <div className="border-b border-gray-300 mt-1 h-6"></div>
                  </div>
                  <div>
                    <span className="text-gray-600">อนุมัติ</span>
                    <div className="border-b border-gray-300 mt-1 h-6"></div>
                  </div>
                </div>

                {/* Right - Summary */}
                <div className="w-1/2 pl-8">
                  {(() => {
                    const totalAmt = printLinkedExpenses.length > 0
                      ? printLinkedExpenses.reduce((s: number, e: any) => s + (e.amount || 0), 0)
                      : printVoucher.amount
                    const totalVat = printLinkedExpenses.length > 0
                      ? printLinkedExpenses.reduce((s: number, e: any) => s + (e.vat_amount || 0), 0)
                      : 0
                    return (
                      <>
                        <div className="flex justify-between py-1 border-b border-gray-200">
                          <span className="text-gray-600">รวม</span>
                          <span>{totalAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-200">
                          <span className="text-gray-600">ภาษีหัก ณ ที่จ่าย</span>
                          <span>0.00</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-200">
                          <span className="text-gray-600">ภาษีมูลค่าเพิ่ม</span>
                          <span>{totalVat.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b-2 border-gray-800 font-medium">
                          <span>รวมทั้งสิ้น</span>
                          <span>{totalAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-4 border-t bg-gray-50 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-[#7B96B2] hover:bg-[#6A869F] text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" />
                พิมพ์
              </button>
              <button
                onClick={() => setShowPrintModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FA Sync Category Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Sync ใบสำคัญจ่ายไป FlowAccount</h3>
            <p className="text-sm text-gray-600 mb-4">
              เลือกหมวดหมู่ค่าใช้จ่ายใน FlowAccount สำหรับ {selectedSyncIds.size} รายการ
            </p>
            {loadingFaCategories ? (
              <p className="text-center text-gray-500 py-4">กำลังโหลดหมวดหมู่...</p>
            ) : faCategories.length === 0 ? (
              <p className="text-center text-red-500 py-4">ไม่พบหมวดหมู่จาก FlowAccount</p>
            ) : (
              <select
                value={selectedFaCategory?.categoryId || ''}
                onChange={(e) => {
                  const cat = faCategories.find(c => c.categoryId === e.target.value)
                  setSelectedFaCategory(cat)
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4"
              >
                {faCategories.map((cat, idx) => (
                  <option key={idx} value={cat.categoryId}>
                    {cat.nameLocal || cat.nameForeign || cat.categoryId}
                  </option>
                ))}
              </select>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowSyncModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSyncToFa}
                disabled={!selectedFaCategory || loadingFaCategories}
                className="flex-1 px-4 py-2 bg-[#2B9CD8] hover:bg-[#2488C0] disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                เริ่ม Sync
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Detail Modal */}
      {showExpenseDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[700px]">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">
                รายการค่าใช้จ่าย — {detailVoucherNumber}
              </h3>
              <button
                onClick={() => setShowExpenseDetail(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              {detailExpenses.length === 0 ? (
                <p className="text-center text-gray-500 py-6">ไม่พบรายการค่าใช้จ่ายที่เชื่อมโยง</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">วันที่</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">เลขที่ใบเสร็จ</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">รายการ</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">ผู้ขาย</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">หมวดหมู่</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">จำนวนเงิน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {detailExpenses.map((exp: any) => (
                        <tr key={exp.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap">
                            {exp.document_date
                              ? new Date(exp.document_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })
                              : exp.expense_date
                              ? new Date(exp.expense_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })
                              : '-'
                            }
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{exp.receipt_number || '-'}</td>
                          <td className="px-3 py-2">{exp.description}</td>
                          <td className="px-3 py-2 text-gray-600">{exp.vendor || '-'}</td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">{exp.category || '-'}</span>
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            ฿{(exp.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-800 font-medium bg-gray-50">
                        <td colSpan={5} className="px-3 py-2 text-right">รวม</td>
                        <td className="px-3 py-2 text-right">
                          ฿{detailExpenses.reduce((s: number, e: any) => s + (e.amount || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowExpenseDetail(false)}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
