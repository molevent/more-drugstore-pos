import { useEffect, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { FileText, Plus, Edit, Trash2, X, Search, Filter, CheckCircle, Clock, Package, AlertCircle } from 'lucide-react'
import type { Product } from '../types/database'

interface PurchaseOrder {
  id: string
  po_number: string
  supplier_name: string
  supplier_contact: string
  order_date: string
  expected_delivery_date: string
  status: 'draft' | 'sent' | 'partial' | 'received' | 'cancelled'
  warehouse_id: string
  total_amount: number
  tax_amount: number
  discount_amount: number
  net_amount: number
  notes: string
  created_at: string
}

interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  product_id: string
  product?: Product
  quantity: number
  unit_price: number
  discount_percent: number
  discount_amount: number
  tax_percent: number
  tax_amount: number
  total_amount: number
  received_quantity: number
  notes: string
}

interface Warehouse {
  id: string
  name: string
  code: string
}

export default function PurchaseOrderPage() {
  const { t } = useLanguage()
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const [poFormData, setPoFormData] = useState({
    supplier_name: '',
    supplier_contact: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    warehouse_id: '',
    notes: ''
  })

  const [itemFormData, setItemFormData] = useState({
    product_id: '',
    quantity: 1,
    unit_price: 0,
    discount_percent: 0,
    tax_percent: 7,
    notes: ''
  })

  useEffect(() => {
    fetchPurchaseOrders()
    fetchProducts()
    fetchWarehouses()
  }, [])

  const fetchPurchaseOrders = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('purchase_orders')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setPurchaseOrders(data)
    setLoading(false)
  }

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('name_th')
    if (data) setProducts(data)
  }

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').order('name')
    if (data) setWarehouses(data)
  }

  const calculateItemTotals = () => {
    const subtotal = itemFormData.quantity * itemFormData.unit_price
    const discountAmount = subtotal * (itemFormData.discount_percent / 100)
    const afterDiscount = subtotal - discountAmount
    const taxAmount = afterDiscount * (itemFormData.tax_percent / 100)
    const total = afterDiscount + taxAmount
    return { subtotal, discountAmount, taxAmount, total }
  }

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .insert([poFormData])
        .select()
        .single()
      
      if (error) throw error
      
      setShowModal(false)
      setPoFormData({
        supplier_name: '',
        supplier_contact: '',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: '',
        warehouse_id: '',
        notes: ''
      })
      fetchPurchaseOrders()
      
      // Open the new PO to add items
      if (data) {
        setSelectedPO(data)
        setShowItemModal(true)
      }
    } catch (error: any) {
      alert('Error creating PO: ' + error.message)
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPO) return

    try {
      const totals = calculateItemTotals()
      
      const { error } = await supabase
        .from('purchase_order_items')
        .insert([{
          purchase_order_id: selectedPO.id,
          product_id: itemFormData.product_id,
          quantity: itemFormData.quantity,
          unit_price: itemFormData.unit_price,
          discount_percent: itemFormData.discount_percent,
          discount_amount: totals.discountAmount,
          tax_percent: itemFormData.tax_percent,
          tax_amount: totals.taxAmount,
          total_amount: totals.total,
          notes: itemFormData.notes
        }])
      
      if (error) throw error
      
      setItemFormData({
        product_id: '',
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        tax_percent: 7,
        notes: ''
      })
      
      fetchPurchaseOrders()
      alert('เพิ่มรายการสินค้าเรียบร้อย')
    } catch (error: any) {
      alert('Error adding item: ' + error.message)
    }
  }

  const handleDeletePO = async (id: string) => {
    if (!confirm('ยืนยันการลบ PO นี้?')) return
    try {
      await supabase.from('purchase_orders').delete().eq('id', id)
      fetchPurchaseOrders()
    } catch (error: any) {
      alert(error.message)
    }
  }

  const handleUpdateStatus = async (po: PurchaseOrder, newStatus: string) => {
    try {
      await supabase
        .from('purchase_orders')
        .update({ status: newStatus })
        .eq('id', po.id)
      fetchPurchaseOrders()
    } catch (error: any) {
      alert(error.message)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
      draft: { color: 'bg-gray-100 text-gray-700', icon: FileText, label: 'ร่าง' },
      sent: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle, label: 'ส่งแล้ว' },
      partial: { color: 'bg-yellow-100 text-yellow-700', icon: Package, label: 'รับบางส่วน' },
      received: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'รับครบ' },
      cancelled: { color: 'bg-red-100 text-red-700', icon: AlertCircle, label: 'ยกเลิก' }
    }
    
    const config = statusConfig[status] || statusConfig.draft
    const Icon = config.icon
    
    return (
      <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    )
  }

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesStatus = !statusFilter || po.status === statusFilter
    const matchesSearch = !searchTerm || 
      po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('th-TH')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ใบสั่งซื้อ (Purchase Orders)</h1>
            <p className="text-sm text-gray-500">จัดการใบสั่งซื้อจากซัพพลายเออร์</p>
          </div>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <Plus className="h-5 w-5 mr-2" />
            สร้าง PO ใหม่
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-white">
            <div className="text-sm text-gray-500">ทั้งหมด</div>
            <div className="text-2xl font-bold text-gray-900">{purchaseOrders.length}</div>
          </Card>
          <Card className="bg-white">
            <div className="text-sm text-gray-500">ร่าง</div>
            <div className="text-2xl font-bold text-gray-600">
              {purchaseOrders.filter(po => po.status === 'draft').length}
            </div>
          </Card>
          <Card className="bg-white">
            <div className="text-sm text-blue-600">ส่งแล้ว</div>
            <div className="text-2xl font-bold text-blue-700">
              {purchaseOrders.filter(po => po.status === 'sent').length}
            </div>
          </Card>
          <Card className="bg-white">
            <div className="text-sm text-yellow-600">รับบางส่วน</div>
            <div className="text-2xl font-bold text-yellow-700">
              {purchaseOrders.filter(po => po.status === 'partial').length}
            </div>
          </Card>
          <Card className="bg-white">
            <div className="text-sm text-green-600">รับครบ</div>
            <div className="text-2xl font-bold text-green-700">
              {purchaseOrders.filter(po => po.status === 'received').length}
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="ค้นหา PO Number หรือ ชื่อซัพพลายเออร์..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">สถานะทั้งหมด</option>
              <option value="draft">ร่าง</option>
              <option value="sent">ส่งแล้ว</option>
              <option value="partial">รับบางส่วน</option>
              <option value="received">รับครบ</option>
              <option value="cancelled">ยกเลิก</option>
            </select>
          </div>
        </Card>

        {/* Purchase Orders Table */}
        <Card>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">กำลังโหลด...</p>
            </div>
          ) : filteredPOs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>ไม่พบใบสั่งซื้อ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ซัพพลายเออร์</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่สั่ง</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">จำนวนเงิน</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPOs.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">{po.po_number}</div>
                        <div className="text-sm text-gray-500">
                          {warehouses.find(w => w.id === po.warehouse_id)?.name || 'ไม่ระบุคลัง'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">{po.supplier_name}</div>
                        <div className="text-sm text-gray-500">{po.supplier_contact}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">{formatDate(po.order_date)}</div>
                        <div className="text-sm text-gray-500">
                          รับ: {formatDate(po.expected_delivery_date)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(po.status)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          ฿{po.total_amount.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedPO(po)
                              setShowItemModal(true)
                            }}
                          >
                            เพิ่มสินค้า
                          </Button>
                          <select
                            value={po.status}
                            onChange={(e) => handleUpdateStatus(po, e.target.value)}
                            className="text-sm px-2 py-1 border border-gray-300 rounded"
                          >
                            <option value="draft">ร่าง</option>
                            <option value="sent">ส่งแล้ว</option>
                            <option value="partial">รับบางส่วน</option>
                            <option value="received">รับครบ</option>
                            <option value="cancelled">ยกเลิก</option>
                          </select>
                          <button
                            onClick={() => handleDeletePO(po.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
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

        {/* Create PO Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">สร้างใบสั่งซื้อใหม่</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleCreatePO} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อซัพพลายเออร์ *</label>
                  <Input
                    value={poFormData.supplier_name}
                    onChange={(e) => setPoFormData({ ...poFormData, supplier_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ข้อมูลติดต่อ</label>
                  <Input
                    value={poFormData.supplier_contact}
                    onChange={(e) => setPoFormData({ ...poFormData, supplier_contact: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">วันที่สั่งซื้อ</label>
                    <Input
                      type="date"
                      value={poFormData.order_date}
                      onChange={(e) => setPoFormData({ ...poFormData, order_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">วันที่คาดว่าจะรับ</label>
                    <Input
                      type="date"
                      value={poFormData.expected_delivery_date}
                      onChange={(e) => setPoFormData({ ...poFormData, expected_delivery_date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">คลังสินค้าที่รับ</label>
                  <select
                    value={poFormData.warehouse_id}
                    onChange={(e) => setPoFormData({ ...poFormData, warehouse_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">เลือกคลัง</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                  <Input
                    value={poFormData.notes}
                    onChange={(e) => setPoFormData({ ...poFormData, notes: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" variant="primary" className="flex-1">
                    สร้าง PO
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                    ยกเลิก
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Items Modal */}
        {showItemModal && selectedPO && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">เพิ่มสินค้าใน PO</h2>
                  <p className="text-sm text-gray-500">{selectedPO.po_number}</p>
                </div>
                <button onClick={() => setShowItemModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">สินค้า *</label>
                  <select
                    value={itemFormData.product_id}
                    onChange={(e) => {
                      const product = products.find(p => p.id === e.target.value)
                      setItemFormData({
                        ...itemFormData,
                        product_id: e.target.value,
                        unit_price: product?.cost_price || 0
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">เลือกสินค้า</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name_th} ({p.sku})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">จำนวน *</label>
                    <Input
                      type="number"
                      min={1}
                      value={itemFormData.quantity}
                      onChange={(e) => setItemFormData({ ...itemFormData, quantity: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ราคาต่อหน่วย *</label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={itemFormData.unit_price}
                      onChange={(e) => setItemFormData({ ...itemFormData, unit_price: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ส่วนลด (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={itemFormData.discount_percent}
                      onChange={(e) => setItemFormData({ ...itemFormData, discount_percent: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ภาษี (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={itemFormData.tax_percent}
                      onChange={(e) => setItemFormData({ ...itemFormData, tax_percent: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                  <Input
                    value={itemFormData.notes}
                    onChange={(e) => setItemFormData({ ...itemFormData, notes: e.target.value })}
                  />
                </div>
                {/* Preview calculated totals */}
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span>รวมเงิน:</span>
                    <span>฿{calculateItemTotals().subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ส่วนลด:</span>
                    <span>฿{calculateItemTotals().discountAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ภาษี:</span>
                    <span>฿{calculateItemTotals().taxAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>ยอดรวม:</span>
                    <span>฿{calculateItemTotals().total.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" variant="primary" className="flex-1">
                    เพิ่มรายการ
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowItemModal(false)}>
                    ปิด
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
