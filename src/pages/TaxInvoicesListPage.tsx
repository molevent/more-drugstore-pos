import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { Link } from 'react-router-dom'
import { 
  FileText, 
  Search, 
  Filter,
  Eye,
  Calendar,
  User,
  Hash,
  Building2,
  MapPin,
  DollarSign,
  Percent,
  Receipt,
  BookOpen,
  ArrowLeft,
  Printer
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

export default function TaxInvoicesListPage() {
  const [taxInvoices, setTaxInvoices] = useState<TaxInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState<string>('')

  const fetchTaxInvoices = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('tax_invoices')
        .select('*')
        .order('created_at', { ascending: false })

      if (dateFilter) {
        const startOfDay = new Date(dateFilter)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(dateFilter)
        endOfDay.setHours(23, 59, 59, 999)
        
        query = query
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString())
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
  }, [dateFilter])

  const filteredTaxInvoices = taxInvoices.filter(ti => 
    ti.tax_invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ti.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ti.customer_tax_id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('th-TH', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    })
  }

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

  const handlePrint = async (orderId: string, orderSource: string) => {
    // Open order details for printing
    const orderTable = orderSource === 'web' ? 'web_orders' : 'orders'
    window.open(`/sales-orders?print=${orderId}&source=${orderSource}`, '_blank')
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
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="ค้นหาเลขที่ใบกำกับภาษี, ชื่อลูกค้า, เลขผู้เสียภาษี..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-full sm:w-48">
            <Input
              type="date"
              placeholder="เลือกวันที่"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-[#7D735F] to-[#9B8F7E]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-sm">จำนวนใบกำกับภาษี</p>
              <p className="text-white text-2xl font-bold">{filteredTaxInvoices.length}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-[#5C4A32] to-[#7D735F]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-sm">ยอดรวมทั้งหมด</p>
              <p className="text-white text-2xl font-bold">
                {formatCurrency(filteredTaxInvoices.reduce((sum, ti) => sum + (ti.total_amount || 0), 0))}
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-[#4A5568] to-[#718096]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg">
              <Percent className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-sm">ภาษีมูลค่าเพิ่มรวม</p>
              <p className="text-white text-2xl font-bold">
                {formatCurrency(filteredTaxInvoices.reduce((sum, ti) => sum + (ti.vat_amount || 0), 0))}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tax Invoices Table */}
      <Card>
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
              {searchTerm || dateFilter ? 'ลองเปลี่ยนเงื่อนไขการค้นหา' : 'ยังไม่มีใบกำกับภาษีในระบบ'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#F5EFE6]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    เลขที่ใบกำกับภาษี
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วันที่
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ลูกค้า
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    เลขผู้เสียภาษี
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
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(invoice.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">{invoice.customer_name}</p>
                          {invoice.customer_address && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {invoice.customer_address.substring(0, 50)}
                              {invoice.customer_address.length > 50 ? '...' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.customer_tax_id ? (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span>{invoice.customer_tax_id}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(invoice.total_amount)} บาท
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {formatCurrency(invoice.vat_amount)} บาท
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <Link
                          to={`/sales-orders?view=${invoice.order_id}&source=${invoice.order_source}`}
                          className="p-2 text-gray-400 hover:text-[#7D735F] hover:bg-[#F5F0E6] rounded-full transition-all"
                          title="ดูรายละเอียดออเดอร์"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handlePrint(invoice.order_id, invoice.order_source)}
                          className="p-2 text-gray-400 hover:text-[#7D735F] hover:bg-[#F5F0E6] rounded-full transition-all"
                          title="พิมพ์ใบกำกับภาษี"
                        >
                          <Printer className="h-4 w-4" />
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
    </div>
  )
}
