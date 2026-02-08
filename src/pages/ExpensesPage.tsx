import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { Receipt, Plus, Search, Trash2, Edit2 } from 'lucide-react'

interface Expense {
  id: string
  expense_date: string
  category: string
  description: string
  amount: number
  payment_method: string
  receipt_number?: string
  vendor?: string
  notes?: string
  created_at: string
}

const EXPENSE_CATEGORIES = [
  'ค่าน้ำ',
  'ค่าไฟ',
  'ค่าเช่า',
  'ค่าซ่อมบำรุง',
  'ค่าอุปกรณ์สำนักงาน',
  'ค่าโฆษณา',
  'ค่าขนส่ง',
  'ค่าทำความสะอาด',
  'ค่าอื่นๆ'
]

const PAYMENT_METHODS = [
  'เงินสด',
  'โอนเงิน',
  'บัตรเครดิต',
  'เช็ค'
]

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  
  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    category: 'ค่าอื่นๆ',
    description: '',
    amount: '',
    payment_method: 'เงินสด',
    receipt_number: '',
    vendor: '',
    notes: ''
  })

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })

      if (error) throw error
      setExpenses(data || [])
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const expenseData = {
        expense_date: formData.expense_date,
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount) || 0,
        payment_method: formData.payment_method,
        receipt_number: formData.receipt_number || null,
        vendor: formData.vendor || null,
        notes: formData.notes || null
      }

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert(expenseData)
        if (error) throw error
      }

      resetForm()
      setShowModal(false)
      fetchExpenses()
    } catch (error) {
      console.error('Error saving expense:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบรายการนี้?')) return
    
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
      if (error) throw error
      fetchExpenses()
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('เกิดข้อผิดพลาดในการลบ')
    }
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setFormData({
      expense_date: expense.expense_date,
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      payment_method: expense.payment_method,
      receipt_number: expense.receipt_number || '',
      vendor: expense.vendor || '',
      notes: expense.notes || ''
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      expense_date: new Date().toISOString().split('T')[0],
      category: 'ค่าอื่นๆ',
      description: '',
      amount: '',
      payment_method: 'เงินสด',
      receipt_number: '',
      vendor: '',
      notes: ''
    })
    setEditingExpense(null)
  }

  const filteredExpenses = expenses.filter(expense =>
    expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Receipt className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">ค่าใช้จ่าย</h1>
        </div>
        <p className="text-gray-600">บันทึกและติดตามค่าใช้จ่ายต่างๆ ของร้าน</p>
      </div>

      {/* Summary Card */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-600 font-medium">ค่าใช้จ่ายทั้งหมด (จากรายการที่แสดง)</p>
            <p className="text-3xl font-bold text-blue-900">
              ฿{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">จำนวนรายการ</p>
            <p className="text-xl font-semibold text-gray-800">{filteredExpenses.length}</p>
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
            placeholder="ค้นหาค่าใช้จ่าย..."
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
          เพิ่มค่าใช้จ่าย
        </Button>
      </div>

      {/* Expenses List */}
      <Card>
        {loading ? (
          <p className="text-center text-gray-600 py-8">กำลังโหลด...</p>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">ไม่มีรายการค่าใช้จ่าย</p>
            <p className="text-sm text-gray-500 mt-1">คลิก "เพิ่มค่าใช้จ่าย" เพื่อบันทึก</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">วันที่</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">หมวดหมู่</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">รายการ</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ผู้จำหน่าย</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">จำนวนเงิน</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">การชำระเงิน</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(expense.expense_date).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{expense.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{expense.vendor || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                      ฿{expense.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">
                      {expense.payment_method}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
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
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingExpense ? 'แก้ไขค่าใช้จ่าย' : 'เพิ่มค่าใช้จ่าย'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ *</label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่ *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รายการ *</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="เช่น ค่าไฟเดือนมกราคม"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนเงิน *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วิธีชำระเงิน *</label>
                  <select
                    required
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {PAYMENT_METHODS.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ผู้จำหน่าย/ร้านค้า</label>
                <input
                  type="text"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="เช่น การไฟฟ้า, ประปา"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่ใบเสร็จ/ใบกำกับภาษี</label>
                <input
                  type="text"
                  value={formData.receipt_number}
                  onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                  placeholder="INV-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="รายละเอียดเพิ่มเติม..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button type="submit" variant="primary" className="flex-1">
                  {editingExpense ? 'บันทึกการแก้ไข' : 'บันทึก'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowModal(false)}
                  className="flex-1"
                >
                  ยกเลิก
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
