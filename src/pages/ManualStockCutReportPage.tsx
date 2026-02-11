import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { AlertTriangle, ShoppingCart, ExternalLink, RefreshCw, Filter, Info, CheckCircle } from 'lucide-react'

// Channel conflict rules as specified by user
// 1. ขายหน้าร้าน(POS) + มี GRAB → ไปตัด GRAB
// 2. ขายหน้าร้าน(POS) + มี LineMan → ไปตัด LineMan  
// 3. ขายที่ GRAB + มี LineMan → ไปตัด LineMan
// 4. ขายที่ LineMan + มี GRAB → ไปตัด GRAB
// 5. ขายที่ LAZADA + มี GRAB → ไปตัด GRAB
// 6. ขายที่ LAZADA + มี LineMan → ไปตัด LineMan
// 7. ขายที่ LineShop + มี GRAB → ไปตัด GRAB
// 8. ขายที่ LineShop + มี LineMan → ไปตัด LineMan
// 9. ขายที่ Shopee + มี GRAB → ไปตัด GRAB
// 10. ขายที่ Shopee + มี LineMan → ไปตัด LineMan

interface ConflictItem {
  id: string
  product_id: string
  product_name: string
  product_barcode: string
  sold_channel: string
  conflict_channel: string
  order_id: string
  order_number: string
  quantity: number
  sold_at: string
  status: 'pending' | 'resolved'
  product_url?: string
}

const CHANNEL_RULES: Record<string, string[]> = {
  'pos': ['grab', 'lineman'],
  'grab': ['lineman'],
  'lineman': ['grab'],
  'lazada': ['grab', 'lineman'],
  'line_shopping': ['grab', 'lineman'],
  'shopee': ['grab', 'lineman']
}

const CHANNEL_LABELS: Record<string, string> = {
  'pos': 'หน้าร้าน (POS)',
  'grab': 'GRAB',
  'lineman': 'LineMan',
  'lazada': 'LAZADA',
  'shopee': 'Shopee',
  'line_shopping': 'Line Shopping'
}

export default function ManualStockCutReportPage() {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([])
  const [filteredConflicts, setFilteredConflicts] = useState<ConflictItem[]>([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved'>('pending')
  const [selectedChannel, setSelectedChannel] = useState<string>('all')
  
  // Date range filter
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })

  useEffect(() => {
    checkStockConflicts()
  }, [startDate, endDate])

  useEffect(() => {
    filterConflicts()
  }, [conflicts, filterStatus, selectedChannel])

  const checkStockConflicts = async () => {
    setLoading(true)
    try {
      // Get orders within date range with their items
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          sales_channel,
          status,
          created_at,
          order_items:order_items (
            product_id,
            quantity
          )
        `)
        .gte('created_at', `${startDate}T00:00:00.000Z`)
        .lte('created_at', `${endDate}T23:59:59.999Z`)
        .eq('status', 'completed')

      if (ordersError) throw ordersError

      // Get all products with their channel settings
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name_th, barcode, sell_on_grab, sell_on_lineman, sell_on_lazada, sell_on_shopee, sell_on_line_shopping, url_grab, url_lineman')

      if (productsError) throw productsError

      const productMap = new Map(products?.map(p => [p.id, p]) || [])
      const newConflicts: ConflictItem[] = []

      // Check each order for conflicts
      orders?.forEach((order: any) => {
        const soldChannel = order.sales_channel?.toLowerCase() || 'pos'
        const conflictChannels = CHANNEL_RULES[soldChannel] || []

        if (!conflictChannels || conflictChannels.length === 0) return

        order.order_items?.forEach((item: any) => {
          const product = productMap.get(item.product_id)
          if (!product) return

          // Check if product is sold on conflicting channels
          conflictChannels.forEach(channel => {
            const channelKey = `sell_on_${channel}` as keyof typeof product
            if (product[channelKey]) {
              // Found conflict - product sold at one channel but also available on another
              const conflict: ConflictItem = {
                id: `${order.id}-${item.product_id}-${channel}`,
                product_id: item.product_id,
                product_name: product.name_th,
                product_barcode: product.barcode,
                sold_channel: soldChannel,
                conflict_channel: channel,
                order_id: order.id,
                order_number: order.order_number,
                quantity: item.quantity,
                sold_at: order.created_at,
                status: 'pending',
                product_url: channel === 'grab' ? product.url_grab : 
                            channel === 'lineman' ? product.url_lineman : undefined
              }
              newConflicts.push(conflict)
            }
          })
        })
      })

      setConflicts(newConflicts)
    } catch (error) {
      console.error('Error checking stock conflicts:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterConflicts = () => {
    let filtered = conflicts

    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus)
    }

    if (selectedChannel !== 'all') {
      filtered = filtered.filter(c => c.conflict_channel === selectedChannel)
    }

    setFilteredConflicts(filtered)
  }

  const markAsResolved = (conflictId: string) => {
    setConflicts(prev => prev.map(c => 
      c.id === conflictId ? { ...c, status: 'resolved' } : c
    ))
  }

  const getConflictDescription = (item: ConflictItem): string => {
    const sold = CHANNEL_LABELS[item.sold_channel] || item.sold_channel
    const conflict = CHANNEL_LABELS[item.conflict_channel] || item.conflict_channel
    return `ขายที่ ${sold} → ต้องไปตัดสต็อกที่ ${conflict}`
  }

  const getRuleExplanation = (soldChannel: string, conflictChannel: string): string => {
    const explanations: Record<string, string> = {
      'pos-grab': 'กรณีสินค้าขายหน้าร้านแล้วมีขายบน GRAB ด้วย',
      'pos-lineman': 'กรณีสินค้าขายหน้าร้านแล้วมีขายบน LineMan ด้วย',
      'grab-lineman': 'กรณีสินค้าขายบน GRAB แล้วมีขายบน LineMan ด้วย',
      'lineman-grab': 'กรณีสินค้าขายบน LineMan แล้วมีขายบน GRAB ด้วย',
      'lazada-grab': 'กรณีสินค้าขายบน LAZADA แล้วมีขายบน GRAB ด้วย',
      'lazada-lineman': 'กรณีสินค้าขายบน LAZADA แล้วมีขายบน LineMan ด้วย',
      'line_shopping-grab': 'กรณีสินค้าขายบน Line Shopping แล้วมีขายบน GRAB ด้วย',
      'line_shopping-lineman': 'กรณีสินค้าขายบน Line Shopping แล้วมีขายบน LineMan ด้วย',
      'shopee-grab': 'กรณีสินค้าขายบน Shopee แล้วมีขายบน GRAB ด้วย',
      'shopee-lineman': 'กรณีสินค้าขายบน Shopee แล้วมีขายบน LineMan ด้วย'
    }
    return explanations[`${soldChannel}-${conflictChannel}`] || 'เงื่อนไขการตัดสต็อกข้ามช่องทาง'
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-7 w-7 text-orange-500" />
            รายงานสินค้าต้องตัดสต็อกแมนนวล
          </h1>
          <p className="text-gray-600 mt-1">สินค้าที่ขายที่ช่องทางหนึ่งแล้วต้องไปตัดสต็อกที่ช่องทางอื่น</p>
        </div>
        <Button
          variant="secondary"
          onClick={checkStockConflicts}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          ตรวจสอบใหม่
        </Button>
      </div>

      {/* Rules Summary */}
      <Card className="mb-6 bg-yellow-50 border-yellow-200">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800 mb-2">เงื่อนไขการตัดสต็อกข้ามช่องทาง</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>1. ขายหน้าร้าน (POS) + มี GRAB → ตัดสต็อก GRAB</li>
              <li>2. ขายหน้าร้าน (POS) + มี LineMan → ตัดสต็อก LineMan</li>
              <li>3. ขาย GRAB + มี LineMan → ตัดสต็อก LineMan</li>
              <li>4. ขาย LineMan + มี GRAB → ตัดสต็อก GRAB</li>
              <li>5. ขาย LAZADA + มี GRAB → ตัดสต็อก GRAB</li>
              <li>6. ขาย LAZADA + มี LineMan → ตัดสต็อก LineMan</li>
              <li>7. ขาย Line Shopping + มี GRAB → ตัดสต็อก GRAB</li>
              <li>8. ขาย Line Shopping + มี LineMan → ตัดสต็อก LineMan</li>
              <li>9. ขาย Shopee + มี GRAB → ตัดสต็อก GRAB</li>
              <li>10. ขาย Shopee + มี LineMan → ตัดสต็อก LineMan</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">วันที่:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="h-6 w-px bg-gray-300" />

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">สถานะ:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'pending'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                รอดำเนินการ
              </button>
              <button
                onClick={() => setFilterStatus('resolved')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'resolved'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ดำเนินการแล้ว
              </button>
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ทั้งหมด
              </button>
            </div>
          </div>

          <div className="h-6 w-px bg-gray-300" />

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">ต้องไปตัดที่:</span>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">ทั้งหมด</option>
              <option value="grab">GRAB</option>
              <option value="lineman">LineMan</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-red-600">รอดำเนินการ</p>
              <p className="text-2xl font-bold text-red-700">
                {conflicts.filter(c => c.status === 'pending').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-green-600">ดำเนินการแล้ว</p>
              <p className="text-2xl font-bold text-green-700">
                {conflicts.filter(c => c.status === 'resolved').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-600">ทั้งหมด</p>
              <p className="text-2xl font-bold text-blue-700">{conflicts.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Conflicts List */}
      <Card>
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">กำลังตรวจสอบ...</p>
          </div>
        ) : filteredConflicts.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
            <p className="text-gray-600">
              {filterStatus === 'pending' 
                ? 'ไม่มีสินค้าที่ต้องตัดสต็อกแมนนวล'
                : 'ไม่มีรายการในสถานะนี้'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConflicts.map((item) => (
              <div 
                key={item.id} 
                className={`p-4 border rounded-lg ${
                  item.status === 'resolved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        item.status === 'resolved' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.status === 'resolved' ? 'ดำเนินการแล้ว' : 'รอดำเนินการ'}
                      </span>
                      <span className="text-sm text-gray-500">
                        ออเดอร์: {item.order_number}
                      </span>
                    </div>
                    
                    <h4 className="font-medium text-gray-900 mt-2">{item.product_name}</h4>
                    <p className="text-sm text-gray-600">{item.product_barcode}</p>
                    
                    <div className="mt-2 p-2 bg-white rounded border">
                      <p className="text-sm font-medium text-orange-700">
                        {getConflictDescription(item)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {getRuleExplanation(item.sold_channel, item.conflict_channel)}
                      </p>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-2">
                      จำนวน: {item.quantity} ชิ้น | 
                      ขายเมื่อ: {new Date(item.sold_at).toLocaleDateString('th-TH')}
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    {item.product_url && (
                      <a
                        href={item.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <ExternalLink className="h-4 w-4" />
                        ไปที่สินค้า
                      </a>
                    )}
                    {item.status === 'pending' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => markAsResolved(item.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        ทำเครื่องหมายว่าตัดแล้ว
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
