import { useState, useEffect, useRef } from 'react'
import html2pdf from 'html2pdf.js'
import { supabase } from '../services/supabase'
import { useSearchParams, useParams } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { QRCodeSVG } from 'qrcode.react'
import { 
  FileText, 
  Share2, 
  Printer, 
  Download, 
  Save,
  MoreHorizontal, 
  Plus, 
  Trash2, 
  Phone,
  Search,
  X,
  Image as ImageIcon,
  Upload,
  Edit2,
  Check,
  Percent,
  ChevronDown,
  Eye,
  Copy,
  Calculator,
  TrendingUp,
  TrendingDown,
  Boxes,
  ShoppingCart
} from 'lucide-react'

interface QuotationItem {
  id: string
  product_id?: string
  product_name: string
  product_image?: string
  custom_image_url?: string
  use_custom_image: boolean
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
  selling_price_incl_vat?: number
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
  signature_url?: string
  seller_name?: string
  receiver_name?: string
  pdf_url?: string
  show_product_images: boolean
  show_discount: boolean
  show_receiver: boolean
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
  total: 0,
  use_custom_image: false
}

export default function QuotationPage() {
  const [searchParams] = useSearchParams()
  const params = useParams()
  const quotationId = searchParams.get('id') || params.id
  const isPreviewMode = searchParams.get('preview') === '1'
  
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
    tax_rate: 0,
    tax_type: 'inclusive',
    total_amount: 0,
    notes: '',
    terms: 'ราคานี้มีผลภายใน 30 วัน นับจากวันออกใบเสนอราคา',
    status: 'draft',
    seller_name: '',
    receiver_name: '',
    pdf_url: undefined,
    show_product_images: false,
    show_discount: true,
    show_receiver: true,
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
  const [attachments, setAttachments] = useState<{name: string, url: string}[]>([])
  const [showAttachmentPreview, setShowAttachmentPreview] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState<{name: string, url: string} | null>(null)
  const [productImageSize, setProductImageSize] = useState<'small' | 'medium' | 'large'>('small')
  const [activeTab, setActiveTab] = useState<'quotation' | 'profit'>('quotation')
  
  // Expenses and additional costs for profit calculation
  const [expenses, setExpenses] = useState({
    shipping: 0,
    fees: 0,
    other: 0
  })
  
  // Stock data for inventory checking
  const [stockData, setStockData] = useState<Record<string, number>>({})
  
  // Purchase orders tracking
  const [purchaseOrders, setPurchaseOrders] = useState<{
    productId: string
    productName: string
    quantity: number
    unitPrice: number
    shippingCost: number
    channel: string
    status: 'not_ordered' | 'ordered' | 'received'
  }[]>([])
  
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
  const attachmentInputRef = useRef<HTMLInputElement>(null)

  // Business settings state
  const [businessSettings, setBusinessSettings] = useState({
    name: 'หจก. สะอางพานิชย์',
    phone: '0646194546',
    email: 'saang.co@gmail.com',
    address: 'เลขที่ 8/8 ถ.สุขสันต์ ต.สุเทพ อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50200',
    tax_id: '0503560008650'
  })

  // Load business settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('shop_settings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setBusinessSettings({
          name: parsed.name || '',
          phone: parsed.phone || '',
          email: parsed.email || '',
          address: parsed.address || '',
          tax_id: parsed.tax_id || ''
        })
      } catch (e) {
        console.error('Error loading business settings:', e)
      }
    }
  }, [])

  useEffect(() => {
    fetchContacts()
    fetchProducts()
    fetchStockData()
    if (quotationId) {
      fetchQuotation(quotationId)
    } else {
      generateQuotationNumber()
    }
    // Auto-trigger print if print=1 parameter is present
    if (searchParams.get('print') === '1') {
      setTimeout(() => {
        window.print()
      }, 1000)
    }
  }, [quotationId])

  useEffect(() => {
    calculateTotals()
  }, [quotation.items, quotation.discount_amount, quotation.tax_rate, quotation.withholding_tax, quotation.withholding_tax_percent])

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

  const fetchStockData = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('product_id, quantity')
      
      if (error) throw error
      
      const stockMap: Record<string, number> = {}
      data?.forEach((item: any) => {
        stockMap[item.product_id] = item.quantity || 0
      })
      setStockData(stockMap)
    } catch (error) {
      console.error('Error fetching stock data:', error)
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
          signature_url: data.signature_url,
          seller_name: data.seller_name || '',
          pdf_url: data.pdf_url,
          show_product_images: data.show_product_images || false,
          show_discount: data.show_discount !== false,
          show_receiver: data.show_receiver !== false,
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
    setQuotation(prev => {
      if (prev.items.length === 1) return prev
      const newItems = prev.items.filter((_, i) => i !== index)
      return { ...prev, items: newItems }
    })
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
        signature_url: quotation.signature_url,
        seller_name: quotation.seller_name,
        pdf_url: quotation.pdf_url,
        show_product_images: quotation.show_product_images,
        show_discount: quotation.show_discount,
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

  const handleItemImageUpload = async (file: File, itemIndex: number) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `item_${Date.now()}.${fileExt}`
      const filePath = `quotation_items/${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file)
      
      if (uploadError) throw uploadError
      
      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath)
      
      setQuotation(prev => ({
        ...prev,
        items: prev.items.map((item, i) => 
          i === itemIndex 
            ? { ...item, custom_image_url: publicUrl, use_custom_image: true }
            : item
        )
      }))
    } catch (error) {
      console.error('Error uploading item image:', error)
      alert('ไม่สามารถอัพโหลดรูปสินค้าได้')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleShare = () => {
    setShowShareModal(true)
  }

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/quotation/${quotation.id || 'preview'}?preview=1`
    navigator.clipboard.writeText(shareUrl)
    alert('คัดลอกลิงก์แล้ว')
  }

  const handleSavePDF = async () => {
    if (!quotation.id) {
      alert('กรุณาบันทึกใบเสนอราคาก่อน')
      return
    }

    const element = document.querySelector('.print-only') as HTMLElement
    if (!element) {
      alert('ไม่พบเนื้อหาสำหรับสร้าง PDF')
      return
    }

    try {
      setLoading(true)
      
      // Temporarily show the element for PDF generation
      const originalDisplay = element.style.display
      element.style.display = 'block'

      const opt = {
        margin: 10,
        filename: `ใบเสนอราคา_${quotation.quotation_number}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      }

      // Generate PDF blob
      const pdfBlob = await html2pdf().set(opt).from(element).output('blob')
      
      // Restore original display
      element.style.display = originalDisplay

      // Upload to Supabase storage
      const fileName = `quotation_${quotation.id}_${Date.now()}.pdf`
      const filePath = `quotations/pdfs/${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf'
        })
      
      if (uploadError) throw uploadError
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath)
      
      // Update quotation with pdf_url
      const { error: updateError } = await supabase
        .from('quotations')
        .update({ pdf_url: publicUrl })
        .eq('id', quotation.id)
      
      if (updateError) throw updateError
      
      // Update local state
      setQuotation(prev => ({ ...prev, pdf_url: publicUrl }))
      
      alert('บันทึก PDF สำเร็จ')
    } catch (error) {
      console.error('Error saving PDF:', error)
      alert('ไม่สามารถบันทึก PDF ได้')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    const element = document.querySelector('.print-only') as HTMLElement
    if (!element) {
      alert('ไม่พบเนื้อหาสำหรับสร้าง PDF')
      return
    }

    // Temporarily show the element for PDF generation
    const originalDisplay = element.style.display
    element.style.display = 'block'

    const opt = {
      margin: 10,
      filename: `ใบเสนอราคา_${quotation.quotation_number}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    }

    try {
      await html2pdf().set(opt).from(element).save()
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('ไม่สามารถสร้าง PDF ได้')
    } finally {
      // Restore original display
      element.style.display = originalDisplay
    }
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
    // Use selling_price_incl_vat if available, otherwise calculate from base_price
    const vatInclusivePrice = product.selling_price_incl_vat || (product.base_price * 1.07)
    newItems[index] = {
      ...newItems[index],
      product_id: product.id,
      product_name: product.name_th,
      product_image: product.image_url,
      unit_price: vatInclusivePrice,
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

  const handleAttachmentUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `attachment_${Date.now()}.${fileExt}`
      const filePath = `quotations/attachments/${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file)
      
      if (uploadError) throw uploadError
      
      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath)
      
      setAttachments(prev => [...prev, { name: file.name, url: publicUrl }])
    } catch (error) {
      console.error('Error uploading attachment:', error)
      alert('ไม่สามารถอัพโหลดไฟล์แนบได้')
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // Convert number to Thai text
  const numberToThaiText = (num: number): string => {
    const thaiNumbers = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
    const thaiPlaces = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน']
    
    const convertGroup = (n: number): string => {
      if (n === 0) return ''
      let result = ''
      const str = n.toString().padStart(6, '0')
      
      for (let i = 0; i < 6; i++) {
        const digit = parseInt(str[i])
        const place = 5 - i
        
        if (digit !== 0) {
          if (place === 1 && digit === 1) {
            result += 'สิบ'
          } else if (place === 1 && digit === 2) {
            result += 'ยี่สิบ'
          } else if (place === 0 && digit === 1 && str[4] !== '0') {
            result += 'เอ็ด'
          } else {
            result += thaiNumbers[digit] + thaiPlaces[place]
          }
        }
      }
      return result
    }
    
    if (num === 0) return 'ศูนย์บาทถ้วน'
    
    const baht = Math.floor(num)
    const satang = Math.round((num - baht) * 100)
    
    let result = ''
    
    if (baht > 0) {
      if (baht >= 1000000) {
        const millions = Math.floor(baht / 1000000)
        const remainder = baht % 1000000
        result += convertGroup(millions) + 'ล้าน'
        if (remainder > 0) {
          result += convertGroup(remainder)
        }
      } else {
        result += convertGroup(baht)
      }
      result += 'บาท'
    }
    
    if (satang > 0) {
      result += convertGroup(satang) + 'สตางค์'
    } else {
      result += 'ถ้วน'
    }
    
    return result
  }

  return (
    <div className={'max-w-5xl mx-auto ' + (isPreviewMode ? 'preview-mode' : '')}>
      {/* Print Styles - Preview Mode Support */}
      <style>{`
        .print-only { display: none; }
        .preview-mode .print-only { display: block !important; }
        .preview-mode .no-print { display: none !important; }
        @media print {
          .print-only { display: block !important; }
          .no-print { display: none !important; }
          body { font-family: 'Sarabun', 'Prompt', sans-serif; }
        }
      `}</style>

      {/* Preview Mode Toggle */}
      {isPreviewMode && (
        <div className="no-print bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-700">
            <Eye className="h-5 w-5" />
            <span className="font-medium">โหมดดูตัวอย่าง</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              พิมพ์
            </button>
            <button 
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              กลับ
            </button>
          </div>
        </div>
      )}

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

      {/* Tabs */}
      <div className="no-print flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('quotation')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'quotation'
              ? 'bg-white text-[#4A90A4] shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileText className="h-4 w-4" />
          ใบเสนอราคา
        </button>
        <button
          onClick={() => setActiveTab('profit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'profit'
              ? 'bg-white text-[#4A90A4] shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calculator className="h-4 w-4" />
          ต้นทุน/กำไร
        </button>
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
        <button onClick={handleSavePDF} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded" title="บันทึก PDF ในระบบ">
          <Save className="h-5 w-5" />
        </button>
        <div className="relative" ref={moreMenuRef}>
          <button onClick={() => setShowMoreMenu(!showMoreMenu)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {showMoreMenu && (
            <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-2 space-y-1">
                {/* Logo Options */}
                <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b">โลโก้</div>
                <button 
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded text-left"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!quotation.logo_url) {
                      const saved = localStorage.getItem('shop_settings')
                      if (saved) {
                        const parsed = JSON.parse(saved)
                        if (parsed.logo_url) {
                          setQuotation(prev => ({ ...prev, logo_url: parsed.logo_url }))
                        } else {
                          alert('ไม่มีโลโก้ในข้อมูลร้าน กรุณาตั้งค่าที่ ตั้งค่า → ข้อมูลร้าน')
                        }
                      }
                    } else {
                      setQuotation(prev => ({ ...prev, logo_url: undefined }))
                    }
                    setShowMoreMenu(false)
                  }}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${quotation.logo_url ? 'bg-[#4A90A4] border-[#4A90A4]' : 'border-gray-300 bg-white'}`}>
                    {quotation.logo_url && <Check className="w-3 h-3 text-white" />}
                  </div>
                  ใช้โลโก้จากข้อมูลร้าน
                </button>
                <button onClick={() => { logoInputRef.current?.click(); setShowMoreMenu(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2 pl-9">
                  <Upload className="h-4 w-4" />
                  อัพโหลดโลโก้ใหม่
                </button>
                
                {/* Stamp Options */}
                <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b mt-2">ตราประทับ</div>
                <button 
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded text-left"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!quotation.stamp_url) {
                      const saved = localStorage.getItem('shop_settings')
                      if (saved) {
                        const parsed = JSON.parse(saved)
                        if (parsed.stamp_url) {
                          setQuotation(prev => ({ ...prev, stamp_url: parsed.stamp_url }))
                        } else {
                          alert('ไม่มีตราประทับในข้อมูลร้าน กรุณาตั้งค่าที่ ตั้งค่า → ข้อมูลร้าน')
                        }
                      }
                    } else {
                      setQuotation(prev => ({ ...prev, stamp_url: undefined }))
                    }
                    setShowMoreMenu(false)
                  }}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${quotation.stamp_url ? 'bg-[#4A90A4] border-[#4A90A4]' : 'border-gray-300 bg-white'}`}>
                    {quotation.stamp_url && <Check className="w-3 h-3 text-white" />}
                  </div>
                  ใช้ตราประทับจากข้อมูลร้าน
                </button>
                <button onClick={() => { stampInputRef.current?.click(); setShowMoreMenu(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2 pl-9">
                  <Upload className="h-4 w-4" />
                  อัพโหลดตราประทับใหม่
                </button>
                
                {/* Signature Option */}
                <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b mt-2">ลายเซ็น</div>
                <button 
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded text-left"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!quotation.signature_url) {
                      const saved = localStorage.getItem('shop_settings')
                      if (saved) {
                        const parsed = JSON.parse(saved)
                        if (parsed.signature_url) {
                          setQuotation(prev => ({ ...prev, signature_url: parsed.signature_url }))
                        } else {
                          alert('ไม่มีลายเซ็นในข้อมูลร้าน กรุณาตั้งค่าที่ ตั้งค่า → ข้อมูลร้าน')
                        }
                      }
                    } else {
                      setQuotation(prev => ({ ...prev, signature_url: undefined }))
                    }
                    setShowMoreMenu(false)
                  }}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${quotation.signature_url ? 'bg-[#4A90A4] border-[#4A90A4]' : 'border-gray-300 bg-white'}`}>
                    {quotation.signature_url && <Check className="w-3 h-3 text-white" />}
                  </div>
                  ใช้ลายเซ็นจากข้อมูลร้าน
                </button>
                
                {/* Product Images Toggle */}
                <div className="border-t pt-2 mt-2">
                  <button 
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded text-left"
                    onClick={(e) => {
                      e.stopPropagation()
                      setQuotation(prev => ({ ...prev, show_product_images: !prev.show_product_images }))
                    }}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${quotation.show_product_images ? 'bg-[#4A90A4] border-[#4A90A4]' : 'border-gray-300 bg-white'}`}>
                      {quotation.show_product_images && <Check className="w-3 h-3 text-white" />}
                    </div>
                    แสดงรูปสินค้า
                  </button>
                  
                  {/* Image Size Selection - Only show when product images are enabled */}
                  {quotation.show_product_images && (
                    <div className="pl-6 pr-3 py-2 space-y-1">
                      <div className="text-xs text-gray-500 mb-1">ขนาดรูปสินค้า</div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setProductImageSize('small')
                          }}
                          className={`px-2 py-1 text-xs rounded ${productImageSize === 'small' ? 'bg-[#4A90A4] text-white' : 'bg-gray-100 text-gray-600'}`}
                        >
                          เล็ก
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setProductImageSize('medium')
                          }}
                          className={`px-2 py-1 text-xs rounded ${productImageSize === 'medium' ? 'bg-[#4A90A4] text-white' : 'bg-gray-100 text-gray-600'}`}
                        >
                          กลาง
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setProductImageSize('large')
                          }}
                          className={`px-2 py-1 text-xs rounded ${productImageSize === 'large' ? 'bg-[#4A90A4] text-white' : 'bg-gray-100 text-gray-600'}`}
                        >
                          ใหญ่
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Discount Toggle */}
                <div className="border-t pt-2 mt-2">
                  <button 
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded text-left"
                    onClick={(e) => {
                      e.stopPropagation()
                      setQuotation(prev => ({ ...prev, show_discount: !prev.show_discount }))
                    }}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${quotation.show_discount ? 'bg-[#4A90A4] border-[#4A90A4]' : 'border-gray-300 bg-white'}`}>
                      {quotation.show_discount && <Check className="w-3 h-3 text-white" />}
                    </div>
                    แสดงส่วนลด
                  </button>
                </div>

                {/* Receiver Toggle */}
                <div className="border-t pt-2 mt-2">
                  <button 
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded text-left"
                    onClick={(e) => {
                      e.stopPropagation()
                      setQuotation(prev => ({ ...prev, show_receiver: !prev.show_receiver }))
                    }}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${quotation.show_receiver ? 'bg-[#4A90A4] border-[#4A90A4]' : 'border-gray-300 bg-white'}`}>
                      {quotation.show_receiver && <Check className="w-3 h-3 text-white" />}
                    </div>
                    แสดงผู้รับเอกสาร
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'logo')} />
      <input ref={stampInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'stamp')} />
      <input ref={attachmentInputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleAttachmentUpload(e.target.files[0])} />

      {/* Print-Only Section - FlowAccount Style */}
      <div className="print-only" style={{ fontSize: '12px' }}>
        {/* Seller Info - From Business Settings */}
        <div className="flow-seller-info" style={{ marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              {quotation.logo_url && <img src={quotation.logo_url} alt="Logo" style={{ height: '50px', objectFit: 'contain', marginBottom: '8px' }} />}
              <div>
                {businessSettings.name && <><strong>{businessSettings.name}</strong><br /></>}
                {businessSettings.address && <>{businessSettings.address}<br /></>}
                {(businessSettings.phone || businessSettings.email) && <>
                  {businessSettings.phone && <>โทร: {businessSettings.phone}</>}
                  {businessSettings.phone && businessSettings.email && ' | '}
                  {businessSettings.email && <>อีเมล: {businessSettings.email}</>}
                  <br />
                </>}
                {businessSettings.tax_id && <>เลขประจำตัวผู้เสียภาษี: {businessSettings.tax_id}</>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>ใบเสนอราคา</h1>
              <div style={{ fontSize: '12px' }}>
                <strong>เลขที่:</strong> {quotation.quotation_number}<br />
                <strong>วันที่:</strong> {new Date(quotation.issue_date).toLocaleDateString('th-TH')}<br />
                <strong>ครบกำหนด:</strong> {new Date(quotation.expiry_date).toLocaleDateString('th-TH')}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="flow-customer-info" style={{ marginBottom: '15px' }}>
          <strong style={{ fontSize: '12px' }}>ลูกค้า</strong>
          <div style={{ marginTop: '6px', lineHeight: '1.5', fontSize: '12px' }}>
            <strong>{quotation.contact_name}</strong><br />
            {quotation.contact_company && <>{quotation.contact_company}<br /></>}
            {quotation.contact_address && <>{quotation.contact_address}<br /></>}
            {quotation.contact_phone && <>โทร: {quotation.contact_phone}<br /></>}
            {quotation.contact_tax_id && <>เลขประจำตัวผู้เสียภาษี: {quotation.contact_tax_id}<br /></>}
            {quotation.notes && <><div style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>{quotation.notes}</div></>}
          </div>
        </div>

        {/* Items Table */}
        <table className="flow-table" style={{ fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={{ width: '5%', paddingBottom: '8px' }}>#</th>
              {quotation.show_product_images && <th style={{ width: '8%', textAlign: 'center', paddingBottom: '8px' }}>รูป</th>}
              <th style={{ width: quotation.show_product_images ? '57%' : '65%', paddingBottom: '8px' }}>รายการ</th>
              <th style={{ width: '5%', textAlign: 'center', paddingBottom: '8px' }}>จำนวน</th>
              <th style={{ width: '5%', textAlign: 'center', paddingBottom: '8px' }}>หน่วย</th>
              <th style={{ width: '10%', textAlign: 'right', paddingBottom: '8px' }}>ราคา/หน่วย</th>
              <th style={{ width: '10%', textAlign: 'right', paddingBottom: '8px' }}>จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {quotation.items.map((item, index) => {
              const currentImage = item.use_custom_image ? item.custom_image_url : item.product_image
              const imageSizeMap = {
                small: { width: '30px', height: '30px', placeholder: '30px' },
                medium: { width: '50px', height: '50px', placeholder: '50px' },
                large: { width: '70px', height: '70px', placeholder: '70px' }
              }
              const imgSize = imageSizeMap[productImageSize]
              return (
              <tr key={item.id} style={index === 0 ? { borderTop: '1px solid #333', paddingTop: '12px' } : {}}>
                <td style={{ paddingTop: index === 0 ? '12px' : '0' }}>{index + 1}</td>
                {quotation.show_product_images && (
                  <td style={{ textAlign: 'center' }}>
                    {currentImage ? (
                      <img src={currentImage} alt={item.product_name} style={{ width: imgSize.width, height: imgSize.height, objectFit: 'cover', borderRadius: '4px' }} />
                    ) : (
                      <div style={{ width: imgSize.placeholder, height: imgSize.placeholder, backgroundColor: '#f3f4f6', borderRadius: '4px', margin: '0 auto' }}></div>
                    )}
                  </td>
                )}
                <td>
                  <strong>{item.product_name}</strong>
                  {item.details && <br />}
                  {item.details && <span style={{ fontSize: '10px', color: '#666' }}>{item.details}</span>}
                </td>
                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ textAlign: 'center' }}>{item.unit}</td>
                <td style={{ textAlign: 'right' }}>{formatNumber(item.unit_price)}</td>
                <td style={{ textAlign: 'right' }}>{formatNumber(item.total)}</td>
              </tr>
            )})}
          </tbody>
        </table>

        {/* Horizontal line after last item */}
        <div style={{ borderTop: '1px solid #333', marginTop: '8px', marginBottom: '15px' }}></div>

        {/* Summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '15px', fontSize: '12px' }}>
          {/* Left side - Terms and Notes */}
          <div style={{ flex: 1, maxWidth: '50%' }}>
            {quotation.terms && (
              <div style={{ fontSize: '11px' }}>
                <strong>เงื่อนไขการชำระเงิน:</strong><br />
                <div style={{ whiteSpace: 'pre-wrap' }}>{quotation.terms}</div>
              </div>
            )}
          </div>

          {/* Right side - Pricing Summary and Signature */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '280px', minHeight: '400px' }}>
            {/* Pricing Summary */}
            <div className="flow-total" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>รวมเป็นเงิน</span>
                <span>{formatNumber(quotation.subtotal)} บาท</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>ภาษีมูลค่าเพิ่ม 7%</span>
                <span>{formatNumber(quotation.tax_amount)} บาท</span>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', paddingTop: '8px', marginTop: '8px' }}>
                <span>ยอดรวมทั้งสิ้น</span>
                <span>{formatNumber(quotation.subtotal + quotation.tax_amount)} บาท</span>
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
              
              {/* Amount in words */}
              <div style={{ marginTop: '12px', fontSize: '11px', fontStyle: 'italic', textAlign: 'right' }}>
                ({numberToThaiText(Math.round((quotation.subtotal + quotation.tax_amount) * 100) / 100)})
              </div>
            </div>
            
            {/* Pricing Summary Section */}
            <div style={{ width: '280px' }}>
              {/* Summary content */}
            </div>
          </div>
        </div>

        {/* Bottom Section - Signature and Receiver in one row */}
        <div style={{ position: 'absolute', bottom: '40px', left: '40px', right: '40px', display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
          {/* Document Receiver - Left side */}
          {quotation.show_receiver && (
            <div style={{ textAlign: 'center', width: '200px', marginRight: 'auto' }}>
              <div style={{ height: '54px' }}></div>
              <div style={{ borderTop: '1px solid #333', paddingTop: '4px' }}>
                <div style={{ fontSize: '12px' }}>ผู้รับเอกสาร</div>
                {quotation.receiver_name && (
                  <div style={{ fontSize: '12px', marginTop: '4px', fontWeight: 'bold' }}>({quotation.receiver_name})</div>
                )}
              </div>
            </div>
          )}

          {/* Stamp - Center - Absolute positioned */}
          {quotation.stamp_url && (
            <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: '20px' }}>
              <img src={quotation.stamp_url} alt="Stamp" style={{ width: '151px', height: '151px', objectFit: 'contain' }} />
            </div>
          )}

          {/* Signature and Seller Name - Right side */}
          <div style={{ textAlign: 'center', width: '200px' }}>
            {quotation.signature_url ? (
              <img src={quotation.signature_url} alt="Signature" style={{ width: '120px', height: '50px', objectFit: 'contain', marginBottom: '4px', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
            ) : (
              <div style={{ height: '54px' }}></div>
            )}
            <div style={{ borderTop: '1px solid #333', paddingTop: '4px' }}>
              <div style={{ fontSize: '12px' }}>ผู้เสนอราคา</div>
              {quotation.seller_name && (
                <div style={{ fontSize: '12px', marginTop: '4px', fontWeight: 'bold' }}>({quotation.seller_name})</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Removed system text */}
      </div>

      {/* Form Fields - Hidden when printing */}
      {activeTab === 'quotation' && (
      <div className="no-print">
        <Card className="mb-4">
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Customer Selection - Compact */}
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">ลูกค้า</label>
                <button onClick={() => setShowContactModal(true)} className="w-full flex items-center justify-between px-3 py-1.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-left text-sm">
                  <span className={quotation.contact_name ? 'text-gray-900' : 'text-gray-400'}>
                    {quotation.contact_name || 'เลือกลูกค้า...'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
                
                {quotation.contact_name && (
                  <div className="mt-1 text-xs text-gray-600 space-y-0.5">
                    {quotation.contact_company && <p className="font-medium">{quotation.contact_company}</p>}
                    {quotation.contact_tax_id && <p>เลขประจำตัวผู้เสียภาษี: {quotation.contact_tax_id}</p>}
                    {quotation.contact_address && <p className="truncate">{quotation.contact_address}</p>}
                    {quotation.contact_phone && <p>{quotation.contact_phone}</p>}
                  </div>
                )}
              </div>

              {/* Dates - Compact */}
              <div className="md:col-span-2 flex gap-3">
                <div className="w-36">
                  <label className="block text-xs font-medium text-gray-700 mb-1">วันที่</label>
                  <Input type="date" value={quotation.issue_date} onChange={(e) => setQuotation(prev => ({ ...prev, issue_date: e.target.value }))} className="text-sm py-1.5 w-full" />
                </div>
                <div className="w-36">
                  <label className="block text-xs font-medium text-gray-700 mb-1">ครบกำหนด</label>
                  <Input type="date" value={quotation.expiry_date} onChange={(e) => setQuotation(prev => ({ ...prev, expiry_date: e.target.value }))} className="text-sm py-1.5 w-full" />
                </div>
              </div>
            </div>
            
            {/* Seller Name Input */}
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">ชื่อผู้เสนอราคา (ลงในใบเสนอราคา)</label>
              <Input 
                type="text" 
                value={quotation.seller_name || ''} 
                onChange={(e) => setQuotation(prev => ({ ...prev, seller_name: e.target.value }))}
                placeholder="ชื่อผู้เสนอราคา..."
                className="text-sm"
              />
            </div>

            {/* Document Receiver Name Input */}
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">ชื่อผู้รับเอกสาร (ลงในใบเสนอราคา)</label>
              <Input 
                type="text" 
                value={quotation.receiver_name || ''} 
                onChange={(e) => setQuotation(prev => ({ ...prev, receiver_name: e.target.value }))}
                placeholder="ชื่อผู้รับเอกสาร..."
                className="text-sm"
              />
            </div>
            
            {/* Notes - Expandable Textarea */}
            <div>
              <textarea 
                placeholder="บันทึกเกี่ยวกับลูกค้า..." 
                value={quotation.notes} 
                onChange={(e) => setQuotation(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="w-full text-sm px-3 py-1.5 border border-gray-300 rounded-lg resize-y min-h-[60px]"
                style={{ resize: 'both' }}
              />
            </div>
          </div>
        </Card>

      <Card className="mb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#4A90A4] text-white">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium w-8">#</th>
                {quotation.show_product_images && <th className="px-2 py-2 text-center text-xs font-medium w-14">รูป</th>}
                <th className="px-2 py-2 text-left text-xs font-medium min-w-[200px]">รายการ</th>
                <th className="px-2 py-2 text-center text-xs font-medium w-16">จำนวน</th>
                <th className="px-2 py-2 text-center text-xs font-medium w-14">หน่วย</th>
                <th className="px-2 py-2 text-right text-xs font-medium w-24">ราคา/หน่วย</th>
                {quotation.show_discount && <th className="px-2 py-2 text-right text-xs font-medium w-16">ส่วนลด</th>}
                <th className="px-2 py-2 text-right text-xs font-medium w-24">รวม</th>
                <th className="px-2 py-2 text-center text-xs font-medium w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {quotation.items.map((item, index) => {
                const currentImage = item.use_custom_image ? item.custom_image_url : item.product_image
                return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-2 py-2 text-xs text-gray-500">{index + 1}</td>
                  {quotation.show_product_images && (
                    <td className="px-2 py-2 text-center">
                      <div className="relative">
                        {currentImage ? (
                          <img src={currentImage} alt={item.product_name} className="h-10 w-10 object-cover rounded mx-auto cursor-pointer" onClick={() => {
                            const input = document.createElement('input')
                            input.type = 'file'
                            input.accept = 'image/*'
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0]
                              if (file) handleItemImageUpload(file, index)
                            }
                            input.click()
                          }} />
                        ) : (
                          <button onClick={() => {
                            const input = document.createElement('input')
                            input.type = 'file'
                            input.accept = 'image/*'
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0]
                              if (file) handleItemImageUpload(file, index)
                            }
                            input.click()
                          }} className="h-10 w-10 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center mx-auto">
                            <ImageIcon className="h-4 w-4 text-gray-400" />
                          </button>
                        )}
                        {(item.product_image || item.custom_image_url) && (
                          <div className="absolute -bottom-1 -right-1">
                            <button onClick={() => {
                              setQuotation(prev => ({
                                ...prev,
                                items: prev.items.map((it, i) => i === index ? { ...it, use_custom_image: !it.use_custom_image, custom_image_url: it.use_custom_image ? undefined : it.custom_image_url } : it)
                              }))
                            }} className="h-4 w-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-[8px]" title={item.use_custom_image ? "ใช้รูปสินค้า" : "ใช้รูปกำหนดเอง"}>
                              {item.use_custom_image ? 'P' : 'C'}
                            </button>
                          </div>
                        )}
                      </div>
                      {(item.product_image || item.custom_image_url) && (
                        <button onClick={() => {
                          setQuotation(prev => ({
                            ...prev,
                            items: prev.items.map((it, i) => i === index ? { ...it, custom_image_url: undefined, product_image: undefined, use_custom_image: false } : it)
                          }))
                        }} className="text-[10px] text-red-500 hover:text-red-700 mt-1">
                          ลบรูป
                        </button>
                      )}
                    </td>
                  )}
                  <td className="px-2 py-2">
                    <button onClick={() => { setActiveItemIndex(index); setShowProductModal(true); }} className="w-full text-left">
                      <input type="text" placeholder="เลือกสินค้า..." value={item.product_name} readOnly className="w-full text-sm px-2 py-1 border border-gray-300 rounded cursor-pointer bg-gray-50 hover:bg-white mb-1" />
                    </button>
                    <input type="text" placeholder="รายละเอียด" value={item.details} onChange={(e) => updateItem(index, 'details', e.target.value)} className="w-full text-xs px-2 py-0.5 border border-gray-300 rounded mb-0.5" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)} className="w-full text-center text-xs px-1 py-1 border border-gray-300 rounded" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="text" value={item.unit} onChange={(e) => updateItem(index, 'unit', e.target.value)} className="w-full text-center text-xs px-1 py-1 border border-gray-300 rounded" />
                  </td>
                  <td className="px-2 py-2">
                    <input 
                      type="number" 
                      step="0.01"
                      value={Number(item.unit_price).toFixed(2)} 
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)} 
                      className="w-full text-right text-xs px-1 py-1 border border-gray-300 rounded" 
                    />
                  </td>
                  {quotation.show_discount && (
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <input type="number" value={item.discount_percent} onChange={(e) => updateItem(index, 'discount_percent', parseFloat(e.target.value) || 0)} className="w-12 text-right text-xs px-1 py-1 border border-gray-300 rounded" />
                        <span className="text-xs text-gray-500">%</span>
                      </div>
                    </td>
                  )}
                  <td className="px-2 py-2 text-right text-xs font-medium">{formatNumber(item.total)}</td>
                  <td className="px-2 py-2 text-center">
                    <button onClick={() => removeItem(index)} className="text-gray-400 hover:text-red-500 p-1" disabled={quotation.items.length === 1}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t">
          <Button variant="secondary" onClick={addItem} className="flex items-center gap-2 text-sm">
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
              {attachments.length > 0 && (
                <div className="mb-3 space-y-1">
                  {attachments.map((file, index) => {
                    const isImage = file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
                    return (
                      <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm">
                        <span className="truncate flex-1">{file.name}</span>
                        <div className="flex items-center gap-2">
                          {isImage && (
                            <button 
                              onClick={() => {
                                setPreviewAttachment(file)
                                setShowAttachmentPreview(true)
                              }} 
                              className="text-gray-500 hover:text-[#4A90A4]"
                              title="ดูตัวอย่าง"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800" title="ดาวน์โหลด">
                            <Download className="h-4 w-4" />
                          </a>
                          <button onClick={() => removeAttachment(index)} className="text-red-500 hover:text-red-700" title="ลบ">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <div 
                onClick={() => attachmentInputRef.current?.click()} 
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 hover:border-[#4A90A4]"
              >
                <div className="text-gray-400 mb-2"><Upload className="h-8 w-8 mx-auto" /></div>
                <p className="text-sm text-gray-500">คลิกเพื่อเลือกไฟล์</p>
                <p className="text-xs text-gray-400">หรือลากและวางไฟล์ที่นี่</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4 space-y-3">
            {/* VAT Breakdown */}
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>ราคาก่อน VAT</span>
              <span>{formatNumber(quotation.subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>VAT 7%</span>
              <span>{formatNumber(quotation.tax_amount)}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-medium text-gray-900 border-t pt-2">
              <span>รวมเป็นเงิน (รวม VAT)</span>
              <span>{formatNumber(quotation.subtotal + quotation.tax_amount)}</span>
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

            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">ยอดรวมทั้งสิ้น</span>
                <span className="text-xl font-bold text-[#4A90A4]">{formatNumber(quotation.subtotal + quotation.tax_amount)}</span>
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
      </div>
      )}

      {/* Profit/Loss Tab */}
      {activeTab === 'profit' && (
        <div className="no-print space-y-4">
          {/* Summary Cards - Moved to top */}
          {(() => {
            const totals = quotation.items.reduce((acc, item) => {
              const product = products.find(p => p.id === item.product_id)
              const po = purchaseOrders.find(o => o.productId === item.product_id)
              const costPrice = po ? ((po.quantity * po.unitPrice + po.shippingCost) / po.quantity) : (product?.base_price || 0)
              const sellingPrice = item.unit_price
              const profitPerUnit = sellingPrice - costPrice
              const totalProfit = profitPerUnit * item.quantity
              
              return {
                totalCost: acc.totalCost + (costPrice * item.quantity),
                totalRevenue: acc.totalRevenue + (sellingPrice * item.quantity),
                totalProfit: acc.totalProfit + totalProfit
              }
            }, { totalCost: 0, totalRevenue: 0, totalProfit: 0 })
            
            const totalExpenses = expenses.shipping + expenses.fees + expenses.other
            const netProfit = totals.totalProfit - totalExpenses
            const overallProfitPercent = totals.totalCost > 0 ? ((netProfit / totals.totalCost) * 100) : 0
            
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Card className="bg-white border-[#d4c9b8] rounded-xl shadow-sm">
                  <div className="p-2 text-center">
                    <p className="text-[10px] text-[#8b7355] mb-0.5">ต้นทุนรวม</p>
                    <p className="text-base font-bold text-[#5c4a32]">{formatNumber(totals.totalCost)}</p>
                  </div>
                </Card>
                <Card className="bg-white border-[#d4c9b8] rounded-xl shadow-sm">
                  <div className="p-2 text-center">
                    <p className="text-[10px] text-[#8b7355] mb-0.5">รายได้รวม</p>
                    <p className="text-base font-bold text-[#5c4a32]">{formatNumber(totals.totalRevenue)}</p>
                  </div>
                </Card>
                <Card className="bg-white border-[#d4c9b8] rounded-xl shadow-sm">
                  <div className="p-2 text-center">
                    <p className="text-[10px] text-[#8b7355] mb-0.5">ค่าใช้จ่ายเพิ่มเติม</p>
                    <p className="text-base font-bold text-[#a67c52]">{formatNumber(totalExpenses)}</p>
                  </div>
                </Card>
                <Card className={`${netProfit >= 0 ? 'bg-[#e8f5e9] border-[#c8e6c9]' : 'bg-[#ffebee] border-[#ffcdd2]'} rounded-xl shadow-sm`}>
                  <div className="p-2 text-center">
                    <p className={`text-[10px] mb-0.5 ${netProfit >= 0 ? 'text-[#4caf50]' : 'text-[#f44336]'}`}>
                      {netProfit >= 0 ? 'กำไรสุทธิ' : 'ขาดทุนสุทธิ'}
                    </p>
                    <p className={`text-base font-bold ${netProfit >= 0 ? 'text-[#2e7d32]' : 'text-[#c62828]'}`}>
                      {formatNumber(Math.abs(netProfit))}
                    </p>
                    <p className="text-[9px] text-[#8b7355]">{overallProfitPercent.toFixed(1)}% จากต้นทุน</p>
                  </div>
                </Card>
              </div>
            )
          })()}

          {/* Profit Calculation Table */}
          <Card className="border-[#e8e0d5]">
            <div className="p-4 border-b border-[#e8e0d5] bg-[#faf8f5]">
              <h2 className="text-base font-bold text-[#5c4a32] flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#a67c52]" />
                คำนวณต้นทุนและกำไร
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">รายการ</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">จำนวน</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">ราคาทุน/หน่วย</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">ราคาขาย/หน่วย</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">กำไร/ขาดทุนต่อหน่วย</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">กำไร/ขาดทุนรวม</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">% กำไร</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {quotation.items.map((item, index) => {
                    const product = products.find(p => p.id === item.product_id)
                    // Check if there's a purchase order for this item
                    const po = purchaseOrders.find(o => o.productId === item.product_id)
                    // Use purchase order price if available, otherwise use product base_price
                    const costPrice = po ? ((po.quantity * po.unitPrice + po.shippingCost) / po.quantity) : (product?.base_price || 0)
                    const sellingPrice = item.unit_price
                    const profitPerUnit = sellingPrice - costPrice
                    const totalProfit = profitPerUnit * item.quantity
                    const profitPercent = costPrice > 0 ? ((profitPerUnit / costPrice) * 100) : 0
                    
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{item.product_name}</p>
                          {po && <p className="text-xs text-blue-600">สั่งซื้อเพิ่มจาก {po.channel}</p>}
                          {item.details && <p className="text-xs text-gray-500">{item.details}</p>}
                        </td>
                        <td className="px-4 py-3 text-center text-sm">{item.quantity} {item.unit}</td>
                        <td className="px-4 py-3 text-right text-sm">{formatNumber(costPrice)}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium">{formatNumber(sellingPrice)}</td>
                        <td className={`px-4 py-3 text-right text-sm font-medium ${profitPerUnit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <div className="flex items-center justify-end gap-1">
                            {profitPerUnit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                            {formatNumber(profitPerUnit)}
                          </div>
                        </td>
                        <td className={`px-4 py-3 text-right text-sm font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatNumber(totalProfit)}
                        </td>
                        <td className={`px-4 py-3 text-right text-sm ${profitPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {profitPercent.toFixed(1)}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Stock Check Section */}
          <Card className="border-[#e8e0d5]">
            <div className="p-4 border-b border-[#e8e0d5] bg-[#faf8f5]">
              <h2 className="text-base font-bold text-[#5c4a32] flex items-center gap-2">
                <Boxes className="h-4 w-4 text-[#a67c52]" />
                ตรวจสอบสต็อกสินค้า
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">รายการ</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">จำนวนที่ต้องการ</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">สต็อกคงเหลือ</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">ขาดอีก</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {quotation.items.map((item, index) => {
                    const stockQty = item.product_id ? (stockData[item.product_id] || 0) : 0
                    const missing = Math.max(0, item.quantity - stockQty)
                    const hasEnough = stockQty >= item.quantity
                    
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{item.product_name}</p>
                          {item.details && <p className="text-xs text-gray-500">{item.details}</p>}
                        </td>
                        <td className="px-4 py-3 text-center text-sm">{item.quantity} {item.unit}</td>
                        <td className="px-4 py-3 text-center text-sm">{stockQty} {item.unit}</td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-red-600">{missing > 0 ? `${missing} ${item.unit}` : '-'}</td>
                        <td className="px-4 py-3 text-center">
                          {hasEnough ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Check className="h-3 w-3 mr-1" />
                              พร้อม
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <X className="h-3 w-3 mr-1" />
                              ไม่พอ
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Expenses Section */}
          <Card className="border-[#e8e0d5]">
            <div className="p-4 border-b border-[#e8e0d5] bg-[#faf8f5]">
              <h2 className="text-base font-bold text-[#5c4a32] flex items-center gap-2">
                <Calculator className="h-4 w-4 text-[#a67c52]" />
                ค่าใช้จ่ายเพิ่มเติม
              </h2>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ค่าขนส่ง</label>
                <Input 
                  type="number" 
                  value={expenses.shipping} 
                  onChange={(e) => setExpenses(prev => ({ ...prev, shipping: parseFloat(e.target.value) || 0 }))}
                  className="text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ค่าธรรมเนียม</label>
                <Input 
                  type="number" 
                  value={expenses.fees} 
                  onChange={(e) => setExpenses(prev => ({ ...prev, fees: parseFloat(e.target.value) || 0 }))}
                  className="text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ค่าใช้จ่ายอื่นๆ</label>
                <Input 
                  type="number" 
                  value={expenses.other} 
                  onChange={(e) => setExpenses(prev => ({ ...prev, other: parseFloat(e.target.value) || 0 }))}
                  className="text-right"
                />
              </div>
            </div>
            <div className="px-4 pb-4">
              <div className="bg-[#faf8f5] rounded-lg p-3 flex justify-between items-center border border-[#e8e0d5]">
                <span className="text-sm font-medium text-[#5c4a32]">รวมค่าใช้จ่ายเพิ่มเติม</span>
                <span className="text-lg font-bold text-[#a67c52]">{formatNumber(expenses.shipping + expenses.fees + expenses.other)}</span>
              </div>
            </div>
          </Card>

          {/* Purchase Orders Section */}
          <Card className="border-[#e8e0d5]">
            <div className="p-4 border-b border-[#e8e0d5] bg-[#faf8f5]">
              <h2 className="text-base font-bold text-[#5c4a32] flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-[#a67c52]" />
                การสั่งซื้อเพิ่ม
              </h2>
            </div>
            
            {/* Add Purchase Order Form */}
            <div className="p-4 bg-[#faf8f5] border-b border-[#e8e0d5]">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <select 
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm md:col-span-5"
                  onChange={(e) => {
                    const selectedProduct = products.find(p => p.id === e.target.value)
                    if (selectedProduct) {
                      const existingOrder = purchaseOrders.find(o => o.productId === selectedProduct.id)
                      if (!existingOrder) {
                        const stockQty = stockData[selectedProduct.id] || 0
                        const quotationItem = quotation.items.find(i => i.product_id === selectedProduct.id)
                        const neededQty = quotationItem ? (quotationItem.quantity - stockQty) : 0
                        setPurchaseOrders(prev => [...prev, {
                          productId: selectedProduct.id,
                          productName: selectedProduct.name_th,
                          quantity: Math.max(0, neededQty),
                          unitPrice: selectedProduct.base_price,
                          shippingCost: 0,
                          channel: 'ตัวแทนจำหน่าย',
                          status: 'not_ordered'
                        }])
                      }
                    }
                  }}
                >
                  <option value="">เลือกสินค้า...</option>
                  {quotation.items.filter(item => {
                    const stockQty = item.product_id ? (stockData[item.product_id] || 0) : 0
                    const missing = item.quantity - stockQty
                    return missing > 0 && !purchaseOrders.find(o => o.productId === item.product_id)
                  }).map(item => (
                    <option key={item.product_id} value={item.product_id}>{item.product_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Purchase Orders List */}
            {purchaseOrders.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">สินค้า</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">จำนวนที่สั่ง</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">ราคาทุน/หน่วย</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">ค่าขนส่ง</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">ช่องทาง</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">สถานะ</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">รวมต้นทุน</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {purchaseOrders.map((order, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium">{order.productName}</td>
                        <td className="px-4 py-3 text-center">
                          <Input 
                            type="number" 
                            value={order.quantity} 
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value) || 0
                              setPurchaseOrders(prev => prev.map((o, i) => i === index ? { ...o, quantity: newQty } : o))
                            }}
                            className="w-20 text-center text-sm"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Input 
                            type="number" 
                            value={order.unitPrice} 
                            onChange={(e) => {
                              const newPrice = parseFloat(e.target.value) || 0
                              setPurchaseOrders(prev => prev.map((o, i) => i === index ? { ...o, unitPrice: newPrice } : o))
                            }}
                            className="w-24 text-right text-sm"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Input 
                            type="number" 
                            value={order.shippingCost} 
                            onChange={(e) => {
                              const newCost = parseFloat(e.target.value) || 0
                              setPurchaseOrders(prev => prev.map((o, i) => i === index ? { ...o, shippingCost: newCost } : o))
                            }}
                            className="w-24 text-right text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input 
                            type="text" 
                            value={order.channel} 
                            onChange={(e) => setPurchaseOrders(prev => prev.map((o, i) => i === index ? { ...o, channel: e.target.value } : o))}
                            className="text-sm"
                            placeholder="ช่องทางสั่งซื้อ"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <select 
                            value={order.status}
                            onChange={(e) => setPurchaseOrders(prev => prev.map((o, i) => i === index ? { ...o, status: e.target.value as 'not_ordered' | 'ordered' | 'received' } : o))}
                            className={`px-2 py-1 rounded text-xs font-medium border ${
                              order.status === 'not_ordered' ? 'bg-gray-100 text-gray-700 border-gray-300' :
                              order.status === 'ordered' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                              'bg-green-100 text-green-700 border-green-300'
                            }`}
                          >
                            <option value="not_ordered">ยังไม่ได้สั่ง</option>
                            <option value="ordered">สั่งแล้ว</option>
                            <option value="received">ได้รับแล้ว</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium">
                          {formatNumber((order.quantity * order.unitPrice) + order.shippingCost)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button 
                            onClick={() => setPurchaseOrders(prev => prev.filter((_, i) => i !== index))}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {purchaseOrders.length === 0 && (
              <div className="p-6 text-center text-[#8b7355]">
                <ShoppingCart className="h-10 w-10 mx-auto mb-2 text-[#d4c9b8]" />
                <p className="text-sm">ยังไม่มีรายการสั่งซื้อเพิ่ม</p>
                <p className="text-xs text-[#a67c52]">เลือกสินค้าที่ขาดจาก dropdown เพื่อเพิ่มรายการ</p>
              </div>
            )}
          </Card>
        </div>
      )}

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm bg-white">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">แชร์ใบเสนอราคา</h3>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* QR Code */}
              <div className="flex justify-center">
                <QRCodeSVG 
                  value={`${window.location.origin}/quotation/${quotation.id || 'preview'}?preview=1`}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-sm text-gray-500 text-center">สแกน QR Code เพื่อดูบน iPad</p>
              
              {/* Shareable Link */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">ลิงก์สำหรับแชร์</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={`${window.location.origin}/quotation/${quotation.id || 'preview'}?preview=1`}
                    readOnly
                    className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                  <button 
                    onClick={copyShareLink}
                    className="px-3 py-2 bg-[#4A90A4] text-white rounded-lg hover:bg-[#3d7a8a] flex items-center gap-1"
                  >
                    <Copy className="h-4 w-4" />
                    คัดลอก
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {showAttachmentPreview && previewAttachment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowAttachmentPreview(false)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setShowAttachmentPreview(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
            <img 
              src={previewAttachment.url} 
              alt={previewAttachment.name}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            <p className="text-white text-center mt-2">{previewAttachment.name}</p>
          </div>
        </div>
      )}
    </div>
  )
}
