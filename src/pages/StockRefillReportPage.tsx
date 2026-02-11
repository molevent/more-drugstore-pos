import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { ArrowUpCircle, ExternalLink, CheckCircle, AlertTriangle, Store, RefreshCw } from 'lucide-react'

interface RefillItem {
  id: string
  product_id: string
  product_name: string
  product_barcode: string
  unit_of_measure: string
  current_stock: number
  added_quantity: number
  channels: string[]
  channelUrls: Record<string, string>
  received_at: string
  batch_number?: string
  supplier?: string
  status: 'pending' | 'completed'
}

const CHANNEL_CONFIG = {
  grab: { label: 'GRAB', icon: '🛵', color: 'bg-green-100 text-green-700' },
  lineman: { label: 'LineMan', icon: '🥡', color: 'bg-green-100 text-green-700' },
  lazada: { label: 'LAZADA', icon: '🛒', color: 'bg-orange-100 text-orange-700' },
  shopee: { label: 'Shopee', icon: '🧡', color: 'bg-orange-100 text-orange-700' },
  line_shopping: { label: 'Line Shopping', icon: '💬', color: 'bg-green-100 text-green-700' },
  tiktok: { label: 'TikTok Shop', icon: '🎵', color: 'bg-black text-white' }
}

export default function StockRefillReportPage() {
  const [refillItems, setRefillItems] = useState<RefillItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkStockRefills()
  }, [])

  const checkStockRefills = async () => {
    setLoading(true)
    try {
      // Get recent stock movements (purchases/receipts in last 7 days)
      const { data: movements, error: movementsError } = await supabase
        .from('stock_movements')
        .select(`
          id,
          product_id,
          quantity,
          quantity_after,
          reason,
          movement_date,
          reference_id,
          products:product_id (
            id,
            name_th,
            barcode,
            unit_of_measure,
            stock_quantity,
            sell_on_grab,
            sell_on_lineman,
            sell_on_lazada,
            sell_on_shopee,
            sell_on_line_shopping,
            sell_on_tiktok,
            url_grab,
            url_lineman,
            url_lazada,
            url_shopee,
            url_line_shopping,
            url_tiktok
          )
        `)
        .in('movement_type', ['purchase', 'adjustment'])
        .gte('movement_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .gt('quantity', 0)
        .order('movement_date', { ascending: false })

      if (movementsError) throw movementsError

      // Get batch info
      const batchIds = movements?.map((m: any) => m.reference_id).filter(Boolean) || []
      const { data: batches } = await supabase
        .from('stock_batches')
        .select('id, batch_number, supplier')
        .in('id', batchIds)

      const batchMap = new Map(batches?.map((b: any) => [b.id, b]) || [])

      const items: RefillItem[] = []

      movements?.forEach((movement: any) => {
        const product = movement.products
        if (!product) return

        // Check which channels this product is sold on
        const channels: string[] = []
        const channelUrls: Record<string, string> = {}

        if (product.sell_on_grab) {
          channels.push('grab')
          if (product.url_grab) channelUrls.grab = product.url_grab
        }
        if (product.sell_on_lineman) {
          channels.push('lineman')
          if (product.url_lineman) channelUrls.lineman = product.url_lineman
        }
        if (product.sell_on_lazada) {
          channels.push('lazada')
          if (product.url_lazada) channelUrls.lazada = product.url_lazada
        }
        if (product.sell_on_shopee) {
          channels.push('shopee')
          if (product.url_shopee) channelUrls.shopee = product.url_shopee
        }
        if (product.sell_on_line_shopping) {
          channels.push('line_shopping')
          if (product.url_line_shopping) channelUrls.line_shopping = product.url_line_shopping
        }
        if (product.sell_on_tiktok) {
          channels.push('tiktok')
          if (product.url_tiktok) channelUrls.tiktok = product.url_tiktok
        }

        // Only show if product is sold on at least one channel
        if (channels.length > 0) {
          const batch = batchMap.get(movement.reference_id)

          items.push({
            id: movement.id,
            product_id: product.id,
            product_name: product.name_th,
            product_barcode: product.barcode,
            unit_of_measure: product.unit_of_measure || 'ชิ้น',
            current_stock: movement.quantity_after,
            added_quantity: movement.quantity,
            channels,
            channelUrls,
            received_at: movement.movement_date,
            batch_number: batch?.batch_number,
            supplier: batch?.supplier,
            status: 'pending'
          })
        }
      })

      setRefillItems(items)
    } catch (error) {
      console.error('Error checking stock refills:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsCompleted = (itemId: string) => {
    setRefillItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, status: 'completed' } : item
    ))
  }

  const getChannelBadge = (channel: string) => {
    const config = CHANNEL_CONFIG[channel as keyof typeof CHANNEL_CONFIG]
    if (!config) return null

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </span>
    )
  }

  const pendingItems = refillItems.filter(i => i.status === 'pending')
  const completedItems = refillItems.filter(i => i.status === 'completed')

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ArrowUpCircle className="h-7 w-7 text-green-600" />
            รายงานแจ้งเติมสต็อกช่องทาง
          </h1>
          <p className="text-gray-600 mt-1">สินค้าที่เข้าสต็อกใหม่และต้องไปเพิ่มสต็อกในช่องทางขายต่างๆ</p>
        </div>
        <Button
          variant="secondary"
          onClick={checkStockRefills}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          ตรวจสอบใหม่
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-yellow-600">รอเติมสต็อก</p>
              <p className="text-2xl font-bold text-yellow-700">{pendingItems.length}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-green-600">เติมสต็อกแล้ว</p>
              <p className="text-2xl font-bold text-green-700">{completedItems.length}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Store className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-600">รายการทั้งหมด</p>
              <p className="text-2xl font-bold text-blue-700">{refillItems.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Items */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <h3 className="font-bold text-gray-900">รอการเติมสต็อก ({pendingItems.length})</h3>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">กำลังตรวจสอบ...</p>
          </div>
        ) : pendingItems.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
            <p className="text-gray-600">ไม่มีสินค้าที่ต้องเติมสต็อกช่องทาง</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingItems.map((item) => (
              <div key={item.id} className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        รอดำเนินการ
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(item.received_at).toLocaleDateString('th-TH')}
                      </span>
                    </div>
                    
                    <h4 className="font-medium text-gray-900">{item.product_name}</h4>
                    <p className="text-sm text-gray-600">{item.product_barcode}</p>
                    
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                      <span className="text-gray-600">
                        เข้าสต็อก: <strong className="text-green-600">+{item.added_quantity}</strong> {item.unit_of_measure}
                      </span>
                      <span className="text-gray-600">
                        คงเหลือ: <strong>{item.current_stock}</strong> {item.unit_of_measure}
                      </span>
                      {item.batch_number && (
                        <span className="text-gray-600">
                          Batch: {item.batch_number}
                        </span>
                      )}
                      {item.supplier && (
                        <span className="text-gray-600">
                          ซัพพลายเออร์: {item.supplier}
                        </span>
                      )}
                    </div>

                    {/* Channels to update */}
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 mb-2">ต้องไปเพิ่มสต็อกที่:</p>
                      <div className="flex flex-wrap gap-2">
                        {item.channels.map(channel => (
                          <div key={channel} className="flex items-center gap-1">
                            {getChannelBadge(channel)}
                            {item.channelUrls[channel] && (
                              <a
                                href={item.channelUrls[channel]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                                title="ไปที่หน้าสินค้า"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => markAsCompleted(item.id)}
                      className="flex items-center gap-1"
                    >
                      <CheckCircle className="h-4 w-4" />
                      เติมสต็อกแล้ว
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Completed Items */}
      {completedItems.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h3 className="font-bold text-gray-900">เติมสต็อกแล้ว ({completedItems.length})</h3>
          </div>
          
          <div className="space-y-2">
            {completedItems.map((item) => (
              <div key={item.id} className="p-4 border border-green-200 rounded-lg bg-green-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        เติมสต็อกแล้ว
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(item.received_at).toLocaleDateString('th-TH')}
                      </span>
                    </div>
                    
                    <h4 className="font-medium text-gray-900">{item.product_name}</h4>
                    <p className="text-sm text-gray-600">{item.product_barcode}</p>
                    
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                      <span className="text-gray-600">
                        เข้าสต็อก: +{item.added_quantity} {item.unit_of_measure}
                      </span>
                      <span className="text-gray-600">
                        คงเหลือ: {item.current_stock} {item.unit_of_measure}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.channels.map(channel => getChannelBadge(channel))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
