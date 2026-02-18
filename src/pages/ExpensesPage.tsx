import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { Receipt, Plus, Search, Trash2, Edit2, Sheet, RefreshCw, Settings, Database, Clock, CheckCircle, XCircle, Percent, FileText, ShoppingCart, BookOpen, Wallet } from 'lucide-react'

interface Expense {
  id: string
  expense_date: string
  category: string
  description: string
  amount: number
  payment_method: string
  receipt_number?: string
  delivery_number?: string
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
  payment_voucher_id?: string
  withholding_mode?: string
  withholding_percent?: string
  evidence_url?: string
}

interface Contact {
  id: string
  name: string
  type: 'customer' | 'seller' | 'both'
  phone?: string
  email?: string
  address?: string
  tax_id?: string
  notes?: string
  created_at?: string
}

const PAYMENT_METHODS = [
  'เงินสด',
  'โอนเงิน',
  'บัตรเครดิต',
  'เช็ค'
]

export default function ExpensesPage() {
  const navigate = useNavigate()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  
  // Form tab state for expense edit modal
  const [expenseFormTab, setExpenseFormTab] = useState<'basic' | 'extended'>('basic')
  
  // Google Sheets states
  const [viewMode, setViewMode] = useState<'database' | 'sheets' | 'pending'>('database')
  const [sheetUrl, setSheetUrl] = useState('https://docs.google.com/spreadsheets/d/1XShDiX-121PdeNgpsF_dxdsjZDEQ574GUS6_yaQRnRk/edit?gid=109620470#gid=109620470')
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
  const [selectedSheetItems, setSelectedSheetItems] = useState<Set<number>>(new Set())
  const [existingSheetIds, setExistingSheetIds] = useState<Set<string>>(new Set())
  const [sheetSearchTerm, setSheetSearchTerm] = useState('')
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [paymentMethodRules, setPaymentMethodRules] = useState<{keyword: string, payment_method: string}[]>([])
  const [expenseCategories, setExpenseCategories] = useState<any[]>([])
  const [paymentMethods, setPaymentMethods] = useState<string[]>([])
  
  // Fetch payment method rules
  const fetchPaymentMethodRules = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_method_rules')
        .select('keyword, payment_method')
        .eq('is_active', true)
        .order('priority', { ascending: false })
      
      if (error) {
        console.error('Error fetching payment method rules:', error)
        return
      }
      
      setPaymentMethodRules(data || [])
    } catch (error) {
      console.error('Error fetching payment method rules:', error)
    }
  }
  
  // Auto-select payment method based on description
  const autoSelectPaymentMethod = (description: string) => {
    if (!description || paymentMethodRules.length === 0) return
    
    const lowerDesc = description.toLowerCase()
    for (const rule of paymentMethodRules) {
      if (lowerDesc.includes(rule.keyword.toLowerCase())) {
        setFormData(prev => ({ ...prev, payment_method: rule.payment_method }))
        return
      }
    }
  }
  
  // Fetch existing sheet IDs to prevent duplicate imports
  const fetchExistingSheetIds = async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select('sheet_id')
      .not('sheet_id', 'is', null)
    
    if (error) {
      console.error('Error fetching existing sheet IDs:', error)
      return
    }
    
    const sheetIds = new Set(data?.map(e => e.sheet_id).filter(Boolean) || [])
    setExistingSheetIds(sheetIds)
  }

  // Fetch expense categories from database
  const fetchExpenseCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      setExpenseCategories(data || [])
    } catch (error) {
      console.error('Error fetching expense categories:', error)
    }
  }

  // Fetch payment methods from database
  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('name')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      setPaymentMethods(data?.map(pm => pm.name) || [])
    } catch (error) {
      console.error('Error fetching payment methods:', error)
    }
  }

  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    category: 'ค่าอื่นๆ',
    description: '',
    amount: '',
    payment_method: 'เงินสด',
    receipt_number: '',
    delivery_number: '',
    vendor: '',
    notes: '',
    has_invoice: 'no',
    // Google Sheets extended fields
    sheet_id: '',
    tax_invoice_number: '',
    document_type: '',
    quantity: '',
    unit_price: '',
    amount_before_tax: '',
    vat_amount: '',
    withholding_tax: '',
    withholding_mode: '',
    withholding_percent: '',
    payment_amount: '',
    product_type: '',
    subcategory: '',
    seller_tax_id: '',
    requester: '',
    evidence_url: ''
  })

  useEffect(() => {
    fetchExpenses()
    fetchContacts()
    fetchPaymentMethodRules()
    fetchExpenseCategories()
    fetchPaymentMethods()
  }, [])

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })

      if (error) throw error
      console.log('Fetched expenses:', data?.length, 'items')
      console.log('Sample expense data:', data?.[0])
      console.log('Expenses with payment_voucher_id:', data?.filter(e => e.payment_voucher_id).map(e => ({id: e.id, desc: e.description, pvid: e.payment_voucher_id})))
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

  // Fetch contacts that are sellers or both (can supply products/services)
  const fetchContacts = async () => {
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .in('type', ['seller', 'both'])
      .order('name')
    if (data) setContacts(data)
  }

  // Helper function to generate payment voucher number
  const generateVoucherNumber = async (date: string): Promise<string> => {
    const dateObj = new Date(date)
    const yy = String(dateObj.getFullYear()).slice(-2)
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
    const dd = String(dateObj.getDate()).padStart(2, '0')
    const datePrefix = `PV-${yy}${mm}${dd}`
    
    // Count existing vouchers with same date prefix
    const { data, error } = await supabase
      .from('payment_vouchers')
      .select('voucher_number')
      .ilike('voucher_number', `${datePrefix}-%`)
      .order('voucher_number', { ascending: false })
      .limit(1)
    
    if (error) {
      console.error('Error fetching existing vouchers:', error)
    }
    
    let sequence = 1
    if (data && data.length > 0) {
      const lastNumber = data[0].voucher_number
      const lastSequence = parseInt(lastNumber.split('-')[2]) || 0
      sequence = lastSequence + 1
    }
    
    return `${datePrefix}-${String(sequence).padStart(3, '0')}`
  }

  // Helper function to check if expense has complete data for auto-generating payment voucher
  const shouldAutoGenerateVoucher = (): boolean => {
    return !!(
      formData.expense_date &&
      formData.description &&
      formData.amount &&
      parseFloat(formData.amount) > 0 &&
      formData.payment_method &&
      formData.vendor
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const expenseData: any = {
        expense_date: formData.expense_date,
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount) || 0,
        payment_method: formData.payment_method,
        receipt_number: formData.receipt_number || null,
        delivery_number: formData.delivery_number || null,
        vendor: formData.vendor || null,
        notes: formData.notes || null,
        // Google Sheets extended fields
        sheet_id: formData.sheet_id || null,
        tax_invoice_number: formData.tax_invoice_number || null,
        document_type: formData.document_type || null,
        quantity: parseFloat(formData.quantity) || null,
        unit_price: parseFloat(formData.unit_price) || null,
        amount_before_tax: parseFloat(formData.amount_before_tax) || null,
        vat_amount: parseFloat(formData.vat_amount) || null,
        withholding_tax: parseFloat(formData.withholding_tax) || null,
        withholding_mode: formData.withholding_mode || null,
        withholding_percent: formData.withholding_percent || null,
        payment_amount: parseFloat(formData.payment_amount) || null,
        product_type: formData.product_type || null,
        subcategory: formData.subcategory || null,
        seller_tax_id: formData.seller_tax_id || null,
        requester: formData.requester || null,
        evidence_url: formData.evidence_url || null
      }

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id)
        if (error) throw error
      } else {
        // Check if we should auto-generate payment voucher
        const shouldGenerateVoucher = shouldAutoGenerateVoucher()
        
        if (shouldGenerateVoucher) {
          // Generate voucher number
          const voucherNumber = await generateVoucherNumber(formData.expense_date)
          
          // Create payment voucher data
          const voucherData = {
            voucher_number: voucherNumber,
            voucher_date: formData.expense_date,
            description: formData.description,
            amount: parseFloat(formData.amount) || 0,
            payment_method: formData.payment_method,
            payee_name: formData.vendor || null,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          // Insert payment voucher first
          const { data: voucherResult, error: voucherError } = await supabase
            .from('payment_vouchers')
            .insert(voucherData)
            .select('id')
            .single()
          
          if (voucherError) {
            console.error('Error creating payment voucher:', voucherError)
            // Continue with expense creation even if voucher creation fails
          } else if (voucherResult) {
            // Add payment_voucher_id to expense data
            expenseData.payment_voucher_id = voucherResult.id
          }
        }
        
        const { error } = await supabase
          .from('expenses')
          .insert(expenseData)
        if (error) throw error
        
        // Show success message if voucher was created
        if (shouldGenerateVoucher) {
          alert('บันทึกค่าใช้จ่ายสำเร็จ และสร้างใบสำคัญจ่ายอัตโนมัติเรียบร้อยแล้ว')
        }
      }

      resetForm()
      setShowModal(false)
      fetchExpenses()
    } catch (error: any) {
      console.error('Error saving expense:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + (error.message || error.details || 'Unknown error'))
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
    setSelectedShortcutCategory(null) // Reset shortcut category when editing
    setFormData({
      expense_date: expense.expense_date,
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      payment_method: expense.payment_method,
      receipt_number: expense.receipt_number || '',
      delivery_number: expense.delivery_number || '',
      vendor: expense.vendor || '',
      notes: expense.notes || '',
      has_invoice: 'no',
      // Google Sheets extended fields
      sheet_id: expense.sheet_id || '',
      tax_invoice_number: expense.tax_invoice_number || '',
      document_type: expense.document_type || '',
      quantity: expense.quantity?.toString() || '',
      unit_price: expense.unit_price?.toString() || '',
      amount_before_tax: expense.amount_before_tax?.toString() || '',
      vat_amount: expense.vat_amount?.toString() || '',
      withholding_tax: expense.withholding_tax?.toString() || '',
      withholding_mode: expense.withholding_mode || '',
      withholding_percent: expense.withholding_percent || '',
      payment_amount: expense.payment_amount?.toString() || '',
      product_type: expense.product_type || '',
      subcategory: expense.subcategory || '',
      seller_tax_id: expense.seller_tax_id || '',
      requester: expense.requester || '',
      evidence_url: expense.evidence_url || ''
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
      delivery_number: '',
      vendor: '',
      notes: '',
      has_invoice: 'no',
      // Google Sheets extended fields
      sheet_id: '',
      tax_invoice_number: '',
      document_type: '',
      quantity: '',
      unit_price: '',
      amount_before_tax: '',
      vat_amount: '',
      withholding_tax: '',
      withholding_mode: '',
      withholding_percent: '',
      payment_amount: '',
      product_type: '',
      subcategory: '',
      seller_tax_id: '',
      requester: '',
      evidence_url: ''
    })
    setEditingExpense(null)
  }

  const [selectedShortcutCategory, setSelectedShortcutCategory] = useState<string | null>(null)

  // Payment Voucher Modal states
  const [showPaymentVoucherModal, setShowPaymentVoucherModal] = useState(false)
  const [paymentVoucherForm, setPaymentVoucherForm] = useState({
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

  const createExpenseWithCategory = (category: string, description: string = '') => {
    resetForm()
    setSelectedShortcutCategory(category)
    setFormData(prev => ({
      ...prev,
      category,
      description: description || category
    }))
    setShowModal(true)
  }

  // Expense shortcuts configuration
  const expenseShortcuts = [
    { name: 'ค่า Service Fee Grab', category: 'ค่า Service Fee Grab', color: 'bg-green-600', icon: 'Grab' },
    { name: 'ค่าของใช้ - วัสดุสำนักงาน', category: 'ค่าของใช้ - วัสดุสำนักงาน', color: 'bg-teal-600', icon: 'Office' },
    { name: 'ค่าเช่าสำนักงาน', category: 'ค่าเช่าสำนักงาน', color: 'bg-teal-500', icon: 'Building' },
    { name: 'ค่าธรรมเนียม Kbank', category: 'ค่าธรรมเนียม Kbank', color: 'bg-green-500', icon: 'Bank' },
    { name: 'ค่าธรรมเนียม Lazada', category: 'ค่าธรรมเนียม Lazada', color: 'bg-orange-500', icon: 'Shopping' },
    { name: 'ค่าธรรมเนียม LINE SHOPPING', category: 'ค่าธรรมเนียม LINE SHOPPING', color: 'bg-orange-600', icon: 'Shopping' },
    { name: 'ค่าน้ำ', category: 'ค่าน้ำ', color: 'bg-blue-500', icon: 'Droplet' },
    { name: 'ค่าบัญชี', category: 'ค่าบัญชี', color: 'bg-blue-600', icon: 'Calculator' },
    { name: 'ค่าไฟฟ้า', category: 'ค่าไฟฟ้า', color: 'bg-rose-500', icon: 'Zap' },
    { name: 'ค่าส่ง ปณ. [EMS]', category: 'ค่าส่ง ปณ. [EMS]', color: 'bg-rose-600', icon: 'Truck' },
    { name: 'ซื้อสินค้า', category: 'ซื้อสินค้า', color: 'bg-pink-500', icon: 'Package' },
    { name: 'อุปกรณ์สำนักงาน', category: 'อุปกรณ์สำนักงาน', color: 'bg-pink-600', icon: 'Monitor' },
  ]

  // Generate payment voucher number
  const generatePaymentVoucherNumber = async (date: string): Promise<string> => {
    const dateObj = new Date(date)
    const yy = String(dateObj.getFullYear()).slice(-2)
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
    const dd = String(dateObj.getDate()).padStart(2, '0')
    const datePrefix = `PV-${yy}${mm}${dd}`
    
    const { data, error } = await supabase
      .from('payment_vouchers')
      .select('voucher_number')
      .ilike('voucher_number', `${datePrefix}-%`)
      .order('voucher_number', { ascending: false })
      .limit(1)
    
    if (error) {
      console.error('Error fetching existing vouchers:', error)
    }
    
    let sequence = 1
    if (data && data.length > 0) {
      const lastNumber = data[0].voucher_number
      const lastSequence = parseInt(lastNumber.split('-')[2]) || 0
      sequence = lastSequence + 1
    }
    
    return `${datePrefix}-${String(sequence).padStart(3, '0')}`
  }

  // Open payment voucher modal with pre-filled data from expense
  const openPaymentVoucherModal = async () => {
    const voucherNumber = await generatePaymentVoucherNumber(formData.expense_date)
    
    setPaymentVoucherForm({
      voucher_date: formData.expense_date,
      voucher_number: voucherNumber,
      payee_name: formData.vendor || '',
      payee_tax_id: formData.seller_tax_id || '',
      amount: formData.amount || '',
      amount_in_words: '',
      description: formData.description || '',
      payment_method: formData.payment_method || 'เงินสด',
      bank_name: '',
      bank_account: '',
      check_number: '',
      approved_by: '',
      notes: formData.notes || ''
    })
    
    setShowPaymentVoucherModal(true)
  }

  // Reset payment voucher form
  const resetPaymentVoucherForm = () => {
    setPaymentVoucherForm({
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
  }

  // Handle save payment voucher
  const handleSavePaymentVoucher = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const voucherData = {
        voucher_date: paymentVoucherForm.voucher_date,
        voucher_number: paymentVoucherForm.voucher_number,
        payee_name: paymentVoucherForm.payee_name,
        payee_tax_id: paymentVoucherForm.payee_tax_id || null,
        amount: parseFloat(paymentVoucherForm.amount) || 0,
        amount_in_words: paymentVoucherForm.amount_in_words || null,
        description: paymentVoucherForm.description,
        payment_method: paymentVoucherForm.payment_method,
        bank_name: paymentVoucherForm.bank_name || null,
        bank_account: paymentVoucherForm.bank_account || null,
        check_number: paymentVoucherForm.check_number || null,
        approved_by: paymentVoucherForm.approved_by || null,
        notes: paymentVoucherForm.notes || null
      }

      const { error } = await supabase
        .from('payment_vouchers')
        .insert([voucherData])
      
      if (error) throw error

      setShowPaymentVoucherModal(false)
      resetPaymentVoucherForm()
      alert('สร้างใบสำคัญจ่ายสำเร็จ!')
    } catch (error) {
      console.error('Error saving voucher:', error)
      alert('เกิดข้อผิดพลาดในการบันทึกใบสำคัญจ่าย')
    }
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

  // Waiting for receipt (have delivery_number but no receipt_number)
  const waitingReceiptExpenses = expenses.filter(e => !e.receipt_number && e.delivery_number)
  const waitingReceiptCount = waitingReceiptExpenses.length
  const waitingReceiptAmount = waitingReceiptExpenses.reduce((sum, e) => sum + e.amount, 0)

  // Waiting for payment voucher (approved but no payment_voucher created)
  const waitingPaymentExpenses = expenses.filter(e => e.status === 'approved' && !e.payment_voucher_id)
  const waitingPaymentCount = waitingPaymentExpenses.length
  const waitingPaymentAmount = waitingPaymentExpenses.reduce((sum, e) => sum + e.amount, 0)

  // Google Sheets functions
  const fetchSheetData = async () => {
    if (!sheetUrl) {
      alert('กรุณาใส่ URL Google Sheet ก่อน')
      return
    }
    
    setSheetLoading(true)
    try {
      // Fetch expense categories for keyword matching
      const { data: categories } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)

      // Fetch existing sheet IDs to check for duplicates
      await fetchExistingSheetIds()

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
      
      // Helper function to find matching category using keywords
      const findCategoryByKeywords = (sheetCategory: string, sheetSubcategory: string, description: string): string => {
        if (!categories || categories.length === 0) return 'ค่าอื่นๆ'
        
        const searchText = `${sheetCategory} ${sheetSubcategory} ${description}`.toLowerCase()
        
        // First try exact match
        const exactMatch = categories.find(cat => 
          sheetCategory.toLowerCase().includes(cat.name.toLowerCase()) ||
          cat.name.toLowerCase().includes(sheetCategory.toLowerCase())
        )
        if (exactMatch) return exactMatch.name
        
        // Then try keyword matching
        for (const cat of categories) {
          if (cat.keywords) {
            const keywordList = cat.keywords.split(',').map((k: string) => k.trim().toLowerCase())
            for (const keyword of keywordList) {
              if (keyword && searchText.includes(keyword)) {
                return cat.name
              }
            }
          }
        }
        
        return 'ค่าอื่นๆ'
      }
      
      // Map CSV data to expense format - all 19 columns
      const mappedData = rows.slice(sheetConfig.startRow).map((row, index) => {
        const sheetCategory = row[sheetConfig.categoryCol] || ''
        const sheetSubcategory = row[sheetConfig.subcategoryCol] || ''
        const description = row[sheetConfig.descriptionCol] || ''
        const matchedCategory = findCategoryByKeywords(sheetCategory, sheetSubcategory, description)
        
        return {
          id: `sheet-${index}`,
          expense_date: formatDate(row[sheetConfig.dateCol] || ''),
          sheet_id: row[sheetConfig.sheetIdCol] || '',
          tax_invoice_number: row[sheetConfig.taxInvoiceCol] || '',
          document_type: row[sheetConfig.docTypeCol] || '',
          description: description,
          quantity: parseFloat(row[sheetConfig.quantityCol]) || 0,
          unit_price: parseFloat(row[sheetConfig.unitPriceCol]) || 0,
          amount_before_tax: parseFloat(row[sheetConfig.amountBeforeTaxCol]) || 0,
          vat_amount: parseFloat(row[sheetConfig.vatCol]) || 0,
          withholding_tax: parseFloat(row[sheetConfig.withholdingTaxCol]) || 0,
          payment_amount: parseFloat(row[sheetConfig.paymentAmountCol]) || 0,
          amount: parseFloat(row[sheetConfig.paymentAmountCol]) || 0,
          product_type: row[sheetConfig.productTypeCol] || '',
          category: matchedCategory,
          subcategory: sheetSubcategory,
          vendor: row[sheetConfig.vendorCol] || '',
          seller_tax_id: row[sheetConfig.sellerTaxIdCol] || '',
          requester: row[sheetConfig.requesterCol] || '',
          evidence_url: row[sheetConfig.evidenceCol] || '',
          notes: row[sheetConfig.notesCol] || '',
          payment_method: 'เงินสด',
          _isSheetData: true
        }
      }).filter(item => item.description && item.amount > 0)
      
      setSheetData(mappedData)
      setSelectedSheetItems(new Set()) // Reset selection when new data loaded
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
    
    // Filter only selected items and exclude duplicates
    const itemsToImport = sheetData.filter((item, index) => 
      selectedSheetItems.has(index) && !existingSheetIds.has(item.sheet_id)
    )
    
    const duplicateCount = sheetData.filter((item, index) => 
      selectedSheetItems.has(index) && existingSheetIds.has(item.sheet_id)
    ).length
    
    if (itemsToImport.length === 0) {
      alert(duplicateCount > 0 
        ? `รายการที่เลือกทั้งหมด (${duplicateCount} รายการ) เคยถูก import แล้ว` 
        : 'กรุณาเลือกรายการที่ต้องการ import'
      )
      return
    }
    
    // Generate import batch ID
    const importBatchId = `import-${Date.now()}`
    
    setImporting(true)
    try {
      const expensesToInsert = itemsToImport.map(item => ({
        expense_date: item.expense_date,
        category: item.category,
        description: item.description,
        amount: item.amount,
        payment_method: item.payment_method,
        vendor: item.vendor || null,
        notes: item.notes || null,
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
        evidence_url: item.evidence_url || null,
        // Import tracking fields
        import_batch_id: importBatchId,
        imported_at: new Date().toISOString(),
        import_source: 'google_sheets'
      }))
      
      const { error } = await supabase.from('expenses').insert(expensesToInsert)
      if (error) throw error
      
      const message = duplicateCount > 0
        ? `Import สำเร็จ! เพิ่ม ${expensesToInsert.length} รายการ (ข้าม ${duplicateCount} รายการที่เคย import แล้ง)`
        : `Import สำเร็จ! เพิ่ม ${expensesToInsert.length} รายการเข้าโซนรออนุมัติ`
      
      alert(message)
      setSelectedSheetItems(new Set()) // Clear selection after import
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

  // Filter sheet data based on search term and month
  const filteredSheetData = sheetData.filter(item => {
    const matchesSearch = 
      item.description?.toLowerCase().includes(sheetSearchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(sheetSearchTerm.toLowerCase()) ||
      item.vendor?.toLowerCase().includes(sheetSearchTerm.toLowerCase()) ||
      item.sheet_id?.toLowerCase().includes(sheetSearchTerm.toLowerCase())
    
    if (!selectedMonth) return matchesSearch
    
    const itemDate = new Date(item.expense_date)
    const itemMonth = itemDate.toISOString().slice(0, 7) // YYYY-MM
    const matchesMonth = itemMonth === selectedMonth
    
    return matchesSearch && matchesMonth
  })

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
            <Receipt className="h-7 w-7 text-[#7D735F]" />
            ค่าใช้จ่าย
          </h1>
          <p className="text-gray-600 mt-1">บันทึกและติดตามค่าใช้จ่ายต่างๆ ของร้าน</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-help-modal'))}
            className="p-2 text-gray-400 hover:text-[#7D735F] hover:bg-[#F5F0E6] rounded-full transition-all"
            title="คู่มือการใช้งาน"
          >
            <BookOpen className="h-5 w-5" />
          </button>
          <Link 
            to="/purchase-orders"
            className="flex items-center gap-2 px-3 py-2 bg-[#E8F4F8] rounded-full border border-[#B8C9B8] hover:bg-[#D5EAE7] hover:shadow-md transition-all"
          >
            <ShoppingCart className="h-5 w-5 text-gray-900" />
            <span className="font-medium text-gray-900 text-sm whitespace-nowrap">ใบสั่งซื้อ</span>
          </Link>
          <Link 
            to="/quotations"
            className="flex items-center gap-2 px-3 py-2 bg-[#E8F4F8] rounded-full border border-[#B8C9B8] hover:bg-[#D5EAE7] hover:shadow-md transition-all"
          >
            <FileText className="h-5 w-5 text-gray-900" />
            <span className="font-medium text-gray-900 text-sm whitespace-nowrap">ใบเสนอราคา</span>
          </Link>
          <Link 
            to="/payment-vouchers"
            className="flex items-center gap-2 px-3 py-2 bg-[#E8F4F8] rounded-full border border-[#B8C9B8] hover:bg-[#D5EAE7] hover:shadow-md transition-all"
          >
            <FileText className="h-5 w-5 text-gray-900" />
            <span className="font-medium text-gray-900 text-sm whitespace-nowrap">ใบสำคัญจ่าย</span>
          </Link>
          <Link 
            to="/withholding-tax"
            className="flex items-center gap-2 px-3 py-2 bg-[#E8F4F8] rounded-full border border-[#B8C9B8] hover:bg-[#D5EAE7] hover:shadow-md transition-all"
          >
            <Percent className="h-5 w-5 text-gray-900" />
            <span className="font-medium text-gray-900 text-sm whitespace-nowrap">หัก ณ ที่จ่าย</span>
          </Link>
          <Link 
            to="/petty-cash"
            className="flex items-center gap-2 px-3 py-2 bg-[#E8F4F8] rounded-full border border-[#B8C9B8] hover:bg-[#D5EAE7] hover:shadow-md transition-all"
          >
            <Wallet className="h-5 w-5 text-gray-900" />
            <span className="font-medium text-gray-900 text-sm whitespace-nowrap">เงินสดย่อย</span>
          </Link>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setViewMode('database')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'database'
              ? 'bg-[#7D735F] text-white'
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
              ? 'bg-[#A67B5B] text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Clock className="h-4 w-4" />
          รออนุมัติ
          {pendingCount > 0 && (
            <span className="bg-[#D4756A] text-white text-xs rounded-full px-2 py-0.5">
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

      {/* Summary Cards - Match Sales Page Style */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {/* Count Card */}
        <Card className="flex items-center justify-center gap-4 py-6">
          <div className="w-12 h-12 rounded-xl bg-[#7D735F]/10 flex items-center justify-center flex-shrink-0">
            <Receipt className="h-6 w-6 text-[#7D735F]" />
          </div>
          <div>
            <p className="text-sm text-gray-600">จำนวนรายการ</p>
            <p className="text-2xl font-bold text-gray-900">
              {viewMode === 'database' ? filteredExpenses.length : sheetData.length}
            </p>
          </div>
        </Card>
        
        {/* Amount Card */}
        <Card className="flex items-center justify-center gap-4 py-6">
          <div className="w-12 h-12 rounded-xl bg-[#A67B5B]/10 flex items-center justify-center flex-shrink-0">
            <Wallet className="h-6 w-6 text-[#A67B5B]" />
          </div>
          <div>
            <p className="text-sm text-gray-600">ยอดรวมค่าใช้จ่าย</p>
            <p className="text-2xl font-bold text-gray-900">
              ฿{(viewMode === 'database' ? totalAmount : sheetTotalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </Card>

        {/* Waiting for Receipt Card */}
        <Card className="flex items-center justify-center gap-4 py-6">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
            <Clock className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">รอรับใบเสร็จ</p>
            <p className="text-2xl font-bold text-gray-900">
              {waitingReceiptCount}
            </p>
            <p className="text-xs text-orange-600">
              ฿{waitingReceiptAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </Card>

        {/* Waiting for Payment Voucher Card */}
        <Card className="flex items-center justify-center gap-4 py-6">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">รอทำใบสำคัญจ่าย</p>
            <p className="text-2xl font-bold text-gray-900">
              {waitingPaymentCount}
            </p>
            <p className="text-xs text-blue-600">
              ฿{waitingPaymentAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </Card>
      </div>

      {/* Expense Category Shortcuts - Quick Add */}
      {viewMode === 'database' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">หมวดหมู่ *</label>
          <div className="flex flex-wrap gap-2">
            {expenseShortcuts.map((shortcut) => (
              <button
                key={shortcut.name}
                onClick={() => createExpenseWithCategory(shortcut.category, shortcut.name)}
                className={`${shortcut.color} text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-sm`}
              >
                {shortcut.name}
              </button>
            ))}
          </div>
        </div>
      )}

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
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#A67B5B] bg-white text-[#A67B5B] text-sm whitespace-nowrap hover:bg-[#A67B5B]/10 transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            เพิ่มค่าใช้จ่าย
          </button>
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

            {/* Search and Month Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 bg-[#E8EBF0] rounded-full px-4 py-2 flex-1">
                <Search className="h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={sheetSearchTerm}
                  onChange={(e) => setSheetSearchTerm(e.target.value)}
                  placeholder="ค้นหารายการ..."
                  className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-sm"
                />
              </div>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
              >
                <option value="">ทุกเดือน</option>
                <option value="2026-01">มกราคม 2026</option>
                <option value="2026-02">กุมภาพันธ์ 2026</option>
                <option value="2026-03">มีนาคม 2026</option>
                <option value="2026-04">เมษายน 2026</option>
                <option value="2026-05">พฤษภาคม 2026</option>
                <option value="2026-06">มิถุนายน 2026</option>
                <option value="2026-07">กรกฎาคม 2026</option>
                <option value="2026-08">สิงหาคม 2026</option>
                <option value="2026-09">กันยายน 2026</option>
                <option value="2026-10">ตุลาคม 2026</option>
                <option value="2026-11">พฤศจิกายน 2026</option>
                <option value="2026-12">ธันวาคม 2026</option>
                <option value="2025-01">มกราคม 2025</option>
                <option value="2025-02">กุมภาพันธ์ 2025</option>
                <option value="2025-03">มีนาคม 2025</option>
                <option value="2025-04">เมษายน 2025</option>
                <option value="2025-05">พฤษภาคม 2025</option>
                <option value="2025-06">มิถุนายน 2025</option>
                <option value="2025-07">กรกฎาคม 2025</option>
                <option value="2025-08">สิงหาคม 2025</option>
                <option value="2025-09">กันยายน 2025</option>
                <option value="2025-10">ตุลาคม 2025</option>
                <option value="2025-11">พฤศจิกายน 2025</option>
                <option value="2025-12">ธันวาคม 2025</option>
              </select>
            </div>

            {/* Import Button */}
            {sheetData.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm text-green-800 font-medium">
                    พบ {sheetData.length} รายการจาก Google Sheet
                    {selectedSheetItems.size > 0 && (
                      <span className="ml-2 text-green-600">
                        (เลือก {selectedSheetItems.size} รายการ)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-green-600">
                    ยอดรวม: ฿{sheetTotalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={importSheetToDatabase}
                  disabled={importing || selectedSheetItems.size === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      กำลัง import...
                    </>
                  ) : (
                    'Import ลง Database'
                  )}
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
                        {new Date(expense.expense_date).toLocaleDateString('en-GB', { year: 'numeric', month: 'numeric', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center gap-2 flex-wrap">
                          {expense.description}
                          {(expense.vat_amount ?? 0) > 0 && (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">VAT</span>
                          )}
                          {!expense.receipt_number && expense.delivery_number && (
                            <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded font-medium" title="รอใบเสร็จ">รอบิล</span>
                          )}
                          {expense.payment_voucher_id && (
                            <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded font-bold flex items-center gap-1 shadow-sm" title="มีใบสำคัญจ่ายแล้ว">
                              <FileText className="h-3 w-3" />
                              PV
                            </span>
                          )}
                        </div>
                      </td>
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
                          {new Date(expense.expense_date).toLocaleDateString('en-GB', { year: 'numeric', month: 'numeric', day: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <span className="px-2 py-1 bg-yellow-100 rounded-full text-xs">
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{expense.description}
                          {!expense.receipt_number && expense.delivery_number && (
                            <span className="ml-2 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded font-medium" title="รอใบเสร็จ">รอบิล</span>
                          )}
                          {expense.payment_voucher_id && (
                            <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded font-bold flex items-center gap-1 shadow-sm inline-flex" title="มีใบสำคัญจ่ายแล้ว">
                              <FileText className="h-3 w-3" />
                              PV
                            </span>
                          )}
                        </td>
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
          {filteredSheetData.length === 0 ? (
            <div className="text-center py-12">
              <Sheet className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">{sheetSearchTerm ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีข้อมูลจาก Google Sheet'}</p>
              <p className="text-sm text-gray-500 mt-1">
                {sheetSearchTerm ? 'ลองค้นหาด้วยคำอื่น' : 'ใส่ URL แล้วกด "ดึงข้อมูล" เพื่อแสดงข้อมูลจาก Google Sheet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-green-50">
                  <tr>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 w-10">
                      <input
                        type="checkbox"
                        checked={selectedSheetItems.size === filteredSheetData.length && filteredSheetData.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const indices = filteredSheetData.map((_, idx) => {
                              const originalIndex = sheetData.findIndex(item => item.sheet_id === filteredSheetData[idx].sheet_id);
                              return originalIndex;
                            }).filter(i => i !== -1);
                            setSelectedSheetItems(new Set(indices));
                          } else {
                            setSelectedSheetItems(new Set());
                          }
                        }}
                        disabled={importing}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">วันที่</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">หมวดหมู่</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">รายการ</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ผู้จำหน่าย</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">จำนวนเงิน</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">การชำระเงิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSheetData.map((item, _filteredIndex) => {
                    const originalIndex = sheetData.findIndex(s => s.sheet_id === item.sheet_id);
                    return (
                      <tr key={originalIndex} className={`hover:bg-green-50/50 ${selectedSheetItems.has(originalIndex) ? 'bg-green-100/50' : ''} ${existingSheetIds.has(item.sheet_id) ? 'bg-gray-100/50' : ''}`}>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedSheetItems.has(originalIndex)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedSheetItems);
                              if (e.target.checked) {
                                newSelected.add(originalIndex);
                              } else {
                                newSelected.delete(originalIndex);
                              }
                              setSelectedSheetItems(newSelected);
                            }}
                            disabled={importing || existingSheetIds.has(item.sheet_id)}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          {existingSheetIds.has(item.sheet_id) && (
                            <span className="ml-1 text-xs text-orange-500">(imported)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(item.expense_date).toLocaleDateString('en-GB', { year: 'numeric', month: 'numeric', day: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <span className="px-2 py-1 bg-green-100 rounded-full text-xs">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.description}
                          {!item.receipt_number && item.delivery_number && (
                            <span className="ml-2 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded font-medium" title="รอใบเสร็จ">รอบิล</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.vendor || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                          ฿{item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">
                          {item.payment_method}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
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
              {/* Tabs */}
              <div className="flex border-b mb-4">
                <button
                  type="button"
                  onClick={() => setExpenseFormTab('basic')}
                  className={`px-4 py-2 font-medium text-sm ${
                    expenseFormTab === 'basic'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  ข้อมูลทั่วไป
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseFormTab('extended')}
                  className={`px-4 py-2 font-medium text-sm ${
                    expenseFormTab === 'extended'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  ข้อมูลเพิ่มเติม (Google Sheets)
                </button>
              </div>

              {expenseFormTab === 'basic' && (
                <>
                  {/* Date - full width */}
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

              {/* Document Type and Category Dropdown - 2 columns */}
              {!selectedShortcutCategory && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
                    <select
                      value={formData.document_type}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        document_type: e.target.value,
                        category: '' // Reset category when document_type changes
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">--</option>
                      <option value="ซื้อสินค้า">ซื้อสินค้า</option>
                      <option value="ค่าใช้จ่ายในการขาย">ค่าใช้จ่ายในการขาย</option>
                      <option value="ค่าใช้จ่ายในการบริหาร">ค่าใช้จ่ายในการบริหาร</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่</label>
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        const selectedCat = expenseCategories.find(cat => cat.name === e.target.value)
                        const isGrabCategory = selectedCat?.name.toLowerCase().includes('grab')
                        setFormData({ 
                          ...formData, 
                          category: e.target.value,
                          payment_method: isGrabCategory ? 'Grab Wallet' : formData.payment_method
                        })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- เลือกหมวดอื่นๆ --</option>
                      {expenseCategories
                        .filter(cat => ![
                          'ซื้อสินค้า',
                          'ค่าส่ง ปณ. [EMS]',
                          'ค่าของใช้ - วัสดุสำนักงาน',
                          'อุปกรณ์สำนักงาน',
                          'ค่า Service Fee Grab',
                          'ค่าธรรมเนียม LINE SHOPPING',
                          'ค่าธรรมเนียม Lazada',
                          'ค่าธรรมเนียม Kbank',
                          'ค่าเช่าสำนักงาน',
                          'ค่าไฟฟ้า',
                          'ค่าน้ำ',
                          'ค่าบัญชี'
                        ].includes(cat.name))
                        .filter(cat => {
                          // Filter based on document_type
                          if (!formData.document_type) return true
                          const code = cat.chart_of_accounts_code || ''
                          if (formData.document_type === 'ซื้อสินค้า') {
                            return code.startsWith('51')
                          } else if (formData.document_type === 'ค่าใช้จ่ายในการขาย') {
                            return code.startsWith('52')
                          } else if (formData.document_type === 'ค่าใช้จ่ายในการบริหาร') {
                            return code.startsWith('53')
                          }
                          return true
                        })
                        .map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))
                      }
                    </select>
                  </div>
                </div>
              )}

              {/* Category buttons - limited to specific categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">หมวดหมู่ *</label>
                
                {/* When coming from shortcut, show only selected category as compact badge */}
                {selectedShortcutCategory ? (
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-gray-600">
                      {selectedShortcutCategory}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedShortcutCategory(null)}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      เปลี่ยนหมวดหมู่
                    </button>
                  </div>
                ) : (
                  /* Quick access buttons for common categories */
                  <div className="flex flex-wrap gap-2 mb-3">
                    {expenseCategories
                      .filter(cat => [
                        'ซื้อสินค้า',
                        'ค่าส่ง ปณ. [EMS]',
                        'ค่าของใช้ - วัสดุสำนักงาน',
                        'อุปกรณ์สำนักงาน',
                        'ค่า Service Fee Grab',
                        'ค่าธรรมเนียม LINE SHOPPING',
                        'ค่าธรรมเนียม Lazada',
                        'ค่าธรรมเนียม Kbank',
                        'ค่าเช่าสำนักงาน',
                        'ค่าไฟฟ้า',
                        'ค่าน้ำ',
                        'ค่าบัญชี'
                      ].includes(cat.name))
                      .map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            const isGrabCategory = cat.name.toLowerCase().includes('grab')
                            setFormData({ 
                              ...formData, 
                              category: cat.name,
                              payment_method: isGrabCategory ? 'Grab Wallet' : formData.payment_method
                            })
                            // Navigate to payment voucher page with expense data
                            navigate(`/payment-vouchers/${cat.name}`, { state: { expenseData: formData } })
                          }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            formData.category === cat.name
                              ? 'ring-2 ring-offset-2 ring-gray-400 scale-105'
                              : 'hover:opacity-80'
                          }`}
                          style={{ backgroundColor: cat.color || '#6B7280', color: '#ffffff' }}
                        >
                          {cat.name}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Main Description and Notes - moved before Vendor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">รายการ *</label>
                  <input
                    type="text"
                    required
                    value={formData.description}
                    onChange={(e) => {
                      const newDescription = e.target.value
                      setFormData({ ...formData, description: newDescription })
                      autoSelectPaymentMethod(newDescription)
                    }}
                    placeholder="เช่น ค่าไฟเดือนมกราคม"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Supplier/Vendor and Tax ID - 2 columns */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">คู่ค้า</label>
                  <select
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.name}>
                        {contact.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เลขประจำตัวผู้เสียภาษี</label>
                  <input
                    type="text"
                    value={formData.seller_tax_id}
                    onChange={(e) => {
                      const newTaxId = e.target.value
                      // Auto-fill vendor if tax ID matches a contact
                      const matchingContact = contacts.find(c => c.tax_id === newTaxId)
                      setFormData({ 
                        ...formData, 
                        seller_tax_id: newTaxId,
                        vendor: matchingContact ? matchingContact.name : formData.vendor
                      })
                    }}
                    placeholder="Tax ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Has Invoice - Radio buttons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">มีบิลภาษี</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="has_invoice"
                      value="yes"
                      checked={formData.has_invoice === 'yes'}
                      onChange={(e) => setFormData({ ...formData, has_invoice: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">Yes</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="has_invoice"
                      value="no"
                      checked={formData.has_invoice === 'no'}
                      onChange={(e) => setFormData({ ...formData, has_invoice: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">No</span>
                  </label>
                </div>
              </div>

              {/* Tax Invoice Info - consolidated field */}
              <div className="grid grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่ใบส่งของ</label>
                  <input
                    type="text"
                    value={formData.delivery_number}
                    onChange={(e) => setFormData({ ...formData, delivery_number: e.target.value })}
                    placeholder="DO-001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Amount fields - 3 columns */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนเงิน *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ภาษีมูลค่าเพิ่ม</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.withholding_tax}
                    onChange={(e) => setFormData({ ...formData, withholding_tax: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ราคาก่อน vat</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.vat_amount}
                    onChange={(e) => setFormData({ ...formData, vat_amount: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Withholding Tax Section */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">หัก ณ ที่จ่าย</h3>
                
                {/* Mode selection */}
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="withholding_mode"
                      value="none"
                      checked={formData.withholding_mode === 'none' || !formData.withholding_mode}
                      onChange={(e) => setFormData({ ...formData, withholding_mode: e.target.value, withholding_percent: '', withholding_tax: '' })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">ไม่มี</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="withholding_mode"
                      value="withhold"
                      checked={formData.withholding_mode === 'withhold'}
                      onChange={(e) => setFormData({ ...formData, withholding_mode: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">หัก ณ ที่จ่าย</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="withholding_mode"
                      value="continuous"
                      checked={formData.withholding_mode === 'continuous'}
                      onChange={(e) => setFormData({ ...formData, withholding_mode: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">ออกให้ตลอดไป</span>
                  </label>
                </div>

                {/* Percentage selection and calculated amount */}
                {(formData.withholding_mode === 'withhold' || formData.withholding_mode === 'continuous') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">อัตราหัก (%)</label>
                      <select
                        value={formData.withholding_percent}
                        onChange={(e) => {
                          const percent = e.target.value
                          const baseAmount = parseFloat(formData.vat_amount) || 0
                          const calculatedTax = percent ? (baseAmount * parseFloat(percent) / 100).toFixed(2) : ''
                          setFormData({ 
                            ...formData, 
                            withholding_percent: percent,
                            withholding_tax: calculatedTax
                          })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- เลือก --</option>
                        <option value="3">3%</option>
                        <option value="5">5%</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ยอดหัก (จากราคาก่อน VAT)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.withholding_tax}
                        onChange={(e) => setFormData({ ...formData, withholding_tax: e.target.value })}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
                        readOnly
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Payment fields - 4 columns: Method, Date, Slip, Voucher */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ช่องทางการชำระเงิน</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">เงินสด</option>
                    {paymentMethods.length > 0 ? paymentMethods.map(method => (
                      <option key={method} value={method}>{method}</option>
                    )) : PAYMENT_METHODS.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ชำระเงิน</label>
                  <input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ไฟล์สลิปจ่ายเงิน</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ใบสำคัญจ่าย</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={openPaymentVoucherModal}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      ออกใบสำคัญจ่าย
                    </button>
                    {editingExpense?.payment_voucher_id && (
                      <Link
                        to={`/payment-vouchers?highlight=${editingExpense.payment_voucher_id}`}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        ดูใบสำคัญจ่าย
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* URL Evidence - moved above file uploads */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL หลักฐาน</label>
                {formData.evidence_url ? (
                  <a
                    href={formData.evidence_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-2 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {formData.evidence_url}
                  </a>
                ) : (
                  <input
                    type="url"
                    value={formData.evidence_url}
                    onChange={(e) => setFormData({ ...formData, evidence_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              {/* File Uploads */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image Update</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PDF Upload</label>
                  <input
                    type="file"
                    accept=".pdf"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
              </>
              )}

              {expenseFormTab === 'extended' && (
                <>
                  {/* Google Sheets Extended Fields */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">ข้อมูลเพิ่มเติม (จาก Google Sheets)</h3>

                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">จำนวน</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.quantity}
                          onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                          placeholder="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ราคาต่อหน่วย</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.unit_price}
                          onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">ผู้ขอเบิก</label>
                      <input
                        type="text"
                        value={formData.requester}
                        onChange={(e) => setFormData({ ...formData, requester: e.target.value })}
                        placeholder="ชื่อผู้ขอเบิก"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <button type="submit" className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Voucher Modal */}
      {showPaymentVoucherModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                ออกใบสำคัญจ่าย
              </h2>
              <button
                onClick={() => {
                  setShowPaymentVoucherModal(false)
                  resetPaymentVoucherForm()
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <form onSubmit={handleSavePaymentVoucher} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่ *</label>
                  <input
                    type="text"
                    required
                    value={paymentVoucherForm.voucher_number}
                    onChange={(e) => setPaymentVoucherForm({ ...paymentVoucherForm, voucher_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="PV-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ *</label>
                  <input
                    type="date"
                    required
                    value={paymentVoucherForm.voucher_date}
                    onChange={(e) => setPaymentVoucherForm({ ...paymentVoucherForm, voucher_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ผู้รับเงิน *</label>
                <input
                  type="text"
                  required
                  value={paymentVoucherForm.payee_name}
                  onChange={(e) => setPaymentVoucherForm({ ...paymentVoucherForm, payee_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="ชื่อผู้รับเงิน"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เลขประจำตัวผู้เสียภาษี</label>
                  <input
                    type="text"
                    value={paymentVoucherForm.payee_tax_id}
                    onChange={(e) => setPaymentVoucherForm({ ...paymentVoucherForm, payee_tax_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="เลข 13 หลัก"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วิธีการชำระเงิน *</label>
                  <select
                    required
                    value={paymentVoucherForm.payment_method}
                    onChange={(e) => setPaymentVoucherForm({ ...paymentVoucherForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="เงินสด">เงินสด</option>
                    <option value="โอนเงิน">โอนเงิน</option>
                    <option value="เช็ค">เช็ค</option>
                  </select>
                </div>
              </div>

              {paymentVoucherForm.payment_method === 'โอนเงิน' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อธนาคาร</label>
                    <input
                      type="text"
                      value={paymentVoucherForm.bank_name}
                      onChange={(e) => setPaymentVoucherForm({ ...paymentVoucherForm, bank_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="ชื่อธนาคาร"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่บัญชี</label>
                    <input
                      type="text"
                      value={paymentVoucherForm.bank_account}
                      onChange={(e) => setPaymentVoucherForm({ ...paymentVoucherForm, bank_account: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="เลขที่บัญชี"
                    />
                  </div>
                </div>
              )}

              {paymentVoucherForm.payment_method === 'เช็ค' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่เช็ค</label>
                  <input
                    type="text"
                    value={paymentVoucherForm.check_number}
                    onChange={(e) => setPaymentVoucherForm({ ...paymentVoucherForm, check_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="เลขที่เช็ค"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รายการ *</label>
                <textarea
                  required
                  value={paymentVoucherForm.description}
                  onChange={(e) => setPaymentVoucherForm({ ...paymentVoucherForm, description: e.target.value })}
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
                    value={paymentVoucherForm.amount}
                    onChange={(e) => setPaymentVoucherForm({ ...paymentVoucherForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนเงินตัวอักษร</label>
                  <input
                    type="text"
                    value={paymentVoucherForm.amount_in_words}
                    onChange={(e) => setPaymentVoucherForm({ ...paymentVoucherForm, amount_in_words: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="หนึ่งพันบาทถ้วน"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">อนุมัติโดย</label>
                <input
                  type="text"
                  value={paymentVoucherForm.approved_by}
                  onChange={(e) => setPaymentVoucherForm({ ...paymentVoucherForm, approved_by: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="ชื่อผู้อนุมัติ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                <textarea
                  value={paymentVoucherForm.notes}
                  onChange={(e) => setPaymentVoucherForm({ ...paymentVoucherForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentVoucherModal(false)
                    resetPaymentVoucherForm()
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  บันทึกใบสำคัญจ่าย
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
