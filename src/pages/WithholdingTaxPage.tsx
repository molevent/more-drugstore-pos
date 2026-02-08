import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { Percent, Plus, Search, Trash2, Edit2 } from 'lucide-react'

interface WithholdingTax {
  id: string
  document_date: string
  document_number: string
  payer_name: string
  payer_tax_id?: string
  payee_name: string
  payee_tax_id?: string
  income_type: string
  income_amount: number
  tax_rate: number
  tax_amount: number
  payment_date?: string
  notes?: string
  created_at: string
  updated_at: string
}

const INCOME_TYPES = [
  { value: 'ค่าจ้าง', rate: 3 },
  { value: 'ค่าบริการ', rate: 3 },
  { value: 'ค่าเช่า', rate: 5 },
  { value: 'ค่าโฆษณา', rate: 2 },
  { value: 'ค่าสิทธิ', rate: 3 },
  { value: 'ค่าธรรมเนียม', rate: 3 },
  { value: 'ค่าดอกเบี้ย', rate: 15 },
  { value: 'เงินปันผล', rate: 10 },
  { value: 'อื่นๆ', rate: 0 }
]

export default function WithholdingTaxPage() {
  const [taxes, setTaxes] = useState<WithholdingTax[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingTax, setEditingTax] = useState<WithholdingTax | null>(null)
  
  const [formData, setFormData] = useState({
    document_date: new Date().toISOString().split('T')[0],
    document_number: '',
    payer_name: '',
    payer_tax_id: '',
    payee_name: '',
    payee_tax_id: '',
    income_type: 'ค่าจ้าง',
    income_amount: '',
    tax_rate: '3',
    tax_amount: '',
    payment_date: '',
    notes: ''
  })

  useEffect(() => {
    fetchTaxes()
  }, [])

  const fetchTaxes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('withholding_taxes')
        .select('*')
        .order('document_date', { ascending: false })

      if (error) throw error
      setTaxes(data || [])
    } catch (error) {
      console.error('Error fetching taxes:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateTaxAmount = (income: number, rate: number) => {
    return (income * rate) / 100
  }

  const handleIncomeChange = (amount: string, type: string) => {
    const incomeType = INCOME_TYPES.find(t => t.value === type)
    const rate = incomeType?.rate || 0
    const income = parseFloat(amount) || 0
    const tax = calculateTaxAmount(income, rate)
    
    setFormData(prev => ({
      ...prev,
      income_amount: amount,
      tax_rate: rate.toString(),
      tax_amount: tax.toFixed(2)
    }))
  }

  const handleTypeChange = (type: string) => {
    const incomeType = INCOME_TYPES.find(t => t.value === type)
    const rate = incomeType?.rate || 0
    const income = parseFloat(formData.income_amount) || 0
    const tax = calculateTaxAmount(income, rate)
    
    setFormData(prev => ({
      ...prev,
      income_type: type,
      tax_rate: rate.toString(),
      tax_amount: tax.toFixed(2)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const taxData = {
        document_date: formData.document_date,
        document_number: formData.document_number,
        payer_name: formData.payer_name,
        payer_tax_id: formData.payer_tax_id || null,
        payee_name: formData.payee_name,
        payee_tax_id: formData.payee_tax_id || null,
        income_type: formData.income_type,
        income_amount: parseFloat(formData.income_amount) || 0,
        tax_rate: parseFloat(formData.tax_rate) || 0,
        tax_amount: parseFloat(formData.tax_amount) || 0,
        payment_date: formData.payment_date || null,
        notes: formData.notes || null
      }

      if (editingTax) {
        const { error } = await supabase
          .from('withholding_taxes')
          .update(taxData)
          .eq('id', editingTax.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('withholding_taxes')
          .insert([taxData])
        
        if (error) throw error
      }

      setShowModal(false)
      resetForm()
      fetchTaxes()
    } catch (error) {
      console.error('Error saving tax:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบรายการหัก ณ ที่จ่ายนี้?')) return
    
    try {
      const { error } = await supabase
        .from('withholding_taxes')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      fetchTaxes()
    } catch (error) {
      console.error('Error deleting tax:', error)
      alert('เกิดข้อผิดพลาดในการลบ')
    }
  }

  const handleEdit = (tax: WithholdingTax) => {
    setEditingTax(tax)
    setFormData({
      document_date: tax.document_date,
      document_number: tax.document_number,
      payer_name: tax.payer_name,
      payer_tax_id: tax.payer_tax_id || '',
      payee_name: tax.payee_name,
      payee_tax_id: tax.payee_tax_id || '',
      income_type: tax.income_type,
      income_amount: tax.income_amount.toString(),
      tax_rate: tax.tax_rate.toString(),
      tax_amount: tax.tax_amount.toString(),
      payment_date: tax.payment_date || '',
      notes: tax.notes || ''
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      document_date: new Date().toISOString().split('T')[0],
      document_number: '',
      payer_name: '',
      payer_tax_id: '',
      payee_name: '',
      payee_tax_id: '',
      income_type: 'ค่าจ้าง',
      income_amount: '',
      tax_rate: '3',
      tax_amount: '',
      payment_date: '',
      notes: ''
    })
    setEditingTax(null)
  }

  const filteredTaxes = taxes.filter(tax =>
    tax.document_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tax.payer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tax.payee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tax.income_type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalIncome = filteredTaxes.reduce((sum, tax) => sum + tax.income_amount, 0)
  const totalTax = filteredTaxes.reduce((sum, tax) => sum + tax.tax_amount, 0)

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Percent className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">หัก ณ ที่จ่าย</h1>
        </div>
        <p className="text-gray-600">บันทึกและจัดการภาษีหัก ณ ที่จ่าย (50 ทวิ)</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div>
            <p className="text-sm text-blue-600 font-medium">ยอดรายได้รวม</p>
            <p className="text-2xl font-bold text-blue-900">
              ฿{totalIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </Card>
        <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <div>
            <p className="text-sm text-red-600 font-medium">ภาษีหัก ณ ที่จ่ายรวม</p>
            <p className="text-2xl font-bold text-red-900">
              ฿{totalTax.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหารายการ..."
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
          เพิ่มรายการ
        </Button>
      </div>

      {/* Taxes List */}
      <Card>
        {loading ? (
          <p className="text-center text-gray-600 py-8">กำลังโหลด...</p>
        ) : filteredTaxes.length === 0 ? (
          <div className="text-center py-12">
            <Percent className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">ไม่มีรายการหัก ณ ที่จ่าย</p>
            <p className="text-sm text-gray-500 mt-1">คลิก "เพิ่มรายการ" เพื่อบันทึก</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">เลขที่เอกสาร</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">วันที่</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ผู้จ่ายเงิน</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ผู้รับเงิน</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ประเภทเงินได้</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">จำนวนเงิน</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">อัตรา</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">ภาษี</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTaxes.map((tax) => (
                  <tr key={tax.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{tax.document_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(tax.document_date).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{tax.payer_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{tax.payee_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                        {tax.income_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      ฿{tax.income_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{tax.tax_rate}%</td>
                    <td className="px-4 py-3 text-sm text-red-600 text-right font-medium">
                      ฿{tax.tax_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(tax)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tax.id)}
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
                {editingTax ? 'แก้ไขรายการ' : 'เพิ่มรายการหัก ณ ที่จ่าย'}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่เอกสาร *</label>
                  <input
                    type="text"
                    required
                    value={formData.document_number}
                    onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="WT-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เอกสาร *</label>
                  <input
                    type="date"
                    required
                    value={formData.document_date}
                    onChange={(e) => setFormData({ ...formData, document_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ผู้จ่ายเงิน *</label>
                  <input
                    type="text"
                    required
                    value={formData.payer_name}
                    onChange={(e) => setFormData({ ...formData, payer_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="ชื่อผู้จ่ายเงิน"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เลขผู้เสียภาษีผู้จ่าย</label>
                  <input
                    type="text"
                    value={formData.payer_tax_id}
                    onChange={(e) => setFormData({ ...formData, payer_tax_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="เลข 13 หลัก"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เลขผู้เสียภาษีผู้รับ</label>
                  <input
                    type="text"
                    value={formData.payee_tax_id}
                    onChange={(e) => setFormData({ ...formData, payee_tax_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="เลข 13 หลัก"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทเงินได้ *</label>
                  <select
                    required
                    value={formData.income_type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {INCOME_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.value} ({type.rate}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนเงินได้ *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.income_amount}
                    onChange={(e) => handleIncomeChange(e.target.value, formData.income_type)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">อัตราภาษี (%)</label>
                  <input
                    type="number"
                    readOnly
                    value={formData.tax_rate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ภาษีที่หัก (บาท)</label>
                  <input
                    type="number"
                    readOnly
                    value={formData.tax_amount}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-red-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่จ่ายเงิน</label>
                <input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  {editingTax ? 'บันทึกการแก้ไข' : 'บันทึก'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
