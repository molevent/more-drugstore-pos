import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { Receipt, Plus, Search, Trash2, Edit2, Sheet, RefreshCw, Settings, Database, Clock, CheckCircle, XCircle, Percent, FileText } from 'lucide-react'

interface Expense {
  id: string
  expense_date: string
  category: string
  description: string
  amount: number
  payment_method: string
  receipt_number?: string
  vendor?: string
  notes?: string
  created_at: string
  status?: 'approved' | 'pending' | 'rejected'
  source?: 'manual' | 'google_sheets'
  // Google Sheets extended fields
  sheet_id?: string
  tax_invoice_number?: string
  document_type?: string
  quantity?: number
  unit_price?: number
  amount_before_tax?: number
  vat_amount?: number
  withholding_tax?: number
  payment_amount?: number
  product_type?: string
  subcategory?: string
  seller_tax_id?: string
  requester?: string
  evidence_url?: string
}

const EXPENSE_CATEGORIES = [
  'ค่าน้ำ',
  'ค่าไฟ',
  'ค่าเช่า',
  'ค่าซ่อมบำรุง',
  'ค่าอุปกรณ์สำนักงาน',
  'ค่าโฆษณา',
  'ค่าขนส่ง',
  'ค่าทำความสะอาด',
  'ค่าอื่นๆ'
]

const PAYMENT_METHODS = [
  'เงินสด',
  'โอนเงิน',
  'บัตรเครดิต',
  'เช็ค'
]

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  
  // Google Sheets states
  const [viewMode, setViewMode] = useState<'database' | 'sheets' | 'pending'>('database')
  const [sheetUrl, setSheetUrl] = useState('')
  const [sheetData, setSheetData] = useState<any[]>([])
  const [sheetLoading, setSheetLoading] = useState(false)
  const [showSheetSettings, setShowSheetSettings] = useState(false)
  const [sheetConfig, setSheetConfig] = useState({
    dateCol: 0,              // A: วันที่
    sheetIdCol: 1,           // B: ไอดี
    taxInvoiceCol: 2,        // C: เลขที่ใบกำกับภาษี
    docTypeCol: 3,           // D: ประเภทเอกสาร
    descriptionCol: 4,       // E: รายละเอียด
    quantityCol: 5,          // F: จำนวน
    unitPriceCol: 6,         // G: ราคาต่อหน่วย
    amountBeforeTaxCol: 7,   // H: ยอดรวมก่อนภาษี
    vatCol: 8,               // I: ภาษีมูลค่าเพิ่ม
    withholdingTaxCol: 9,    // J: ภาษีหัก ณ ที่จ่าย
    paymentAmountCol: 10,    // K: ยอดชำระ
    productTypeCol: 11,      // L: ประเภทสินค้า
    categoryCol: 12,         // M: หมวดหมู่
    subcategoryCol: 13,      // N: หมวดหมู่ย่อย
    vendorCol: 14,           // O: ผู้ขาย/ผู้ให้บริการ
    sellerTaxIdCol: 15,      // P: เลขประจำตัวผู้เสียภาษีของร้านค้า
    requesterCol: 16,        // Q: ผู้ขออนุญาตเบิกจ่าย
    evidenceCol: 17,         // R: หลักฐาน
    notesCol: 18,            // S: หมายเหตุ
    startRow: 4              // ข้อมูลเริ่มแถว 5
  })
  const [importing, setImporting] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  
  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    category: 'ค่าอื่นๆ',
    description: '',
    amount: '',
    payment_method: 'เงินสด',
    receipt_number: '',
    vendor: '',
    notes: ''
  })

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })

      if (error) throw error
      setExpenses(data || [])
      
      // Count pending expenses
      const pending = data?.filter(e => e.status === 'pending').length || 0
      setPendingCount(pending)
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const expenseData = {
        expense_date: formData.expense_date,
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount) || 0,
        payment_method: formData.payment_method,
        receipt_number: formData.receipt_number || null,
        vendor: formData.vendor || null,
        notes: formData.notes || null
      }

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert(expenseData)
        if (error) throw error
      }

      resetForm()
      setShowModal(false)
      fetchExpenses()
    } catch (error) {
      console.error('Error saving expense:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบรายการนี้?')) return
    
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
      if (error) throw error
      fetchExpenses()
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('เกิดข้อผิดพลาดในการลบ')
    }
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setFormData({
      expense_date: expense.expense_date,
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      payment_method: expense.payment_method,
      receipt_number: expense.receipt_number || '',
      vendor: expense.vendor || '',
      notes: expense.notes || ''
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      expense_date: new Date().toISOString().split('T')[0],
      category: 'ค่าอื่นๆ',
      description: '',
      amount: '',
      payment_method: 'เงินสด',
      receipt_number: '',
      vendor: '',
      notes: ''
    })
    setEditingExpense(null)
  }

  const filteredExpenses = expenses.filter(expense =>
    expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  // Pending expenses
  const pendingExpenses = expenses.filter(e => e.status === 'pending')
  const pendingTotalAmount = pendingExpenses.reduce((sum, e) => sum + e.amount, 0)

  // Google Sheets functions
  const fetchSheetData = async () => {
    if (!sheetUrl) {
      alert('กรุณาใส่ URL Google Sheet ก่อน')
      return
    }
    
    setSheetLoading(true)
    try {
      // Convert Google Sheet URL to CSV export URL
      const sheetId = extractSheetId(sheetUrl)
      if (!sheetId) {
        throw new Error('Invalid Google Sheet URL')
      }
      
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
      
      const response = await fetch(csvUrl)
      if (!response.ok) throw new Error('Failed to fetch sheet data')
      
      const csvText = await response.text()
      const rows = parseCSV(csvText)
      
      // Map CSV data to expense format - all 19 columns
      const mappedData = rows.slice(sheetConfig.startRow).map((row, index) => ({
        id: `sheet-${index}`,
        expense_date: formatDate(row[sheetConfig.dateCol] || ''),
        sheet_id: row[sheetConfig.sheetIdCol] || '',
        tax_invoice_number: row[sheetConfig.taxInvoiceCol] || '',
        document_type: row[sheetConfig.docTypeCol] || '',
        description: row[sheetConfig.descriptionCol] || '',
        quantity: parseFloat(row[sheetConfig.quantityCol]) || 0,
        unit_price: parseFloat(row[sheetConfig.unitPriceCol]) || 0,
        amount_before_tax: parseFloat(row[sheetConfig.amountBeforeTaxCol]) || 0,
        vat_amount: parseFloat(row[sheetConfig.vatCol]) || 0,
        withholding_tax: parseFloat(row[sheetConfig.withholdingTaxCol]) || 0,
        payment_amount: parseFloat(row[sheetConfig.paymentAmountCol]) || 0,
        amount: parseFloat(row[sheetConfig.paymentAmountCol]) || 0, // ใช้ยอดชำระเป็นหลัก
        product_type: row[sheetConfig.productTypeCol] || '',
        category: row[sheetConfig.categoryCol] || 'ค่าอื่นๆ',
        subcategory: row[sheetConfig.subcategoryCol] || '',
        vendor: row[sheetConfig.vendorCol] || '',
        seller_tax_id: row[sheetConfig.sellerTaxIdCol] || '',
        requester: row[sheetConfig.requesterCol] || '',
        evidence_url: row[sheetConfig.evidenceCol] || '',
        notes: row[sheetConfig.notesCol] || '',
        payment_method: 'เงินสด', // ไม่มีคอลัมน์ใน Sheet, ใช้ค่า default
        _isSheetData: true
      })).filter(item => item.description && item.amount > 0)
      
      setSheetData(mappedData)
    } catch (error) {
      console.error('Error fetching sheet:', error)
      alert('ไม่สามารถดึงข้อมูลจาก Google Sheet ได้ ตรวจสอบว่า Sheet ถูก Publish แล้ว')
    } finally {
      setSheetLoading(false)
    }
  }

  const extractSheetId = (url: string): string | null => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    return match ? match[1] : null
  }

  const parseCSV = (text: string): string[][] => {
    const lines = text.trim().split('\n')
    return lines.map(line => {
      const result: string[] = []
      let current = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    })
  }

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0]
    
    // Try parsing Thai date format (DD/MM/YYYY)
    const thaiMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (thaiMatch) {
      const [, day, month, year] = thaiMatch
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    
    // Try ISO format
    const isoMatch = dateStr.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
    if (isoMatch) {
      const [, year, month, day] = isoMatch
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    
    return new Date().toISOString().split('T')[0]
  }

  const importSheetToDatabase = async () => {
    if (sheetData.length === 0) {
      alert('ไม่มีข้อมูลให้ import')
      return
    }
    
    setImporting(true)
    try {
      const expensesToInsert = sheetData.map(item => ({
        expense_date: item.expense_date,
        category: item.category,
        description: item.description,
        amount: item.amount,
        payment_method: item.payment_method,
        vendor: item.vendor || null,
        notes: item.notes || null,
        status: 'pending',
        source: 'google_sheets',
        // Google Sheets extended fields
        sheet_id: item.sheet_id || null,
        tax_invoice_number: item.tax_invoice_number || null,
        document_type: item.document_type || null,
        quantity: item.quantity || null,
        unit_price: item.unit_price || null,
        amount_before_tax: item.amount_before_tax || null,
        vat_amount: item.vat_amount || null,
        withholding_tax: item.withholding_tax || null,
        payment_amount: item.payment_amount || null,
        product_type: item.product_type || null,
        subcategory: item.subcategory || null,
        seller_tax_id: item.seller_tax_id || null,
        requester: item.requester || null,
        evidence_url: item.evidence_url || null
      }))
      
      const { error } = await supabase.from('expenses').insert(expensesToInsert)
      if (error) throw error
      
      alert(`Import สำเร็จ! เพิ่ม ${expensesToInsert.length} รายการเข้าโซนรออนุมัติ`)
      fetchExpenses()
      setViewMode('database')
    } catch (error) {
      console.error('Error importing:', error)
      alert('เกิดข้อผิดพลาดในการ import')
    } finally {
      setImporting(false)
    }
  }

  const sheetTotalAmount = sheetData.reduce((sum, item) => sum + item.amount, 0)

  // Approval functions
  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ status: 'approved' })
        .eq('id', id)
      
      if (error) throw error
      fetchExpenses()
    } catch (error) {
      console.error('Error approving:', error)
      alert('เกิดข้อผิดพลาดในการอนุมัติ')
    }
  }

  const handleReject = async (id: string) => {
    if (!confirm('ต้องการปฏิเสธรายการนี้?')) return
    
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ status: 'rejected' })
        .eq('id', id)
      
      if (error) throw error
      fetchExpenses()
    } catch (error) {
      console.error('Error rejecting:', error)
      alert('เกิดข้อผิดพลาดในการปฏิเสธ')
    }
  }

  const handleApproveAll = async () => {
    if (!confirm(`ต้องการอนุมัติทั้งหมด ${pendingExpenses.length} รายการ?`)) return
    
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ status: 'approved' })
        .eq('status', 'pending')
      
      if (error) throw error
      fetchExpenses()
      alert('อนุมัติทั้งหมดสำเร็จ!')
    } catch (error) {
      console.error('Error approving all:', error)
      alert('เกิดข้อผิดพลาดในการอนุมัติ')
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="h-7 w-7 text-blue-600" />
            ค่าใช้จ่าย
          </h1>
          <p className="text-gray-600 mt-1">บันทึกและติดตามค่าใช้จ่ายต่างๆ ของร้าน</p>
        </div>
        <div className="flex gap-2">
          <Link 
            to="/payment-vouchers"
            className="flex items-center gap-3 px-5 py-3 bg-purple-50 rounded-full border border-purple-200 hover:bg-purple-100 hover:shadow-md transition-all"
          >
            <FileText className="h-6 w-6 text-gray-900" />
            <span className="font-semibold text-gray-900">ใบสำคัญจ่าย</span>
          </Link>
          <Link 
            to="/withholding-tax"
            className="flex items-center gap-3 px-5 py-3 bg-blue-50 rounded-full border border-blue-200 hover:bg-blue-100 hover:shadow-md transition-all"
          >
            <Percent className="h-6 w-6 text-gray-900" />
            <span className="font-semibold text-gray-900">หัก ณ ที่จ่าย</span>
          </Link>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setViewMode('database')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'database'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Database className="h-4 w-4" />
          ฐานข้อมูล
        </button>
        <button
          onClick={() => setViewMode('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'pending'
              ? 'bg-yellow-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Clock className="h-4 w-4" />
          รออนุมัติ
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setViewMode('sheets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'sheets'
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Sheet className="h-4 w-4" />
          Google Sheets
        </button>
      </div>

      {/* Summary Card */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-600 font-medium">
              ค่าใช้จ่ายทั้งหมด {viewMode === 'sheets' && '(จาก Google Sheet)'}
            </p>
            <p className="text-3xl font-bold text-blue-900">
              ฿{(viewMode === 'database' ? totalAmount : sheetTotalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">จำนวนรายการ</p>
            <p className="text-xl font-semibold text-gray-800">
              {viewMode === 'database' ? filteredExpenses.length : sheetData.length}
            </p>
          </div>
        </div>
      </Card>

      {/* Actions Bar - Database View */}
      {viewMode === 'database' && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <div className="flex items-center gap-2 bg-[#E8EBF0] rounded-full px-4 py-3 border border-transparent focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหารายการ..."
                className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-base"
              />
            </div>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มค่าใช้จ่าย
          </Button>
        </div>
      )}

      {/* Actions Bar - Google Sheets View */}
      {viewMode === 'sheets' && (
        <Card className="mb-6 border-green-200">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Sheet className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">เชื่อมต่อ Google Sheets</h3>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="วางลิงค์ Google Sheet (เช่น https://docs.google.com/spreadsheets/d/...)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ต้อง Publish Google Sheet ก่อน: File → Share → Publish to web
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowSheetSettings(!showSheetSettings)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  ตั้งค่า
                </Button>
                <Button
                  variant="primary"
                  onClick={fetchSheetData}
                  disabled={sheetLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${sheetLoading ? 'animate-spin' : ''}`} />
                  {sheetLoading ? 'กำลังโหลด...' : 'ดึงข้อมูล'}
                </Button>
              </div>
            </div>

            {/* Sheet Column Settings */}
            {showSheetSettings && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <h4 className="font-medium text-gray-700">ตั้งค่าคอลัมน์ Google Sheets (เริ่มจาก 0)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">A: วันที่</label>
                    <input type="number" value={sheetConfig.dateCol} onChange={(e) => setSheetConfig({...sheetConfig, dateCol: parseInt(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">B: ไอดี</label>
                    <input type="number" value={sheetConfig.sheetIdCol} onChange={(e) => setSheetConfig({...sheetConfig, sheetIdCol: parseInt(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">C: เลขที่ใบกำกับภาษี</label>
                    <input type="number" value={sheetConfig.taxInvoiceCol} onChange={(e) => setSheetConfig({...sheetConfig, taxInvoiceCol: parseInt(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">D: ประเภทเอกสาร</label>
                    <input type="number" value={sheetConfig.docTypeCol} onChange={(e) => setSheetConfig({...sheetConfig, docTypeCol: parseInt(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">E: รายละเอียด</label>
                    <input type="number" value={sheetConfig.descriptionCol} onChange={(e) => setSheetConfig({...sheetConfig, descriptionCol: parseInt(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">F: จำนวน</label>
                    <input type="number" value={sheetConfig.quantityCol} onChange={(e) => setSheetConfig({...sheetConfig, quantityCol: parseInt(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">G: ราคาต่อหน่วย</label>
                    <input type="number" value={sheetConfig.unitPriceCol} onChange={(e) => setSheetConfig({...sheetConfig, unitPriceCol: parseInt(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">H: ยอดรวมก่อนภาษี</label>
                    <input type="number" value={sheetConfig.amountBeforeTaxCol} onChange={(e) => setSheetConfig({...sheetConfig, amountBeforeTaxCol: parseInt(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">I: ภาษีมูลค่าเพิ่ม</label>
                    <input type="number" value={sheetConfig.vatCol} onChange={(e) => setSheetConfig({...sheetConfig, vatCol: parseInt(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">J: ภาษีหัก ณ ที่จ่าย</label>
                    <input type="number" value={sheetConfig.withholdingTaxCol} onChange={(e) => setSheetConfig({...sheetConfig, withholdingTaxCol: parseInt(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">K: ยอดชำระ</label>
                    <input type="number" value={sheetConfig.paymentAmountCol} onChange={(e) => setSheetConfig({...sheetConfig, paymentAmountCol: parseInt(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">L: ประเภทสินค้า</label>
                    <input type="number" value={sheetConfig.productTypeCol} onChange={(e) => setSheetConfig({...sheetConfig, productTypeCol: parseInt(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">M: หมวดหมู่</label>
                    <input type="number" value={sheetConfig.categoryCol} onChange={(e) => setSheetConfig({...sheetConfig, categoryCol: parseInt(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">N: หมวดหมู่ย่อย</label>
                    <input type="number" value={sheetConfig.subcategoryCol} onChange={(e) => setSheetConfig({...sheetConfig, subcategoryCol: parseInt(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">O: ผู้ขาย</label>
                    <input type="number" value={sheetConfig.vendorCol} onChange={(e) => setSheetConfig({...sheetConfig, vendorCol: parseInt(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">P: เลขผู้เสียภาษี</label>
                    <input type="number" value={sheetConfig.sellerTaxIdCol} onChange={(e) => setSheetConfig({...sheetConfig, sellerTaxIdCol: parseInt(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Q: ผู้ขอเบิก</label>
                    <input type="number" value={sheetConfig.requesterCol} onChange={(e) => setSheetConfig({...sheetConfig, requesterCol: parseInt(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">R: หลักฐาน</label>
                    <input type="number" value={sheetConfig.evidenceCol} onChange={(e) => setSheetConfig({...sheetConfig, evidenceCol: parseInt(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">S: หมายเหตุ</label>
                    <input type="number" value={sheetConfig.notesCol} onChange={(e) => setSheetConfig({...sheetConfig, notesCol: parseInt(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-600">แถวเริ่มต้นข้อมูล (ข้ามหัวตาราง)</label>
                  <input type="number" value={sheetConfig.startRow} onChange={(e) => setSheetConfig({...sheetConfig, startRow: parseInt(e.target.value)})} className="w-24 px-2 py-1 border rounded text-sm" />
                </div>
              </div>
            )}

            {/* Import Button */}
            {sheetData.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm text-green-800 font-medium">
                    พบ {sheetData.length} รายการจาก Google Sheet
                  </p>
                  <p className="text-xs text-green-600">
                    ยอดรวม: ฿{sheetTotalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={importSheetToDatabase}
                  disabled={importing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {importing ? 'กำลัง import...' : 'Import ลง Database'}
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Expenses List - Database View */}
      {viewMode === 'database' && (
        <Card>
          {loading ? (
            <p className="text-center text-gray-600 py-8">กำลังโหลด...</p>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">ไม่มีรายการค่าใช้จ่าย</p>
              <p className="text-sm text-gray-500 mt-1">คลิก "เพิ่มค่าใช้จ่าย" เพื่อบันทึก</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">วันที่</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">หมวดหมู่</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">รายการ</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ผู้จำหน่าย</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">จำนวนเงิน</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">การชำระเงิน</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(expense.expense_date).toLocaleDateString('th-TH')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{expense.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{expense.vendor || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                        ฿{expense.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">
                        {expense.payment_method}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
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
      )}

      {/* Pending Approval View */}
      {viewMode === 'pending' && (
        <Card>
          {loading ? (
            <p className="text-center text-gray-600 py-8">กำลังโหลด...</p>
          ) : pendingExpenses.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">ไม่มีรายการรออนุมัติ</p>
              <p className="text-sm text-gray-500 mt-1">ข้อมูลจาก Google Sheets จะแสดงที่นี่</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">
                    พบ {pendingExpenses.length} รายการรออนุมัติ
                  </p>
                  <p className="text-lg font-bold text-yellow-600">
                    ยอดรวม: ฿{pendingTotalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={handleApproveAll}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  อนุมัติทั้งหมด
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-yellow-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">วันที่</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">หมวดหมู่</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">รายการ</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ผู้ขาย</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">จำนวนเงิน</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">การชำระเงิน</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pendingExpenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-yellow-50/50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(expense.expense_date).toLocaleDateString('th-TH')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <span className="px-2 py-1 bg-yellow-100 rounded-full text-xs">
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{expense.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{expense.vendor || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                          ฿{expense.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">
                          {expense.payment_method}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleApprove(expense.id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="อนุมัติ"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleReject(expense.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="ปฏิเสธ"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Google Sheets Data View */}
      {viewMode === 'sheets' && (
        <Card>
          {sheetData.length === 0 ? (
            <div className="text-center py-12">
              <Sheet className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">ยังไม่มีข้อมูลจาก Google Sheet</p>
              <p className="text-sm text-gray-500 mt-1">
                ใส่ URL แล้วกด "ดึงข้อมูล" เพื่อแสดงข้อมูลจาก Google Sheet
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-green-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">วันที่</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">หมวดหมู่</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">รายการ</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ผู้จำหน่าย</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">จำนวนเงิน</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">การชำระเงิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sheetData.map((item, index) => (
                    <tr key={index} className="hover:bg-green-50/50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(item.expense_date).toLocaleDateString('th-TH')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <span className="px-2 py-1 bg-green-100 rounded-full text-xs">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.vendor || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                        ฿{item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">
                        {item.payment_method}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingExpense ? 'แก้ไขค่าใช้จ่าย' : 'เพิ่มค่าใช้จ่าย'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ *</label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่ *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รายการ *</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="เช่น ค่าไฟเดือนมกราคม"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนเงิน *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วิธีชำระเงิน *</label>
                  <select
                    required
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {PAYMENT_METHODS.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ผู้จำหน่าย/ร้านค้า</label>
                <input
                  type="text"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="เช่น การไฟฟ้า, ประปา"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่ใบเสร็จ/ใบกำกับภาษี</label>
                <input
                  type="text"
                  value={formData.receipt_number}
                  onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                  placeholder="INV-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="รายละเอียดเพิ่มเติม..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button type="submit" variant="primary" className="flex-1">
                  {editingExpense ? 'บันทึกการแก้ไข' : 'บันทึก'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowModal(false)}
                  className="flex-1"
                >
                  ยกเลิก
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
