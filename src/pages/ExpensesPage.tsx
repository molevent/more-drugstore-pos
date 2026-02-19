import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { Receipt, Plus, Search, Trash2, Edit2, Sheet, RefreshCw, Settings, Database, Clock, CheckCircle, XCircle, Percent, FileText, ShoppingCart, BookOpen, Wallet, Printer } from 'lucide-react'

interface PaymentVoucher {
  id?: string
  voucher_number: string
  voucher_date: string
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
  // Extended fields for displaying expense info
  expense_document_date?: string
}

interface Expense {
  id: string
  expense_date: string
  document_date?: string  // วันที่ตามเอกสาร (เก็บค่าเดิมไม่เปลี่ยนเมื่อแก้ไข)
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
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Get default date range: 1st of last month to today
  const today = new Date()
  const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const formatDateValue = (date: Date) => date.toISOString().split('T')[0]

  // Filter states - with default date range
  const [filterDateFrom, setFilterDateFrom] = useState(formatDateValue(firstOfLastMonth))
  const [filterDateTo, setFilterDateTo] = useState(formatDateValue(today))
  const [filterCategory, setFilterCategory] = useState('')
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  
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
    expense_date: '',
    document_date: '',  // วันที่ตามเอกสาร (คงที่ ไม่เปลี่ยนตามวันที่ชำระเงิน)
    category: 'ค่าอื่นๆ',
    description: '',
    amount: '',
    payment_method: '',
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

      if (error) throw error
      
      // Sort by document_date descending (latest first), fallback to expense_date if document_date is null
      const sortedData = (data || []).sort((a, b) => {
        const dateA = new Date(a.document_date || a.expense_date || '1970-01-01')
        const dateB = new Date(b.document_date || b.expense_date || '1970-01-01')
        return dateB.getTime() - dateA.getTime() // descending order
      })
      
      console.log('Fetched expenses:', sortedData.length, 'items')
      setExpenses(sortedData)
      
      // Removed pending count - no longer needed
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
      // For document_date: use form value when editing, or form value (which should have initial date) for new
      const finalDocumentDate = editingExpense 
        ? formData.document_date  // When editing, use exactly what's in the form (don't auto-change)
        : (formData.document_date || formData.expense_date)  // For new, default to expense_date if not set
      
      const expenseData: any = {
        expense_date: formData.expense_date,
        document_date: finalDocumentDate,
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
          const voucherNumber = await generatePaymentVoucherNumber(formData.expense_date)
          
          // Create payment voucher data
          const voucherData = {
            voucher_number: voucherNumber,
            voucher_date: formData.expense_date,
            description: formData.description,
            amount: parseFloat(formData.amount) || 0,
            payment_method: formData.payment_method,
            payee_name: formData.vendor || null,
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
            alert('ไม่สามารถสร้างใบสำคัญจ่าย: ' + voucherError.message)
            // Continue with expense creation even if voucher creation fails
          } else if (voucherResult) {
            // Add payment_voucher_id to expense data
            expenseData.payment_voucher_id = voucherResult.id
            console.log('Payment voucher created successfully:', voucherResult.id, 'Number:', voucherNumber)
          }
        }
        
        const { error } = await supabase
          .from('expenses')
          .insert(expenseData)
        if (error) throw error
        
        // Show success message if voucher was created
        if (shouldGenerateVoucher) {
          if (expenseData.payment_voucher_id) {
            alert('บันทึกค่าใช้จ่ายสำเร็จ และสร้างใบสำคัญจ่ายอัตโนมัติเรียบร้อยแล้ว')
          } else {
            alert('บันทึกค่าใช้จ่ายสำเร็จ แต่ไม่สามารถสร้างใบสำคัญจ่ายได้')
          }
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
      document_date: expense.document_date || '',  // ใช้ค่าเดิมถ้ามี ถ้าไม่มีให้ว่าง (ไม่ใช่ expense_date)
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
      expense_date: '',
      document_date: '',
      category: 'ค่าอื่นๆ',
      description: '',
      amount: '',
      payment_method: '',
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

  // Add Contact Modal states
  const [showAddContactModal, setShowAddContactModal] = useState(false)
  const [newContactForm, setNewContactForm] = useState({
    name: '',
    type: 'seller' as 'customer' | 'seller' | 'both',
    phone: '',
    email: '',
    address: '',
    tax_id: '',
    notes: ''
  })

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

  // View Payment Voucher Print Modal states
  const [showViewVoucherModal, setShowViewVoucherModal] = useState(false)
  const [viewVoucher, setViewVoucher] = useState<PaymentVoucher | null>(null)
  const [viewVoucherCategory, setViewVoucherCategory] = useState<string>('')
  const [shopSettings, setShopSettings] = useState<{ name: string; logo_url: string } | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  // Expenses Print Modal state
  const [showPrintModal, setShowPrintModal] = useState(false)

  const createExpenseWithCategory = async (category: string, description: string = '') => {
    resetForm()
    setSelectedShortcutCategory(category)
    
    // Set initial dates for new expense
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]
    
    setFormData(prev => ({
      ...prev,
      category,
      description: description || category,
      document_date: dateStr,  // วันที่ตามเอกสาร (คงที่)
      expense_date: dateStr  // วันที่ชำระเงิน (เปลี่ยนได้)
    }))
    setShowModal(true)
  }

  // Expense shortcuts configuration - Bridgerton Blue borders
  const expenseShortcuts = [
    { name: 'ซื้อสินค้า', category: 'ซื้อสินค้า', color: '#A8C4D9', icon: 'Package' },
    { name: 'ค่าของใช้ - วัสดุสำนักงาน', category: 'ค่าของใช้ - วัสดุสำนักงาน', color: '#A8C4D9', icon: 'Office' },
    { name: 'ค่า Service Fee Grab', category: 'ค่า Service Fee Grab', color: '#A8C4D9', icon: 'Grab' },
    { name: 'ค่าเช่าสำนักงาน', category: 'ค่าเช่าสำนักงาน', color: '#A8C4D9', icon: 'Building' },
    { name: 'ค่าธรรมเนียม Kbank', category: 'ค่าธรรมเนียม Kbank', color: '#A8C4D9', icon: 'Bank' },
    { name: 'ค่าธรรมเนียม Lazada', category: 'ค่าธรรมเนียม Lazada', color: '#A8C4D9', icon: 'Shopping' },
    { name: 'ค่าธรรมเนียม LINE SHOPPING', category: 'ค่าธรรมเนียม LINE SHOPPING', color: '#A8C4D9', icon: 'Shopping' },
    { name: 'ค่าน้ำ', category: 'ค่าน้ำ', color: '#A8C4D9', icon: 'Droplet' },
    { name: 'ค่าบัญชี', category: 'ค่าบัญชี', color: '#A8C4D9', icon: 'Calculator' },
    { name: 'ค่าไฟฟ้า', category: 'ค่าไฟฟ้า', color: '#A8C4D9', icon: 'Zap' },
    { name: 'ค่าส่ง ปณ. [EMS]', category: 'ค่าส่ง ปณ. [EMS]', color: '#A8C4D9', icon: 'Truck' },
    { name: 'อุปกรณ์สำนักงาน', category: 'อุปกรณ์สำนักงาน', color: '#A8C4D9', icon: 'Monitor' },
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
    console.log('Opening payment voucher modal...', formData.expense_date)
    try {
      const voucherNumber = await generatePaymentVoucherNumber(formData.expense_date)
      console.log('Generated voucher number:', voucherNumber)
      
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
      console.log('Payment voucher modal opened')
    } catch (error) {
      console.error('Error opening payment voucher modal:', error)
      alert('เกิดข้อผิดพลาดในการเปิดใบสำคัญจ่าย')
    }
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

      const { data: voucherResult, error } = await supabase
        .from('payment_vouchers')
        .insert([voucherData])
        .select('id')
        .single()
      
      if (error) throw error

      // If editing an expense, link the voucher to it
      if (editingExpense && voucherResult) {
        const { error: updateError } = await supabase
          .from('expenses')
          .update({ payment_voucher_id: voucherResult.id })
          .eq('id', editingExpense.id)
        
        if (updateError) {
          console.error('Error linking voucher to expense:', updateError)
        } else {
          console.log('Linked voucher', voucherResult.id, 'to expense', editingExpense.id)
          // Update local state so UI immediately shows "ดูใบสำคัญจ่าย" button
          setEditingExpense({ ...editingExpense, payment_voucher_id: voucherResult.id })
        }
      }

      setShowPaymentVoucherModal(false)
      resetPaymentVoucherForm()
      fetchExpenses() // Refresh to show the PV badge
      alert('สร้างใบสำคัญจ่ายสำเร็จ!')
    } catch (error) {
      console.error('Error saving voucher:', error)
      alert('เกิดข้อผิดพลาดในการบันทึกใบสำคัญจ่าย')
    }
  }

  // Handle save new contact
  const handleSaveNewContact = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newContactForm.name.trim()) {
      alert('กรุณากรอกชื่อคู่ค้า')
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert([{
          name: newContactForm.name.trim(),
          type: newContactForm.type,
          phone: newContactForm.phone || null,
          email: newContactForm.email || null,
          address: newContactForm.address || null,
          tax_id: newContactForm.tax_id || null,
          notes: newContactForm.notes || null
        }])
        .select('*')
        .single()
      
      if (error) throw error
      
      if (data) {
        // Refresh contacts list
        await fetchContacts()
        
        // Auto-select the new contact in the form
        setFormData({ ...formData, vendor: data.name })
        
        // Close modal and reset form
        setShowAddContactModal(false)
        setNewContactForm({
          name: '',
          type: 'seller',
          phone: '',
          email: '',
          address: '',
          tax_id: '',
          notes: ''
        })
        
        alert('เพิ่มคู่ค้าใหม่สำเร็จ!')
      }
    } catch (error) {
      console.error('Error saving contact:', error)
      alert('เกิดข้อผิดพลาดในการบันทึกคู่ค้า')
    }
  }

  // Fetch and view payment voucher
  const handleViewPaymentVoucher = async (voucherId: string) => {
    try {
      // Fetch voucher data
      const { data: voucherData, error: voucherError } = await supabase
        .from('payment_vouchers')
        .select('*')
        .eq('id', voucherId)
        .single()
      
      if (voucherError) throw voucherError
      
      // Fetch associated expense to get category and document_date
      const { data: expenseData } = await supabase
        .from('expenses')
        .select('category, document_date')
        .eq('payment_voucher_id', voucherId)
        .single()
      
      // Fetch shop settings for logo and business name
      const { data: shopData } = await supabase
        .from('shop_settings')
        .select('name, logo_url')
        .single()
      
      if (voucherData) {
        setViewVoucher({
          ...voucherData,
          expense_document_date: expenseData?.document_date || voucherData.voucher_date
        })
        setViewVoucherCategory(expenseData?.category || '-')
        setShopSettings(shopData || { name: 'ห้างหุ้นส่วนจำกัด สะอางพาณิชย์', logo_url: '' })
        setShowViewVoucherModal(true)
      }
    } catch (error) {
      console.error('Error fetching voucher:', error)
      alert('เกิดข้อผิดพลาดในการโหลดใบสำคัญจ่าย')
    }
  }

  const filteredExpenses = expenses.filter(expense => {
    // Text search
    const matchesSearch = !searchTerm || 
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Date range filter
    const matchesDateFrom = !filterDateFrom || expense.expense_date >= filterDateFrom
    const matchesDateTo = !filterDateTo || expense.expense_date <= filterDateTo
    
    // Category filter
    const matchesCategory = !filterCategory || expense.category === filterCategory
    
    // Payment method filter
    const matchesPaymentMethod = !filterPaymentMethod || expense.payment_method === filterPaymentMethod
    
    // Status filter
    let matchesStatus = true
    if (filterStatus === 'waiting_receipt') {
      matchesStatus = !expense.receipt_number
    } else if (filterStatus === 'waiting_payment') {
      matchesStatus = !expense.payment_voucher_id
    }
    
    return matchesSearch && matchesDateFrom && matchesDateTo && matchesCategory && matchesPaymentMethod && matchesStatus
  })

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  // Pending expenses
  const pendingExpenses = expenses.filter(e => e.status === 'pending')
  const pendingTotalAmount = pendingExpenses.reduce((sum, e) => sum + e.amount, 0)

  // Waiting for receipt (no receipt_number, regardless of delivery_number)
  const waitingReceiptExpenses = expenses.filter(e => !e.receipt_number)
  const waitingReceiptCount = waitingReceiptExpenses.length
  const waitingReceiptAmount = waitingReceiptExpenses.reduce((sum, e) => sum + e.amount, 0)

  // Waiting for payment voucher (no payment_voucher_id, regardless of status)
  const waitingPaymentExpenses = expenses.filter(e => !e.payment_voucher_id)
  const waitingPaymentCount = waitingPaymentExpenses.length
  const waitingPaymentAmount = waitingPaymentExpenses.reduce((sum, e) => sum + e.amount, 0)

  // VAT and Non-VAT expenses (based on filteredExpenses)
  const vatExpenses = filteredExpenses.filter(e => (e.vat_amount ?? 0) > 0)
  const vatTotalAmount = vatExpenses.reduce((sum, e) => sum + e.amount, 0)
  const nonVatExpenses = filteredExpenses.filter(e => (e.vat_amount ?? 0) <= 0)
  const nonVatTotalAmount = nonVatExpenses.reduce((sum, e) => sum + e.amount, 0)

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
      {/* Print Styles - Hide everything except print modal when printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #expenses-print-content,
          #expenses-print-content * {
            visibility: visible;
          }
          #expenses-print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="h-7 w-7 text-[#7D735F]" />
            เอกสาร
          </h1>
          <p className="text-gray-600 mt-1">บันทึกและติดตามเอกสารต่างๆ ของร้าน</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-help-modal'))}
            className="p-2 text-gray-400 hover:text-[#7D735F] hover:bg-[#F5F0E6] rounded-full transition-all"
            title="คู่มือการใช้งาน"
          >
            <BookOpen className="h-5 w-5" />
          </button>
          {/* Hidden - not used yet
          <Link 
            to="/expenses/add"
            className="px-4 py-2 bg-[#A67B5B] hover:bg-[#8B6B4F] text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            เพิ่มเอกสาร
          </Link>
          */}
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 items-center">
        {/* Quick Links - Hidden for now
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
        <div className="flex-grow"></div>
        */}
        <button
          onClick={() => setViewMode('database')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'database'
              ? 'bg-[#A8C4D9] text-white border-black'
              : 'bg-white text-gray-700 border-black hover:bg-gray-50'
          }`}
        >
          <Database className="h-4 w-4" />
          ค่าใช้จ่าย
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
          ดึงข้อมูล
        </button>

        {/* Quick Links */}
        <div className="w-px h-8 bg-gray-300 mx-2"></div>
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

        {/* Tax Menu Dropdown */}
        <div className="relative group">
          <button className="flex items-center gap-2 px-3 py-2 bg-[#FEF3C7] rounded-full border border-[#F59E0B] hover:bg-[#FDE68A] hover:shadow-md transition-all">
            <Percent className="h-5 w-5 text-amber-700" />
            <span className="font-medium text-amber-800 text-sm whitespace-nowrap">ภาษี</span>
            <svg className="h-4 w-4 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <div className="py-1">
              <Link 
                to="/withholding-tax"
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 text-gray-700 transition-colors"
              >
                <Percent className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">หัก ณ ที่จ่าย</span>
              </Link>
              <Link 
                to="/tax-pp30"
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 text-gray-700 transition-colors"
              >
                <FileText className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">ภ.พ.30 (VAT Return)</span>
              </Link>
              <Link 
                to="/tax-invoices"
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 text-gray-700 transition-colors"
              >
                <Receipt className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">ใบกำกับภาษี</span>
              </Link>
              <div className="border-t border-gray-100 my-1"></div>
              <div className="px-4 py-1.5 text-xs text-gray-400 font-medium">ภ.ง.ด.</div>
              <Link 
                to="/tax-pnd1"
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 text-gray-700 transition-colors"
              >
                <FileText className="h-4 w-4 text-amber-600" />
                <span className="text-sm">ภ.ง.ด.1 (เงินเดือน)</span>
              </Link>
              <Link 
                to="/tax-pnd3"
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 text-gray-700 transition-colors"
              >
                <FileText className="h-4 w-4 text-amber-600" />
                <span className="text-sm">ภ.ง.ด.3 (ค่าบริการ)</span>
              </Link>
              <Link 
                to="/tax-pnd53"
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 text-gray-700 transition-colors"
              >
                <FileText className="h-4 w-4 text-amber-600" />
                <span className="text-sm">ภ.ง.ด.53 (ค่าจ้าง)</span>
              </Link>
            </div>
          </div>
        </div>

        <Link 
          to="/petty-cash"
          className="flex items-center gap-2 px-3 py-2 bg-[#E8F4F8] rounded-full border border-[#B8C9B8] hover:bg-[#D5EAE7] hover:shadow-md transition-all"
        >
          <Wallet className="h-5 w-5 text-gray-900" />
          <span className="font-medium text-gray-900 text-sm whitespace-nowrap">เงินสดย่อย</span>
        </Link>
      </div>

      {/* Summary Cards - Match Sales Page Style */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {/* Combined Count & Amount Card - IVORY LACE */}
        <Card className="flex flex-col items-center justify-center text-center py-3 px-4 hover:border-[#D4C5B3] hover:border-2 transition-all cursor-pointer col-span-2 sm:col-span-1">
          <div className="text-center">
            <p className="text-sm text-gray-600">ยอดรวมค่าใช้จ่าย</p>
            <p className="text-2xl font-bold text-gray-900">
              {viewMode === 'database' ? filteredExpenses.length : sheetData.length}
            </p>
            <p className="text-xs text-[#8B7355]">
              ฿{(viewMode === 'database' ? totalAmount : sheetTotalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </Card>

        {/* Waiting for Receipt Card - LEMON CHIFFON */}
        <Card className="flex flex-col items-center justify-center text-center py-3 px-4 hover:border-[#E6D7A8] hover:border-2 transition-all cursor-pointer">
          <div className="text-center">
            <p className="text-sm text-gray-600">รอรับใบเสร็จ</p>
            <p className="text-2xl font-bold text-gray-900">
              {waitingReceiptCount}
            </p>
            <p className="text-xs text-[#B8A060]">
              ฿{waitingReceiptAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </Card>

        {/* Waiting for Payment Voucher Card - WONDEROUS BLUE */}
        <Card className="flex flex-col items-center justify-center text-center py-3 px-4 hover:border-[#A8C4D9] hover:border-2 transition-all cursor-pointer">
          <div className="text-center">
            <p className="text-sm text-gray-600">รอทำใบสำคัญจ่าย</p>
            <p className="text-2xl font-bold text-gray-900">
              {waitingPaymentCount}
            </p>
            <p className="text-xs text-[#5B7A8B]">
              ฿{waitingPaymentAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </Card>

        {/* VAT Expenses Card - RAINWASHED */}
        <Card className="flex flex-col items-center justify-center text-center py-3 px-4 hover:border-[#A8C4B8] hover:border-2 transition-all cursor-pointer">
          <div className="text-center">
            <p className="text-sm text-gray-600">ค่าใช้จ่ายมี VAT</p>
            <p className="text-2xl font-bold text-gray-900">
              {vatExpenses.length}
            </p>
            <p className="text-xs text-[#5B7A6B]">
              ฿{vatTotalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </Card>

        {/* Non-VAT Expenses Card - AGAPAHNTHUS */}
        <Card className="flex flex-col items-center justify-center text-center py-3 px-4 hover:border-[#B8B8C8] hover:border-2 transition-all cursor-pointer">
          <div className="text-center">
            <p className="text-sm text-gray-600">ค่าใช้จ่ายไม่มี VAT</p>
            <p className="text-2xl font-bold text-gray-900">
              {nonVatExpenses.length}
            </p>
            <p className="text-xs text-[#6B6B8B]">
              ฿{nonVatTotalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </Card>
      </div>

      {/* Expense Category Shortcuts - Quick Add */}
      {viewMode === 'database' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">บันทึกค่าใช้จ่าย *</label>
          <div className="flex flex-wrap gap-2">
            {expenseShortcuts.map((shortcut) => (
              <button
                key={shortcut.name}
                onClick={() => createExpenseWithCategory(shortcut.category, shortcut.name)}
                className="bg-white border-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-900 transition-all shadow-sm hover:bg-gray-50"
                style={{ borderColor: shortcut.color }}
              >
                {shortcut.name}
              </button>
            ))}
            <button
              onClick={async () => {
                resetForm()
                // Set initial dates for new expense
                const today = new Date()
                const dateStr = today.toISOString().split('T')[0]
                setFormData(prev => ({
                  ...prev,
                  document_date: dateStr,
                  expense_date: dateStr
                }))
                setShowModal(true)
              }}
              className="flex items-center gap-1 bg-[#A67B5B] border-2 border-gray-300 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all shadow-sm hover:bg-[#8B6B4F]"
            >
              <Plus className="h-4 w-4" />
              เพิ่มค่าใช้จ่ายอื่นๆ
            </button>
          </div>
        </div>
      )}

      {/* Actions Bar - Database View with Filters */}
      {viewMode === 'database' && (
        <div className="flex flex-col gap-2 mb-6">
          {/* Compact Filter Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="flex-1 min-w-[200px] relative">
              <div className="flex items-center gap-2 bg-[#E8EBF0] rounded-full px-3 py-2 border border-transparent focus-within:border-[#A8C4D9] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#A8C4D9]/20 transition-all">
                <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ค้นหา..."
                  className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-sm min-w-0"
                />
              </div>
            </div>
            
            {/* Date From */}
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="px-2 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#A8C4D9] focus:border-[#A8C4D9] w-[130px]"
              placeholder="จาก"
            />
            
            <span className="text-gray-400">-</span>
            
            {/* Date To */}
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="px-2 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#A8C4D9] focus:border-[#A8C4D9] w-[130px]"
              placeholder="ถึง"
            />
            
            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#A8C4D9] focus:border-[#A8C4D9] w-[140px]"
            >
              <option value="">ทุกหมวด</option>
              {expenseShortcuts.map((shortcut) => (
                <option key={shortcut.category} value={shortcut.category}>
                  {shortcut.category}
                </option>
              ))}
            </select>
            
            {/* Payment Method Filter */}
            <select
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
              className="px-2 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#A8C4D9] focus:border-[#A8C4D9] w-[120px]"
            >
              <option value="">ทุกวิธีชำระ</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
            
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#A8C4D9] focus:border-[#A8C4D9] w-[110px]"
            >
              <option value="">ทุกสถานะ</option>
              <option value="waiting_receipt">รอใบเสร็จ</option>
              <option value="waiting_payment">รอใบสำคัญ</option>
            </select>
            
            {/* Clear Button */}
            {(searchTerm || filterDateFrom || filterDateTo || filterCategory || filterPaymentMethod || filterStatus) && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setFilterDateFrom(formatDateValue(firstOfLastMonth))
                  setFilterDateTo(formatDateValue(today))
                  setFilterCategory('')
                  setFilterPaymentMethod('')
                  setFilterStatus('')
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="ล้างตัวกรอง"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
            
            {/* Print Button */}
            <button
              onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
              title="พิมพ์รายงานเอกสาร"
            >
              <Printer className="h-4 w-4" />
              พิมพ์
            </button>
          </div>
          
          {/* Active Filters Tags */}
          {(searchTerm || filterDateFrom || filterDateTo || filterCategory || filterPaymentMethod || filterStatus) && (
            <div className="flex flex-wrap gap-1 text-xs">
              {searchTerm && (
                <span className="px-2 py-0.5 bg-[#A8C4D9]/20 text-[#5B7A8B] rounded-full">
                  ค้นหา: {searchTerm}
                </span>
              )}
              {(filterDateFrom || filterDateTo) && (
                <span className="px-2 py-0.5 bg-[#A8C4D9]/20 text-[#5B7A8B] rounded-full">
                  {filterDateFrom || '...'} ถึง {filterDateTo || '...'}
                </span>
              )}
              {filterCategory && (
                <span className="px-2 py-0.5 bg-[#A8C4D9]/20 text-[#5B7A8B] rounded-full">{filterCategory}</span>
              )}
              {filterPaymentMethod && (
                <span className="px-2 py-0.5 bg-[#A8C4D9]/20 text-[#5B7A8B] rounded-full">{filterPaymentMethod}</span>
              )}
              {filterStatus === 'waiting_receipt' && (
                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">รอใบเสร็จ</span>
              )}
              {filterStatus === 'waiting_payment' && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">รอใบสำคัญ</span>
              )}
            </div>
          )}
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
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">วันที่ตามเอกสาร</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">หมวดหมู่</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">รายการ</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ผู้จำหน่าย</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">จำนวนเงิน</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(expense.document_date || expense.expense_date).toLocaleDateString('en-GB', { year: 'numeric', month: 'numeric', day: 'numeric' })}
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
                            <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded font-medium flex items-center gap-1 shadow-sm" title="มีใบสำคัญจ่ายแล้ว">
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
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
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
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">วันที่ตามเอกสาร</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">หมวดหมู่</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">รายการ</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ผู้ขาย</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">จำนวนเงิน</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pendingExpenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-yellow-50/50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(expense.document_date || expense.expense_date).toLocaleDateString('en-GB', { year: 'numeric', month: 'numeric', day: 'numeric' })}
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
                            <span className="ml-2 px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded font-medium flex items-center gap-1 shadow-sm inline-flex" title="มีใบสำคัญจ่ายแล้ว">
                              <FileText className="h-3 w-3" />
                              PV
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{expense.vendor || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                          ฿{expense.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
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
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">วันที่ตามเอกสาร</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">หมวดหมู่</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">รายการ</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ผู้จำหน่าย</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">จำนวนเงิน</th>
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
                          {new Date(item.document_date || item.expense_date).toLocaleDateString('en-GB', { year: 'numeric', month: 'numeric', day: 'numeric' })}
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
                  {/* Date, Document Type and Category - 3 columns */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ ตามเอกสาร *</label>
                      <input
                        type="date"
                        required
                        value={formData.document_date}
                        onChange={(e) => setFormData({ ...formData, document_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
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

              {/* Category buttons - limited to specific categories */}
              <div>
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
                          }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                            formData.category === cat.name
                              ? 'text-white scale-105 shadow-md'
                              : 'bg-white hover:bg-gray-50'
                          }`}
                          style={{ 
                            backgroundColor: formData.category === cat.name ? (cat.color || '#6B7280') : 'transparent',
                            borderColor: cat.color || '#6B7280',
                            color: formData.category === cat.name ? '#ffffff' : (cat.color || '#6B7280')
                          }}
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
                  <div className="flex gap-2">
                    <select
                      value={formData.vendor}
                      onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select</option>
                      {contacts.map((contact) => (
                        <option key={contact.id} value={contact.name}>
                          {contact.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowAddContactModal(true)}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1 whitespace-nowrap"
                    >
                      <Plus className="h-4 w-4" />
                      เพิ่มคู่ค้า
                    </button>
                  </div>
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
                      onChange={(e) => {
                        const newFormData = { ...formData, has_invoice: e.target.value }
                        // Auto-calculate VAT if amount exists
                        const amount = parseFloat(formData.amount) || 0
                        if (amount > 0) {
                          const amountBeforeTax = amount / 1.07
                          const vatAmount = amount - amountBeforeTax
                          newFormData.amount_before_tax = amountBeforeTax.toFixed(2)
                          newFormData.vat_amount = vatAmount.toFixed(2)
                        }
                        setFormData(newFormData)
                      }}
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
                    onChange={(e) => {
                      const amount = parseFloat(e.target.value) || 0
                      const newFormData: any = { 
                        ...formData, 
                        amount: e.target.value,
                        // Reset withholding tax when amount changes
                        withholding_percent: '',
                        withholding_tax: ''
                      }
                      // Auto-calculate VAT when has_invoice is yes
                      if (formData.has_invoice === 'yes' && amount > 0) {
                        const amountBeforeTax = amount / 1.07
                        const vatAmount = amount - amountBeforeTax
                        newFormData.amount_before_tax = amountBeforeTax.toFixed(2)
                        newFormData.vat_amount = vatAmount.toFixed(2)
                      }
                      setFormData(newFormData)
                    }}
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
                    value={formData.vat_amount}
                    onChange={(e) => setFormData({ ...formData, vat_amount: e.target.value })}
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
                    value={formData.amount_before_tax}
                    onChange={(e) => {
                      const amountBeforeTax = parseFloat(e.target.value) || 0
                      const newFormData: any = { 
                        ...formData, 
                        amount_before_tax: e.target.value,
                        // Reset withholding tax when base amount changes
                        withholding_percent: '',
                        withholding_tax: ''
                      }
                      // Auto-calculate amount and VAT when has_invoice is yes
                      if (formData.has_invoice === 'yes' && amountBeforeTax > 0) {
                        const totalAmount = amountBeforeTax * 1.07
                        const vatAmount = totalAmount - amountBeforeTax
                        newFormData.amount = totalAmount.toFixed(2)
                        newFormData.vat_amount = vatAmount.toFixed(2)
                      }
                      setFormData(newFormData)
                    }}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Withholding Tax Section - Compact Single Line */}
              <div className="border-t pt-4 mt-4">
                <div className="flex flex-wrap items-end gap-3">
                  {/* Label */}
                  <span className="text-sm font-semibold text-gray-900 mb-2">หัก ณ ที่จ่าย:</span>
                  
                  {/* Mode selection - compact */}
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
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
                    <label className="flex items-center gap-1.5 cursor-pointer">
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
                    <label className="flex items-center gap-1.5 cursor-pointer">
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

                  {/* Percentage and Amount - inline */}
                  {(formData.withholding_mode === 'withhold' || formData.withholding_mode === 'continuous') && (
                    <>
                      <div className="w-24">
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
                          className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="">--%</option>
                          <option value="3">3%</option>
                          <option value="5">5%</option>
                        </select>
                      </div>
                      <div className="w-32">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.withholding_tax}
                          onChange={(e) => setFormData({ ...formData, withholding_tax: e.target.value })}
                          placeholder="ยอดหัก"
                          className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm"
                          readOnly
                        />
                      </div>
                    </>
                  )}
                </div>
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
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      ออกใบสำคัญจ่าย
                    </button>
                    {editingExpense?.payment_voucher_id && (
                      <button
                        type="button"
                        onClick={() => handleViewPaymentVoucher(editingExpense.payment_voucher_id!)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        ดูใบสำคัญจ่าย
                      </button>
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

              {/* File Upload - Single field for both images and PDF */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">อัพโหลดไฟล์ (รูปภาพหรือ PDF)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
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
                {editingExpense && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('ต้องการลบรายการนี้?')) {
                        handleDelete(editingExpense.id)
                        setShowModal(false)
                      }
                    }}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    ลบ
                  </button>
                )}
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

      {/* View Payment Voucher Print Modal */}
      {showViewVoucherModal && viewVoucher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[800px]">
            {/* Print Content - A4 Style */}
            <div ref={printRef} className="p-8 bg-white">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  {/* Logo */}
                  {shopSettings?.logo_url ? (
                    <img 
                      src={shopSettings.logo_url} 
                      alt="Logo" 
                      className="w-20 h-20 object-contain rounded-full border-2 border-gray-400"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full border-2 border-gray-400 flex items-center justify-center bg-white">
                      <div className="text-center text-xs text-gray-600">
                        <div className="font-bold">Sa-ang</div>
                        <div className="text-[8px]">PHARMACY</div>
                      </div>
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">{shopSettings?.name || 'ห้างหุ้นส่วนจำกัด สะอางพาณิชย์'}</h2>
                    <p className="text-sm text-gray-600">สำนักงานใหญ่</p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="flex gap-2 mb-1">
                    <span className="text-gray-600">เลขที่</span>
                    <span className="font-medium">{viewVoucher.voucher_number}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-600">วันที่</span>
                    <span className="font-medium">{viewVoucher.voucher_date}</span>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="bg-blue-100 py-2 px-4 mb-4">
                <h1 className="text-xl font-bold text-center text-gray-800">
                  ใบสำคัญจ่าย {viewVoucher.voucher_number}
                </h1>
              </div>

              {/* Payee Info */}
              <div className="mb-6 text-sm">
                <div className="flex gap-2 mb-1">
                  <span className="text-gray-600">จ่ายให้ :</span>
                  <span className="font-medium">{viewVoucher.payee_name}</span>
                </div>
                <div className="flex gap-2 mb-1">
                  <span className="text-gray-600">โดย :</span>
                  <span className="font-medium">S/A {viewVoucher.payee_tax_id || '-'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-600">หมวดหมู่ :</span>
                  <span className="font-medium">{viewVoucherCategory}</span>
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
                  <tr className="border-b border-gray-300">
                    <td className="py-2 px-2">{viewVoucher.expense_document_date}</td>
                    <td className="py-2 px-2">{viewVoucher.description}</td>
                    <td className="py-2 px-2">{viewVoucher.voucher_number}</td>
                    <td className="py-2 px-2 text-right">
                      {viewVoucher.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-2 text-right">0.00</td>
                    <td className="py-2 px-2 text-right">
                      {viewVoucher.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="border-t-2 border-gray-800 font-medium bg-gray-50">
                    <td className="py-2 px-2" colSpan={3}></td>
                    <td className="py-2 px-2 text-right">
                      {viewVoucher.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-2 text-right">0.00</td>
                    <td className="py-2 px-2 text-right">
                      {viewVoucher.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
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
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-gray-600">รวม</span>
                    <span>{viewVoucher.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-gray-600">ภาษีหัก ณ ที่จ่าย</span>
                    <span>0.00</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-gray-600">ภาษีมูลค่าเพิ่ม</span>
                    <span>0.00</span>
                  </div>
                  <div className="flex justify-between py-1 border-b-2 border-gray-800 font-medium">
                    <span>รวมทั้งสิ้น</span>
                    <span>{viewVoucher.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-4 border-t bg-gray-50 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" />
                พิมพ์
              </button>
              <button
                onClick={() => setShowViewVoucherModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expenses Print Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:fixed print:inset-0 print:z-50 print:p-0 print:bg-white">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:shadow-none print:rounded-none print:w-full print:h-screen print:overflow-visible">
            {/* Print Content */}
            <div className="p-8 print:p-6" id="expenses-print-content">
              {/* Header */}
              <div className="text-center mb-6 print:mb-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">รายงานเอกสารค่าใช้จ่าย</h1>
                <p className="text-sm text-gray-600">
                  วันที่พิมพ์: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {/* Summary */}
              <div className="flex justify-between mb-4 text-sm print:text-xs">
                <span className="text-gray-600">จำนวนรายการทั้งหมด: {filteredExpenses.length} รายการ</span>
                <span className="text-gray-600">
                  ยอดรวม: ฿{filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Table - Sorted by date ascending (oldest first) */}
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-800 bg-gray-100">
                    <th className="py-2 px-2 text-center font-medium w-12">ลำดับ</th>
                    <th className="py-2 px-2 text-left font-medium">วันที่ตามเอกสาร</th>
                    <th className="py-2 px-2 text-left font-medium">หมวดหมู่</th>
                    <th className="py-2 px-2 text-left font-medium">รายการ</th>
                    <th className="py-2 px-2 text-left font-medium">ผู้จำหน่าย</th>
                    <th className="py-2 px-2 text-right font-medium">จำนวนเงิน</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filteredExpenses]
                    .sort((a, b) => {
                      const dateA = new Date(a.document_date || a.expense_date || '1970-01-01').getTime()
                      const dateB = new Date(b.document_date || b.expense_date || '1970-01-01').getTime()
                      return dateA - dateB // ascending order (oldest first)
                    })
                    .map((expense, index) => (
                      <tr key={expense.id} className="border-b border-gray-300">
                        <td className="py-2 px-2 text-center">{index + 1}</td>
                        <td className="py-2 px-2">
                          {new Date(expense.document_date || expense.expense_date).toLocaleDateString('en-GB', { 
                            year: 'numeric', 
                            month: 'numeric', 
                            day: 'numeric' 
                          })}
                        </td>
                        <td className="py-2 px-2">{expense.category}</td>
                        <td className="py-2 px-2">{expense.description}</td>
                        <td className="py-2 px-2">{expense.vendor || '-'}</td>
                        <td className="py-2 px-2 text-right font-medium">
                          ฿{expense.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  {/* Total Row */}
                  <tr className="border-t-2 border-gray-800 bg-gray-50 font-medium">
                    <td className="py-2 px-2 text-right" colSpan={5}>รวมทั้งสิ้น</td>
                    <td className="py-2 px-2 text-right">
                      ฿{filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Signature Section */}
              <div className="mt-12 flex justify-between text-sm print:mt-8">
                <div className="text-center">
                  <div className="border-b border-gray-400 w-32 mb-1"></div>
                  <span className="text-gray-600">ผู้จัดทำ</span>
                </div>
                <div className="text-center">
                  <div className="border-b border-gray-400 w-32 mb-1"></div>
                  <span className="text-gray-600">ผู้ตรวจสอบ</span>
                </div>
                <div className="text-center">
                  <div className="border-b border-gray-400 w-32 mb-1"></div>
                  <span className="text-gray-600">ผู้อนุมัติ</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-4 border-t bg-gray-50 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
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

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">เพิ่มคู่ค้าใหม่</h2>
              <button
                onClick={() => {
                  setShowAddContactModal(false)
                  setNewContactForm({
                    name: '',
                    type: 'seller',
                    phone: '',
                    email: '',
                    address: '',
                    tax_id: '',
                    notes: ''
                  })
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSaveNewContact} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อคู่ค้า *</label>
                <input
                  type="text"
                  required
                  value={newContactForm.name}
                  onChange={(e) => setNewContactForm({ ...newContactForm, name: e.target.value })}
                  placeholder="ชื่อบริษัทหรือบุคคล"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
                <select
                  value={newContactForm.type}
                  onChange={(e) => setNewContactForm({ ...newContactForm, type: e.target.value as 'customer' | 'seller' | 'both' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="seller">ผู้ขาย (Seller)</option>
                  <option value="customer">ลูกค้า (Customer)</option>
                  <option value="both">ทั้งสองอย่าง (Both)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="tel"
                    value={newContactForm.phone}
                    onChange={(e) => setNewContactForm({ ...newContactForm, phone: e.target.value })}
                    placeholder="0xx-xxx-xxxx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
                  <input
                    type="email"
                    value={newContactForm.email}
                    onChange={(e) => setNewContactForm({ ...newContactForm, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เลขประจำตัวผู้เสียภาษี</label>
                <input
                  type="text"
                  value={newContactForm.tax_id}
                  onChange={(e) => setNewContactForm({ ...newContactForm, tax_id: e.target.value })}
                  placeholder="เลข 13 หลัก"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่</label>
                <textarea
                  value={newContactForm.address}
                  onChange={(e) => setNewContactForm({ ...newContactForm, address: e.target.value })}
                  rows={2}
                  placeholder="ที่อยู่คู่ค้า..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                <textarea
                  value={newContactForm.notes}
                  onChange={(e) => setNewContactForm({ ...newContactForm, notes: e.target.value })}
                  rows={2}
                  placeholder="หมายเหตุเพิ่มเติม..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddContactModal(false)
                    setNewContactForm({
                      name: '',
                      type: 'seller',
                      phone: '',
                      email: '',
                      address: '',
                      tax_id: '',
                      notes: ''
                    })
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  บันทึกคู่ค้า
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
