import { useState, useEffect, useRef } from 'react'
import { supabase } from '../services/supabase'
import { useSearchParams } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { 
  FileText, 
  Share2, 
  Printer, 
  Download, 
  MoreHorizontal, 
  Plus, 
  Trash2, 
  Building, 
  Phone, 
  Search,
  X,
  Image as ImageIcon,
  Upload,
  Edit2,
  Check,
  Calendar,
  Percent,
  ChevronDown,
  Link as LinkIcon
} from 'lucide-react'

interface QuotationItem {
  id: string
  product_id?: string
  product_name: string
  product_image?: string
  details: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  discount_percent: number
  discount_amount: number
  total: number
}

interface Contact {
  id: string
  name: string
  type?: 'buyer' | 'seller' | 'both'
  phone?: string
  email?: string
  address?: string
  company_name?: string
  tax_id?: string
  code?: string
  notes?: string
}

interface Product {
  id: string
  name_th: string
  name_en?: string
  barcode?: string
  base_price: number
  image_url?: string
  unit?: string
  is_active: boolean
}

interface Quotation {
  id: string
  quotation_number: string
  contact_id: string | null
  contact_name: string
  contact_company: string
  contact_address: string
  contact_tax_id: string
  contact_phone: string
  issue_date: string
  expiry_date: string
  items: QuotationItem[]
  subtotal: number
  discount_amount: number
  discount_percent: number
  tax_amount: number
  tax_rate: number
  tax_type: 'inclusive' | 'exclusive'
  total_amount: number
  notes: string
  terms: string
  status: 'draft' | 'sent' | 'approved' | 'rejected'
  logo_url?: string
  stamp_url?: string
  show_product_images: boolean
  withholding_tax: boolean
  withholding_tax_percent: number
  withholding_tax_amount: number
}

const initialItem: QuotationItem = {
  id: '',
  product_name: '',
  details: '',
  description: '',
  quantity: 1,
  unit: 'ชิ้น',
  unit_price: 0,
  discount_percent: 0,
  discount_amount: 0,
  total: 0
}

export default function QuotationPage() {
  const [searchParams] = useSearchParams()
  const quotationId = searchParams.get('id')
  
  const [quotation, setQuotation] = useState<Quotation>({
    id: '',
    quotation_number: '',
    contact_id: null,
    contact_name: '',
    contact_company: '',
    contact_address: '',
    contact_tax_id: '',
    contact_phone: '',
    issue_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [{ ...initialItem, id: '1' }],
    subtotal: 0,
    discount_amount: 0,
    discount_percent: 0,
    tax_amount: 0,
    tax_rate: 7,
    tax_type: 'exclusive',
    total_amount: 0,
    notes: '',
    terms: 'ราคานี้มีผลภายใน 30 วัน นับจากวันออกใบเสนอราคา',
    status: 'draft',
    show_product_images: false,
    withholding_tax: false,
    withholding_tax_percent: 3,
    withholding_tax_amount: 0
  })
  
  const [contacts, setContacts] = useState<Contact[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showContactModal, setShowContactModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [showNewContactModal, setShowNewContactModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingQuotationNumber, setEditingQuotationNumber] = useState(false)
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [contactSearchTerm, setContactSearchTerm] = useState('')
  
  const [newContact, setNewContact] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    address: '',
    tax_id: ''
  })
  
  const logoInputRef = useRef<HTMLInputElement>(null)
  const stampInputRef = useRef<HTMLInputElement>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchContacts()
    fetchProducts()
    if (quotationId) {
      fetchQuotation(quotationId)
    } else {
      generateQuotationNumber()
    }
  }, [quotationId])

  useEffect(() => {
    calculateTotals()
  }, [quotation.items, quotation.discount_amount, quotation.tax_rate])

  const generateQuotationNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select('quotation_number')
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (error) throw error
      
      let nextNumber = 1
      if (data && data.length > 0) {
        const lastNumber = parseInt(data[0].quotation_number.slice(-3))
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1
        }
      }
      
      const prefix = 'QT' + new Date().getFullYear().toString().slice(-2) + String(new Date().getMonth() + 1).padStart(2, '0') + String(new Date().getDate()).padStart(2, '0')
      setQuotation(prev => ({
        ...prev,
        quotation_number: prefix + String(nextNumber).padStart(3, '0')
      }))
    } catch (error) {
      console.error('Error generating quotation number:', error)
    }
  }

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, type, phone, email, address, company_name, tax_id')
        .order('name')
      
      if (error) throw error
      setContacts(data || [])
    } catch (error) {
      console.error('Error fetching contacts:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name_th, name_en, barcode, base_price, image_url, unit, is_active')
        .eq('is_active', true)
        .order('name_th')
      
      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const fetchQuotation = async (id: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      
      if (data) {
        setQuotation({
          id: data.id,
          quotation_number: data.quotation_number,
          contact_id: data.contact_id,
          contact_name: data.contact_name || '',
          contact_company: data.contact_company || '',
          contact_address: data.contact_address || '',
          contact_tax_id: data.contact_tax_id || '',
          contact_phone: data.contact_phone || '',
          issue_date: data.issue_date,
          expiry_date: data.expiry_date,
          items: data.items || [{ ...initialItem, id: '1' }],
          subtotal: data.subtotal || 0,
          discount_amount: data.discount_amount || 0,
          discount_percent: data.discount_percent || 0,
          tax_amount: data.tax_amount || 0,
          tax_rate: data.tax_rate || 7,
          tax_type: data.tax_type || 'exclusive',
          total_amount: data.total_amount || 0,
          notes: data.notes || '',
          terms: data.terms || '',
          status: data.status || 'draft',
          logo_url: data.logo_url,
          stamp_url: data.stamp_url,
          show_product_images: data.show_product_images || false,
          withholding_tax: data.withholding_tax || false,
          withholding_tax_percent: data.withholding_tax_percent || 3,
          withholding_tax_amount: data.withholding_tax_amount || 0
        })
      }
    } catch (error) {
      console.error('Error fetching quotation:', error)
      alert('ไม่สามารถโหลดข้อมูลใบเสนอราคาได้')
    } finally {
      setLoading(false)
    }
  }

  const calculateTotals = () => {
    let subtotal = quotation.items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unit_price
      const itemDiscount = itemSubtotal * (item.discount_percent / 100) + item.discount_amount
      return sum + itemSubtotal - itemDiscount
    }, 0)
    
    if (quotation.discount_percent > 0) {
      subtotal = subtotal * (1 - quotation.discount_percent / 100)
    }
    subtotal -= quotation.discount_amount
    
    let taxAmount = 0
    if (quotation.tax_type === 'exclusive') {
      taxAmount = subtotal * (quotation.tax_rate / 100)
    } else {
      taxAmount = subtotal - (subtotal / (1 + quotation.tax_rate / 100))
      subtotal = subtotal - taxAmount
    }
    
    const total = subtotal + (quotation.tax_type === 'exclusive' ? taxAmount : 0)
    
    let withholdingAmount = 0
    if (quotation.withholding_tax) {
      withholdingAmount = total * (quotation.withholding_tax_percent / 100)
    }
    
    setQuotation(prev => ({
      ...prev,
      subtotal,
      tax_amount: taxAmount,
      total_amount: total - withholdingAmount,
      withholding_tax_amount: withholdingAmount
    }))
  }

  const updateItem = (index: number, field: keyof QuotationItem, value: any) => {
    const newItems = [...quotation.items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Recalculate total for this item
    const item = newItems[index]
    const itemSubtotal = item.quantity * item.unit_price
    const itemDiscount = itemSubtotal * (item.discount_percent / 100) + item.discount_amount
    item.total = itemSubtotal - itemDiscount
    
    setQuotation(prev => ({ ...prev, items: newItems }))
  }

  const addItem = () => {
    setQuotation(prev => ({
      ...prev,
      items: [...prev.items, { ...initialItem, id: Date.now().toString() }]
    }))
  }

  const removeItem = (index: number) => {
    if (quotation.items.length === 1) return
    const newItems = quotation.items.filter((_, i) => i !== index)
    setQuotation(prev => ({ ...prev, items: newItems }))
  }

  const selectContact = (contact: Contact) => {
    setQuotation(prev => ({
      ...prev,
      contact_id: contact.id,
      contact_name: contact.name,
      contact_company: contact.company_name || '',
      contact_address: contact.address || '',
      contact_tax_id: contact.tax_id || '',
      contact_phone: contact.phone || ''
    }))
    setShowContactModal(false)
    setContactSearchTerm('')
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const quotationData = {
        quotation_number: quotation.quotation_number,
        contact_id: quotation.contact_id,
        contact_name: quotation.contact_name,
        contact_company: quotation.contact_company,
        contact_address: quotation.contact_address,
        contact_tax_id: quotation.contact_tax_id,
        contact_phone: quotation.contact_phone,
        issue_date: quotation.issue_date,
        expiry_date: quotation.expiry_date,
        items: quotation.items,
        subtotal: quotation.subtotal,
        discount_amount: quotation.discount_amount,
        discount_percent: quotation.discount_percent,
        tax_rate: quotation.tax_rate,
        tax_type: quotation.tax_type,
        tax_amount: quotation.tax_amount,
        total_amount: quotation.total_amount,
        notes: quotation.notes,
        terms: quotation.terms,
        logo_url: quotation.logo_url,
        stamp_url: quotation.stamp_url,
        show_product_images: quotation.show_product_images,
        withholding_tax: quotation.withholding_tax,
        withholding_tax_percent: quotation.withholding_tax_percent,
        withholding_tax_amount: quotation.withholding_tax_amount,
        status: quotation.status || 'draft'
      }

      let result
      if (quotation.id) {
        // Update existing
        result = await supabase
          .from('quotations')
          .update(quotationData)
          .eq('id', quotation.id)
          .select()
          .single()
      } else {
        // Create new
        result = await supabase
          .from('quotations')
          .insert([quotationData])
          .select()
          .single()
      }
      
      if (result.error) throw result.error
      
      if (result.data) {
        setQuotation(prev => ({ ...prev, id: result.data.id }))
      }
      
      alert(quotation.id ? 'อัพเดทใบเสนอราคาสำเร็จ' : 'บันทึกใบเสนอราคาสำเร็จ')
      
      // Redirect to list after creating new
      if (!quotation.id) {
        window.location.href = '/quotations'
      }
    } catch (error) {
      console.error('Error saving quotation:', error)
      alert('ไม่สามารถบันทึกใบเสนอราคาได้')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file: File, type: 'logo' | 'stamp') => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${type}_${Date.now()}.${fileExt}`
      const filePath = `quotations/${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file)
      
      if (uploadError) throw uploadError
      
      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath)
      
      setQuotation(prev => ({
        ...prev,
        [type === 'logo' ? 'logo_url' : 'stamp_url']: publicUrl
      }))
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('ไม่สามารถอัพโหลดไฟล์ได้')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/quotation/${quotation.id || 'preview'}`
    navigator.clipboard.writeText(shareUrl)
    setShowShareModal(true)
    setTimeout(() => setShowShareModal(false), 2000)
  }

  const handleDownloadPDF = () => {
    window.print()
  }

  const handleCreateContact = async () => {
    if (!newContact.name) return
    
    try {
      const { data: contactData, error } = await supabase
        .from('contacts')
        .insert([{
          name: newContact.name,
          company: newContact.company,
          phone: newContact.phone,
          email: newContact.email,
          address: newContact.address,
          tax_id: newContact.tax_id,
          type: 'buyer'
        }])
        .select()
        .single()
      
      if (error) throw error
      
      if (contactData) {
        setContacts(prev => [...prev, contactData])
        selectContact(contactData)
        setShowNewContactModal(false)
        setNewContact({ name: '', company: '', phone: '', email: '', address: '', tax_id: '' })
      }
    } catch (error) {
      console.error('Error creating contact:', error)
      alert('ไม่สามารถสร้างลูกค้าได้')
    }
  }

  const selectProduct = (product: Product, index: number) => {
    const newItems = [...quotation.items]
    newItems[index] = {
      ...newItems[index],
      product_id: product.id,
      product_name: product.name_th,
      product_image: product.image_url,
      unit_price: product.base_price,
      unit: product.unit || 'ชิ้น'
    }
    
    const item = newItems[index]
    const itemSubtotal = item.quantity * item.unit_price
    const itemDiscount = itemSubtotal * (item.discount_percent / 100) + item.discount_amount
    item.total = itemSubtotal - itemDiscount
    
    setQuotation(prev => ({ ...prev, items: newItems }))
    setShowProductModal(false)
    setActiveItemIndex(null)
    setSearchTerm('')
  }

  const filteredProducts = products.filter(p => 
    p.name_th.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchTerm))
  )

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
    (c.company_name && c.company_name.toLowerCase().includes(contactSearchTerm.toLowerCase()))
  )

  const formatNumber = (num: number) => {
    return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Print Styles */}
      <style>{`
        .print-only { display: none; }
        @media print {
          .print-only { display: block !important; }
          .no-print { display: none !important; }
          body { font-family: 'Sarabun', 'Prompt', sans-serif; }
        }
      `}</style>

      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-[#4A90A4]" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">สร้างใบเสนอราคา</h1>
              {editingQuotationNumber ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={quotation.quotation_number}
                    onChange={(e) => setQuotation(prev => ({ ...prev, quotation_number: e.target.value }))}
                    className="w-40 text-sm"
                    onBlur={() => setEditingQuotationNumber(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingQuotationNumber(false)}
                    autoFocus
                  />
                  <button onClick={() => setEditingQuotationNumber(false)} className="text-green-600">
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-500">{quotation.quotation_number}</span>
                  <button 
                    onClick={() => setEditingQuotationNumber(true)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => window.history.back()}>
            ปิดหน้าต่าง
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-[#7cb342] hover:bg-[#6ba32e] text-white">
            {loading ? 'กำลังบันทึก...' : 'บันทึกร่าง'}
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="no-print flex justify-end gap-2 mb-4">
        <button onClick={handleShare} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded" title="แชร์ลิงก์">
          <Share2 className="h-5 w-5" />
        </button>
        <button onClick={handlePrint} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded" title="พิมพ์">
          <Printer className="h-5 w-5" />
        </button>
        <button onClick={handleDownloadPDF} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded" title="ดาวน์โหลด PDF">
          <Download className="h-5 w-5" />
        </button>
        <div className="relative" ref={moreMenuRef}>
          <button onClick={() => setShowMoreMenu(!showMoreMenu)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {showMoreMenu && (
            <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-2 space-y-1">
                <button onClick={() => logoInputRef.current?.click()} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  {quotation.logo_url ? 'เปลี่ยนโลโก้' : 'เพิ่มโลโก้'}
                </button>
                <button onClick={() => stampInputRef.current?.click()} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  {quotation.stamp_url ? 'เปลี่ยนตราประทับ' : 'เพิ่มตราประทับ'}
                </button>
                <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded">
                  <input type="checkbox" checked={quotation.show_product_images} onChange={(e) => setQuotation(prev => ({ ...prev, show_product_images: e.target.checked }))} className="rounded" />
                  แสดงรูปสินค้า
                </label>
                {quotation.logo_url && (
                  <button onClick={() => setQuotation(prev => ({ ...prev, logo_url: undefined }))} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded">
                    ลบโลโก้
                  </button>
                )}
                {quotation.stamp_url && (
                  <button onClick={() => setQuotation(prev => ({ ...prev, stamp_url: undefined }))} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded">
                    ลบตราประทับ
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'logo')} />
      <input ref={stampInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'stamp')} />

      {/* Print-Only Section - FlowAccount Style */}
      <div className="print-only">
        {/* Header with Logo */}
        <div className="flow-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              {quotation.logo_url && <img src={quotation.logo_url} alt="Logo" style={{ height: '60px', objectFit: 'contain', marginBottom: '10px' }} />}
              <div className="flow-company-info">
                <strong>More Drug Store</strong><br />
                123 ถนนสุขุมวิท กรุงเทพฯ<br />
                โทร: 02-123-4567 | อีเมล: contact@moredrugstore.com<br />
                เลขประจำตัวผู้เสียภาษี: 1234567890123
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', marginBottom: '10px' }}>ใบเสนอราคา</h1>
              <div style={{ fontSize: '14px' }}>
                <strong>เลขที่:</strong> {quotation.quotation_number}<br />
                <strong>วันที่:</strong> {new Date(quotation.issue_date).toLocaleDateString('th-TH')}<br />
                <strong>ครบกำหนด:</strong> {new Date(quotation.expiry_date).toLocaleDateString('th-TH')}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="flow-customer-info">
          <strong style={{ fontSize: '14px' }}>ลูกค้า</strong>
          <div style={{ marginTop: '8px', lineHeight: '1.6' }}>
            <strong>{quotation.contact_name}</strong><br />
            {quotation.contact_company && <>{quotation.contact_company}<br /></>}
            {quotation.contact_address && <>{quotation.contact_address}<br /></>}
            {quotation.contact_tax_id && <>เลขประจำตัวผู้เสียภาษี: {quotation.contact_tax_id}<br /></>}
            {quotation.contact_phone && <>โทร: {quotation.contact_phone}</>}
          </div>
        </div>

        {/* Items Table */}
        <table className="flow-table">
          <thead>
            <tr>
              <th style={{ width: '5%' }}>#</th>
              <th style={{ width: '40%' }}>รายการ</th>
              <th style={{ width: '10%', textAlign: 'center' }}>จำนวน</th>
              <th style={{ width: '10%', textAlign: 'center' }}>หน่วย</th>
              <th style={{ width: '15%', textAlign: 'right' }}>ราคาต่อหน่วย</th>
              <th style={{ width: '20%', textAlign: 'right' }}>จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {quotation.items.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>
                  <strong>{item.product_name}</strong>
                  {item.details && <br />}
                  {item.details && <span style={{ fontSize: '11px', color: '#666' }}>{item.details}</span>}
                </td>
                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ textAlign: 'center' }}>{item.unit}</td>
                <td style={{ textAlign: 'right' }}>{formatNumber(item.unit_price)}</td>
                <td style={{ textAlign: 'right' }}>{formatNumber(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <div style={{ flex: 1 }}>
            <div className="flow-total" style={{ maxWidth: '300px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>รวมเป็นเงิน</span>
                <span>{formatNumber(quotation.subtotal)} บาท</span>
              </div>
              {quotation.discount_percent > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>ส่วนลด {quotation.discount_percent}%</span>
                  <span>{formatNumber(quotation.subtotal * quotation.discount_percent / 100)} บาท</span>
                </div>
              )}
              {quotation.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>ส่วนลด</span>
                  <span>{formatNumber(quotation.discount_amount)} บาท</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>ราคาก่อนภาษี</span>
                <span>{formatNumber(quotation.subtotal - (quotation.subtotal * quotation.discount_percent / 100) - quotation.discount_amount)} บาท</span>
              </div>
              {quotation.tax_rate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>ภาษีมูลค่าเพิ่ม {quotation.tax_rate}%</span>
                  <span>{formatNumber(quotation.tax_amount)} บาท</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', borderTop: '2px solid #333', paddingTop: '10px', marginTop: '10px' }}>
                <span>ยอดรวมทั้งสิ้น</span>
                <span>{formatNumber(quotation.total_amount + quotation.withholding_tax_amount)} บาท</span>
              </div>
              {quotation.withholding_tax && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', color: '#666' }}>
                  <span>หักภาษี ณ ที่จ่าย {quotation.withholding_tax_percent}%</span>
                  <span>-{formatNumber(quotation.withholding_tax_amount)} บาท</span>
                </div>
              )}
              {quotation.withholding_tax && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontWeight: 'bold', color: '#4A90A4' }}>
                  <span>ยอดชำระสุทธิ</span>
                  <span>{formatNumber(quotation.total_amount)} บาท</span>
                </div>
              )}
            </div>
            
            {/* Terms and Notes */}
            {quotation.terms && (
              <div style={{ marginTop: '20px', fontSize: '12px' }}>
                <strong>เงื่อนไขการชำระเงิน:</strong><br />
                <div style={{ whiteSpace: 'pre-wrap' }}>{quotation.terms}</div>
              </div>
            )}
            {quotation.notes && (
              <div style={{ marginTop: '15px', fontSize: '12px' }}>
                <strong>หมายเหตุ:</strong><br />
                {quotation.notes}
              </div>
            )}
          </div>

          {/* Signature Section */}
          <div style={{ width: '250px', textAlign: 'center' }}>
            {quotation.stamp_url && (
              <img src={quotation.stamp_url} alt="Stamp" style={{ width: '100px', height: '100px', objectFit: 'contain', marginBottom: '10px' }} />
            )}
            <div style={{ borderTop: '1px solid #333', marginTop: '60px', paddingTop: '10px' }}>
              <div style={{ fontSize: '14px' }}>ผู้เสนอราคา</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #ddd', fontSize: '11px', color: '#666', textAlign: 'center' }}>
          เอกสารนี้สร้างจากระบบ More Drug Store | ใบเสนอราคานี้มีอายุถึงวันที่ {new Date(quotation.expiry_date).toLocaleDateString('th-TH')}
        </div>
      </div>

      {/* Form Fields - Hidden when printing */}
      <div className="no-print">
        <Card className="mb-6">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อลูกค้า/ร้านค้า</label>
              <button onClick={() => setShowContactModal(true)} className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-left">
                <span className={quotation.contact_name ? 'text-gray-900' : 'text-gray-400'}>
                  {quotation.contact_name || 'เลือกลูกค้าหรือสร้างรายการใหม่'}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              
              {quotation.contact_name && (
                <div className="mt-3 space-y-1 text-sm text-gray-600">
                  {quotation.contact_company && <p><Building className="h-4 w-4 inline mr-1" /> {quotation.contact_company}</p>}
                  {quotation.contact_tax_id && <p>เลขประจำตัวผู้เสียภาษี: {quotation.contact_tax_id}</p>}
                  {quotation.contact_address && <p>ที่อยู่: {quotation.contact_address}</p>}
                  {quotation.contact_phone && <p><Phone className="h-4 w-4 inline mr-1" /> {quotation.contact_phone}</p>}
                </div>
              )}

              <div className="mt-3">
                <Input placeholder="เพิ่มบันทึกเกี่ยวกับลูกค้า..." value={quotation.notes} onChange={(e) => setQuotation(prev => ({ ...prev, notes: e.target.value }))} className="text-sm" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันที่</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <Input type="date" value={quotation.issue_date} onChange={(e) => setQuotation(prev => ({ ...prev, issue_date: e.target.value }))} className="flex-1" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ครบกำหนด</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <Input type="date" value={quotation.expiry_date} onChange={(e) => setQuotation(prev => ({ ...prev, expiry_date: e.target.value }))} className="flex-1" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-blue-600 text-sm">
                  <input type="checkbox" checked={quotation.tax_rate > 0} onChange={(e) => setQuotation(prev => ({ ...prev, tax_rate: e.target.checked ? 7 : 0 }))} className="rounded" />
                  ภาษีมูลค่าเพิ่ม {quotation.tax_rate}%
                </label>
                <select value={quotation.tax_type} onChange={(e) => setQuotation(prev => ({ ...prev, tax_type: e.target.value as 'inclusive' | 'exclusive' }))} className="text-sm border border-gray-300 rounded px-2 py-1">
                  <option value="exclusive">ไม่รวม VAT</option>
                  <option value="inclusive">รวม VAT</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#4A90A4] text-white">
              <tr>
                <th className="px-3 py-3 text-left text-sm font-medium w-12">#</th>
                {quotation.show_product_images && <th className="px-3 py-3 text-center text-sm font-medium w-16"></th>}
                <th className="px-3 py-3 text-left text-sm font-medium">รายละเอียดสินค้า/บริการ</th>
                <th className="px-3 py-3 text-center text-sm font-medium w-24">จำนวน</th>
                <th className="px-3 py-3 text-center text-sm font-medium w-20">หน่วย</th>
                <th className="px-3 py-3 text-right text-sm font-medium w-28">ราคาต่อหน่วย</th>
                <th className="px-3 py-3 text-right text-sm font-medium w-24">ส่วนลด</th>
                <th className="px-3 py-3 text-right text-sm font-medium w-28">ราคารวม</th>
                <th className="px-3 py-3 text-center text-sm font-medium w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {quotation.items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 text-sm text-gray-500">{index + 1}</td>
                  {quotation.show_product_images && (
                    <td className="px-3 py-3 text-center">
                      {item.product_image ? (
                        <img src={item.product_image} alt={item.product_name} className="h-10 w-10 object-cover rounded mx-auto" />
                      ) : (
                        <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center mx-auto">
                          <ImageIcon className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </td>
                  )}
                  <td className="px-3 py-3">
                    <button onClick={() => { setActiveItemIndex(index); setShowProductModal(true); }} className="w-full text-left">
                      <Input placeholder="คลิกเพื่อเลือกสินค้าหรือพิมพ์ชื่อสินค้า..." value={item.product_name} readOnly className="text-sm mb-1 cursor-pointer bg-gray-50" />
                    </button>
                    <Input placeholder="รายละเอียด (เช่น รุ่น, สี, ขนาด...)" value={item.details} onChange={(e) => updateItem(index, 'details', e.target.value)} className="text-sm mb-1" />
                    <Input placeholder="รายละเอียดเพิ่มเติม..." value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} className="text-sm text-gray-500" />
                  </td>
                  <td className="px-3 py-3">
                    <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)} className="text-center text-sm" />
                  </td>
                  <td className="px-3 py-3">
                    <Input value={item.unit} onChange={(e) => updateItem(index, 'unit', e.target.value)} className="text-center text-sm" />
                  </td>
                  <td className="px-3 py-3">
                    <Input type="number" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)} className="text-right text-sm" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <Input type="number" value={item.discount_percent} onChange={(e) => updateItem(index, 'discount_percent', parseFloat(e.target.value) || 0)} className="text-right text-sm w-14" />
                      <span className="text-xs text-gray-500">%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-medium">{formatNumber(item.total)}</td>
                  <td className="px-3 py-3 text-center">
                    <button onClick={() => removeItem(index)} className="text-gray-400 hover:text-red-500" disabled={quotation.items.length === 1}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t">
          <Button variant="secondary" onClick={addItem} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            เพิ่มรายการ
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">เงื่อนไขและหมายเหตุ</label>
              <textarea rows={3} value={quotation.terms} onChange={(e) => setQuotation(prev => ({ ...prev, terms: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4A90A4] focus:border-transparent" />
            </div>
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">ไฟล์แนบ</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <div className="text-gray-400 mb-2"><Upload className="h-8 w-8 mx-auto" /></div>
                <p className="text-sm text-gray-500">คลิกเพื่อเลือกไฟล์</p>
                <p className="text-xs text-gray-400">หรือลากและวางไฟล์ที่นี่</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">รวมเป็นเงิน</span>
              <span className="text-sm font-medium">{formatNumber(quotation.subtotal)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">ส่วนลด</span>
                <div className="flex items-center gap-1">
                  <Input type="number" value={quotation.discount_percent} onChange={(e) => setQuotation(prev => ({ ...prev, discount_percent: parseFloat(e.target.value) || 0 }))} className="w-16 text-right text-sm" />
                  <Percent className="h-3 w-3 text-gray-400" />
                </div>
              </div>
              <span className="text-sm font-medium">{formatNumber(quotation.subtotal * quotation.discount_percent / 100)}</span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">ส่วนลด (บาท)</span>
                <Input type="number" value={quotation.discount_amount} onChange={(e) => setQuotation(prev => ({ ...prev, discount_amount: parseFloat(e.target.value) || 0 }))} className="w-24 text-right text-sm" />
              </div>
              <span className="text-sm font-medium">{formatNumber(quotation.discount_amount)}</span>
            </div>

            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>ราคาหลังหักส่วนลด</span>
              <span>{formatNumber(quotation.subtotal - (quotation.subtotal * quotation.discount_percent / 100) - quotation.discount_amount)}</span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-blue-600 text-sm">
                  <input type="checkbox" checked={quotation.tax_rate > 0} onChange={(e) => setQuotation(prev => ({ ...prev, tax_rate: e.target.checked ? 7 : 0 }))} className="rounded" />
                  ภาษีมูลค่าเพิ่ม {quotation.tax_rate}%
                </label>
                <span className="text-xs text-gray-400">({quotation.tax_type === 'inclusive' ? 'รวม' : 'ไม่รวม'})</span>
              </div>
              <span className="text-sm font-medium">{formatNumber(quotation.tax_amount)}</span>
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">ยอดรวมทั้งสิ้น</span>
                <span className="text-xl font-bold text-[#4A90A4]">{formatNumber(quotation.total_amount + quotation.withholding_tax_amount)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-blue-600 text-sm">
                  <input type="checkbox" checked={quotation.withholding_tax} onChange={(e) => setQuotation(prev => ({ ...prev, withholding_tax: e.target.checked }))} className="rounded" />
                  หักภาษี ณ ที่จ่าย
                </label>
                {quotation.withholding_tax && (
                  <select value={quotation.withholding_tax_percent} onChange={(e) => setQuotation(prev => ({ ...prev, withholding_tax_percent: parseInt(e.target.value) }))} className="text-sm border border-gray-300 rounded px-2 py-1">
                    <option value={1}>1%</option>
                    <option value={1.5}>1.5%</option>
                    <option value={2}>2%</option>
                    <option value={3}>3%</option>
                    <option value={5}>5%</option>
                    <option value={10}>10%</option>
                    <option value={15}>15%</option>
                  </select>
                )}
              </div>
              {quotation.withholding_tax && (
                <span className="text-sm font-medium text-red-600">-{formatNumber(quotation.withholding_tax_amount)}</span>
              )}
            </div>

            {quotation.withholding_tax && (
              <div className="flex justify-between items-center bg-red-50 p-2 rounded">
                <span className="text-sm font-medium text-gray-900">ยอดชำระสุทธิ</span>
                <span className="text-lg font-bold text-[#4A90A4]">{formatNumber(quotation.total_amount)}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">เลือกลูกค้า</h3>
              <button onClick={() => setShowContactModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 border-b">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input placeholder="ค้นหาลูกค้า..." value={contactSearchTerm} onChange={(e) => setContactSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Button onClick={() => { setShowContactModal(false); setShowNewContactModal(true); }} className="flex items-center gap-2 bg-[#4A90A4] hover:bg-[#3d7a8a] text-white">
                  <Plus className="h-4 w-4" /> ใหม่
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {filteredContacts.map((contact) => (
                  <button key={contact.id} onClick={() => selectContact(contact)} className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-[#4A90A4] transition-colors">
                    <p className="font-medium text-gray-900">{contact.name}</p>
                    {contact.company_name && <p className="text-sm text-gray-500">{contact.company_name}</p>}
                    {contact.phone && <p className="text-sm text-gray-400 flex items-center gap-1 mt-1"><Phone className="h-3 w-3" /> {contact.phone}</p>}
                  </button>
                ))}
                {filteredContacts.length === 0 && <p className="text-center text-gray-500 py-4">ไม่พบรายชื่อลูกค้า</p>}
              </div>
            </div>
          </Card>
        </div>
      )}

      {showNewContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">เพิ่มลูกค้าใหม่</h3>
              <button onClick={() => setShowNewContactModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ *</label>
                <Input value={newContact.name} onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))} placeholder="ชื่อลูกค้า" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">บริษัท</label>
                <Input value={newContact.company} onChange={(e) => setNewContact(prev => ({ ...prev, company: e.target.value }))} placeholder="ชื่อบริษัท" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">โทรศัพท์</label>
                <Input value={newContact.phone} onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))} placeholder="เบอร์โทรศัพท์" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
                <Input value={newContact.email} onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))} placeholder="อีเมล" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่</label>
                <textarea value={newContact.address} onChange={(e) => setNewContact(prev => ({ ...prev, address: e.target.value }))} placeholder="ที่อยู่" rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4A90A4] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เลขประจำตัวผู้เสียภาษี</label>
                <Input value={newContact.tax_id} onChange={(e) => setNewContact(prev => ({ ...prev, tax_id: e.target.value }))} placeholder="เลขประจำตัวผู้เสียภาษี" />
              </div>
            </div>
            <div className="p-4 border-t flex gap-3">
              <Button variant="secondary" onClick={() => setShowNewContactModal(false)} className="flex-1">ยกเลิก</Button>
              <Button onClick={handleCreateContact} disabled={!newContact.name} className="flex-1 bg-[#4A90A4] hover:bg-[#3d7a8a] text-white">บันทึก</Button>
            </div>
          </Card>
        </div>
      )}

      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">เลือกสินค้า</h3>
              <button onClick={() => { setShowProductModal(false); setActiveItemIndex(null); setSearchTerm(''); }} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="ค้นหาสินค้าด้วยชื่อหรือบาร์โค้ด..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {filteredProducts.map((product) => (
                  <button key={product.id} onClick={() => activeItemIndex !== null && selectProduct(product, activeItemIndex)} className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-[#4A90A4] transition-colors text-left">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name_th} className="h-12 w-12 object-cover rounded" />
                    ) : (
                      <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center"><ImageIcon className="h-6 w-6 text-gray-400" /></div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{product.name_th}</p>
                      {product.barcode && <p className="text-sm text-gray-500">{product.barcode}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-[#4A90A4]">{formatNumber(product.base_price)}</p>
                      <p className="text-xs text-gray-400">บาท/{product.unit || 'ชิ้น'}</p>
                    </div>
                  </button>
                ))}
                {filteredProducts.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">ไม่พบสินค้า</p>
                    <Button onClick={() => { setShowProductModal(false); }} variant="secondary">ปิดและพิมพ์ชื่อสินค้าเอง</Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {showShareModal && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <LinkIcon className="h-4 w-4" />
          คัดลอกลิงก์แล้ว
        </div>
      )}
    </div>
  )
}
