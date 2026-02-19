import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { Link } from 'react-router-dom'
import { 
  FileText, 
  Plus, 
  Search, 
  Filter,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  AlertCircle,
  FileDown,
  BookOpen,
  ArrowLeft,
  DollarSign,
  Percent,
  Users,
  X,
  Printer,
  Building2,
  Phone,
  Mail,
  MapPin
} from 'lucide-react'
import Card from '../components/common/Card'
import Input from '../components/common/Input'

interface Quotation {
  id: string
  quotation_number: string
  contact_name: string
  contact_company: string
  contact_address: string
  contact_tax_id: string
  contact_phone: string
  contact_email: string
  issue_date: string
  expiry_date: string
  total_amount: number
  subtotal: number
  tax_amount: number
  tax_rate: number
  tax_type: 'inclusive' | 'exclusive'
  discount_amount: number
  discount_percent: number
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'
  pdf_url?: string
  notes: string
  terms: string
  items: QuotationItem[]
  created_at: string
  updated_at: string
  logo_url?: string
  stamp_url?: string
  signature_url?: string
  seller_name?: string
  receiver_name?: string
  show_product_images: boolean
  show_discount: boolean
  show_receiver: boolean
  withholding_tax: boolean
  withholding_tax_percent: number
  withholding_tax_amount: number
}

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

type ModalType = 'view' | 'print' | null

const statusConfig = {
  draft: { label: 'ร่าง', color: 'bg-gray-100 text-gray-700', icon: Clock },
  sent: { label: 'ส่งแล้ว', color: 'bg-blue-100 text-blue-700', icon: Send },
  approved: { label: 'อนุมัติ', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'ปฏิเสธ', color: 'bg-red-100 text-red-700', icon: XCircle },
  expired: { label: 'หมดอายุ', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle }
}

export default function QuotationsListPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('')

  // Modal states
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)
  const [modalLoading, setModalLoading] = useState(false)

  const fetchQuotations = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('quotations')
        .select('*')
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

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
      setQuotations(data || [])
    } catch (error) {
      console.error('Error fetching quotations:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotations()
  }, [statusFilter, dateFilter])

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบใบเสนอราคานี้?')) return

    try {
      const { error } = await supabase.from('quotations').delete().eq('id', id)
      if (error) throw error
      fetchQuotations()
    } catch (error) {
      console.error('Error deleting quotation:', error)
      alert('ไม่สามารถลบใบเสนอราคาได้')
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('quotations')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      fetchQuotations()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('ไม่สามารถเปลี่ยนสถานะได้')
    }
  }

  const filteredQuotations = quotations.filter(q => 
    q.quotation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.contact_company.toLowerCase().includes(searchTerm.toLowerCase())
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

  const openModal = async (type: ModalType, quotation: Quotation) => {
    setModalLoading(true)
    setSelectedQuotation(quotation)
    setActiveModal(type)
    setModalLoading(false)
  }

  const closeModal = () => {
    setActiveModal(null)
    setSelectedQuotation(null)
  }

  const handlePrint = () => {
    if (!selectedQuotation) return
    window.print()
  }

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

  const formatNumber = (num: number) => {
    return num.toLocaleString('th-TH', { minimumFractionDigits: 2 })
  }

  // View Modal Component
  const ViewModal = () => {
    if (!selectedQuotation) return null
    
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#F5EFE6]">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Eye className="h-5 w-5 text-[#7D735F]" />
              รายละเอียดใบเสนอราคา
            </h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrint}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                title="พิมพ์"
              >
                <Printer className="h-5 w-5" />
              </button>
              <button onClick={closeModal} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="p-6 overflow-y-auto flex-1">
            {modalLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7D735F] mx-auto"></div>
                <p className="mt-4 text-gray-500">กำลังโหลด...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header Info */}
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    {selectedQuotation.logo_url && (
                      <img 
                        src={selectedQuotation.logo_url} 
                        alt="Logo" 
                        className="h-16 object-contain mb-4"
                      />
                    )}
                    <h2 className="text-2xl font-bold text-gray-900">ใบเสนอราคา / QUOTATION</h2>
                    <p className="text-gray-500">เลขที่: {selectedQuotation.quotation_number}</p>
                  </div>
                  <div className="text-right">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <span className="text-gray-500">วันที่ออก:</span>
                      <span>{formatDate(selectedQuotation.issue_date)}</span>
                      <span className="text-gray-500">ครบกำหนด:</span>
                      <span>{formatDate(selectedQuotation.expiry_date)}</span>
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                <Card>
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    ข้อมูลลูกค้า
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">ชื่อ</p>
                      <p className="font-medium">{selectedQuotation.contact_name}</p>
                    </div>
                    {selectedQuotation.contact_company && (
                      <div>
                        <p className="text-sm text-gray-500">บริษัท</p>
                        <p className="font-medium flex items-center gap-1">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          {selectedQuotation.contact_company}
                        </p>
                      </div>
                    )}
                    {selectedQuotation.contact_tax_id && (
                      <div>
                        <p className="text-sm text-gray-500">เลขประจำตัวผู้เสียภาษี</p>
                        <p className="font-medium">{selectedQuotation.contact_tax_id}</p>
                      </div>
                    )}
                    {selectedQuotation.contact_phone && (
                      <div>
                        <p className="text-sm text-gray-500">โทรศัพท์</p>
                        <p className="font-medium flex items-center gap-1">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {selectedQuotation.contact_phone}
                        </p>
                      </div>
                    )}
                    {selectedQuotation.contact_email && (
                      <div>
                        <p className="text-sm text-gray-500">อีเมล</p>
                        <p className="font-medium flex items-center gap-1">
                          <Mail className="h-4 w-4 text-gray-400" />
                          {selectedQuotation.contact_email}
                        </p>
                      </div>
                    )}
                    {selectedQuotation.contact_address && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500">ที่อยู่</p>
                        <p className="font-medium flex items-start gap-1">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                          {selectedQuotation.contact_address}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Items Table */}
                <Card>
                  <h4 className="font-medium mb-4">รายการสินค้า</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">#</th>
                          <th className="px-3 py-2 text-left">รายการ</th>
                          <th className="px-3 py-2 text-center">จำนวน</th>
                          <th className="px-3 py-2 text-right">ราคา/หน่วย</th>
                          <th className="px-3 py-2 text-right">ส่วนลด</th>
                          <th className="px-3 py-2 text-right">รวม</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedQuotation.items?.map((item, index) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2">{index + 1}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                {selectedQuotation.show_product_images && (item.product_image || item.custom_image_url) && (
                                  <img 
                                    src={item.use_custom_image ? item.custom_image_url : item.product_image} 
                                    alt={item.product_name}
                                    className="w-10 h-10 object-cover rounded"
                                  />
                                )}
                                <div>
                                  <p className="font-medium">{item.product_name}</p>
                                  {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">{item.quantity} {item.unit}</td>
                            <td className="px-3 py-2 text-right">{formatNumber(item.unit_price)}</td>
                            <td className="px-3 py-2 text-right">
                              {item.discount_percent > 0 && <span>{item.discount_percent}%</span>}
                              {item.discount_amount > 0 && <span>{formatNumber(item.discount_amount)}</span>}
                              {item.discount_percent === 0 && item.discount_amount === 0 && <span>-</span>}
                            </td>
                            <td className="px-3 py-2 text-right">{formatNumber(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <div className="space-y-2">
                      {selectedQuotation.notes && (
                        <div>
                          <p className="text-sm text-gray-500">หมายเหตุ</p>
                          <p className="text-sm whitespace-pre-wrap">{selectedQuotation.notes}</p>
                        </div>
                      )}
                      {selectedQuotation.terms && (
                        <div>
                          <p className="text-sm text-gray-500">เงื่อนไข</p>
                          <p className="text-sm whitespace-pre-wrap">{selectedQuotation.terms}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                  
                  <Card className="bg-gray-50">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">รวมเป็นเงิน:</span>
                        <span>{formatNumber(selectedQuotation.subtotal)} บาท</span>
                      </div>
                      {selectedQuotation.discount_amount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">ส่วนลด:</span>
                          <span>-{formatNumber(selectedQuotation.discount_amount)} บาท</span>
                        </div>
                      )}
                      {selectedQuotation.discount_percent > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">ส่วนลด ({selectedQuotation.discount_percent}%):</span>
                          <span>-{formatNumber(selectedQuotation.subtotal * selectedQuotation.discount_percent / 100)} บาท</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">ภาษีมูลค่าเพิ่ม {selectedQuotation.tax_rate}%:</span>
                        <span>{formatNumber(selectedQuotation.tax_amount)} บาท</span>
                      </div>
                      {selectedQuotation.withholding_tax && (
                        <div className="flex justify-between text-red-600">
                          <span>หัก ณ ที่จ่าย {selectedQuotation.withholding_tax_percent}%:</span>
                          <span>-{formatNumber(selectedQuotation.withholding_tax_amount)} บาท</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold pt-2 border-t">
                        <span>จำนวนเงินรวมทั้งสิ้น:</span>
                        <span className="text-[#4A90A4]">{formatNumber(selectedQuotation.total_amount)} บาท</span>
                      </div>
                      <p className="text-xs text-gray-500 italic">
                        ({numberToThaiText(selectedQuotation.total_amount)})
                      </p>
                    </div>
                  </Card>
                </div>

                {/* Status */}
                <div className="flex justify-end">
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusConfig[selectedQuotation.status].color}`}>
                    สถานะ: {statusConfig[selectedQuotation.status].label}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
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
          <FileText className="h-8 w-8 text-[#7D735F] mt-1" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">รายการใบเสนอราคา</h1>
            <p className="text-gray-600">จัดการใบเสนอราคาทั้งหมด</p>
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
          <Link 
            to="/quotation"
            className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#A67B5B] bg-white text-[#A67B5B] text-sm whitespace-nowrap hover:bg-[#A67B5B]/10 transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            สร้างใบเสนอราคาใหม่
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="ค้นหาด้วยเลขที่, ชื่อลูกค้า, บริษัท..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4A90A4] focus:border-transparent"
            >
              <option value="all">ทั้งหมด</option>
              <option value="draft">ร่าง</option>
              <option value="sent">ส่งแล้ว</option>
              <option value="approved">อนุมัติ</option>
              <option value="rejected">ปฏิเสธ</option>
              <option value="expired">หมดอายุ</option>
            </select>
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
        <Card className="bg-white hover:border-blue-500 hover:border-2 transition-all cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#F5EFE6] rounded-lg">
              <FileText className="h-6 w-6 text-[#7D735F]" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">จำนวนใบเสนอราคา</p>
              <p className="text-gray-900 text-2xl font-bold">{filteredQuotations.length}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white hover:border-blue-500 hover:border-2 transition-all cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#F5EFE6] rounded-lg">
              <DollarSign className="h-6 w-6 text-[#7D735F]" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">ยอดรวมทั้งหมด</p>
              <p className="text-gray-900 text-2xl font-bold">
                {formatNumber(filteredQuotations.reduce((sum, q) => sum + (q.total_amount || 0), 0))}
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-white hover:border-blue-500 hover:border-2 transition-all cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#F5EFE6] rounded-lg">
              <Percent className="h-6 w-6 text-[#7D735F]" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">ภาษีมูลค่าเพิ่มรวม</p>
              <p className="text-gray-900 text-2xl font-bold">
                {formatNumber(filteredQuotations.reduce((sum, q) => sum + (q.tax_amount || 0), 0))}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quotations Table */}
      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
        ) : filteredQuotations.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">ไม่พบใบเสนอราคา</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm || statusFilter !== 'all' 
                ? 'ลองเปลี่ยนเงื่อนไขการค้นหา' 
                : 'เริ่มสร้างใบเสนอราคาแรกของคุณ'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">เลขที่</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ลูกค้า</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">วันที่</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">ครบกำหนด</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">ยอดรวม</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">สถานะ</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredQuotations.map((quotation) => {
                  const status = statusConfig[quotation.status]
                  return (
                    <tr key={quotation.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link 
                          to={`/quotation?id=${quotation.id}`}
                          className="font-medium text-[#4A90A4] hover:underline"
                          title="แก้ไขใบเสนอราคา"
                        >
                          {quotation.quotation_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{quotation.contact_name}</p>
                          {quotation.contact_company && (
                            <p className="text-sm text-gray-500">{quotation.contact_company}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {formatDate(quotation.issue_date)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {formatDate(quotation.expiry_date)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatNumber((quotation.subtotal || 0) + (quotation.tax_amount || 0))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={quotation.status}
                          onChange={(e) => handleStatusChange(quotation.id, e.target.value)}
                          className={`text-xs font-medium rounded-full px-2 py-1 border-none cursor-pointer focus:ring-2 focus:ring-[#4A90A4] ${status.color}`}
                        >
                          <option value="draft">ร่าง</option>
                          <option value="sent">ส่งแล้ว</option>
                          <option value="approved">อนุมัติ</option>
                          <option value="rejected">ปฏิเสธ</option>
                          <option value="expired">หมดอายุ</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => openModal('view', quotation)}
                            className="p-1 text-gray-400 hover:text-[#4A90A4] rounded"
                            title="ดูตัวอย่าง"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {quotation.pdf_url && (
                            <a 
                              href={quotation.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                              title="ดู PDF"
                            >
                              <FileDown className="h-4 w-4" />
                            </a>
                          )}
                          <Link 
                            to={`/quotation?id=${quotation.id}`}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded"
                            title="แก้ไข"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Link>
                          <button 
                            onClick={() => handleDelete(quotation.id)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                            title="ลบ"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {/* Modals */}
      {activeModal === 'view' && <ViewModal />}
    </div>
  )
}
