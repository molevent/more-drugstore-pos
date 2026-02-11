import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { ShoppingCart, AlertTriangle, Package, ExternalLink, Clock, Eye, EyeOff, Archive } from 'lucide-react'

interface ReorderItem {
  id: string
  product_id: string
  product_name: string
  product_barcode: string
  current_stock: number
  min_stock_level: number
  reorder_point: number
  unit_of_measure: string
  supplier_name?: string
  cost_price: number
  estimated_value: number
  purchase_links: string[]
  days_out_of_stock: number
  is_hidden: boolean
  is_out_of_stock: boolean
  last_movement_date?: string
}

export default function ReorderReportPage() {
  const [items, setItems] = useState<ReorderItem[]>([])
  const [filteredItems, setFilteredItems] = useState<ReorderItem[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'urgent' | 'low' | 'hidden'>('urgent')
  const [hiddenItemIds, setHiddenItemIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchReorderItems()
  }, [])

  useEffect(() => {
    filterItems()
  }, [items, activeTab, hiddenItemIds])

  const fetchReorderItems = async () => {
    setLoading(true)
    try {
      // Get products that need reordering
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name_th,
          barcode,
          stock_quantity,
          min_stock_level,
          reorder_point,
          unit_of_measure,
          cost_price,
          purchase_link_1,
          purchase_link_2,
          purchase_link_3,
          hidden_at,
          suppliers:supplier_id (name)
        `)
        .eq('is_active', true)
        .order('stock_quantity', { ascending: true })

      if (productsError) throw productsError

      // Get last movement date for each product
      const { data: movements, error: movementsError } = await supabase
        .from('stock_movements')
        .select('product_id, movement_date')
        .in('movement_type', ['purchase', 'sale'])
        .order('movement_date', { ascending: false })

      if (movementsError) throw movementsError

      // Get hidden items from localStorage
      const savedHidden = localStorage.getItem('reorder_hidden_items')
      const hiddenIds: Set<string> = savedHidden ? new Set(JSON.parse(savedHidden)) : new Set()
      setHiddenItemIds(hiddenIds)

      // Build map of last movement dates
      const lastMovementMap = new Map<string, string>()
      movements?.forEach((m: any) => {
        if (!lastMovementMap.has(m.product_id)) {
          lastMovementMap.set(m.product_id, m.movement_date)
        }
      })

      const formattedItems: ReorderItem[] = (products || []).map((p: any) => {
        const lastMovement = lastMovementMap.get(p.id)
        const daysOutOfStock = lastMovement 
          ? Math.floor((Date.now() - new Date(lastMovement).getTime()) / (1000 * 60 * 60 * 24))
          : 0

        const purchaseLinks = [
          p.purchase_link_1,
          p.purchase_link_2,
          p.purchase_link_3
        ].filter(Boolean) as string[]

        const isOutOfStock = p.stock_quantity <= 0
        const isHidden = hiddenIds.has(p.id)

        return {
          id: p.id,
          product_id: p.id,
          product_name: p.name_th,
          product_barcode: p.barcode,
          current_stock: p.stock_quantity,
          min_stock_level: p.min_stock_level,
          reorder_point: p.reorder_point,
          unit_of_measure: p.unit_of_measure || 'ชิ้น',
          supplier_name: p.suppliers?.name,
          cost_price: p.cost_price || 0,
          estimated_value: (p.cost_price || 0) * p.stock_quantity,
          purchase_links: purchaseLinks,
          days_out_of_stock: isOutOfStock ? daysOutOfStock : 0,
          is_hidden: isHidden,
          is_out_of_stock: isOutOfStock,
          last_movement_date: lastMovement
        }
      })

      setItems(formattedItems)
    } catch (error) {
      console.error('Error fetching reorder items:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterItems = () => {
    let filtered = items

    switch (activeTab) {
      case 'urgent':
        filtered = items.filter(i => !i.is_hidden && (i.is_out_of_stock || i.days_out_of_stock > 7))
        break
      case 'low':
        filtered = items.filter(i => !i.is_hidden && !i.is_out_of_stock && i.current_stock <= i.reorder_point)
        break
      case 'hidden':
        filtered = items.filter(i => i.is_hidden)
        break
    }

    setFilteredItems(filtered)
  }

  const toggleHideItem = (itemId: string) => {
    const newHidden = new Set(hiddenItemIds)
    if (newHidden.has(itemId)) {
      newHidden.delete(itemId)
    } else {
      newHidden.add(itemId)
    }
    setHiddenItemIds(newHidden)
    localStorage.setItem('reorder_hidden_items', JSON.stringify(Array.from(newHidden)))
  }

  const getStockStatus = (item: ReorderItem) => {
    if (item.is_out_of_stock) {
      return { 
        color: 'bg-red-100 text-red-700 border-red-200', 
        text: item.days_out_of_stock > 7 ? 'ขาดตลาด' : 'หมดสต็อก',
        urgent: true 
      }
    }
    if (item.current_stock <= item.min_stock_level) {
      return { 
        color: 'bg-orange-100 text-orange-700 border-orange-200', 
        text: 'ต่ำกว่าขั้นต่ำ',
        urgent: true 
      }
    }
    if (item.current_stock <= item.reorder_point) {
      return { 
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200', 
        text: 'ถึงจุดสั่งซื้อ',
        urgent: false 
      }
    }
    return { 
      color: 'bg-green-100 text-green-700 border-green-200', 
      text: 'ปกติ',
      urgent: false 
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="h-7 w-7 text-blue-600" />
            รายงานเตรียมสั่งซื้อสินค้า
          </h1>
          <p className="text-gray-600 mt-1">สินค้าที่หมดสต็อกหรือต่ำกว่าจุดสั่งซื้อ พร้อมลิงก์สั่งซื้อ</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('urgent')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'urgent'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          ขาดตลาด/หมดสต็อก
          <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-sm">
            {items.filter(i => !i.is_hidden && (i.is_out_of_stock || i.days_out_of_stock > 7)).length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('low')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'low'
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Package className="h-4 w-4" />
          ใกล้หมด/ถึงจุดสั่งซื้อ
          <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-sm">
            {items.filter(i => !i.is_hidden && !i.is_out_of_stock && i.current_stock <= i.reorder_point).length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('hidden')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'hidden'
              ? 'bg-gray-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Archive className="h-4 w-4" />
          รายการที่ซ่อน
          <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-sm">
            {items.filter(i => i.is_hidden).length}
          </span>
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-red-600">ขาดตลาด &gt; 1 สัปดาห์</p>
              <p className="text-2xl font-bold text-red-700">
                {items.filter(i => !i.is_hidden && i.days_out_of_stock > 7).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Package className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-yellow-600">ต่ำกว่าจุดสั่งซื้อ</p>
              <p className="text-2xl font-bold text-yellow-700">
                {items.filter(i => !i.is_hidden && !i.is_out_of_stock && i.current_stock <= i.reorder_point).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-600">มูลค่าสินค้าคงเหลือ</p>
              <p className="text-2xl font-bold text-blue-700">
                ฿{items.filter(i => !i.is_hidden).reduce((sum, i) => sum + i.estimated_value, 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Items List */}
      <Card>
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">กำลังโหลด...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            {activeTab === 'hidden' ? (
              <>
                <Archive className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">ไม่มีรายการที่ซ่อน</p>
              </>
            ) : (
              <>
                <Package className="h-12 w-12 text-green-400 mx-auto mb-3" />
                <p className="text-gray-600">
                  {activeTab === 'urgent' 
                    ? 'ไม่มีสินค้าขาดตลาดหรือหมดสต็อก'
                    : 'ไม่มีสินค้าต่ำกว่าจุดสั่งซื้อ'}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => {
              const status = getStockStatus(item)
              return (
                <div 
                  key={item.id} 
                  className={`p-4 border rounded-lg ${status.urgent ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${status.color}`}>
                          {status.text}
                        </span>
                        {item.days_out_of_stock > 7 && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                            <Clock className="h-3 w-3 mr-1" />
                            ขาดมา {item.days_out_of_stock} วัน
                          </span>
                        )}
                      </div>
                      
                      <h4 className="font-medium text-gray-900 mt-2">{item.product_name}</h4>
                      <p className="text-sm text-gray-600">{item.product_barcode}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                        <span className="text-gray-600">
                          คงเหลือ: <strong className={item.current_stock <= 0 ? 'text-red-600' : 'text-gray-900'}>
                            {item.current_stock} {item.unit_of_measure}
                          </strong>
                        </span>
                        <span className="text-gray-600">
                          ขั้นต่ำ: {item.min_stock_level} {item.unit_of_measure}
                        </span>
                        <span className="text-gray-600">
                          จุดสั่งซื้อ: {item.reorder_point} {item.unit_of_measure}
                        </span>
                        {item.supplier_name && (
                          <span className="text-gray-600">
                            ซัพพลายเออร์: {item.supplier_name}
                          </span>
                        )}
                      </div>

                      {/* Purchase Links */}
                      {item.purchase_links.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.purchase_links.map((link, idx) => (
                            <a
                              key={idx}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              สั่งซื้อ {idx + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => toggleHideItem(item.id)}
                        className="flex items-center gap-1"
                      >
                        {item.is_hidden ? (
                          <>
                            <Eye className="h-4 w-4" />
                            แสดง
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-4 w-4" />
                            ซ่อน
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Legend */}
      <Card className="mt-6 bg-gray-50">
        <h4 className="font-medium text-gray-900 mb-2">คำอธิบายสัญลักษณ์</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium border bg-red-100 text-red-700 border-red-200">
              ขาดตลาด
            </span>
            <span className="text-gray-600">หมดสต็อกมาแล้ว &gt; 7 วัน</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium border bg-red-100 text-red-700 border-red-200">
              หมดสต็อก
            </span>
            <span className="text-gray-600">สินค้าหมด</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium border bg-orange-100 text-orange-700 border-orange-200">
              ต่ำกว่าขั้นต่ำ
            </span>
            <span className="text-gray-600">ต่ำกว่าค่าขั้นต่ำ</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium border bg-yellow-100 text-yellow-700 border-yellow-200">
              ถึงจุดสั่งซื้อ
            </span>
            <span className="text-gray-600">ควรสั่งซื้อเพิ่ม</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
