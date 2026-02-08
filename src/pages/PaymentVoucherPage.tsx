import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { FileText, Plus, Search, Trash2, Edit2 } from 'lucide-react'

interface PaymentVoucher {
  id: string
  voucher_date: string
  voucher_number: string
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
  created_at: string
  updated_at: string
}

export default function PaymentVoucherPage() {
  const [vouchers, setVouchers] = useState<PaymentVoucher[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingVoucher, setEditingVoucher] = useState<PaymentVoucher | null>(null)
  
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    fetchVouchers()
  }, [])

  const fetchVouchers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('payment_vouchers')
        .select('*')
        .order('voucher_date', { ascending: false })

      if (error) throw error
      setVouchers(data || [])
    } catch (error) {
      console.error('Error fetching vouchers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const voucherData = {
        voucher_date: formData.voucher_date,
        voucher_number: formData.voucher_number,
        payee_name: formData.payee_name,
        payee_tax_id: formData.payee_tax_id || null,
        amount: parseFloat(formData.amount) || 0,
        amount_in_words: formData.amount_in_words || null,
        description: formData.description,
        payment_method: formData.payment_method,
        bank_name: formData.bank_name || null,
        bank_account: formData.bank_account || null,
        check_number: formData.check_number || null,
        approved_by: formData.approved_by || null,
        notes: formData.notes || null
      }

      if (editingVoucher) {
        const { error } = await supabase
          .from('payment_vouchers')
          .update(voucherData)
          .eq('id', editingVoucher.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('payment_vouchers')
          .insert([voucherData])
        
        if (error) throw error
      }

      setShowModal(false)
      resetForm()
      fetchVouchers()
    } catch (error) {
      console.error('Error saving voucher:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบใบสำคัญจ่ายนี้?')) return
    
    try {
      const { error } = await supabase
        .from('payment_vouchers')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      fetchVouchers()
    } catch (error) {
      console.error('Error deleting voucher:', error)
      alert('เกิดข้อผิดพลาดในการลบ')
    }
  }

  const handleEdit = (voucher: PaymentVoucher) => {
    setEditingVoucher(voucher)
    setFormData({
      voucher_date: voucher.voucher_date,
      voucher_number: voucher.voucher_number,
      payee_name: voucher.payee_name,
      payee_tax_id: voucher.payee_tax_id || '',
      amount: voucher.amount.toString(),
      amount_in_words: voucher.amount_in_words || '',
      description: voucher.description,
      payment_method: voucher.payment_method,
      bank_name: voucher.bank_name || '',
      bank_account: voucher.bank_account || '',
      check_number: voucher.check_number || '',
      approved_by: voucher.approved_by || '',
      notes: voucher.notes || ''
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
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
    setEditingVoucher(null)
  }

  const filteredVouchers = vouchers.filter(voucher =>
    voucher.voucher_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voucher.payee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voucher.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalAmount = filteredVouchers.reduce((sum, voucher) => sum + voucher.amount, 0)

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">ใบสำคัญจ่าย</h1>
        </div>
        <p className="text-gray-600">บันทึกและจัดการใบสำคัญจ่าย</p>
      </div>

      {/* Summary Card */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-600 font-medium">ยอดรวมใบสำคัญจ่าย</p>
            <p className="text-3xl font-bold text-blue-900">
              ฿{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">จำนวนรายการ</p>
            <p className="text-xl font-semibold text-gray-800">{filteredVouchers.length}</p>
          </div>
        </div>
      </Card>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาใบสำคัญจ่าย..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Button
          variant="primary"
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มใบสำคัญจ่าย
        </Button>
      </div>

      {/* Vouchers List */}
      <Card>
        {loading ? (
          <p className="text-center text-gray-600 py-8">กำลังโหลด...</p>
        ) : filteredVouchers.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">ไม่มีรายการใบสำคัญจ่าย</p>
            <p className="text-sm text-gray-500 mt-1">คลิก "เพิ่มใบสำคัญจ่าย" เพื่อบันทึก</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">เลขที่</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">วันที่</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ผู้รับเงิน</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">รายการ</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">จำนวนเงิน</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">การชำระเงิน</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredVouchers.map((voucher) => (
                  <tr key={voucher.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {voucher.voucher_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(voucher.voucher_date).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{voucher.payee_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{voucher.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                      ฿{voucher.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">
                      {voucher.payment_method}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(voucher)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(voucher.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingVoucher ? 'แก้ไขใบสำคัญจ่าย' : 'เพิ่มใบสำคัญจ่าย'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่ *</label>
                  <input
                    type="text"
                    required
                    value={formData.voucher_number}
                    onChange={(e) => setFormData({ ...formData, voucher_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="PV-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ *</label>
                  <input
                    type="date"
                    required
                    value={formData.voucher_date}
                    onChange={(e) => setFormData({ ...formData, voucher_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ผู้รับเงิน *</label>
                <input
                  type="text"
                  required
                  value={formData.payee_name}
                  onChange={(e) => setFormData({ ...formData, payee_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="ชื่อผู้รับเงิน"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เลขประจำตัวผู้เสียภาษี</label>
                  <input
                    type="text"
                    value={formData.payee_tax_id}
                    onChange={(e) => setFormData({ ...formData, payee_tax_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="เลข 13 หลัก"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วิธีการชำระเงิน *</label>
                  <select
                    required
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="เงินสด">เงินสด</option>
                    <option value="โอนเงิน">โอนเงิน</option>
                    <option value="เช็ค">เช็ค</option>
                  </select>
                </div>
              </div>

              {formData.payment_method === 'โอนเงิน' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อธนาคาร</label>
                    <input
                      type="text"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="ชื่อธนาคาร"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่บัญชี</label>
                    <input
                      type="text"
                      value={formData.bank_account}
                      onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="เลขที่บัญชี"
                    />
                  </div>
                </div>
              )}

              {formData.payment_method === 'เช็ค' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่เช็ค</label>
                  <input
                    type="text"
                    value={formData.check_number}
                    onChange={(e) => setFormData({ ...formData, check_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="เลขที่เช็ค"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รายการ *</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนเงินตัวอักษร</label>
                  <input
                    type="text"
                    value={formData.amount_in_words}
                    onChange={(e) => setFormData({ ...formData, amount_in_words: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="หนึ่งพันบาทถ้วน"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">อนุมัติโดย</label>
                <input
                  type="text"
                  value={formData.approved_by}
                  onChange={(e) => setFormData({ ...formData, approved_by: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="ชื่อผู้อนุมัติ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="flex-1"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                >
                  {editingVoucher ? 'บันทึกการแก้ไข' : 'บันทึก'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
