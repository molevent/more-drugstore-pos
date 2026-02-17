import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { 
  CreditCard, 
  Plus, 
  ArrowLeft, 
  Edit2, 
  Trash2, 
  Save,
  X,
  Settings,
  Hash,
  ArrowUp
} from 'lucide-react'

interface PaymentMethodRule {
  id: string
  keyword: string
  payment_method: string
  priority: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

interface PaymentMethod {
  id: string
  name: string
  is_active: boolean
  created_at?: string
}

const DEFAULT_PAYMENT_METHODS = [
  'เงินสด',
  'โอนเงิน',
  'บัตรเครดิต',
  'เช็ค'
]

export default function PaymentMethodSettingsPage() {
  const [rules, setRules] = useState<PaymentMethodRule[]>([])
  const [loading, setLoading] = useState(true)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loadingMethods, setLoadingMethods] = useState(true)
  const [showMethodModal, setShowMethodModal] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [methodFormData, setMethodFormData] = useState({
    name: '',
    is_active: true
  })

  useEffect(() => {
    fetchRules()
    fetchPaymentMethods()
  }, [])

  const fetchPaymentMethods = async () => {
    setLoadingMethods(true)
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching payment methods:', error)
        return
      }

      // If no data in DB yet, use defaults
      if (!data || data.length === 0) {
        const defaultMethods = DEFAULT_PAYMENT_METHODS.map((name, index) => ({
          id: `default-${index}`,
          name,
          is_active: true
        }))
        setPaymentMethods(defaultMethods)
      } else {
        setPaymentMethods(data)
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error)
      // Fallback to defaults
      const defaultMethods = DEFAULT_PAYMENT_METHODS.map((name, index) => ({
        id: `default-${index}`,
        name,
        is_active: true
      }))
      setPaymentMethods(defaultMethods)
    } finally {
      setLoadingMethods(false)
    }
  }

  const handleMethodSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingMethod) {
        // Update existing method in state only (no DB persistence for now)
        setPaymentMethods(prev => prev.map(m => 
          m.id === editingMethod.id 
            ? { ...m, name: methodFormData.name, is_active: methodFormData.is_active }
            : m
        ))
      } else {
        // Add new method
        const newMethod: PaymentMethod = {
          id: `method-${Date.now()}`,
          name: methodFormData.name,
          is_active: methodFormData.is_active
        }
        setPaymentMethods(prev => [...prev, newMethod])
      }

      setShowMethodModal(false)
      setEditingMethod(null)
      setMethodFormData({ name: '', is_active: true })
    } catch (error) {
      console.error('Error saving payment method:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    }
  }

  const handleDeleteMethod = async (id: string) => {
    if (!confirm('ต้องการลบวิธีการชำระเงินนี้?')) return

    setPaymentMethods(prev => prev.filter(m => m.id !== id))
  }

  const handleEditMethod = (method: PaymentMethod) => {
    setEditingMethod(method)
    setMethodFormData({
      name: method.name,
      is_active: method.is_active
    })
    setShowMethodModal(true)
  }

  const closeMethodModal = () => {
    setShowMethodModal(false)
    setEditingMethod(null)
    setMethodFormData({ name: '', is_active: true })
  }
  const [showModal, setShowModal] = useState(false)
  const [editingRule, setEditingRule] = useState<PaymentMethodRule | null>(null)
  const [formData, setFormData] = useState({
    keyword: '',
    payment_method: 'เงินสด',
    priority: 0,
    is_active: true
  })

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('payment_method_rules')
        .select('*')
        .order('priority', { ascending: false })
        .order('keyword', { ascending: true })

      if (error) throw error
      setRules(data || [])
    } catch (error) {
      console.error('Error fetching rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const ruleData = {
        keyword: formData.keyword.toLowerCase().trim(),
        payment_method: formData.payment_method,
        priority: formData.priority,
        is_active: formData.is_active
      }

      if (editingRule) {
        const { error } = await supabase
          .from('payment_method_rules')
          .update(ruleData)
          .eq('id', editingRule.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('payment_method_rules')
          .insert(ruleData)
        if (error) throw error
      }

      setShowModal(false)
      setEditingRule(null)
      setFormData({
        keyword: '',
        payment_method: 'เงินสด',
        priority: 0,
        is_active: true
      })
      fetchRules()
    } catch (error) {
      console.error('Error saving rule:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบกฎนี้?')) return

    try {
      const { error } = await supabase
        .from('payment_method_rules')
        .delete()
        .eq('id', id)
      if (error) throw error
      fetchRules()
    } catch (error) {
      console.error('Error deleting rule:', error)
      alert('เกิดข้อผิดพลาดในการลบ')
    }
  }

  const handleEdit = (rule: PaymentMethodRule) => {
    setEditingRule(rule)
    setFormData({
      keyword: rule.keyword,
      payment_method: rule.payment_method,
      priority: rule.priority,
      is_active: rule.is_active
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingRule(null)
    setFormData({
      keyword: '',
      payment_method: 'เงินสด',
      priority: 0,
      is_active: true
    })
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3] pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/settings"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#7D735F]/10 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-[#7D735F]" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-[#5A5A5A]">ตั้งค่าวิธีการชำระเงิน</h1>
                <p className="text-sm text-black">กำหนดค่าเริ่มต้นวิธีการชำระเงินตามคีย์เวิร์ดในรายการค่าใช้จ่าย</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Info Card */}
        <Card className="mb-6 p-4 bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">วิธีการทำงาน</h3>
              <p className="text-sm text-black mt-1">ระบบจะตรวจสอบคีย์เวิร์ดในรายการค่าใช้จ่าย และเลือกวิธีการชำระเงินอัตโนมัติตามกฎที่ตั้งไว้ กฎที่มี priority สูงกว่าจะถูกตรวจสอบก่อน</p>
            </div>
          </div>
        </Card>

        {/* Payment Methods Section */}
        <Card className="mb-6">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-medium text-[#5A5A5A] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#7D735F]" />
              วิธีการชำระเงิน
            </h2>
            <Button
              onClick={() => setShowMethodModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              เพิ่มวิธีการชำระเงิน
            </Button>
          </div>

          {loadingMethods ? (
            <div className="p-8 text-center text-black">กำลังโหลด...</div>
          ) : paymentMethods.length === 0 ? (
            <div className="p-8 text-center">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-black">ยังไม่มีวิธีการชำระเงิน</p>
              <Button
                onClick={() => setShowMethodModal(true)}
                variant="secondary"
                className="mt-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มวิธีการชำระเงินแรก
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`p-4 flex items-center justify-between hover:bg-gray-50 ${!method.is_active ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-sm ${
                      method.name === 'เงินสด' ? 'bg-green-100 text-green-700' :
                      method.name === 'โอนเงิน' ? 'bg-blue-100 text-blue-700' :
                      method.name === 'บัตรเครดิต' ? 'bg-purple-100 text-purple-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {method.name}
                    </span>
                    {!method.is_active && (
                      <span className="text-xs text-black">(ปิดใช้งาน)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditMethod(method)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMethod(method.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Rules List */}
        <Card>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-medium text-[#5A5A5A] flex items-center gap-2">
              <Hash className="w-5 h-5 text-[#7D735F]" />
              กฎการเลือกวิธีการชำระเงิน
            </h2>
            <Button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              เพิ่มกฎ
            </Button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-black">กำลังโหลด...</div>
          ) : rules.length === 0 ? (
            <div className="p-8 text-center">
              <Settings className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-black">ยังไม่มีกฎ</p>
              <Button
                onClick={() => setShowModal(true)}
                variant="secondary"
                className="mt-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มกฎแรก
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-4 flex items-center justify-between hover:bg-gray-50 ${!rule.is_active ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-black">
                      <ArrowUp className="w-4 h-4" />
                      <span className="text-sm">{rule.priority}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#5A5A5A]">
                          ถ้าเจอ "{rule.keyword}"
                        </span>
                        <span className="text-black">→</span>
                        <span className={`px-2 py-1 rounded text-sm ${
                          rule.payment_method === 'เงินสด' ? 'bg-green-100 text-green-700' :
                          rule.payment_method === 'โอนเงิน' ? 'bg-blue-100 text-blue-700' :
                          rule.payment_method === 'บัตรเครดิต' ? 'bg-purple-100 text-purple-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {rule.payment_method}
                        </span>
                      </div>
                      {!rule.is_active && (
                        <span className="text-xs text-black">(ปิดใช้งาน)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(rule)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-medium text-[#5A5A5A]">
                {editingRule ? 'แก้ไขกฎ' : 'เพิ่มกฎใหม่'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#5A5A5A] mb-2">
                  คีย์เวิร์ด <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.keyword}
                  onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                  placeholder="เช่น service fee, grab, lazada"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D735F]/20 focus:border-[#7D735F] outline-none"
                  required
                />
                <p className="text-xs text-black mt-1">
                  ระบบจะค้นหาคีย์เวิร์ดนี้ในรายการค่าใช้จ่าย (ไม่สนตัวพิมพ์เล็ก/ใหญ่)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5A5A5A] mb-2">
                  วิธีการชำระเงิน <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D735F]/20 focus:border-[#7D735F] outline-none"
                  required
                >
                  {paymentMethods.map((method: PaymentMethod) => (
                    <option key={method.id} value={method.name}>{method.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5A5A5A] mb-2">
                  Priority (ลำดับความสำคัญ)
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D735F]/20 focus:border-[#7D735F] outline-none"
                />
                <p className="text-xs text-black mt-1">
                  ตัวเลขสูง = ตรวจสอบก่อน (default: 0)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-[#7D735F] border-gray-300 rounded focus:ring-[#7D735F]"
                />
                <label htmlFor="is_active" className="text-sm text-[#5A5A5A]">
                  เปิดใช้งานกฎนี้
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeModal}
                  className="flex-1"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  บันทึก
                </Button>
              </div>
            </form>
          </Card>
        </div>
      {/* Payment Method Modal */}
      {showMethodModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-medium text-[#5A5A5A]">
                {editingMethod ? 'แก้ไขวิธีการชำระเงิน' : 'เพิ่มวิธีการชำระเงิน'}
              </h2>
              <button
                onClick={closeMethodModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleMethodSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#5A5A5A] mb-2">
                  ชื่อวิธีการชำระเงิน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={methodFormData.name}
                  onChange={(e) => setMethodFormData({ ...methodFormData, name: e.target.value })}
                  placeholder="เช่น เงินสด, โอนเงิน, บัตรเครดิต"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D735F]/20 focus:border-[#7D735F] outline-none"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="method_is_active"
                  checked={methodFormData.is_active}
                  onChange={(e) => setMethodFormData({ ...methodFormData, is_active: e.target.checked })}
                  className="w-4 h-4 text-[#7D735F] border-gray-300 rounded focus:ring-[#7D735F]"
                />
                <label htmlFor="method_is_active" className="text-sm text-[#5A5A5A]">
                  เปิดใช้งาน
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeMethodModal}
                  className="flex-1"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  บันทึก
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
