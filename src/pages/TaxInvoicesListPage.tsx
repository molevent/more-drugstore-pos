import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { 
  FileText, 
  Search, 
  Filter,
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
  Edit
} from 'lucide-react'
import Card from '../components/common/Card'
import Input from '../components/common/Input'
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
  const [taxInvoices, setTaxInvoices] = useState<TaxInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  
  // Modal states
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [modalLoading, setModalLoading] = useState(false)

  const fetchTaxInvoices = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('tax_invoices')
        .select('*')
        .order('created_at', { ascending: false })

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
    } finally {
      setModalLoading(false)
    }
  }

  const openModal = async (type: ModalType, orderId: string, orderSource: string) => {
    await fetchOrderDetails(orderId, orderSource)
    setActiveModal(type)
  }

  const closeModal = () => {
    setActiveModal(null)
    setSelectedOrder(null)
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

  const handlePrintTaxInvoice = (type: 'abbreviated' | 'full') => {
    if (!selectedOrder) return
    
    if (type === 'abbreviated') {
      // Abbreviated tax invoice (ใบกำกับภาษีอย่างย่อ)
      const printContent = `
        <div style="font-family: 'TH Sarabun New', sans-serif; width: 80mm; min-height: 100mm; padding: 10px; font-size: 12px; box-sizing: border-box;">
          <div style="text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px;">
            <h2 style="margin: 0; font-size: 14px;">ใบกำกับภาษีอย่างย่อ/ใบเสร็จรับเงิน</h2>
            <p style="margin: 3px 0; font-size: 10px;">Abbreviated Tax Invoice/Receipt</p>
          </div>
          <div style="margin-bottom: 10px; font-size: 11px;">
            <p><strong>เลขที่:</strong> ${selectedOrder.order_number}</p>
            <p><strong>วันที่:</strong> ${formatDate(selectedOrder.created_at)}</p>
            <p><strong>เวลา:</strong> ${formatTime(selectedOrder.created_at)}</p>
          </div>
          <div style="margin-bottom: 10px; font-size: 11px;">
            <p><strong>ลูกค้า:</strong> ${selectedOrder.customer_name}</p>
          </div>
          <table style="width: 100%; font-size: 10px; border-collapse: collapse; margin-bottom: 10px;">
            <thead>
              <tr style="border-top: 1px solid #000; border-bottom: 1px solid #000;">
                <th style="padding: 4px; text-align: left;">รายการ</th>
                <th style="padding: 4px; text-align: center;">จำนวน</th>
                <th style="padding: 4px; text-align: right;">รวม</th>
              </tr>
            </thead>
            <tbody>
              ${selectedOrder.order_items?.map((item) => `
                <tr style="border-bottom: 1px dashed #ccc;">
                  <td style="padding: 4px;">${item.product_name}</td>
                  <td style="padding: 4px; text-align: center;">${item.quantity}</td>
                  <td style="padding: 4px; text-align: right;">${formatCurrency(item.total_price)}</td>
                </tr>
              `).join('') || ''}
            </tbody>
          </table>
          <div style="text-align: right; font-size: 11px; margin-top: 10px; border-top: 1px dashed #000; padding-top: 10px;">
            <p><strong>ยอดรวม: ${formatCurrency(selectedOrder.total)} บาท</strong></p>
          </div>
          <div style="margin-top: 20px; text-align: center; font-size: 10px; color: #666;">
            <p>ขอบคุณที่ใช้บริการ</p>
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
      // Full tax invoice (ใบกำกับภาษีเต็มรูป)
      const printContent = `
        <div style="font-family: 'TH Sarabun New', sans-serif; width: 210mm; min-height: 297mm; padding: 15px; font-size: 14px; box-sizing: border-box;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 18px;">ใบกำกับภาษี/ใบเสร็จรับเงิน</h2>
            <p style="margin: 5px 0; font-size: 12px;">Tax Invoice/Receipt</p>
          </div>
          <table style="width: 100%; margin-bottom: 20px; font-size: 12px;">
            <tr>
              <td style="width: 50%;">
                <strong>เลขที่:</strong> ${selectedOrder.order_number}<br>
                <strong>วันที่:</strong> ${formatDate(selectedOrder.created_at)}<br>
                <strong>เวลา:</strong> ${formatTime(selectedOrder.created_at)}
              </td>
              <td style="width: 50%; text-align: right;">
                <strong>ลูกค้า:</strong> ${selectedOrder.customer_name}<br>
                ${selectedOrder.customer_tax_id ? `<strong>เลขผู้เสียภาษี:</strong> ${selectedOrder.customer_tax_id}<br>` : ''}
              </td>
            </tr>
          </table>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
            <thead>
              <tr style="border-top: 2px solid #333; border-bottom: 1px solid #333;">
                <th style="padding: 8px; text-align: left;">#</th>
                <th style="padding: 8px; text-align: left;">รายการ</th>
                <th style="padding: 8px; text-align: center;">จำนวน</th>
                <th style="padding: 8px; text-align: right;">ราคา/หน่วย</th>
                <th style="padding: 8px; text-align: right;">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              ${selectedOrder.order_items?.map((item, index) => `
                <tr>
                  <td style="padding: 8px;">${index + 1}</td>
                  <td style="padding: 8px;">${item.product_name}</td>
                  <td style="padding: 8px; text-align: center;">${item.quantity}</td>
                  <td style="padding: 8px; text-align: right;">${formatCurrency(item.unit_price)}</td>
                  <td style="padding: 8px; text-align: right;">${formatCurrency(item.total_price)}</td>
                </tr>
              `).join('') || ''}
            </tbody>
          </table>
          <table style="width: 100%; font-size: 12px; margin-top: 20px;">
            <tr>
              <td style="width: 50%;"></td>
              <td style="width: 50%; text-align: right;">
                <strong>รวมเป็นเงิน:</strong> ${formatCurrency(selectedOrder.total * 0.93)} บาท<br>
                <strong>ภาษีมูลค่าเพิ่ม 7%:</strong> ${formatCurrency(selectedOrder.total * 0.07)} บาท<br>
                <strong style="font-size: 14px;">จำนวนเงินรวมทั้งสิ้น:</strong> <strong style="font-size: 14px;">${formatCurrency(selectedOrder.total)} บาท</strong>
              </td>
            </tr>
          </table>
          <div style="margin-top: 40px; text-align: center; font-size: 12px;">
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
            <h1 className="text-2xl font-bold text-gray-900">รายการใบกำกับภาษีเต็มรูป</h1>
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
            <Filter className="h-4 w-4" />
            รีเฟรช
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="w-24">
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2.5 transition-all">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="เลขที่ใบกำกับภาษี, ชื่อลูกค้า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-sm min-w-0"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            placeholder="จากวันที่"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-32 text-xs py-1 px-2"
          />
          <span className="text-gray-500 text-xs">-</span>
          <Input
            type="date"
            placeholder="ถึงวันที่"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-32 text-xs py-1 px-2"
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  เลขที่ใบกำกับภาษี
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  วันที่/เวลา
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ลูกค้า
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ยอดรวม
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                    <span className="text-xs text-gray-500 ml-6">
                      {invoice.order_source === 'web' ? '(Web Order)' : '(POS)'}
                    </span>
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
                    {formatCurrency(invoice.total_amount)} บาท
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {formatCurrency(invoice.vat_amount)} บาท
                  </td>
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
                        onClick={() => openModal('edit', invoice.order_id, invoice.order_source)}
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
                      <p className="text-2xl font-bold text-[#7D735F]">{formatCurrency(selectedOrder.total)} บาท</p>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {activeModal === 'edit' && selectedOrder && (
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
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>หมายเหตุ:</strong> การแก้ไขใบกำกับภาษีจะเปิดหน้าออเดอร์เดิมในแท็บใหม่ กรุณาแก้ไขข้อมูลออเดอร์จากหน้านั้น
                    </p>
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
                  <div className="flex justify-end gap-4 pt-4">
                    <Button variant="secondary" onClick={closeModal}>
                      ปิด
                    </Button>
                    <Button 
                      onClick={() => {
                        const orderType = selectedOrder.platform_id === 'website' ? 'website' : 'pos'
                        window.open(`/sales?edit=${selectedOrder.id}&source=${orderType}`, '_blank')
                        closeModal()
                      }}
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      เปิดหน้าแก้ไข
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
                      <p><strong>รวมเป็นเงิน:</strong> {formatCurrency(selectedOrder.total * 0.93)} บาท</p>
                      <p><strong>ภาษีมูลค่าเพิ่ม 7%:</strong> {formatCurrency(selectedOrder.total * 0.07)} บาท</p>
                      <p className="text-lg font-bold mt-2">
                        จำนวนเงินรวมทั้งสิ้น: {formatCurrency(selectedOrder.total)} บาท
                      </p>
                    </div>
                    <div className="mt-8 text-center text-sm text-gray-500">
                      <p>ขอบคุณที่ใช้บริการ</p>
                      <p>Thank you for your business</p>
                    </div>
                  </div>
                  <div className="flex justify-center gap-4">
                    <Button 
                      onClick={() => handlePrintTaxInvoice('abbreviated')} 
                      variant="secondary"
                      className="flex items-center gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      พิมพ์อย่างย่อ
                    </Button>
                    <Button 
                      onClick={() => handlePrintTaxInvoice('full')} 
                      className="flex items-center gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      พิมพ์เต็มรูป
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
