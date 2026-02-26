import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import { Receipt, Plus, ArrowLeft, Save } from 'lucide-react'

interface Contact {
  id: string
  name: string
  type: 'customer' | 'seller' | 'both'
  phone?: string
  email?: string
  address?: string
  tax_id?: string
  notes?: string
}

interface ExpenseCategory {
  id: string
  name: string
  color?: string
  chart_of_accounts_code?: string
  is_active: boolean
}

const PAYMENT_METHODS = [
  'เงินสด',
  'โอนเงิน',
  'บัตรเครดิต',
  'เช็ค'
]

export default function AddExpensePage() {
  const navigate = useNavigate()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [paymentMethods, setPaymentMethods] = useState<string[]>([])
  const [paymentMethodRules, setPaymentMethodRules] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  // Add Contact Modal
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

  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]

  const [formData, setFormData] = useState({
    expense_date: dateStr,
    document_date: dateStr,
    category: '',
    description: '',
    amount: '',
    payment_method: '',
    receipt_number: '',
    delivery_number: '',
    vendor: '',
    notes: '',
    has_invoice: 'no',
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

  const [expenseFormTab, setExpenseFormTab] = useState<'basic' | 'extended'>('basic')

  useEffect(() => {
    fetchContacts()
    fetchExpenseCategories()
    fetchPaymentMethods()
    fetchPaymentMethodRules()
  }, [])

  const fetchContacts = async () => {
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .in('type', ['seller', 'both'])
      .order('name')
    if (data) setContacts(data)
  }

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

  const fetchPaymentMethodRules = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_method_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true })
      if (error) {
        console.error('Error fetching payment method rules:', error)
        return
      }
      setPaymentMethodRules(data || [])
    } catch (error) {
      console.error('Error fetching payment method rules:', error)
    }
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const finalDocumentDate = formData.document_date || formData.expense_date

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
        status: 'approved',
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

      // Check if we should auto-generate payment voucher
      const shouldGenerate = shouldAutoGenerateVoucher()

      if (shouldGenerate) {
        const voucherNumber = await generatePaymentVoucherNumber(formData.expense_date)
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

        const { data: voucherResult, error: voucherError } = await supabase
          .from('payment_vouchers')
          .insert(voucherData)
          .select('id')
          .single()

        if (voucherError) {
          console.error('Error creating payment voucher:', voucherError)
        } else if (voucherResult) {
          expenseData.payment_voucher_id = voucherResult.id
        }
      }

      const { error } = await supabase
        .from('expenses')
        .insert(expenseData)
      if (error) throw error

      if (shouldGenerate && expenseData.payment_voucher_id) {
        alert('บันทึกค่าใช้จ่ายสำเร็จ และสร้างใบสำคัญจ่ายอัตโนมัติเรียบร้อยแล้ว')
      }

      navigate('/expenses')
    } catch (error: any) {
      console.error('Error saving expense:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + (error.message || error.details || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNewContact = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert(newContactForm)
        .select()
        .single()
      if (error) throw error
      setContacts(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setFormData(prev => ({ ...prev, vendor: data.name }))
      setShowAddContactModal(false)
      setNewContactForm({ name: '', type: 'seller', phone: '', email: '', address: '', tax_id: '', notes: '' })
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
  }

  // Category-specific field configurations
  // Fields not listed here will be hidden for that category
  type CategoryConfig = {
    fields: string[]
    defaults: Record<string, string>
  }

  const categoryConfigs: Record<string, CategoryConfig> = {
    'ค่า Service Fee Grab': {
      fields: ['document_date', 'category', 'description', 'notes', 'vendor', 'has_invoice', 'receipt_number', 'amount', 'vat_amount', 'amount_before_tax', 'withholding', 'evidence_url', 'file_upload'],
      defaults: { vendor: 'GRAB', has_invoice: 'yes', withholding_mode: 'withhold', withholding_percent: '3', payment_method: 'Grab Wallet' }
    }
  }

  // Get active config (null = show all fields)
  const activeConfig = categoryConfigs[formData.category] || null
  const showField = (field: string) => !activeConfig || activeConfig.fields.includes(field)

  // Quick category buttons
  const quickCategories = [
    'ซื้อสินค้า',
    'ค่าของใช้ - วัสดุสำนักงาน',
    'ค่า Service Fee Grab',
    'ค่าเช่าสำนักงาน',
    'ค่าธรรมเนียม Kbank',
    'ค่าธรรมเนียม Lazada',
    'ค่าธรรมเนียม LINE SHOPPING',
    'ค่าน้ำ',
    'ค่าบัญชี',
    'ค่าไฟฟ้า',
    'ค่าส่ง ปณ. [EMS]',
    'อุปกรณ์สำนักงาน'
  ]

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/expenses')}
            className="p-2 text-gray-400 hover:text-[#7D735F] hover:bg-[#F5F0E6] rounded-full transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="h-6 w-6 text-[#7D735F]" />
              บันทึกค่าใช้จ่าย
            </h1>
          </div>
        </div>
      </div>

      {/* Category Quick Select */}
      <Card className="p-4">
        <label className="block text-sm font-medium text-gray-700 mb-3">บันทึกค่าใช้จ่าย *</label>
        <div className="flex flex-wrap gap-2">
          {expenseCategories
            .filter(cat => quickCategories.includes(cat.name))
            .map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  const config = categoryConfigs[cat.name]
                  const newData: any = {
                    ...formData,
                    category: cat.name,
                    description: formData.description || cat.name
                  }
                  if (config) {
                    Object.entries(config.defaults).forEach(([k, v]) => { newData[k] = v })
                    // Auto-calc withholding if amount exists
                    if (config.defaults.withholding_percent && newData.amount_before_tax) {
                      const base = parseFloat(newData.amount_before_tax) || 0
                      newData.withholding_tax = (base * parseFloat(config.defaults.withholding_percent) / 100).toFixed(2)
                    }
                    // Auto-calc VAT if has_invoice=yes and amount exists
                    if (config.defaults.has_invoice === 'yes' && newData.amount) {
                      const amt = parseFloat(newData.amount) || 0
                      if (amt > 0) {
                        newData.amount_before_tax = (amt / 1.07).toFixed(2)
                        newData.vat_amount = (amt - amt / 1.07).toFixed(2)
                      }
                    }
                  }
                  setFormData(newData)
                }}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-all border ${
                  formData.category === cat.name
                    ? 'bg-[#A8C4D9] text-white border-[#A8C4D9] shadow-md scale-105'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          <button
            type="button"
            onClick={() => {
              setFormData(prev => ({ ...prev, category: '' }))
            }}
            className={`px-3 py-2 rounded-full text-sm font-medium transition-all border ${
              !formData.category || !quickCategories.includes(formData.category)
                ? 'bg-[#A8C4D9] text-white border-[#A8C4D9] shadow-md scale-105'
                : 'bg-[#F0F6FA] text-gray-900 border-[#D0E1ED] hover:bg-[#E4EFF7] hover:border-[#A8C4D9]'
            }`}
          >
            + เพิ่มค่าใช้จ่ายอื่นๆ
          </button>
        </div>
      </Card>

      {/* Expense Form */}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
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
              {/* Row 1: Date, Document Type, Category */}
              <div className={`grid gap-4 ${showField('document_type') ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {showField('document_date') && (
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
                )}
                {showField('document_type') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
                    <select
                      value={formData.document_type}
                      onChange={(e) => setFormData({
                        ...formData,
                        document_type: e.target.value,
                        category: ''
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">--</option>
                      <option value="ซื้อสินค้า">ซื้อสินค้า</option>
                      <option value="ค่าใช้จ่ายในการขาย">ค่าใช้จ่ายในการขาย</option>
                      <option value="ค่าใช้จ่ายในการบริหาร">ค่าใช้จ่ายในการบริหาร</option>
                    </select>
                  </div>
                )}
                {showField('category') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่</label>
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        const config = categoryConfigs[e.target.value]
                        const newData: any = { ...formData, category: e.target.value }
                        if (config) {
                          Object.entries(config.defaults).forEach(([k, v]) => { newData[k] = v })
                        }
                        setFormData(newData)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- เลือกหมวดอื่นๆ --</option>
                      {expenseCategories
                        .filter(cat => {
                          if (!formData.document_type) return true
                          const code = cat.chart_of_accounts_code || ''
                          if (formData.document_type === 'ซื้อสินค้า') return code.startsWith('51')
                          if (formData.document_type === 'ค่าใช้จ่ายในการขาย') return code.startsWith('52')
                          if (formData.document_type === 'ค่าใช้จ่ายในการบริหาร') return code.startsWith('53')
                          return true
                        })
                        .map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))
                      }
                    </select>
                  </div>
                )}
              </div>

              {/* Row 2: Description and Notes */}
              <div className="grid grid-cols-2 gap-4">
                {showField('description') && (
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
                )}
                {showField('notes') && (
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
                )}
              </div>

              {/* Row 3: Vendor and Tax ID */}
              {(showField('vendor') || showField('seller_tax_id')) && (
                <div className="grid grid-cols-2 gap-4">
                  {showField('vendor') && (
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
                  )}
                  {showField('seller_tax_id') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">เลขประจำตัวผู้เสียภาษี</label>
                      <input
                        type="text"
                        value={formData.seller_tax_id}
                        onChange={(e) => {
                          const newTaxId = e.target.value
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
                  )}
                </div>
              )}

              {/* Has Invoice */}
              {showField('has_invoice') && (
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
              )}

              {/* Tax Invoice Info */}
              {(showField('receipt_number') || showField('delivery_number')) && (
                <div className="grid grid-cols-2 gap-4">
                  {showField('receipt_number') && (
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
                  )}
                  {showField('delivery_number') && (
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
                  )}
                </div>
              )}

              {/* Amount fields */}
              <div className="grid grid-cols-3 gap-4">
                {showField('amount') && (
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
                          amount: e.target.value
                        }
                        // Preserve withholding settings from config
                        if (!activeConfig) {
                          newFormData.withholding_percent = ''
                          newFormData.withholding_tax = ''
                        }
                        if (formData.has_invoice === 'yes' && amount > 0) {
                          const amountBeforeTax = amount / 1.07
                          const vatAmount = amount - amountBeforeTax
                          newFormData.amount_before_tax = amountBeforeTax.toFixed(2)
                          newFormData.vat_amount = vatAmount.toFixed(2)
                          // Auto-calc withholding if percent is set
                          if (formData.withholding_percent) {
                            newFormData.withholding_tax = (amountBeforeTax * parseFloat(formData.withholding_percent) / 100).toFixed(2)
                          }
                        }
                        setFormData(newFormData)
                      }}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                {showField('vat_amount') && (
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
                )}
                {showField('amount_before_tax') && (
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
                          amount_before_tax: e.target.value
                        }
                        if (!activeConfig) {
                          newFormData.withholding_percent = ''
                          newFormData.withholding_tax = ''
                        }
                        if (formData.has_invoice === 'yes' && amountBeforeTax > 0) {
                          const totalAmount = amountBeforeTax * 1.07
                          const vatAmount = totalAmount - amountBeforeTax
                          newFormData.amount = totalAmount.toFixed(2)
                          newFormData.vat_amount = vatAmount.toFixed(2)
                          if (formData.withholding_percent) {
                            newFormData.withholding_tax = (amountBeforeTax * parseFloat(formData.withholding_percent) / 100).toFixed(2)
                          }
                        }
                        setFormData(newFormData)
                      }}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Withholding Tax Section */}
              {showField('withholding') && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <span className="text-sm font-semibold text-gray-900 mb-2">หัก ณ ที่จ่าย:</span>
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

                    {(formData.withholding_mode === 'withhold' || formData.withholding_mode === 'continuous') && (
                      <>
                        <div className="w-24">
                          <select
                            value={formData.withholding_percent}
                            onChange={(e) => {
                              const percent = e.target.value
                              const baseAmount = parseFloat(formData.amount_before_tax) || 0
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
              )}

              {/* Payment fields */}
              {(showField('payment_method') || showField('expense_date') || showField('payment_slip')) && (
                <div className="grid grid-cols-3 gap-4">
                  {showField('payment_method') && (
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
                  )}
                  {showField('expense_date') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ชำระเงิน</label>
                      <input
                        type="date"
                        value={formData.expense_date}
                        onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  {showField('payment_slip') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ไฟล์สลิปจ่ายเงิน</label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* URL Evidence */}
              {showField('evidence_url') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL หลักฐาน</label>
                  <input
                    type="url"
                    value={formData.evidence_url}
                    onChange={(e) => setFormData({ ...formData, evidence_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* File Upload */}
              {showField('file_upload') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">อัพโหลดไฟล์ (รูปภาพหรือ PDF)</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              )}
            </>
          )}

          {expenseFormTab === 'extended' && (
            <>
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

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[#A67B5B] hover:bg-[#8C6E4A] text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'กำลังบันทึก...' : 'บันทึกค่าใช้จ่าย'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/expenses')}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </Card>

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">เพิ่มคู่ค้าใหม่</h3>
              <button onClick={() => setShowAddContactModal(false)} className="text-gray-400 hover:text-gray-600">
                <Plus className="h-5 w-5 rotate-45" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ *</label>
                <input
                  type="text"
                  value={newContactForm.name}
                  onChange={(e) => setNewContactForm({ ...newContactForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="ชื่อบริษัท/ร้านค้า"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เลขผู้เสียภาษี</label>
                <input
                  type="text"
                  value={newContactForm.tax_id}
                  onChange={(e) => setNewContactForm({ ...newContactForm, tax_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="เลขผู้เสียภาษี 13 หลัก"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">โทร</label>
                <input
                  type="tel"
                  value={newContactForm.phone}
                  onChange={(e) => setNewContactForm({ ...newContactForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveNewContact}
                  disabled={!newContactForm.name}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  บันทึก
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
