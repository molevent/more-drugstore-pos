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
  AlertCircle
} from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'

interface Quotation {
  id: string
  quotation_number: string
  contact_name: string
  contact_company: string
  issue_date: string
  expiry_date: string
  total_amount: number
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'
  created_at: string
  updated_at: string
}

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

  const fetchQuotations = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('quotations')
        .select('id, quotation_number, contact_name, contact_company, issue_date, expiry_date, total_amount, status, created_at, updated_at')
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
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
  }, [statusFilter])

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

  const formatNumber = (num: number) => {
    return num.toLocaleString('th-TH', { minimumFractionDigits: 2 })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-[#4A90A4]" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">รายการใบเสนอราคา</h1>
            <p className="text-gray-600">จัดการใบเสนอราคาทั้งหมด</p>
          </div>
        </div>
        <Link to="/quotation">
          <Button className="flex items-center gap-2 bg-[#4A90A4] hover:bg-[#3d7a8a] text-white">
            <Plus className="h-4 w-4" />
            สร้างใบเสนอราคาใหม่
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4 flex flex-col sm:flex-row gap-4">
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
        </div>
      </Card>

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
                  const StatusIcon = status.icon
                  return (
                    <tr key={quotation.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-[#4A90A4]">{quotation.quotation_number}</span>
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
                        {formatNumber(quotation.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Link 
                            to={`/quotation/${quotation.id}`}
                            className="p-1 text-gray-400 hover:text-[#4A90A4] rounded"
                            title="ดูรายละเอียด"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
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

      {/* Summary */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-4">
        {Object.entries(statusConfig).map(([key, config]) => {
          const count = quotations.filter(q => q.status === key).length
          const Icon = config.icon
          return (
            <Card key={key} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-sm text-gray-500">{config.label}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
