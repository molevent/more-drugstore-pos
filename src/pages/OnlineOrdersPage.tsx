import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import { Plus, Search, X, ArrowLeft, ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'

interface OnlineOrder {
  id: string
  order_date: string
  tax_number?: string
  order_number?: string
  seller_name?: string
  seller_id?: string
  status: 'pending' | 'received' | 'not_booked' | 'booked' | 'partial'
  payment_method?: string
  amount: number
  total: number
  notes?: string
  created_at: string
  updated_at: string
}

interface Contact {
  id: string
  name: string
  company_name?: string
  type: string
  code?: string
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'ยังไม่ได้รับ', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'received', label: 'ได้รับแล้ว', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'not_booked', label: 'ยังไม่ได้ลงบัญชี', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'booked', label: 'ลงบัญชีแล้ว', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'partial', label: 'ได้สินค้าบางส่วน', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
]

const PAYMENT_METHODS = [
  'โอนเงิน',
  'เงินสด',
  'บัตรเครดิต',
  'เช็ค',
  'เครดิต',
]

export default function OnlineOrdersPage() {
  const [orders, setOrders] = useState<OnlineOrder[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState<OnlineOrder | null>(null)

  // Filters
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const formatDate = (d: Date) => d.toISOString().split('T')[0]

  const [dateFrom, setDateFrom] = useState(formatDate(firstOfMonth))
  const [dateTo, setDateTo] = useState(formatDate(today))
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSeller, setFilterSeller] = useState('')
  const [filterPayment, setFilterPayment] = useState('')

  // Form
  const [formData, setFormData] = useState({
    status: 'pending',
    order_date: formatDate(today),
    seller_name: '',
    seller_id: '',
    payment_method: '',
    order_number: '',
    tax_number: '',
    amount: 0,
    total: 0,
    notes: '',
  })

  useEffect(() => {
    fetchOrders()
    fetchContacts()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('online_orders')
        .select('*')
        .order('order_date', { ascending: false })
      if (!error && data) setOrders(data)
    } catch (e) {
      console.error('Error fetching online orders:', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchContacts = async () => {
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .in('type', ['seller', 'both'])
      .order('name')
    if (data) setContacts(data)
  }

  const handleSave = async () => {
    try {
      const orderData = {
        order_date: formData.order_date,
        tax_number: formData.tax_number || null,
        order_number: formData.order_number || null,
        seller_name: formData.seller_name || null,
        seller_id: formData.seller_id || null,
        status: formData.status,
        payment_method: formData.payment_method || null,
        amount: formData.amount || 0,
        total: formData.total || 0,
        notes: formData.notes || null,
      }

      if (editingOrder) {
        const { error } = await supabase
          .from('online_orders')
          .update({ ...orderData, updated_at: new Date().toISOString() })
          .eq('id', editingOrder.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('online_orders')
          .insert([orderData])
        if (error) throw error
      }

      setShowModal(false)
      setEditingOrder(null)
      resetForm()
      fetchOrders()
    } catch (err) {
      console.error('Save error:', err)
      alert('เกิดข้อผิดพลาด: ' + (err as Error).message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบรายการนี้?')) return
    try {
      const { error } = await supabase.from('online_orders').delete().eq('id', id)
      if (error) throw error
      fetchOrders()
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleEdit = (order: OnlineOrder) => {
    setEditingOrder(order)
    setFormData({
      status: order.status,
      order_date: order.order_date,
      seller_name: order.seller_name || '',
      seller_id: order.seller_id || '',
      payment_method: order.payment_method || '',
      order_number: order.order_number || '',
      tax_number: order.tax_number || '',
      amount: order.amount,
      total: order.total,
      notes: order.notes || '',
    })
    setShowModal(true)
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('online_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      fetchOrders()
    } catch (err) {
      console.error('Status update error:', err)
    }
  }

  const resetForm = () => {
    setFormData({
      status: 'pending',
      order_date: formatDate(today),
      seller_name: '',
      seller_id: '',
      payment_method: '',
      order_number: '',
      tax_number: '',
      amount: 0,
      total: 0,
      notes: '',
    })
  }

  const handleSellerChange = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId)
    setFormData(prev => ({
      ...prev,
      seller_id: contactId,
      seller_name: contact ? (contact.company_name || contact.name) : '',
    }))
  }

  // Filtered orders
  const filteredOrders = orders.filter(order => {
    if (dateFrom && order.order_date < dateFrom) return false
    if (dateTo && order.order_date > dateTo) return false
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const matches =
        order.order_number?.toLowerCase().includes(term) ||
        order.tax_number?.toLowerCase().includes(term) ||
        order.seller_name?.toLowerCase().includes(term)
      if (!matches) return false
    }
    if (filterSeller && order.seller_name !== filterSeller) return false
    if (filterPayment && order.payment_method !== filterPayment) return false
    return true
  })

  // Summary counts
  const countByStatus = (status: string) => filteredOrders.filter(o => o.status === status).length
  const sumByStatus = (status: string) => filteredOrders.filter(o => o.status === status).reduce((s, o) => s + (o.amount || 0), 0)

  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find(s => s.value === status)
    return opt || { label: status, color: 'bg-gray-100 text-gray-700 border-gray-200' }
  }

  // Unique sellers for filter
  const uniqueSellers = [...new Set(orders.map(o => o.seller_name).filter(Boolean))]

  const totalAmount = filteredOrders.reduce((s, o) => s + (o.amount || 0), 0)
  const totalTotal = filteredOrders.reduce((s, o) => s + (o.total || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/expenses"
            className="p-2 text-gray-400 hover:text-[#7D735F] hover:bg-[#F5F0E6] rounded-full transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="h-7 w-7 text-[#7D735F]" />
              ใบสั่งซื้อ
            </h1>
            <p className="text-gray-600 mt-1">รายการสั่งซื้อสินค้า</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setEditingOrder(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#E8F4F8] hover:bg-[#D5EAE7] text-gray-900 border border-[#B8C9B8] rounded-full text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          สร้างใบสั่งซื้อ
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STATUS_OPTIONS.map(opt => (
          <Card key={opt.value}>
            <div className="p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">{opt.label}</p>
              <p className="text-xl font-bold text-gray-900">{countByStatus(opt.value)}</p>
              <p className="text-xs text-gray-500">
                ฿{sumByStatus(opt.value).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-2 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#A8C4D9] focus:border-[#A8C4D9] w-[130px]"
        />
        <span className="text-gray-400">-</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-2 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#A8C4D9] focus:border-[#A8C4D9] w-[130px]"
        />
        <div className="flex-1 min-w-[150px] relative">
          <div className="flex items-center gap-2 bg-[#E8EBF0] rounded-full px-3 py-2 border border-transparent focus-within:border-[#A8C4D9] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#A8C4D9]/20 transition-all">
            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหา Order Number..."
              className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-sm min-w-0"
            />
          </div>
        </div>
        <select
          value={filterSeller}
          onChange={(e) => setFilterSeller(e.target.value)}
          className="px-2 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#A8C4D9] w-[140px]"
        >
          <option value="">เลือก</option>
          {uniqueSellers.map(s => (
            <option key={s} value={s!}>{s}</option>
          ))}
        </select>
        <select
          value={filterPayment}
          onChange={(e) => setFilterPayment(e.target.value)}
          className="px-2 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#A8C4D9] w-[140px]"
        >
          <option value="">Please Select</option>
          {PAYMENT_METHODS.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <button
          onClick={fetchOrders}
          className="px-3 py-2 bg-[#A8C4D9] hover:bg-[#8FB3CC] text-white rounded-lg text-sm font-medium transition-colors"
        >
          GO
        </button>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">No.</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax Number</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Number</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pay by</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-500">กำลังโหลด...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-500">ไม่พบรายการ</td></tr>
              ) : (
                filteredOrders.map((order, idx) => {
                  const badge = getStatusBadge(order.status)
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-gray-700">{idx + 1}</td>
                      <td className="px-3 py-3 text-gray-700">{order.order_date}</td>
                      <td className="px-3 py-3 text-gray-700">{order.tax_number || '-'}</td>
                      <td className="px-3 py-3 text-gray-700 font-medium">{order.order_number || '-'}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.color}`}>
                          {badge.label}
                        </span>
                        <div className="mt-1">
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className="text-xs border border-gray-200 rounded px-1 py-0.5 text-gray-600"
                          >
                            {STATUS_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-gray-700">{order.payment_method || '-'}</td>
                      <td className="px-3 py-3 text-right text-gray-900 font-medium">
                        {order.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-900">
                        {order.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(order)}
                            className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded font-medium transition-colors"
                          >
                            edit
                          </button>
                          <button
                            onClick={() => handleDelete(order.id)}
                            className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded font-medium transition-colors"
                          >
                            delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          {/* Summary row */}
          <div className="flex justify-end items-center gap-8 px-4 py-3 bg-gray-50 border-t text-sm font-medium">
            <span className="text-gray-600">Total</span>
            <span className="text-gray-900 w-28 text-right">
              {totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-gray-900 w-28 text-right">
              {totalTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </span>
            <span className="w-20"></span>
          </div>
        </div>
      </Card>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">
                {editingOrder ? 'แก้ไขใบสั่งซื้อ' : 'สร้างใบสั่งซื้อ'}
              </h2>
              <button
                onClick={() => { setShowModal(false); setEditingOrder(null); resetForm() }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Status */}
              <div className="flex items-center gap-4">
                <label className="w-28 text-sm text-gray-600 text-right flex-shrink-0">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#A8C4D9] focus:border-[#A8C4D9]"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {/* Date */}
              <div className="flex items-center gap-4">
                <label className="w-28 text-sm text-gray-600 text-right flex-shrink-0">Date</label>
                <input
                  type="date"
                  value={formData.order_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, order_date: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#A8C4D9] focus:border-[#A8C4D9]"
                />
              </div>
              {/* Seller */}
              <div className="flex items-center gap-4">
                <label className="w-28 text-sm text-gray-600 text-right flex-shrink-0">Seller</label>
                <select
                  value={formData.seller_id}
                  onChange={(e) => handleSellerChange(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#A8C4D9] focus:border-[#A8C4D9]"
                >
                  <option value="">Select</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code ? `${c.code} - ` : ''}{c.company_name || c.name}
                    </option>
                  ))}
                </select>
              </div>
              {/* Payment Method */}
              <div className="flex items-center gap-4">
                <label className="w-28 text-sm text-gray-600 text-right flex-shrink-0">ชำระเงินด้วย</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#A8C4D9] focus:border-[#A8C4D9]"
                >
                  <option value="">Please Select</option>
                  {PAYMENT_METHODS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              {/* Order Number */}
              <div className="flex items-center gap-4">
                <label className="w-28 text-sm text-gray-600 text-right flex-shrink-0">Order Number</label>
                <input
                  type="text"
                  value={formData.order_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, order_number: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#A8C4D9] focus:border-[#A8C4D9]"
                  placeholder=""
                />
              </div>
              {/* Tax Number */}
              <div className="flex items-center gap-4">
                <label className="w-28 text-sm text-gray-600 text-right flex-shrink-0">Tax Number</label>
                <input
                  type="text"
                  value={formData.tax_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, tax_number: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#A8C4D9] focus:border-[#A8C4D9]"
                  placeholder=""
                />
              </div>
              {/* Amount */}
              <div className="flex items-center gap-4">
                <label className="w-28 text-sm text-gray-600 text-right flex-shrink-0">Total</label>
                <input
                  type="number"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#A8C4D9] focus:border-[#A8C4D9]"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              {/* Notes */}
              <div className="flex items-start gap-4">
                <label className="w-28 text-sm text-gray-600 text-right flex-shrink-0 pt-2">Note</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#A8C4D9] focus:border-[#A8C4D9] min-h-[80px]"
                  rows={3}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button
                onClick={() => { setShowModal(false); setEditingOrder(null); resetForm() }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-[#A8C4D9] hover:bg-[#8FB3CC] text-white rounded-lg text-sm font-medium transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
