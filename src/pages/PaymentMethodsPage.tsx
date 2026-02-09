import { useState, useEffect } from 'react'
import { CreditCard, Plus, Edit2, Trash2 } from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { supabase } from '../services/supabase'

interface PaymentMethod {
  id: string
  name: string
  description?: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export default function PaymentMethodsPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    sort_order: 0
  })

  useEffect(() => {
    fetchPaymentMethods()
  }, [])

  const fetchPaymentMethods = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching payment methods:', error)
        return
      }

      setPaymentMethods(data || [])
    } catch (err) {
      console.error('Exception fetching payment methods:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      alert('กรุณากรอกชื่อช่องทางการชำระเงิน')
      return
    }

    try {
      const { error } = await supabase
        .from('payment_methods')
        .insert({
          name: formData.name,
          description: formData.description,
          is_active: formData.is_active,
          sort_order: formData.sort_order
        })

      if (error) {
        console.error('Error adding payment method:', error)
        alert('ไม่สามารถเพิ่มช่องทางการชำระเงินได้')
        return
      }

      setShowAddModal(false)
      setFormData({ name: '', description: '', is_active: true, sort_order: 0 })
      fetchPaymentMethods()
    } catch (err) {
      console.error('Exception adding payment method:', err)
      alert('เกิดข้อผิดพลาดในการเพิ่มช่องทางการชำระเงิน')
    }
  }

  const handleEdit = async () => {
    if (!editingMethod) return
    if (!formData.name.trim()) {
      alert('กรุณากรอกชื่อช่องทางการชำระเงิน')
      return
    }

    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({
          name: formData.name,
          description: formData.description,
          is_active: formData.is_active,
          sort_order: formData.sort_order
        })
        .eq('id', editingMethod.id)

      if (error) {
        console.error('Error updating payment method:', error)
        alert('ไม่สามารถแก้ไขช่องทางการชำระเงินได้')
        return
      }

      setEditingMethod(null)
      setFormData({ name: '', description: '', is_active: true, sort_order: 0 })
      fetchPaymentMethods()
    } catch (err) {
      console.error('Exception updating payment method:', err)
      alert('เกิดข้อผิดพลาดในการแก้ไขช่องทางการชำระเงิน')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบช่องทางการชำระเงินนี้?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting payment method:', error)
        alert('ไม่สามารถลบช่องทางการชำระเงินได้')
        return
      }

      fetchPaymentMethods()
    } catch (err) {
      console.error('Exception deleting payment method:', err)
      alert('เกิดข้อผิดพลาดในการลบช่องทางการชำระเงิน')
    }
  }

  const openEditModal = (method: PaymentMethod) => {
    setEditingMethod(method)
    setFormData({
      name: method.name,
      description: method.description || '',
      is_active: method.is_active,
      sort_order: method.sort_order
    })
  }

  const openAddModal = () => {
    setShowAddModal(true)
    setFormData({
      name: '',
      description: '',
      is_active: true,
      sort_order: paymentMethods.length + 1
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-blue-600" />
            ช่องทางการชำระเงิน
          </h1>
          <p className="text-gray-600 mt-1">จัดการช่องทางการชำระเงินสำหรับหน้า POS</p>
        </div>
        <Button onClick={openAddModal} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          เพิ่มช่องทางใหม่
        </Button>
      </div>

      {/* Payment Methods List */}
      <Card>
        {loading ? (
          <div className="text-center py-8 text-gray-500">กำลังโหลด...</div>
        ) : paymentMethods.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>ไม่พบช่องทางการชำระเงิน</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {paymentMethods.map((method, index) => (
              <div
                key={method.id}
                className="flex items-center justify-between py-4 px-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center h-8 w-8 bg-gray-100 rounded-lg text-gray-500 text-sm font-medium">
                    {method.sort_order || index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{method.name}</h3>
                      {method.is_active ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          ใช้งาน
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          ปิดใช้งาน
                        </span>
                      )}
                    </div>
                    {method.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{method.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(method)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="แก้ไข"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(method.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="ลบ"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">เพิ่มช่องทางการชำระเงิน</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อช่องทาง <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น เงินสด, บัตรเครดิต"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  รายละเอียด
                </label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ลำดับ
                  </label>
                  <Input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">เปิดใช้งาน</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => setShowAddModal(false)}
                className="flex-1"
              >
                ยกเลิก
              </Button>
              <Button onClick={handleAdd} className="flex-1">
                บันทึก
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingMethod && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">แก้ไขช่องทางการชำระเงิน</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อช่องทาง <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น เงินสด, บัตรเครดิต"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  รายละเอียด
                </label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ลำดับ
                  </label>
                  <Input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">เปิดใช้งาน</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => setEditingMethod(null)}
                className="flex-1"
              >
                ยกเลิก
              </Button>
              <Button onClick={handleEdit} className="flex-1">
                บันทึก
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
