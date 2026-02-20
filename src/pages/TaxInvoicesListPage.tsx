import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { 
  FileText, 
  Search, 
  Eye,
  User,
  DollarSign,
  Percent,
  Receipt,
  BookOpen,
  ArrowLeft,
  Printer,
  X,
  ShoppingCart,
  CreditCard,
  Wallet,
  ArrowUpRight,
  Edit,
  RefreshCw,
  Calendar
} from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'

interface TaxInvoice {
  id: string
  order_id: string
  order_source: string
  tax_invoice_number: string
  customer_name: string
  customer_tax_id: string
  customer_address: string
  total_amount: number
  vat_amount: number
  created_at: string
  updated_at: string
}

interface OrderItem {
  id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_tax_id?: string
  customer_address?: string
  total: number
  vat_amount?: number
  payment_method: string
  created_at: string
  order_items?: OrderItem[]
  platform_id?: string
}

type ModalType = 'view' | 'edit' | 'print' | null

export default function TaxInvoicesListPage() {
  // Get default date range: 1st of current month to today
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const [taxInvoices, setTaxInvoices] = useState<TaxInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState(formatDateForInput(firstDayOfMonth))
  const [dateTo, setDateTo] = useState(formatDateForInput(today))
  
  // Modal states
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedTaxInvoice, setSelectedTaxInvoice] = useState<TaxInvoice | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    customer_name: '',
    customer_tax_id: '',
    customer_address: ''
  })

  const fetchTaxInvoices = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('tax_invoices')
        .select('*')
        .order('created_at', { ascending: true })

      if (dateFrom) {
        const startOfDay = new Date(dateFrom)
        startOfDay.setHours(0, 0, 0, 0)
        query = query.gte('created_at', startOfDay.toISOString())
      }
      
      if (dateTo) {
        const endOfDay = new Date(dateTo)
        endOfDay.setHours(23, 59, 59, 999)
        query = query.lte('created_at', endOfDay.toISOString())
      }

      const { data, error } = await query

      if (error) throw error
      setTaxInvoices(data || [])
    } catch (error) {
      console.error('Error fetching tax invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTaxInvoices()
  }, [dateFrom, dateTo])

  const filteredTaxInvoices = taxInvoices.filter(ti => 
    ti.tax_invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ti.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  )


  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('th-TH', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (num: number) => {
    return num.toLocaleString('th-TH', { minimumFractionDigits: 2 })
  }

  const getPaymentMethodName = (method: string) => {
    const methods: Record<string, string> = {
      cash: 'เงินสด',
      credit_card: 'บัตรเครดิต',
      transfer: 'โอนเงิน',
      grab_wallet: 'Grab',
      shopee_wallet: 'Shopee',
      lineman_wallet: 'Lineman'
    }
    return methods[method] || method
  }

  const fetchOrderDetails = async (orderId: string, orderSource: string) => {
    try {
      setModalLoading(true)
      const orderTable = orderSource === 'web' ? 'web_orders' : 'orders'
      const itemsTable = orderSource === 'web' ? 'web_order_items' : 'order_items'
      
      const { data: order, error: orderError } = await supabase
        .from(orderTable)
        .select('*')
        .eq('id', orderId)
        .single()
      
      if (orderError) throw orderError
      
      const { data: items, error: itemsError } = await supabase
        .from(itemsTable)
        .select('*')
        .eq('order_id', orderId)
      
      if (itemsError) throw itemsError
      
      setSelectedOrder({ ...order, order_items: items || [] })
    } catch (error) {
      console.error('Error fetching order details:', error)
      throw error
    } finally {
      setModalLoading(false)
    }
  }

  const openModal = async (type: ModalType, orderId: string, orderSource: string, taxInvoice?: TaxInvoice) => {
    try {
      await fetchOrderDetails(orderId, orderSource)
      if (taxInvoice) {
        setSelectedTaxInvoice(taxInvoice)
        setEditForm({
          customer_name: taxInvoice.customer_name || '',
          customer_tax_id: taxInvoice.customer_tax_id || '',
          customer_address: taxInvoice.customer_address || ''
        })
      }
      setActiveModal(type)
    } catch (error) {
      console.error('Error opening modal:', error)
      alert('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง')
    }
  }

  const closeModal = () => {
    setActiveModal(null)
    setSelectedOrder(null)
    setSelectedTaxInvoice(null)
    setEditForm({ customer_name: '', customer_tax_id: '', customer_address: '' })
  }

  const handleSaveTaxInvoice = async () => {
    if (!selectedTaxInvoice) return
    
    try {
      setSaving(true)
      const { error } = await supabase
        .from('tax_invoices')
        .update({
          customer_name: editForm.customer_name,
          customer_tax_id: editForm.customer_tax_id,
          customer_address: editForm.customer_address,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTaxInvoice.id)
      
      if (error) throw error
      
      // Refresh the list
      await fetchTaxInvoices()
      closeModal()
    } catch (error) {
      console.error('Error updating tax invoice:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('th-TH', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric'
    })
  }

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit'
    })
  }

  const handlePrintTaxInvoice = async (type: 'abbreviated' | 'full' | 'copy_abbreviated' | 'copy_full') => {
    if (!selectedOrder) return
    
    const isCopy = type === 'copy_abbreviated' || type === 'copy_full'
    const actualType = type === 'copy_abbreviated' ? 'abbreviated' : type === 'copy_full' ? 'full' : type
    
    if (actualType === 'abbreviated') {
      // Abbreviated tax invoice (ใบกำกับภาษีอย่างย่อ)
      const copyText = isCopy ? '<div style="text-align: center; margin-bottom: 5px; font-size: 11px; color: #999; border: 1px dashed #999; padding: 2px;">สำเนา</div>' : ''
      const printContent = `
        <div style="font-family: 'TH Sarabun New', sans-serif; width: 80mm; min-height: 100mm; padding: 10px; font-size: 12px; box-sizing: border-box;">
          <!-- Logo & Business Info -->
          <div style="text-align: center; margin-bottom: 10px;">
            <img src="/logo.png" alt="Logo" style="width: 50px; height: 50px; margin-bottom: 8px;" />
            <h3 style="margin: 0; font-size: 13px; font-weight: bold;">More Drugstore</h3>
            <p style="margin: 2px 0; font-size: 9px; color: #555;">123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110</p>
            <p style="margin: 2px 0; font-size: 9px; color: #555;">เลขผู้เสียภาษี: 0123456789012</p>
            <p style="margin: 2px 0; font-size: 9px; color: #555;">โทร: 02-123-4567</p>
          </div>
          
          <div style="text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 8px;">
            ${copyText}
            <h2 style="margin: 0; font-size: 13px;">ใบกำกับภาษีอย่างย่อ/ใบเสร็จรับเงิน</h2>
            <p style="margin: 2px 0; font-size: 9px;">Abbreviated Tax Invoice/Receipt</p>
          </div>
          
          <div style="margin-bottom: 8px; font-size: 10px;">
            <p><strong>เลขที่:</strong> ${selectedOrder.order_number}</p>
            <p><strong>วันที่:</strong> ${formatDate(selectedOrder.created_at)}</p>
            <p><strong>เวลา:</strong> ${formatTime(selectedOrder.created_at)}</p>
          </div>
          
          <div style="margin-bottom: 8px; font-size: 10px;">
            <p><strong>ลูกค้า:</strong> ${selectedOrder.customer_name}</p>
          </div>
          
          <table style="width: 100%; font-size: 10px; border-collapse: collapse; margin-bottom: 8px;">
            <thead>
              <tr style="border-top: 1px solid #000; border-bottom: 1px solid #000;">
                <th style="padding: 3px; text-align: left;">รายการ</th>
                <th style="padding: 3px; text-align: center;">จำนวน</th>
                <th style="padding: 3px; text-align: right;">รวม</th>
              </tr>
            </thead>
            <tbody>
              ${selectedOrder.order_items?.map((item) => `
                <tr style="border-bottom: 1px dashed #ccc;">
                  <td style="padding: 3px;">${item.product_name}</td>
                  <td style="padding: 3px; text-align: center;">${item.quantity}</td>
                  <td style="padding: 3px; text-align: right;">${formatCurrency(item.total_price)}</td>
                </tr>
              `).join('') || ''}
            </tbody>
          </table>
          
          <div style="text-align: right; font-size: 10px; margin-top: 8px; border-top: 1px dashed #000; padding-top: 8px;">
            <p>รวมเป็นเงิน: ${formatCurrency(selectedOrder.total - (selectedOrder.total * 0.07 / 1.07))}</p>
            <p>VAT 7%: ${formatCurrency(selectedOrder.total * 0.07 / 1.07)}</p>
            <p style="font-weight: bold; font-size: 11px; margin-top: 4px;">ยอดรวม: ${formatCurrency(selectedOrder.total)}</p>
          </div>
          
          <div style="margin-top: 15px; text-align: center; font-size: 9px; color: #666;">
            <p style="font-weight: bold; color: #000;">*** VAT INCLUDED ***</p>
            <p>ขอบคุณที่ใช้บริการ</p>
            <p>Thank you for your business</p>
          </div>
        </div>
      `
      
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(printContent)
        printWindow.document.close()
        printWindow.print()
      }
    } else {
      // Full tax invoice (ใบกำกับภาษีเต็มรูป) - Match SalesOrdersPage format
      try {
        // Fetch shop settings
        const { data: shopData } = await supabase
          .from('shop_settings')
          .select('name, address, tax_id, phone, logo_url, stamp_url, signature_url')
          .single()

        const shopName = shopData?.name || 'ห้างหุ้นส่วนจำกัด สะอางพาณิชย์'
        const shopAddress = shopData?.address || ''
        const shopTaxId = shopData?.tax_id || ''
        const shopPhone = shopData?.phone || ''
        const logoUrl = shopData?.logo_url || ''
        const stampUrl = shopData?.stamp_url || ''
        const signatureUrl = shopData?.signature_url || ''

        const customerTaxId = selectedOrder.customer_tax_id || ''
        const customerAddress = selectedOrder.customer_address || ''
        const taxInvoiceNumber = selectedTaxInvoice?.tax_invoice_number || selectedOrder.order_number

        const totalAmount = selectedOrder.total || 0
        const vatAmount = totalAmount * 0.07 / 1.07
        const baseAmount = totalAmount - vatAmount

        const copyText = isCopy ? '<div style="text-align: center; margin-bottom: 8px; font-size: 14px; color: #999; border: 2px dashed #999; padding: 4px; font-weight: bold;">สำเนา</div>' : ''
        const copyLabel = isCopy ? 'สำเนา' : 'ต้นฉบับ'

        const printContent = `
          <div style="font-family: 'TH Sarabun New', 'Angsana New', sans-serif; width: 210mm; min-height: 297mm; padding: 15px; font-size: 14px; box-sizing: border-box;">
            <!-- Header Section -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
              <tr>
                <!-- Logo/Company Info -->
                <td style="width: 60%; vertical-align: top;">
                  ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="width: 80px; height: 80px; object-fit: contain; margin-bottom: 10px;" />` : `<div style="border: 2px solid #333; border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;"><span style="font-size: 12px; text-align: center; color: #666;">Logo</span></div>`}
                  <p style="margin: 3px 0; font-size: 13px; font-weight: bold;">${shopName}</p>
                  <p style="margin: 3px 0; font-size: 12px;">${shopAddress}</p>
                  <p style="margin: 3px 0; font-size: 12px;">เลขประจำตัวผู้เสียภาษี: ${shopTaxId}</p>
                  <p style="margin: 3px 0; font-size: 12px;">โทร: ${shopPhone}</p>
                </td>
                <!-- Invoice Details -->
                <td style="width: 40%; vertical-align: top; text-align: right;">
                  ${copyText}
                  <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: bold;">ใบกำกับภาษี/ใบเสร็จรับเงิน</h2>
                  <p style="margin: 3px 0; font-size: 11px; color: #666;">${copyLabel} (เอกสารออกเป็นคู่ฉบับ)</p>
                  <table style="width: 100%; margin-top: 10px; font-size: 12px;">
                    <tr>
                      <td style="text-align: left; padding: 2px 0;">เลขที่</td>
                      <td style="text-align: right; padding: 2px 0;">${taxInvoiceNumber}</td>
                    </tr>
                    <tr>
                      <td style="text-align: left; padding: 2px 0;">วันที่</td>
                      <td style="text-align: right; padding: 2px 0;">${new Date().toLocaleDateString('th-TH')}</td>
                    </tr>
                    <tr>
                      <td style="text-align: left; padding: 2px 0;">ครบกำหนด</td>
                      <td style="text-align: right; padding: 2px 0;">${new Date().toLocaleDateString('th-TH')}</td>
                    </tr>
                    <tr>
                      <td style="text-align: left; padding: 2px 0;">อ้างอิง</td>
                      <td style="text-align: right; padding: 2px 0;">${selectedOrder.order_number}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Customer Section -->
            <table style="width: 100%; border: 1px solid #333; border-collapse: collapse; margin-bottom: 15px;">
              <tr>
                <td style="padding: 10px; vertical-align: top; width: 50%; border-right: 1px solid #333;">
                  <p style="margin: 3px 0; font-size: 12px; color: #666;">ลูกค้า</p>
                  <p style="margin: 5px 0; font-size: 13px; font-weight: bold;">${selectedOrder.customer_name || 'ลูกค้าทั่วไป'}</p>
                  <p style="margin: 3px 0; font-size: 12px;">${customerAddress || '-'}</p>
                  <p style="margin: 3px 0; font-size: 12px;">เลขประจำตัวผู้เสียภาษี: ${customerTaxId}</p>
                </td>
                <td style="padding: 10px; vertical-align: top; width: 50%;">
                  <p style="margin: 3px 0; font-size: 12px; color: #666;">เรื่อง</p>
                  <p style="margin: 5px 0; font-size: 13px;">ขายสินค้า</p>
                  <p style="margin: 10px 0 3px 0; font-size: 12px; color: #666;">เรื่อง</p>
                  <p style="margin: 3px 0; font-size: 12px;">-</p>
                </td>
              </tr>
            </table>

            <!-- Items Table -->
            <table style="width: 100%; border: 1px solid #333; border-collapse: collapse; margin-bottom: 0;">
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="border: 1px solid #333; padding: 8px; text-align: center; width: 5%; font-size: 12px;">#</th>
                  <th style="border: 1px solid #333; padding: 8px; text-align: left; width: 35%; font-size: 12px;">รายละเอียด</th>
                  <th style="border: 1px solid #333; padding: 8px; text-align: center; width: 10%; font-size: 12px;">จำนวน</th>
                  <th style="border: 1px solid #333; padding: 8px; text-align: center; width: 10%; font-size: 12px;">หน่วย</th>
                  <th style="border: 1px solid #333; padding: 8px; text-align: right; width: 15%; font-size: 12px;">ราคาต่อหน่วย</th>
                  <th style="border: 1px solid #333; padding: 8px; text-align: right; width: 12%; font-size: 12px;">ส่วนลด</th>
                  <th style="border: 1px solid #333; padding: 8px; text-align: right; width: 13%; font-size: 12px;">มูลค่า</th>
                </tr>
              </thead>
              <tbody>
                ${selectedOrder.order_items?.map((item: any, index: number) => {
                  const itemTotal = item.total_price || 0
                  const unitPrice = item.quantity > 0 ? itemTotal / item.quantity : 0
                  return `
                    <tr>
                      <td style="border: 1px solid #333; padding: 6px; text-align: center; font-size: 12px;">${index + 1}</td>
                      <td style="border: 1px solid #333; padding: 6px; font-size: 12px;">${item.product_name || 'สินค้า'}</td>
                      <td style="border: 1px solid #333; padding: 6px; text-align: center; font-size: 12px;">${item.quantity}</td>
                      <td style="border: 1px solid #333; padding: 6px; text-align: center; font-size: 12px;">ชิ้น</td>
                      <td style="border: 1px solid #333; padding: 6px; text-align: right; font-size: 12px;">${unitPrice.toFixed(2)}</td>
                      <td style="border: 1px solid #333; padding: 6px; text-align: right; font-size: 12px;">-</td>
                      <td style="border: 1px solid #333; padding: 6px; text-align: right; font-size: 12px;">${itemTotal.toFixed(2)}</td>
                    </tr>
                  `
                }).join('') || ''}
              </tbody>
            </table>

            <!-- Totals Section -->
            <table style="width: 100%; border: 1px solid #333; border-collapse: collapse; border-top: none;">
              <tr>
                <td style="width: 50%; border-right: 1px solid #333; padding: 10px; vertical-align: top; font-size: 11px;">
                  <p style="margin: 3px 0;">(หนึ่งหมื่นห้าพันสองร้อยห้าสิบบาทถ้วน)</p>
                  <p style="margin: 10px 0 3px 0; font-weight: bold;">หมายเหตุ</p>
                  <p style="margin: 3px 0;">1. กรุณาตรวจสอบสินค้าและจำนวนให้ถูกต้องก่อนรับสินค้า</p>
                  <p style="margin: 3px 0;">2. สินค้าที่ขายแล้วไม่รับคืน</p>
                </td>
                <td style="width: 50%; padding: 0; vertical-align: top;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 6px 10px; text-align: right; font-size: 12px; border-bottom: 1px solid #ddd;">รวมเป็นเงิน</td>
                      <td style="padding: 6px 10px; text-align: right; font-size: 12px; border-bottom: 1px solid #ddd; width: 120px;">${baseAmount.toFixed(2)} บาท</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 10px; text-align: right; font-size: 12px; border-bottom: 1px solid #ddd;">ภาษีมูลค่าเพิ่ม 7%</td>
                      <td style="padding: 6px 10px; text-align: right; font-size: 12px; border-bottom: 1px solid #ddd;">${vatAmount.toFixed(2)} บาท</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 10px; text-align: right; font-size: 12px; border-bottom: 1px solid #ddd;">ราคาไม่รวมภาษีมูลค่าเพิ่ม</td>
                      <td style="padding: 6px 10px; text-align: right; font-size: 12px; border-bottom: 1px solid #ddd;">${baseAmount.toFixed(2)} บาท</td>
                    </tr>
                    <tr style="background-color: #f5f5f5;">
                      <td style="padding: 8px 10px; text-align: right; font-size: 13px; font-weight: bold; border-top: 2px solid #333;">จำนวนเงินรวมทั้งสิ้น</td>
                      <td style="padding: 8px 10px; text-align: right; font-size: 13px; font-weight: bold; border-top: 2px solid #333;">${totalAmount.toFixed(2)} บาท</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Payment Section -->
            <table style="width: 100%; border: 1px solid #333; border-collapse: collapse; margin-top: 15px;">
              <tr>
                <td style="padding: 10px; vertical-align: top; width: 60%;">
                  <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold;">ชำระเงินโดย:</p>
                  <div style="font-size: 12px;">
                    <span style="margin-right: 15px;"><span style="border: 1px solid #333; display: inline-block; width: 12px; height: 12px; margin-right: 3px; vertical-align: middle;"></span> เงินสด</span>
                    <span style="margin-right: 15px;"><span style="border: 1px solid #333; display: inline-block; width: 12px; height: 12px; margin-right: 3px; vertical-align: middle;"></span> เช็ค</span>
                    <span style="margin-right: 15px;"><span style="border: 1px solid #333; display: inline-block; width: 12px; height: 12px; margin-right: 3px; vertical-align: middle;"></span> โอนเงิน</span>
                    <span><span style="border: 1px solid #333; display: inline-block; width: 12px; height: 12px; margin-right: 3px; vertical-align: middle;"></span> บัตรเครดิต</span>
                  </div>
                  <table style="width: 100%; margin-top: 10px; font-size: 11px; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 4px; border: 1px solid #ddd; width: 30%;">ธนาคาร</td>
                      <td style="padding: 4px; border: 1px solid #ddd;">เลขที่</td>
                      <td style="padding: 4px; border: 1px solid #ddd; width: 25%;">วันที่</td>
                      <td style="padding: 4px; border: 1px solid #ddd; width: 25%;">จำนวนเงิน</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px; border: 1px solid #ddd;">&nbsp;</td>
                      <td style="padding: 4px; border: 1px solid #ddd;">&nbsp;</td>
                      <td style="padding: 4px; border: 1px solid #ddd;">&nbsp;</td>
                      <td style="padding: 4px; border: 1px solid #ddd;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
                <td style="padding: 10px; vertical-align: top; width: 40%; text-align: center;">
                  <p style="margin: 0 0 5px 0; font-size: 11px; color: #666;">ขอแสดงความนับถือ</p>
                  <div style="margin-top: 40px;">
                    <p style="margin: 0; font-size: 12px;">_____________________</p>
                    <p style="margin: 5px 0 0 0; font-size: 12px;">ผู้จ่ายเงิน</p>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Footer Section -->
            <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
              <tr>
                <td style="width: 35%; text-align: center; vertical-align: top; padding: 10px;">
                  <p style="margin: 0; font-size: 12px;">_____________________</p>
                  <p style="margin: 5px 0 0 0; font-size: 12px;">ผู้จ่ายเงิน</p>
                </td>
                <td style="width: 30%; text-align: center; vertical-align: middle; padding: 10px;">
                  ${stampUrl ? `<img src="${stampUrl}" alt="Stamp" style="width: 100px; height: 100px; object-fit: contain;" />` : `<div style="border: 2px solid #0066cc; border-radius: 50%; width: 100px; height: 100px; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: #0066cc; font-weight: bold;"><span style="font-size: 11px; text-align: center;">ตราบริษัท<br/>Saang</span></div>`}
                </td>
                <td style="width: 35%; text-align: center; vertical-align: top; padding: 10px;">
                  ${signatureUrl ? `<img src="${signatureUrl}" alt="Signature" style="max-width: 120px; max-height: 60px; object-fit: contain; margin-bottom: 5px;" /><br/>` : `<p style="margin: 0; font-size: 12px;">_____________________</p>`}
                  <p style="margin: 5px 0 0 0; font-size: 12px;">ผู้รับเงิน</p>
                  <p style="margin: 3px 0 0 0; font-size: 11px; color: #666;">${new Date().toLocaleDateString('th-TH')}</p>
                </td>
              </tr>
            </table>
          </div>
        `
        
        const printWindow = window.open('', '_blank')
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>ใบกำกับภาษี - ${taxInvoiceNumber}</title>
                <style>
                  @media print {
                    body { margin: 0; }
                    * { -webkit-print-color-adjust: exact !important; }
                  }
                </style>
              </head>
              <body>${printContent}</body>
            </html>
          `)
          printWindow.document.close()
          printWindow.print()
        }
      } catch (error) {
        console.error('Error generating full tax invoice:', error)
        alert('เกิดข้อผิดพลาดในการสร้างใบกำกับภาษี')
      }
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <a
            href="/expenses"
            className="p-2 text-gray-400 hover:text-[#7D735F] hover:bg-[#F5F0E6] rounded-full transition-all"
            title="กลับไปหน้าเอกสาร"
          >
            <ArrowLeft className="h-5 w-5" />
          </a>
          <Receipt className="h-8 w-8 text-[#7D735F] mt-1" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">รายการใบกำกับภาษี</h1>
            <p className="text-gray-600">ดูและจัดการใบกำกับภาษีทั้งหมด</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-help-modal'))}
            className="p-2 text-gray-400 hover:text-[#7D735F] hover:bg-[#F5F0E6] rounded-full transition-all"
            title="คู่มือการใช้งาน"
          >
            <BookOpen className="h-5 w-5" />
          </button>
          <Button
            variant="secondary"
            onClick={fetchTaxInvoices}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-2 h-10">
            <Search className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="ค้นหา..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-sm min-w-0"
            />
          </div>
        </div>
        <div className="flex items-center justify-center">
          <Calendar className="h-5 w-5 text-gray-400" />
        </div>
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-gray-100 border-none rounded-lg text-xs py-2 px-2 w-36 outline-none h-10"
          />
          <span className="text-gray-400 text-xs">-</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-gray-100 border-none rounded-lg text-xs py-2 px-2 w-36 outline-none h-10"
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="bg-white hover:border-white hover:border-2 hover:shadow-lg transition-all cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#F5EFE6] rounded-lg">
              <FileText className="h-6 w-6 text-[#7D735F]" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">จำนวนใบกำกับภาษี</p>
              <p className="text-gray-900 text-2xl font-bold">{filteredTaxInvoices.length}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white hover:border-white hover:border-2 hover:shadow-lg transition-all cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#F5EFE6] rounded-lg">
              <DollarSign className="h-6 w-6 text-[#7D735F]" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">ยอดรวมทั้งหมด</p>
              <p className="text-gray-900 text-2xl font-bold">
                {formatCurrency(filteredTaxInvoices.reduce((sum, ti) => sum + (ti.total_amount || 0), 0))}
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-white hover:border-white hover:border-2 hover:shadow-lg transition-all cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#F5EFE6] rounded-lg">
              <Percent className="h-6 w-6 text-[#7D735F]" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">ภาษีมูลค่าเพิ่มรวม</p>
              <p className="text-gray-900 text-2xl font-bold">
                {formatCurrency(filteredTaxInvoices.reduce((sum, ti) => sum + (ti.vat_amount || 0), 0))}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tax Invoices Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7D735F] mx-auto"></div>
            <p className="mt-4 text-gray-500">กำลังโหลด...</p>
          </div>
        ) : filteredTaxInvoices.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่พบใบกำกับภาษี</h3>
            <p className="text-gray-500">
              {searchTerm || dateFrom || dateTo ? 'ลองเปลี่ยนเงื่อนไขการค้นหา' : 'ยังไม่มีใบกำกับภาษีในระบบ'}
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#F5EFE6]">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  เลขที่ใบกำกับภาษี
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  วันที่/เวลา
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ลูกค้า
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ยอดรวม
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  VAT
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTaxInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#7D735F]" />
                      <span className="font-medium text-gray-900">{invoice.tax_invoice_number}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-6 mt-1">
                      <span className="text-xs text-gray-500">
                        {invoice.order_source === 'web' ? '(Web Order)' : '(POS)'}
                      </span>
                      {invoice.customer_tax_id ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                          เต็มรูป
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          อย่างย่อ
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-900 font-medium">{formatDate(invoice.created_at)}</span>
                      <span className="text-xs text-gray-500">{formatTime(invoice.created_at)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{invoice.customer_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                    {formatCurrency(invoice.total_amount)}                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {formatCurrency(invoice.vat_amount)}                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <button
                        onClick={() => openModal('view', invoice.order_id, invoice.order_source)}
                        className="p-2 text-gray-400 hover:text-[#7D735F] hover:bg-[#F5F0E6] rounded-full transition-all"
                        title="ดูรายละเอียด"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openModal('edit', invoice.order_id, invoice.order_source, invoice)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                        title="แก้ไข"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openModal('print', invoice.order_id, invoice.order_source)}
                        className="p-2 text-gray-400 hover:text-[#7D735F] hover:bg-[#F5F0E6] rounded-full transition-all"
                        title="พิมพ์"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* View Modal */}
      {activeModal === 'view' && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#F5EFE6]">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Eye className="h-5 w-5 text-[#7D735F]" />
                รายละเอียดออเดอร์
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {modalLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7D735F] mx-auto"></div>
                  <p className="mt-4 text-gray-500">กำลังโหลด...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <p className="text-sm text-gray-500">เลขที่ออเดอร์</p>
                      <p className="font-medium">{selectedOrder.order_number}</p>
                    </Card>
                    <Card>
                      <p className="text-sm text-gray-500">วันที่</p>
                      <p className="font-medium">{formatDateTime(selectedOrder.created_at)}</p>
                    </Card>
                  </div>
                  <Card>
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      ข้อมูลลูกค้า
                    </h4>
                    <div className="space-y-2">
                      <p><span className="text-gray-500">ชื่อ:</span> {selectedOrder.customer_name}</p>
                      {selectedOrder.customer_tax_id && (
                        <p><span className="text-gray-500">เลขผู้เสียภาษี:</span> {selectedOrder.customer_tax_id}</p>
                      )}
                      {selectedOrder.customer_address && (
                        <p><span className="text-gray-500">ที่อยู่:</span> {selectedOrder.customer_address}</p>
                      )}
                    </div>
                  </Card>
                  <Card>
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      รายการสินค้า
                    </h4>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">#</th>
                          <th className="px-3 py-2 text-left">สินค้า</th>
                          <th className="px-3 py-2 text-center">จำนวน</th>
                          <th className="px-3 py-2 text-right">ราคา/หน่วย</th>
                          <th className="px-3 py-2 text-right">รวม</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.order_items?.map((item, index) => (
                          <tr key={item.id} className="border-t">
                            <td className="px-3 py-2">{index + 1}</td>
                            <td className="px-3 py-2">{item.product_name}</td>
                            <td className="px-3 py-2 text-center">{item.quantity}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(item.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <p className="text-sm text-gray-500 mb-1">วิธีชำระเงิน</p>
                      <p className="font-medium flex items-center gap-2">
                        {selectedOrder.payment_method === 'cash' && <Wallet className="h-4 w-4" />}
                        {selectedOrder.payment_method === 'credit_card' && <CreditCard className="h-4 w-4" />}
                        {selectedOrder.payment_method === 'transfer' && <ArrowUpRight className="h-4 w-4" />}
                        {getPaymentMethodName(selectedOrder.payment_method)}
                      </p>
                    </Card>
                    <Card className="text-right">
                      <p className="text-sm text-gray-500">ยอดรวมทั้งสิ้น</p>
                      <p className="text-2xl font-bold text-[#7D735F]">{formatCurrency(selectedOrder.total)}</p>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {activeModal === 'edit' && selectedOrder && selectedTaxInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-600" />
                แก้ไขใบกำกับภาษี
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {modalLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-500">กำลังโหลด...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>เลขที่ใบกำกับภาษี:</strong> {selectedTaxInvoice.tax_invoice_number}
                    </p>
                    <p className="text-sm text-blue-800">
                      <strong>เลขที่ออเดอร์:</strong> {selectedOrder.order_number}
                    </p>
                  </div>
                  
                  <Card>
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      ข้อมูลลูกค้า
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">ชื่อลูกค้า</label>
                        <input
                          type="text"
                          value={editForm.customer_name}
                          onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="ชื่อลูกค้า"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">เลขผู้เสียภาษี</label>
                        <input
                          type="text"
                          value={editForm.customer_tax_id}
                          onChange={(e) => setEditForm({ ...editForm, customer_tax_id: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="เลขผู้เสียภาษี (ถ้ามี)"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">ที่อยู่</label>
                        <textarea
                          value={editForm.customer_address}
                          onChange={(e) => setEditForm({ ...editForm, customer_address: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="ที่อยู่ (ถ้ามี)"
                          rows={3}
                        />
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      รายการสินค้า
                    </h4>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">#</th>
                          <th className="px-3 py-2 text-left">สินค้า</th>
                          <th className="px-3 py-2 text-center">จำนวน</th>
                          <th className="px-3 py-2 text-right">ราคา/หน่วย</th>
                          <th className="px-3 py-2 text-right">รวม</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.order_items?.map((item, index) => (
                          <tr key={item.id} className="border-t">
                            <td className="px-3 py-2">{index + 1}</td>
                            <td className="px-3 py-2">{item.product_name}</td>
                            <td className="px-3 py-2 text-center">{item.quantity}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(item.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>

                  <div className="flex justify-end gap-4 pt-4">
                    <Button variant="secondary" onClick={closeModal} disabled={saving}>
                      ยกเลิก
                    </Button>
                    <Button 
                      onClick={handleSaveTaxInvoice}
                      disabled={saving}
                      className="flex items-center gap-2"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          กำลังบันทึก...
                        </>
                      ) : (
                        <>
                          <Edit className="h-4 w-4" />
                          บันทึกการแก้ไข
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {activeModal === 'print' && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#F5EFE6]">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Printer className="h-5 w-5 text-[#7D735F]" />
                พิมพ์ใบกำกับภาษี
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {modalLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7D735F] mx-auto"></div>
                  <p className="mt-4 text-gray-500">กำลังโหลด...</p>
                </div>
              ) : (
                <>
                  <div className="border-2 border-gray-300 p-8 mb-6 bg-white">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-bold mb-1">ใบกำกับภาษี/ใบเสร็จรับเงิน</h2>
                      <p className="text-sm text-gray-500">Tax Invoice/Receipt</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                      <div>
                        <p><strong>เลขที่:</strong> {selectedOrder.order_number}</p>
                        <p><strong>วันที่:</strong> {formatDate(selectedOrder.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p><strong>ลูกค้า:</strong> {selectedOrder.customer_name}</p>
                        {selectedOrder.customer_tax_id && (
                          <p><strong>เลขผู้เสียภาษี:</strong> {selectedOrder.customer_tax_id}</p>
                        )}
                      </div>
                    </div>
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-t-2 border-b border-gray-800">
                          <th className="py-2 text-left">#</th>
                          <th className="py-2 text-left">รายการ</th>
                          <th className="py-2 text-center">จำนวน</th>
                          <th className="py-2 text-right">ราคา/หน่วย</th>
                          <th className="py-2 text-right">จำนวนเงิน</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.order_items?.map((item, index) => (
                          <tr key={item.id} className="border-b border-gray-200">
                            <td className="py-2">{index + 1}</td>
                            <td className="py-2">{item.product_name}</td>
                            <td className="py-2 text-center">{item.quantity}</td>
                            <td className="py-2 text-right">{formatCurrency(item.unit_price)}</td>
                            <td className="py-2 text-right">{formatCurrency(item.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-6 text-right text-sm">
                      <p><strong>รวมเป็นเงิน:</strong> {formatCurrency(selectedOrder.total - (selectedOrder.total * 0.07 / 1.07))}</p>
                      <p><strong>ภาษีมูลค่าเพิ่ม 7%:</strong> {formatCurrency(selectedOrder.total * 0.07 / 1.07)}</p>
                      <p className="text-lg font-bold mt-2">
                        จำนวนเงินรวมทั้งสิ้น: {formatCurrency(selectedOrder.total)}                      </p>
                    </div>
                    <div className="mt-8 text-center text-sm text-gray-500">
                      <p>ขอบคุณที่ใช้บริการ</p>
                      <p>Thank you for your business</p>
                    </div>
                  </div>
                  
                  {/* Print Type Selection */}
                  <div className="grid grid-cols-2 gap-4 mb-6 max-w-lg mx-auto">
                    <Button 
                      onClick={() => handlePrintTaxInvoice('abbreviated')} 
                      variant="secondary"
                      className="flex items-center justify-center gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      ใบกำกับภาษีอย่างย่อ
                    </Button>
                    <Button 
                      onClick={() => handlePrintTaxInvoice('full')} 
                      variant="secondary"
                      className="flex items-center justify-center gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      ใบกำกับภาษีเต็มรูป
                    </Button>
                    <Button 
                      onClick={() => handlePrintTaxInvoice('copy_abbreviated')} 
                      className="flex items-center justify-center gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      สำเนาใบกำกับภาษีอย่างย่อ
                    </Button>
                    <Button 
                      onClick={() => handlePrintTaxInvoice('copy_full')} 
                      className="flex items-center justify-center gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      สำเนาใบกำกับภาษีเต็มรูป
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
