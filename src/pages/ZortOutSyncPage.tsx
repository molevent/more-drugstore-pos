import { useState, useEffect } from 'react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { RefreshCw, Package, ShoppingCart, FileText, Check, AlertCircle, Loader2, Download, Clock, Search, Bell } from 'lucide-react'
import { zortOutService, ZortOutOrder } from '../services/zortout'
import { supabase } from '../services/supabase'

interface SyncStatus {
  products: 'idle' | 'syncing' | 'success' | 'error'
  orders: 'idle' | 'syncing' | 'success' | 'error'
  documents: 'idle' | 'syncing' | 'success' | 'error'
  pullOrders: 'idle' | 'syncing' | 'success' | 'error'
  polling: 'idle' | 'running' | 'error'
}

interface SyncResult {
  imported: number
  updated: number
  errors: number
}

export default function ZortOutSyncPage() {
  const [status, setStatus] = useState<SyncStatus>({
    products: 'idle',
    orders: 'idle',
    documents: 'idle',
    pullOrders: 'idle',
    polling: 'idle'
  })
  const [results, setResults] = useState<{
    products?: SyncResult
    orders?: SyncResult
    documents?: number
  }>({})
  const [orderNumber, setOrderNumber] = useState('')
  const [pulledOrders, setPulledOrders] = useState<ZortOutOrder[]>([])
  const [isPolling, setIsPolling] = useState(false)
  const [pollInterval, setPollInterval] = useState<number | null>(null)
  const [pollMinutes, setPollMinutes] = useState(5)
  const [newOrdersAlert, setNewOrdersAlert] = useState<string[]>([])
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [salesChannel, setSalesChannel] = useState('')

  const salesChannels = [
    { value: '', label: 'ทั้งหมด' },
    { value: 'POS', label: 'POS' },
    { value: 'Online', label: 'Online' },
    { value: 'Lazada', label: 'Lazada' },
    { value: 'Shopee', label: 'Shopee' },
    { value: 'Facebook', label: 'Facebook' },
    { value: 'TikTok', label: 'TikTok' },
    { value: 'Line', label: 'Line' },
    { value: 'Website', label: 'Website' },
  ]

  // Pull specific order from ZortOut
  const pullOrderByNumber = async () => {
    if (!orderNumber.trim()) {
      alert('กรุณาระบุเลขออเดอร์')
      return
    }
    
    setStatus(prev => ({ ...prev, pullOrders: 'syncing' }))
    
    try {
      const order = await zortOutService.getOrderByNumber(orderNumber.trim())
      
      if (!order) {
        alert('ไม่พบออเดอร์นี้ใน ZortOut')
        setStatus(prev => ({ ...prev, pullOrders: 'error' }))
        return
      }
      
      // Import order to POS
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('zortout_order_id', order.id)
        .single()
      
      const orderData = {
        zortout_order_id: order.id,
        order_number: order.ordernumber,
        customer_name: order.customername,
        customer_phone: order.customerphone,
        total: order.total,
        status: order.status,
        source: 'zortout',
        created_at: order.createddatetime,
        updated_at: new Date().toISOString()
      }
      
      if (existing) {
        await supabase.from('orders').update(orderData).eq('id', existing.id)
      } else {
        await supabase.from('orders').insert(orderData)
      }
      
      setPulledOrders([order])
      setStatus(prev => ({ ...prev, pullOrders: 'success' }))
      alert(`ดึงออเดอร์ ${order.ordernumber} สำเร็จ`)
    } catch (error) {
      console.error('Error pulling order:', error)
      setStatus(prev => ({ ...prev, pullOrders: 'error' }))
      alert('เกิดข้อผิดพลาดในการดึงออเดอร์')
    }
  }
  
  // Pull orders by date range
  const pullOrdersByDateRange = async (days: number, channel: string = salesChannel) => {
    setStatus(prev => ({ ...prev, pullOrders: 'syncing' }))
    
    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const orders = await zortOutService.getOrdersByDateRange(startDate, endDate, channel || undefined)
      
      let imported = 0
      let updated = 0
      
      for (const order of orders) {
        const { data: existing } = await supabase
          .from('orders')
          .select('id')
          .eq('zortout_order_id', order.id)
          .single()
        
        const orderData = {
          zortout_order_id: order.id,
          order_number: order.ordernumber,
          customer_name: order.customername,
          customer_phone: order.customerphone,
          total: order.total,
          status: order.status,
          sales_channel: order.saleschannel,
          source: 'zortout',
          created_at: order.createddatetime,
          updated_at: new Date().toISOString()
        }
        
        if (existing) {
          await supabase.from('orders').update(orderData).eq('id', existing.id)
          updated++
        } else {
          await supabase.from('orders').insert(orderData)
          imported++
        }
      }
      
      setPulledOrders(orders)
      setStatus(prev => ({ ...prev, pullOrders: 'success' }))
      const channelText = channel ? ` (ช่องทาง: ${channel})` : ''
      alert(`ดึงออเดอร์สำเร็จ${channelText}: นำเข้า ${imported} รายการ, อัพเดต ${updated} รายการ`)
    } catch (error) {
      console.error('Error pulling orders:', error)
      setStatus(prev => ({ ...prev, pullOrders: 'error' }))
      alert('เกิดข้อผิดพลาดในการดึงออเดอร์')
    }
  }
  
  // Start polling for new orders
  const startPolling = (minutes: number) => {
    if (pollInterval) clearInterval(pollInterval)
    
    setIsPolling(true)
    setStatus(prev => ({ ...prev, polling: 'running' }))
    
    // Save settings
    localStorage.setItem('zortout_polling_enabled', 'true')
    localStorage.setItem('zortout_polling_minutes', minutes.toString())
    
    let lastCheck = new Date().toISOString()
    
    const interval = window.setInterval(async () => {
      try {
        const newOrders = await zortOutService.pollForNewOrders(lastCheck)
        
        if (newOrders.length > 0) {
          // Import new orders
          for (const order of newOrders) {
            const orderData = {
              zortout_order_id: order.id,
              order_number: order.ordernumber,
              customer_name: order.customername,
              customer_phone: order.customerphone,
              total: order.total,
              status: order.status,
              source: 'zortout',
              created_at: order.createddatetime,
              updated_at: new Date().toISOString()
            }
            await supabase.from('orders').insert(orderData)
          }
          
          // Show alert
          setNewOrdersAlert(newOrders.map(o => o.ordernumber))
          setTimeout(() => setNewOrdersAlert([]), 10000)
        }
        
        lastCheck = new Date().toISOString()
        localStorage.setItem('zortout_last_poll', lastCheck)
      } catch (error) {
        console.error('Polling error:', error)
        setStatus(prev => ({ ...prev, polling: 'error' }))
      }
    }, minutes * 60 * 1000)
    
    setPollInterval(interval)
  }
  
  // Stop polling
  const stopPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval)
      setPollInterval(null)
    }
    setIsPolling(false)
    setStatus(prev => ({ ...prev, polling: 'idle' }))
    localStorage.setItem('zortout_polling_enabled', 'false')
  }

  useEffect(() => {
    const saved = localStorage.getItem('zortout_last_sync')
    if (saved) setLastSync(saved)
    
    // Load polling settings
    const savedPolling = localStorage.getItem('zortout_polling_enabled')
    const savedInterval = localStorage.getItem('zortout_polling_minutes')
    if (savedPolling === 'true' && savedInterval) {
      setPollMinutes(parseInt(savedInterval))
      startPolling(parseInt(savedInterval))
    }
    
    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [])

  const syncProducts = async () => {
    setStatus(prev => ({ ...prev, products: 'syncing' }))
    const result: SyncResult = { imported: 0, updated: 0, errors: 0 }

    try {
      const zortProducts = await zortOutService.syncAllProducts()
      
      for (const zProduct of zortProducts) {
        try {
          // Check if product exists
          const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('sku', zProduct.sku)
            .single()

          const productData = {
            name_th: zProduct.name,
            name_en: zProduct.name,
            sku: zProduct.sku,
            barcode: zProduct.barcode || zProduct.sku,
            base_price: zProduct.price || 0,
            cost_price: zProduct.cost || 0,
            stock_quantity: zProduct.stockquantity || 0,
            min_stock_level: 10,
            unit: zProduct.unit || 'ชิ้น',
            category: zProduct.category,
            description: zProduct.description,
            is_active: zProduct.active ?? true
          }

          if (existing) {
            await supabase.from('products').update(productData).eq('id', existing.id)
            result.updated++
          } else {
            await supabase.from('products').insert(productData)
            result.imported++
          }
        } catch (err: any) {
          console.error('Error syncing product:', zProduct.sku, err)
          console.error('Error details:', err.message, err.details, err.hint)
          result.errors++
        }
      }

      setResults(prev => ({ ...prev, products: result }))
      setStatus(prev => ({ ...prev, products: 'success' }))
      updateLastSync()
    } catch (error) {
      console.error('Sync products error:', error)
      setStatus(prev => ({ ...prev, products: 'error' }))
    }
  }

  const syncOrders = async () => {
    setStatus(prev => ({ ...prev, orders: 'syncing' }))
    const result: SyncResult = { imported: 0, updated: 0, errors: 0 }

    try {
      // Get last 7 days orders
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const zortOrders = await zortOutService.syncAllOrders(startDate, endDate)
      
      for (const zOrder of zortOrders) {
        try {
          // Check if order exists
          const { data: existing } = await supabase
            .from('orders')
            .select('id')
            .eq('zortout_order_id', zOrder.id)
            .single()

          const orderData = {
            zortout_order_id: zOrder.id,
            order_number: zOrder.ordernumber,
            customer_name: zOrder.customername,
            customer_phone: zOrder.customerphone,
            total: zOrder.total,
            status: zOrder.status,
            source: 'zortout',
            created_at: zOrder.createddatetime
          }

          if (existing) {
            await supabase.from('orders').update(orderData).eq('id', existing.id)
            result.updated++
          } else {
            await supabase.from('orders').insert(orderData)
            result.imported++
          }
        } catch (err) {
          console.error('Error syncing order:', zOrder.id, err)
          result.errors++
        }
      }

      setResults(prev => ({ ...prev, orders: result }))
      setStatus(prev => ({ ...prev, orders: 'success' }))
      updateLastSync()
    } catch (error) {
      console.error('Sync orders error:', error)
      setStatus(prev => ({ ...prev, orders: 'error' }))
    }
  }

  const syncDocuments = async () => {
    setStatus(prev => ({ ...prev, documents: 'syncing' }))

    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const documents = await zortOutService.getDocuments(1, 200, undefined, startDate, endDate)
      
      setResults(prev => ({ ...prev, documents: documents.length }))
      setStatus(prev => ({ ...prev, documents: 'success' }))
      updateLastSync()
    } catch (error) {
      console.error('Sync documents error:', error)
      setStatus(prev => ({ ...prev, documents: 'error' }))
    }
  }

  const syncAll = async () => {
    await syncProducts()
    await syncOrders()
    await syncDocuments()
  }

  const updateLastSync = () => {
    const now = new Date().toISOString()
    localStorage.setItem('zortout_last_sync', now)
    setLastSync(now)
  }

  const getStatusIcon = (s: SyncStatus[keyof SyncStatus]) => {
    switch (s) {
      case 'success':
        return <Check className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'syncing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return null
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <RefreshCw className="h-7 w-7 text-purple-600" />
            ZortOut Sync
          </h1>
          <p className="text-gray-600 mt-1">เชื่อมต่อและซิงค์ข้อมูลกับ ZortOut</p>
        </div>
        <Button variant="primary" onClick={syncAll} disabled={Object.values(status).some(s => s === 'syncing')}>
          <RefreshCw className="h-5 w-5 mr-2" />
          ซิงค์ทั้งหมด
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Products Sync */}
        <Card className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">สินค้า</h3>
                <p className="text-sm text-gray-500">Sync Products</p>
              </div>
            </div>
            {getStatusIcon(status.products)}
          </div>
          
          {results.products && (
            <div className="space-y-1 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">นำเข้าใหม่:</span>
                <span className="font-medium text-green-600">+{results.products.imported}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">อัพเดต:</span>
                <span className="font-medium text-blue-600">{results.products.updated}</span>
              </div>
              {results.products.errors > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">ผิดพลาด:</span>
                  <span className="font-medium text-red-600">{results.products.errors}</span>
                </div>
              )}
            </div>
          )}
          
          <Button 
            variant="secondary" 
            className="w-full"
            onClick={syncProducts}
            disabled={status.products === 'syncing'}
          >
            {status.products === 'syncing' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                กำลังซิงค์...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                ซิงค์สินค้า
              </>
            )}
          </Button>
        </Card>

        {/* Orders Sync */}
        <Card className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">ออเดอร์</h3>
                <p className="text-sm text-gray-500">Sync Orders (7 วันล่าสุด)</p>
              </div>
            </div>
            {getStatusIcon(status.orders)}
          </div>
          
          {results.orders && (
            <div className="space-y-1 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">นำเข้าใหม่:</span>
                <span className="font-medium text-green-600">+{results.orders.imported}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">อัพเดต:</span>
                <span className="font-medium text-blue-600">{results.orders.updated}</span>
              </div>
              {results.orders.errors > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">ผิดพลาด:</span>
                  <span className="font-medium text-red-600">{results.orders.errors}</span>
                </div>
              )}
            </div>
          )}
          
          <Button 
            variant="secondary" 
            className="w-full"
            onClick={syncOrders}
            disabled={status.orders === 'syncing'}
          >
            {status.orders === 'syncing' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                กำลังซิงค์...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                ซิงค์ออเดอร์
              </>
            )}
          </Button>
        </Card>

        {/* Documents Sync */}
        <Card className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-lg">
                <FileText className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">เอกสาร</h3>
                <p className="text-sm text-gray-500">Sync Documents (7 วันล่าสุด)</p>
              </div>
            </div>
            {getStatusIcon(status.documents)}
          </div>
          
          {results.documents !== undefined && (
            <div className="space-y-1 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">พบเอกสาร:</span>
                <span className="font-medium text-blue-600">{results.documents} รายการ</span>
              </div>
            </div>
          )}
          
          <Button 
            variant="secondary" 
            className="w-full"
            onClick={syncDocuments}
            disabled={status.documents === 'syncing'}
          >
            {status.documents === 'syncing' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                กำลังซิงค์...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                ซิงค์เอกสาร
              </>
            )}
          </Button>
        </Card>
      </div>

      {/* Pull Orders from ZortOut */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Pull Specific Order */}
        <Card className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Download className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">ดึงออเดอร์เฉพาะ</h3>
                <p className="text-sm text-gray-500">Pull Specific Order</p>
              </div>
            </div>
            {getStatusIcon(status.pullOrders)}
          </div>
          
          <div className="space-y-3">
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="ระบุเลขออเดอร์ ZortOut..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            
            <select
              value={salesChannel}
              onChange={(e) => setSalesChannel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {salesChannels.map((ch) => (
                <option key={ch.value} value={ch.value}>
                  {ch.label}
                </option>
              ))}
            </select>
            
            <Button 
              variant="secondary" 
              className="w-full"
              onClick={pullOrderByNumber}
              disabled={status.pullOrders === 'syncing' || !orderNumber.trim()}
            >
              {status.pullOrders === 'syncing' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังดึง...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  ดึงออเดอร์
                </>
              )}
            </Button>
          </div>
          
          {pulledOrders.length > 0 && status.pullOrders === 'success' && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                ดึงออเดอร์สำเร็จ: {pulledOrders[0].ordernumber}
              </p>
              <p className="text-xs text-green-600">
                ลูกค้า: {pulledOrders[0].customername} | ยอด: ฿{pulledOrders[0].total}
                {pulledOrders[0].saleschannel && ` | ช่องทาง: ${pulledOrders[0].saleschannel}`}
              </p>
            </div>
          )}
        </Card>

        {/* Pull Orders by Date Range */}
        <Card className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-100 rounded-lg">
                <Clock className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">ดึงออเดอร์ย้อนหลัง</h3>
                <p className="text-sm text-gray-500">Pull by Date Range</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3 mb-3">
            <label className="text-sm text-gray-600">ช่องทางการขาย:</label>
            <select
              value={salesChannel}
              onChange={(e) => setSalesChannel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
            >
              {salesChannels.map((ch) => (
                <option key={ch.value} value={ch.value}>
                  {ch.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <Button 
              variant="secondary" 
              size="sm"
              className="w-full"
              onClick={() => pullOrdersByDateRange(1)}
              disabled={status.pullOrders === 'syncing'}
            >
              ดึงออเดอร์ 1 วันล่าสุด
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              className="w-full"
              onClick={() => pullOrdersByDateRange(7)}
              disabled={status.pullOrders === 'syncing'}
            >
              ดึงออเดอร์ 7 วันล่าสุด
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              className="w-full"
              onClick={() => pullOrdersByDateRange(30)}
              disabled={status.pullOrders === 'syncing'}
            >
              ดึงออเดอร์ 30 วันล่าสุด
            </Button>
          </div>
        </Card>
      </div>

      {/* Auto Polling Settings */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Bell className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">ตรวจสอบอัตโนมัติ (Polling)</h3>
              <p className="text-sm text-gray-500">Auto-check for new orders from ZortOut</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPolling && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                กำลังทำงาน
              </span>
            )}
            {getStatusIcon(status.polling)}
          </div>
        </div>
        
        {newOrdersAlert.length > 0 && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-800">
              <Bell className="h-4 w-4 inline mr-1" />
              พบออเดอร์ใหม่จาก ZortOut: {newOrdersAlert.join(', ')}
            </p>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ตรวจสอบทุก (นาที)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={pollMinutes}
              onChange={(e) => setPollMinutes(parseInt(e.target.value) || 5)}
              disabled={isPolling}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
            />
          </div>
          
          <div className="flex gap-2">
            {!isPolling ? (
              <Button 
                variant="primary"
                onClick={() => startPolling(pollMinutes)}
              >
                <Clock className="h-4 w-4 mr-2" />
                เริ่มตรวจสอบ
              </Button>
            ) : (
              <Button 
                variant="danger"
                onClick={stopPolling}
              >
                หยุดตรวจสอบ
              </Button>
            )}
          </div>
        </div>
        
        <p className="text-xs text-gray-500 mt-3">
          * ระบบจะตรวจสอบออเดอร์ใหม่จาก ZortOut ตามช่วงเวลาที่กำหนด และนำเข้าอัตโนมัติ
        </p>
      </Card>

      {/* Last Sync Info */}
      {lastSync && (
        <Card className="bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">ซิงค์ล่าสุด:</p>
              <p className="font-medium text-gray-900">
                {new Date(lastSync).toLocaleString('th-TH')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Store:</p>
              <p className="font-medium text-gray-900">moredrugstore</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
