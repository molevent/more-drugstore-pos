import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { 
  Receipt, 
  Plus, 
  ArrowLeft, 
  Edit2, 
  Trash2, 
  Save,
  X,
  LayoutGrid,
  Hash
} from 'lucide-react'

interface ExpenseCategory {
  id: string
  name: string
  code: string
  chart_of_accounts_code?: string
  description?: string
  color?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

const DEFAULT_COLORS = [
  '#7D735F',
  '#A67B5B',
  '#B8C9B8',
  '#4A90A4',
  '#D4756A',
  '#E8B87D',
  '#9B7DD4',
  '#7DD4A0',
  '#D47D7D',
  '#7D9BD4'
]

export default function ExpenseCategorySettingsPage() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    chart_of_accounts_code: '',
    description: '',
    color: DEFAULT_COLORS[0],
    is_active: true
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('code', { ascending: true })

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const categoryData = {
        name: formData.name,
        code: formData.code.toUpperCase(),
        chart_of_accounts_code: formData.chart_of_accounts_code || null,
        description: formData.description || null,
        color: formData.color,
        is_active: formData.is_active
      }

      if (editingCategory) {
        const { error } = await supabase
          .from('expense_categories')
          .update(categoryData)
          .eq('id', editingCategory.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('expense_categories')
          .insert(categoryData)
        if (error) throw error
      }

      resetForm()
      setShowModal(false)
      fetchCategories()
    } catch (error: any) {
      console.error('Error saving category:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + (error.message || error.details || 'Unknown error'))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบหมวดหมู่นี้?')) return
    
    try {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', id)
      if (error) throw error
      fetchCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('เกิดข้อผิดพลาดในการลบ')
    }
  }

  const handleEdit = (category: ExpenseCategory) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      code: category.code,
      chart_of_accounts_code: category.chart_of_accounts_code || '',
      description: category.description || '',
      color: category.color || DEFAULT_COLORS[0],
      is_active: category.is_active
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      chart_of_accounts_code: '',
      description: '',
      color: DEFAULT_COLORS[0],
      is_active: true
    })
    setEditingCategory(null)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link 
            to="/settings"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="h-7 w-7 text-[#7D735F]" />
              ตั้งค่าหมวดหมู่ค่าใช้จ่าย
            </h1>
            <p className="text-gray-600 mt-1">จัดการหมวดหมู่ รหัส และแผนผังบัญชี</p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#A67B5B] bg-white text-[#A67B5B] text-sm whitespace-nowrap hover:bg-[#A67B5B]/10 transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" />
          เพิ่มหมวดหมู่
        </button>
      </div>

      <Card>
        {loading ? (
          <p className="text-center text-gray-600 py-8">กำลังโหลด...</p>
        ) : categories.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">ไม่มีหมวดหมู่ค่าใช้จ่าย</p>
            <p className="text-sm text-gray-500 mt-1">คลิก "เพิ่มหมวดหมู่" เพื่อสร้างใหม่</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-10">#</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">รหัส</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ชื่อหมวดหมู่</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">รหัสแผนผังบัญชี</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">รายละเอียด</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">สถานะ</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color || '#7D735F' }}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">
                      {category.code}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {category.name}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">
                      {category.chart_of_accounts_code || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {category.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        category.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {category.is_active ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
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
                {editingCategory ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="flex items-center gap-1">
                      <Hash className="h-4 w-4" />
                      รหัสหมวดหมู่ *
                    </span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="EXP001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="flex items-center gap-1">
                      <LayoutGrid className="h-4 w-4" />
                      รหัสแผนผังบัญชี
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.chart_of_accounts_code}
                    onChange={(e) => setFormData({ ...formData, chart_of_accounts_code: e.target.value })}
                    placeholder="5-1010"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อหมวดหมู่ *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น ค่าน้ำ"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  รายละเอียด
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="รายละเอียดเพิ่มเติม..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  สีประจำหมวดหมู่
                </label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === color 
                          ? 'border-gray-900 scale-110' 
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  เปิดใช้งาน
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowModal(false)}
                  className="flex-1"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingCategory ? 'บันทึกการแก้ไข' : 'บันทึก'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
