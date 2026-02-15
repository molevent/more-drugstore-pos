import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { Warehouse, Plus, Edit, Trash2, X, ArrowRightLeft, History, Package, ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react'
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
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productStocks, setProductStocks] = useState<ProductStock[]>([])
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
  const [lastActivityDates, setLastActivityDates] = useState<Record<string, string>>({})
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null)
  const [stockMovements, setStockMovements] = useState<Array<{
    id: string
    product_id: string
    product_name: string
    from_warehouse_id: string
    to_warehouse_id: string
    quantity: number
    movement_type: 'in' | 'out' | 'transfer'
    created_at: string
    created_by: string
    notes: string
  }>>([])
  const [currentUser, setCurrentUser] = useState<string>('')

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUser(data.user.email || data.user.id)
      }
    })
    fetchWarehouses()
    fetchProducts()
    fetchProductStocks()
    fetchLastActivityDates()
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

  const fetchLastActivityDates = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_transfers')
        .select('from_warehouse_id, to_warehouse_id, transfer_date')
        .order('transfer_date', { ascending: false })
      
      if (error) {
        console.error('Error fetching last activity dates:', error)
        return
      }
      
      const dates: Record<string, string> = {}
      
      data?.forEach((transfer: any) => {
        const date = transfer.transfer_date
        
        if (transfer.from_warehouse_id) {
          if (!dates[transfer.from_warehouse_id] || new Date(date) > new Date(dates[transfer.from_warehouse_id])) {
            dates[transfer.from_warehouse_id] = date
          }
        }
        
        if (transfer.to_warehouse_id) {
          if (!dates[transfer.to_warehouse_id] || new Date(date) > new Date(dates[transfer.to_warehouse_id])) {
            dates[transfer.to_warehouse_id] = date
          }
        }
      })
      
      setLastActivityDates(dates)
    } catch (err) {
      console.error('Exception fetching last activity dates:', err)
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
      // Create stock transfer record with user info
      await supabase.from('stock_transfers').insert([{
        ...transferData,
        transfer_date: new Date().toISOString(),
        created_by: currentUser
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
    const stocks = productStocks.filter(ps => ps.warehouse_id === warehouseId)
    if (stocks.length === 0 && warehouses.find(w => w.id === warehouseId)?.is_main) {
      // Fallback: use products table data for main warehouse
      return products.map(p => ({
        id: `fallback-${p.id}`,
        product_id: p.id,
        warehouse_id: warehouseId,
        quantity: p.stock_quantity,
        min_stock_level: p.min_stock_level,
        product: p
      }))
    }
    return stocks
  }

  const fetchStockMovements = async (warehouseId: string) => {
    try {
      // Fetch transfers where this warehouse is source or destination
      const { data: transfers, error } = await supabase
        .from('stock_transfers')
        .select(`
          *,
          product:products(name_th)
        `)
        .or(`from_warehouse_id.eq.${warehouseId},to_warehouse_id.eq.${warehouseId}`)
        .order('transfer_date', { ascending: false })

      if (error) {
        console.error('Error fetching stock movements:', error)
        return
      }

      const movements = transfers?.map((transfer: any) => ({
        id: transfer.id,
        product_id: transfer.product_id,
        product_name: transfer.product?.name_th || 'ไม่ทราบชื่อ',
        from_warehouse_id: transfer.from_warehouse_id,
        to_warehouse_id: transfer.to_warehouse_id,
        quantity: transfer.quantity,
        movement_type: transfer.from_warehouse_id === warehouseId ? 'out' : 'in' as 'in' | 'out' | 'transfer',
        created_at: transfer.transfer_date,
        created_by: transfer.created_by || 'ไม่ทราบ',
        notes: transfer.notes || ''
      })) || []

      setStockMovements(movements)
    } catch (err) {
      console.error('Exception fetching stock movements:', err)
    }
  }

  const handleViewHistory = (warehouseId: string) => {
    setSelectedWarehouseId(warehouseId)
    fetchStockMovements(warehouseId)
    setShowHistoryModal(true)
  }

  const getMovementIcon = (type: 'in' | 'out' | 'transfer') => {
    switch (type) {
      case 'in':
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />
      case 'out':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />
      case 'transfer':
        return <ArrowLeftRight className="h-4 w-4 text-blue-500" />
    }
  }

  const getMovementLabel = (type: 'in' | 'out' | 'transfer') => {
    switch (type) {
      case 'in':
        return 'รับเข้า'
      case 'out':
        return 'โอนออก'
      case 'transfer':
        return 'โอนย้าย'
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Warehouse className="h-7 w-7 text-blue-600" />
            จัดการคลังสินค้า
          </h1>
          <p className="text-gray-600 mt-1">จัดการคลังสินค้าและโอนสินค้า</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowTransferModal(true)}>
            <ArrowRightLeft className="h-5 w-5 mr-2" />
            โอนสินค้า
          </Button>
          <button
            onClick={() => { setEditingWarehouse(null); setFormData({ name: '', code: '', address: '' }); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#A67B5B] bg-white text-[#A67B5B] text-sm whitespace-nowrap hover:bg-[#A67B5B]/10 transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            เพิ่มคลัง
          </button>
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
                  onClick={() => handleViewHistory(warehouse.id)}
                  className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-100 rounded"
                  title="ดูประวัติการเคลื่อนไหว"
                >
                  <History className="h-4 w-4" />
                </button>
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
              <div className="grid grid-cols-3 gap-2 text-sm">
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
                <div className="bg-green-50 rounded p-2">
                  <div className="text-green-600">มูลค่า</div>
                  <div className="font-semibold text-green-700">
                    ฿{getWarehouseStock(warehouse.id).reduce((sum, ps) => sum + (ps.quantity * (ps.product?.cost_price || 0)), 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Last Activity Date */}
            {lastActivityDates[warehouse.id] && (
              <div className="mt-3 pt-3 border-t text-xs text-gray-400">
                เคลื่อนไหวล่าสุด: {new Date(lastActivityDates[warehouse.id]).toLocaleDateString('th-TH')}
              </div>
            )}
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

      {/* History Modal */}
      {showHistoryModal && selectedWarehouseId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <History className="h-6 w-6 text-green-600" />
                  ประวัติการเคลื่อนไหว
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {warehouses.find(w => w.id === selectedWarehouseId)?.name}
                </p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              {stockMovements.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>ไม่มีประวัติการเคลื่อนไหว</p>
                  <p className="text-sm mt-2">ยังไม่มีการรับเข้าหรือโอนออกสินค้า</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stockMovements.map((movement) => {
                    const fromWarehouse = warehouses.find(w => w.id === movement.from_warehouse_id)
                    const toWarehouse = warehouses.find(w => w.id === movement.to_warehouse_id)
                    return (
                      <div key={movement.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${
                              movement.movement_type === 'in' ? 'bg-green-100' :
                              movement.movement_type === 'out' ? 'bg-red-100' : 'bg-blue-100'
                            }`}>
                              {getMovementIcon(movement.movement_type)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{movement.product_name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  movement.movement_type === 'in' ? 'bg-green-100 text-green-700' :
                                  movement.movement_type === 'out' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {getMovementLabel(movement.movement_type)}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                {movement.movement_type === 'in' && (
                                  <span>รับเข้าจาก {fromWarehouse?.name || 'ไม่ทราบ'}</span>
                                )}
                                {movement.movement_type === 'out' && (
                                  <span>โอนไป {toWarehouse?.name || 'ไม่ทราบ'}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  {movement.quantity} ชิ้น
                                </span>
                                <span>{new Date(movement.created_at).toLocaleString('th-TH')}</span>
                                {movement.created_by && movement.created_by !== 'ไม่ทราบ' && (
                                  <span>โดย: {movement.created_by}</span>
                                )}
                              </div>
                              {movement.notes && (
                                <div className="mt-2 text-sm text-gray-600 bg-white p-2 rounded">
                                  หมายเหตุ: {movement.notes}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-semibold ${
                              movement.movement_type === 'in' ? 'text-green-600' :
                              movement.movement_type === 'out' ? 'text-red-600' : 'text-blue-600'
                            }`}>
                              {movement.movement_type === 'in' ? '+' : '-'}{movement.quantity}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50 rounded-b-lg">
              <Button variant="secondary" onClick={() => setShowHistoryModal(false)} className="w-full">
                ปิด
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
