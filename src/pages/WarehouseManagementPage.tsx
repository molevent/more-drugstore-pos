import { useEffect, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { Warehouse, Plus, Edit, Trash2, X, ArrowRightLeft } from 'lucide-react'
import type { Product } from '../types/database'

interface WarehouseType {
  id: string
  name: string
  code: string
  address: string
  is_main: boolean
  is_active: boolean
}

interface ProductStock {
  id: string
  product_id: string
  warehouse_id: string
  quantity: number
  min_stock_level: number
  product?: Product
}

export default function WarehouseManagementPage() {
  const { t } = useLanguage()
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productStocks, setProductStocks] = useState<ProductStock[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseType | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: ''
  })
  const [transferData, setTransferData] = useState({
    product_id: '',
    from_warehouse_id: '',
    to_warehouse_id: '',
    quantity: 1,
    notes: ''
  })

  useEffect(() => {
    fetchWarehouses()
    fetchProducts()
    fetchProductStocks()
  }, [])

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').order('is_main', { ascending: false })
    if (data) setWarehouses(data)
  }

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('name_th')
    if (data) setProducts(data)
  }

  const fetchProductStocks = async () => {
    try {
      const { data, error } = await supabase
        .from('product_stock')
        .select('*, product:products(*)')
      
      if (error) {
        console.error('Error fetching product stocks:', error)
        return
      }
      
      console.log('Product stocks fetched:', data)
      if (data) setProductStocks(data)
    } catch (err) {
      console.error('Exception fetching product stocks:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingWarehouse) {
        await supabase.from('warehouses').update(formData).eq('id', editingWarehouse.id)
      } else {
        await supabase.from('warehouses').insert([formData])
      }
      setShowModal(false)
      setFormData({ name: '', code: '', address: '' })
      setEditingWarehouse(null)
      fetchWarehouses()
    } catch (error: any) {
      alert(error.message)
    }
  }

  const handleEdit = (warehouse: WarehouseType) => {
    setEditingWarehouse(warehouse)
    setFormData({
      name: warehouse.name,
      code: warehouse.code,
      address: warehouse.address || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ยืนยันการลบคลังสินค้า?')) return
    try {
      await supabase.from('warehouses').delete().eq('id', id)
      fetchWarehouses()
    } catch (error: any) {
      alert(error.message)
    }
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Create stock transfer record
      await supabase.from('stock_transfers').insert([{
        ...transferData,
        transfer_date: new Date().toISOString()
      }])

      // Update source warehouse stock
      const { data: sourceStock } = await supabase
        .from('product_stock')
        .select('*')
        .eq('product_id', transferData.product_id)
        .eq('warehouse_id', transferData.from_warehouse_id)
        .single()

      if (sourceStock) {
        await supabase
          .from('product_stock')
          .update({ quantity: sourceStock.quantity - transferData.quantity })
          .eq('id', sourceStock.id)
      }

      // Update destination warehouse stock
      const { data: destStock } = await supabase
        .from('product_stock')
        .select('*')
        .eq('product_id', transferData.product_id)
        .eq('warehouse_id', transferData.to_warehouse_id)
        .single()

      if (destStock) {
        await supabase
          .from('product_stock')
          .update({ quantity: destStock.quantity + transferData.quantity })
          .eq('id', destStock.id)
      } else {
        // Create new stock entry for destination
        await supabase.from('product_stock').insert([{
          product_id: transferData.product_id,
          warehouse_id: transferData.to_warehouse_id,
          quantity: transferData.quantity,
          min_stock_level: 0
        }])
      }

      setShowTransferModal(false)
      setTransferData({
        product_id: '',
        from_warehouse_id: '',
        to_warehouse_id: '',
        quantity: 1,
        notes: ''
      })
      fetchProductStocks()
      alert('โอนสินค้าสำเร็จ')
    } catch (error: any) {
      alert(error.message)
    }
  }

  const getWarehouseStock = (warehouseId: string) => {
    return productStocks.filter(ps => ps.warehouse_id === warehouseId)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">จัดการคลังสินค้า</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowTransferModal(true)}>
            <ArrowRightLeft className="h-5 w-5 mr-2" />
            โอนสินค้า
          </Button>
          <Button variant="primary" onClick={() => { setEditingWarehouse(null); setFormData({ name: '', code: '', address: '' }); setShowModal(true); }}>
            <Plus className="h-5 w-5 mr-2" />
            เพิ่มคลัง
          </Button>
        </div>
      </div>

      {/* Warehouses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {warehouses.map((warehouse) => (
          <Card key={warehouse.id} className={warehouse.is_main ? 'border-blue-300' : ''}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${warehouse.is_main ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <Warehouse className={`h-6 w-6 ${warehouse.is_main ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{warehouse.name}</h3>
                  <p className="text-sm text-gray-500">{warehouse.code}</p>
                  {warehouse.is_main && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">คลังหลัก</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(warehouse)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded"
                >
                  <Edit className="h-4 w-4" />
                </button>
                {!warehouse.is_main && (
                  <button
                    onClick={() => handleDelete(warehouse.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            
            {warehouse.address && (
              <p className="text-sm text-gray-600 mt-2">{warehouse.address}</p>
            )}

            {/* Stock Summary */}
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-gray-500">จำนวนสินค้า</div>
                  <div className="font-semibold">{getWarehouseStock(warehouse.id).length} รายการ</div>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-gray-500">สต็อกรวม</div>
                  <div className="font-semibold">
                    {getWarehouseStock(warehouse.id).reduce((sum, ps) => sum + ps.quantity, 0)} ชิ้น
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Warehouse Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingWarehouse ? 'แก้ไขคลังสินค้า' : 'เพิ่มคลังสินค้า'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อคลัง</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสคลัง</label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่</label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" variant="primary" className="flex-1">
                  {editingWarehouse ? 'บันทึก' : 'สร้าง'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                  ยกเลิก
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">โอนสินค้าระหว่างคลัง</h2>
              <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">สินค้า</label>
                <select
                  value={transferData.product_id}
                  onChange={(e) => setTransferData({ ...transferData, product_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">เลือกสินค้า</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name_th}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">จากคลัง</label>
                  <select
                    value={transferData.from_warehouse_id}
                    onChange={(e) => setTransferData({ ...transferData, from_warehouse_id: e.target.value })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">ไปคลัง</label>
                  <select
                    value={transferData.to_warehouse_id}
                    onChange={(e) => setTransferData({ ...transferData, to_warehouse_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">เลือกคลัง</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">จำนวน</label>
                <Input
                  type="number"
                  min={1}
                  value={transferData.quantity}
                  onChange={(e) => setTransferData({ ...transferData, quantity: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                <Input
                  value={transferData.notes}
                  onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" variant="primary" className="flex-1">
                  โอนสินค้า
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowTransferModal(false)}>
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
