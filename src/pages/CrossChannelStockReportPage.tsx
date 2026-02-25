import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import { ArrowLeft, CheckCircle, ExternalLink, RefreshCw, Download, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Product } from '../types/database'
import * as XLSX from 'xlsx'

interface CrossChannelAlert {
  id: string
  order_id?: string
  product_id: string
  product_name: string
  alert_type: string
  alert_title: string
  alert_message: string
  created_at: string
  acknowledged: boolean
}

interface PlatformTask {
  platformName: string
  platformField: string
  urlField: string
  color: string
  bgColor: string
  logo: string
  items: {
    alertId: string
    productId: string
    productName: string
    barcode: string
    sku: string
    quantityToDeduct: number
    currentStock: number
    newStock: number
    productUrl: string
    soldChannel: string
    soldAt: string
    acknowledged: boolean
  }[]
}

const PLATFORM_CONFIG: Record<string, { name: string, field: string, urlField: string, color: string, bgColor: string, logo: string }> = {
  'GRAB': { name: 'GRAB', field: 'sell_on_grab', urlField: 'url_grab', color: 'text-[#00B14F]', bgColor: 'bg-[#00B14F]', logo: '🚕' },
  'Lazada': { name: 'Lazada', field: 'sell_on_lazada', urlField: 'url_lazada', color: 'text-[#0F146D]', bgColor: 'bg-[#0F146D]', logo: '🛒' },
  'Shopee': { name: 'Shopee', field: 'sell_on_shopee', urlField: 'url_shopee', color: 'text-[#EE4D2D]', bgColor: 'bg-[#EE4D2D]', logo: '🧡' },
  'LINEMAN': { name: 'LINEMAN', field: 'sell_on_lineman', urlField: 'url_lineman', color: 'text-[#2DBE60]', bgColor: 'bg-[#2DBE60]', logo: '🏍️' },
  'LINE Shopping': { name: 'LINE Shopping', field: 'sell_on_line_shopping', urlField: 'url_line_shopping', color: 'text-[#06C755]', bgColor: 'bg-[#06C755]', logo: '💚' },
  'TikTok': { name: 'TikTok', field: 'sell_on_tiktok', urlField: 'url_tiktok', color: 'text-[#000000]', bgColor: 'bg-[#000000]', logo: '🎵' },
  'หน้าร้าน': { name: 'หน้าร้าน', field: 'sell_on_pos', urlField: 'url_pos', color: 'text-[#7D735F]', bgColor: 'bg-[#7D735F]', logo: '🏪' },
}

export default function CrossChannelStockReportPage() {
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState<CrossChannelAlert[]>([])
  const [products, setProducts] = useState<Map<string, Product>>(new Map())
  const [platformTasks, setPlatformTasks] = useState<PlatformTask[]>([])
  const [loading, setLoading] = useState(true)
  const [acknowledging, setAcknowledging] = useState<Set<string>>(new Set())
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [showAcknowledged, setShowAcknowledged] = useState(false)

  useEffect(() => {
    fetchData()
  }, [filterDate, showAcknowledged])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch cross-channel alerts
      let query = supabase
        .from('sale_alert_logs')
        .select('*')
        .eq('alert_type', 'cross_channel_stock')
        .gte('created_at', `${filterDate}T00:00:00`)
        .lte('created_at', `${filterDate}T23:59:59`)
        .order('created_at', { ascending: false })

      if (!showAcknowledged) {
        query = query.eq('acknowledged', false)
      }

      const { data: alertData, error: alertError } = await query

      if (alertError) {
        console.error('Error fetching alerts:', alertError)
        setLoading(false)
        return
      }

      const alertList = alertData || []
      setAlerts(alertList)

      // Fetch product details for all unique product IDs
      const productIds = [...new Set(alertList.map(a => a.product_id).filter(Boolean))]
      
      if (productIds.length > 0) {
        const productMap = new Map<string, Product>()
        // Fetch in batches of 50
        for (let i = 0; i < productIds.length; i += 50) {
          const batch = productIds.slice(i, i + 50)
          const { data: productData } = await supabase
            .from('products')
            .select('*')
            .in('id', batch)
          
          if (productData) {
            productData.forEach(p => productMap.set(p.id, p as Product))
          }
        }
        setProducts(productMap)

        // Process alerts into platform-grouped tasks
        processTasks(alertList, productMap)
      } else {
        setPlatformTasks([])
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const processTasks = (alertList: CrossChannelAlert[], productMap: Map<string, Product>) => {
    // Parse alert messages to extract platform names and quantities
    // Message format: "ขาย X ชิ้น ผ่านY → ต้องตัดสต็อกออกจาก A, B, C"
    const platformItems: Record<string, PlatformTask['items']> = {}

    for (const alert of alertList) {
      const product = productMap.get(alert.product_id)
      if (!product) continue

      // Parse quantity from message
      const qtyMatch = alert.alert_message?.match(/ขาย (\d+) ชิ้น/)
      const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1

      // Parse sold channel
      const channelMatch = alert.alert_message?.match(/ผ่าน(.+?)→/)
      const soldChannel = channelMatch ? channelMatch[1].trim() : ''

      // Parse target platforms
      const platformMatch = alert.alert_message?.match(/ออกจาก (.+)$/)
      const targetPlatforms = platformMatch ? platformMatch[1].split(',').map(s => s.trim()) : []

      for (const platformName of targetPlatforms) {
        const config = PLATFORM_CONFIG[platformName]
        if (!config) continue

        if (!platformItems[platformName]) {
          platformItems[platformName] = []
        }

        const productAny = product as any
        const currentStock = product.stock_quantity || 0
        const newStock = Math.max(0, currentStock - quantity)

        platformItems[platformName].push({
          alertId: alert.id,
          productId: product.id,
          productName: product.name_th,
          barcode: product.barcode || '',
          sku: product.sku || '',
          quantityToDeduct: quantity,
          currentStock,
          newStock,
          productUrl: productAny[config.urlField] || '',
          soldChannel,
          soldAt: alert.created_at,
          acknowledged: alert.acknowledged,
        })
      }
    }

    // Convert to PlatformTask array
    const tasks: PlatformTask[] = Object.entries(platformItems).map(([name, items]) => {
      const config = PLATFORM_CONFIG[name]
      return {
        platformName: name,
        platformField: config?.field || '',
        urlField: config?.urlField || '',
        color: config?.color || 'text-gray-600',
        bgColor: config?.bgColor || 'bg-gray-500',
        logo: config?.logo || '📦',
        items,
      }
    })

    // Sort: most items first
    tasks.sort((a, b) => b.items.length - a.items.length)
    setPlatformTasks(tasks)
  }

  const handleAcknowledge = async (alertId: string) => {
    setAcknowledging(prev => new Set([...prev, alertId]))
    try {
      const { error } = await supabase
        .from('sale_alert_logs')
        .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
        .eq('id', alertId)

      if (!error) {
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a))
        // Re-process tasks
        const updatedAlerts = alerts.map(a => a.id === alertId ? { ...a, acknowledged: true } : a)
        if (!showAcknowledged) {
          const filtered = updatedAlerts.filter(a => !a.acknowledged)
          processTasks(filtered, products)
        } else {
          processTasks(updatedAlerts, products)
        }
      }
    } catch (err) {
      console.error('Error acknowledging:', err)
    } finally {
      setAcknowledging(prev => {
        const next = new Set(prev)
        next.delete(alertId)
        return next
      })
    }
  }

  const handleAcknowledgeAll = async (platformName: string) => {
    const task = platformTasks.find(t => t.platformName === platformName)
    if (!task) return
    
    const unacknowledgedIds = task.items.filter(i => !i.acknowledged).map(i => i.alertId)
    if (unacknowledgedIds.length === 0) return

    if (!confirm(`ยืนยันว่าตัดสต็อก ${platformName} เสร็จแล้ว ${unacknowledgedIds.length} รายการ?`)) return

    for (const id of unacknowledgedIds) {
      setAcknowledging(prev => new Set([...prev, id]))
    }

    try {
      const { error } = await supabase
        .from('sale_alert_logs')
        .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
        .in('id', unacknowledgedIds)

      if (!error) {
        fetchData()
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleExport = () => {
    if (platformTasks.length === 0) return

    const wb = XLSX.utils.book_new()

    for (const task of platformTasks) {
      const wsData = [
        [`รายงานตัดสต็อก ${task.platformName} - ${filterDate}`],
        [],
        ['#', 'ชื่อสินค้า', 'Barcode', 'SKU', 'จำนวนที่ต้องตัด', 'สต็อกปัจจุบัน', 'สต็อกหลังตัด', 'ขายผ่าน', 'เวลา', 'ลิงก์สินค้า', 'สถานะ'],
        ...task.items.map((item, idx) => [
          idx + 1,
          item.productName,
          item.barcode,
          item.sku,
          item.quantityToDeduct,
          item.currentStock,
          item.newStock,
          item.soldChannel,
          new Date(item.soldAt).toLocaleString('th-TH'),
          item.productUrl || '-',
          item.acknowledged ? 'เสร็จแล้ว' : 'รอดำเนินการ'
        ])
      ]

      const ws = XLSX.utils.aoa_to_sheet(wsData)
      ws['!cols'] = [
        { wch: 5 }, { wch: 40 }, { wch: 18 }, { wch: 18 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        { wch: 18 }, { wch: 40 }, { wch: 12 }
      ]
      const sheetName = task.platformName.substring(0, 31)
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
    }

    XLSX.writeFile(wb, `ตัดสต็อกข้ามช่องทาง_${filterDate}.xlsx`)
  }

  const totalPending = platformTasks.reduce((sum, t) => sum + t.items.filter(i => !i.acknowledged).length, 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">รายงานตัดสต็อกข้ามช่องทาง</h1>
            <p className="text-sm text-gray-500">แจกแจงรายการสินค้าที่ต้องไปตัดสต็อกในแต่ละแพลตฟอร์ม</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={platformTasks.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className="h-4 w-4" />
            รีเฟรช
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">วันที่:</label>
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showAcknowledged}
              onChange={e => setShowAcknowledged(e.target.checked)}
              className="rounded border-gray-300"
            />
            แสดงรายการที่ดำเนินการแล้ว
          </label>
          <div className="flex-1" />
          {totalPending > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg border border-orange-200">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">รอดำเนินการ {totalPending} รายการ</span>
            </div>
          )}
        </div>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-gray-500">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
          กำลังโหลด...
        </div>
      )}

      {/* Empty state */}
      {!loading && platformTasks.length === 0 && (
        <Card>
          <div className="text-center py-12 text-gray-400">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-400" />
            <p className="text-lg font-medium text-gray-600">ไม่มีรายการที่ต้องตัดสต็อก</p>
            <p className="text-sm text-gray-400 mt-1">สำหรับวันที่ {new Date(filterDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </Card>
      )}

      {/* Platform Sections */}
      {!loading && platformTasks.map(task => {
        const pendingCount = task.items.filter(i => !i.acknowledged).length
        const doneCount = task.items.filter(i => i.acknowledged).length

        return (
          <Card key={task.platformName}>
            {/* Platform Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={`text-3xl`}>{task.logo}</span>
                <div>
                  <h2 className={`text-xl font-bold ${task.color}`}>{task.platformName}</h2>
                  <p className="text-sm text-gray-500">
                    {pendingCount > 0 && <span className="text-orange-600 font-medium">รอดำเนินการ {pendingCount} รายการ</span>}
                    {pendingCount > 0 && doneCount > 0 && ' · '}
                    {doneCount > 0 && <span className="text-green-600">เสร็จแล้ว {doneCount} รายการ</span>}
                  </p>
                </div>
              </div>
              {pendingCount > 0 && (
                <button
                  onClick={() => handleAcknowledgeAll(task.platformName)}
                  className={`flex items-center gap-2 px-4 py-2 ${task.bgColor} text-white rounded-lg hover:opacity-90 text-sm font-medium`}
                >
                  <CheckCircle className="h-4 w-4" />
                  ตัดสต็อกเสร็จทั้งหมด
                </button>
              )}
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-3 font-medium text-gray-600 w-10">#</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">สินค้า</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Barcode</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600">ตัดออก</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600">สต็อกปัจจุบัน</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600">สต็อกใหม่</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">ขายผ่าน</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">เวลา</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600">ลิงก์</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {task.items.map((item, idx) => (
                    <tr key={`${item.alertId}-${idx}`} className={`border-b hover:bg-gray-50 ${item.acknowledged ? 'opacity-50 bg-green-50/30' : ''}`}>
                      <td className="py-2.5 px-3 text-gray-400">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-gray-900">{item.productName}</div>
                        {item.sku && <div className="text-xs text-gray-400">SKU: {item.sku}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 font-mono text-xs">{item.barcode || '-'}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-bold text-sm">
                          -{item.quantityToDeduct}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-gray-600">{item.currentStock}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`font-bold ${item.newStock <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {item.newStock}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">{item.soldChannel}</td>
                      <td className="py-2.5 px-3 text-gray-500 text-xs">
                        {new Date(item.soldAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {item.productUrl ? (
                          <a
                            href={item.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${task.bgColor} text-white hover:opacity-80`}
                          >
                            <ExternalLink className="h-3 w-3" />
                            เปิด
                          </a>
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {item.acknowledged ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                            <CheckCircle className="h-4 w-4" />
                            เสร็จ
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAcknowledge(item.alertId)}
                            disabled={acknowledging.has(item.alertId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 text-xs font-medium disabled:opacity-50"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            {acknowledging.has(item.alertId) ? '...' : 'เสร็จ'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
