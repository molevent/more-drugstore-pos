import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { TrendingUp, Calendar, DollarSign, Package, BarChart3, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react'

interface SalesReportItem {
  product_id: string
  product_name: string
  product_barcode: string
  total_quantity: number
  total_revenue: number
  total_cost: number
  profit: number
  profit_margin: number
  avg_turnover_days?: number
}

interface PeriodSummary {
  total_revenue: number
  total_cost: number
  total_profit: number
  total_transactions: number
  total_items_sold: number
}

type ReportPeriod = 'today' | 'week' | 'month' | 'year'
type TopLimit = 50 | 100
type SortBy = 'revenue' | 'quantity' | 'profit' | 'turnover'

export default function SalesReportPage() {
  const [period, setPeriod] = useState<ReportPeriod>('today')
  const [topLimit, setTopLimit] = useState<TopLimit>(50)
  const [sortBy, setSortBy] = useState<SortBy>('revenue')
  const [reportData, setReportData] = useState<SalesReportItem[]>([])
  const [summary, setSummary] = useState<PeriodSummary | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchSalesReport()
  }, [period, topLimit, sortBy])

  const getDateRange = (selectedPeriod: ReportPeriod): { start: string; end: string } => {
    const now = new Date()
    const end = now.toISOString().split('T')[0]
    let start = end

    switch (selectedPeriod) {
      case 'today':
        start = end
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        start = weekAgo.toISOString().split('T')[0]
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        start = monthAgo.toISOString().split('T')[0]
        break
      case 'year':
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        start = yearAgo.toISOString().split('T')[0]
        break
    }

    return { start, end }
  }

  const fetchSalesReport = async () => {
    setLoading(true)
    try {
      const { start, end } = getDateRange(period)

      // Get order items with product info
      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select(`
          quantity,
          unit_price,
          cost_price,
          products:product_id (id, name_th, barcode, cost_price)
        `)
        .gte('created_at', start)
        .lte('created_at', end + 'T23:59:59')

      if (error) throw error

      // Aggregate by product
      const productMap = new Map<string, SalesReportItem>()
      let totalRevenue = 0
      let totalCost = 0
      let totalTransactions = 0

      orderItems?.forEach((item: any) => {
        const productId = item.products?.id
        if (!productId) return

        const productCost = item.cost_price || item.products?.cost_price || 0
        const revenue = (item.unit_price || 0) * (item.quantity || 0)
        const cost = productCost * (item.quantity || 0)

        totalRevenue += revenue
        totalCost += cost
        totalTransactions++

        if (productMap.has(productId)) {
          const existing = productMap.get(productId)!
          existing.total_quantity += item.quantity || 0
          existing.total_revenue += revenue
          existing.total_cost += cost
          existing.profit = existing.total_revenue - existing.total_cost
          existing.profit_margin = existing.total_revenue > 0 
            ? (existing.profit / existing.total_revenue) * 100 
            : 0
        } else {
          const profit = revenue - cost
          productMap.set(productId, {
            product_id: productId,
            product_name: item.products?.name_th || 'Unknown',
            product_barcode: item.products?.barcode || '',
            total_quantity: item.quantity || 0,
            total_revenue: revenue,
            total_cost: cost,
            profit: profit,
            profit_margin: revenue > 0 ? (profit / revenue) * 100 : 0
          })
        }
      })

      let sortedData = Array.from(productMap.values())

      // Sort based on selected criteria
      sortedData.sort((a, b) => {
        switch (sortBy) {
          case 'revenue':
            return b.total_revenue - a.total_revenue
          case 'quantity':
            return b.total_quantity - a.total_quantity
          case 'profit':
            return b.profit - a.profit
          default:
            return b.total_revenue - a.total_revenue
        }
      })

      // Take top N
      sortedData = sortedData.slice(0, topLimit)

      setReportData(sortedData)
      setSummary({
        total_revenue: totalRevenue,
        total_cost: totalCost,
        total_profit: totalRevenue - totalCost,
        total_transactions: totalTransactions,
        total_items_sold: orderItems?.length || 0
      })
    } catch (error) {
      console.error('Error fetching sales report:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPeriodLabel = (p: ReportPeriod): string => {
    const labels: Record<ReportPeriod, string> = {
      today: 'วันนี้',
      week: 'สัปดาห์นี้',
      month: 'เดือนนี้',
      year: 'ปีนี้'
    }
    return labels[p]
  }

  const exportToCSV = () => {
    if (reportData.length === 0) return

    const headers = 'อันดับ,บาร์โค้ด,ชื่อสินค้า,จำนวนขาย,รายได้,ต้นทุน,กำไร,%กำไร'
    const rows = reportData.map((item, idx) => 
      `${idx + 1},${item.product_barcode},"${item.product_name}",${item.total_quantity},${item.total_revenue.toFixed(2)},${item.total_cost.toFixed(2)},${item.profit.toFixed(2)},${item.profit_margin.toFixed(2)}`
    ).join('\n')
    
    const csv = `${headers}\n${rows}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `sales_report_${period}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-green-600" />
            รายงานยอดขาย
          </h1>
          <p className="text-gray-600 mt-1">สินค้าขายดี เรียงตามยอดขายหรือจำนวน</p>
        </div>
        <Button
          variant="secondary"
          onClick={exportToCSV}
          disabled={reportData.length === 0}
        >
          <BarChart3 className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">ช่วงเวลา:</span>
            <div className="flex gap-1">
              {(['today', 'week', 'month', 'year'] as ReportPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    period === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {getPeriodLabel(p)}
                </button>
              ))}
            </div>
          </div>

          <div className="h-6 w-px bg-gray-300" />

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">แสดง:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setTopLimit(50)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  topLimit === 50
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Top 50
              </button>
              <button
                onClick={() => setTopLimit(100)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  topLimit === 100
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Top 100
              </button>
            </div>
          </div>

          <div className="h-6 w-px bg-gray-300" />

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">เรียงตาม:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="revenue">มูลค่าสูงสุด</option>
              <option value="quantity">จำนวนชิ้นสูงสุด</option>
              <option value="profit">กำไรสูงสุด</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <Card className="bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-600">รายได้รวม</p>
                <p className="text-2xl font-bold text-green-700">
                  ฿{summary.total_revenue.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-600">จำนวนรายการ</p>
                <p className="text-2xl font-bold text-blue-700">{summary.total_transactions}</p>
              </div>
            </div>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-purple-600">กำไรรวม</p>
                <p className="text-2xl font-bold text-purple-700">
                  ฿{summary.total_profit.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-orange-600">% กำไร</p>
                <p className="text-2xl font-bold text-orange-700">
                  {summary.total_revenue > 0 
                    ? ((summary.total_profit / summary.total_revenue) * 100).toFixed(1) 
                    : 0}%
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Report Table */}
      <Card>
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">กำลังโหลด...</p>
          </div>
        ) : reportData.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">ไม่พบข้อมูลการขายในช่วง {getPeriodLabel(period)}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 w-16">อันดับ</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">สินค้า</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">จำนวนขาย</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">รายได้</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">ต้นทุน</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">กำไร</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">% กำไร</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reportData.map((item, index) => {
                  const rank = index + 1
                  const isTop3 = rank <= 3
                  return (
                    <tr key={item.product_id} className={isTop3 ? 'bg-yellow-50' : ''}>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                          rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                          rank === 2 ? 'bg-gray-300 text-gray-700' :
                          rank === 3 ? 'bg-orange-300 text-orange-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {rank}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{item.product_name}</p>
                          <p className="text-sm text-gray-500">{item.product_barcode}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-medium text-blue-600">{item.total_quantity}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-medium text-gray-900">
                          ฿{item.total_revenue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-gray-600">
                          ฿{item.total_cost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.profit >= 0 ? '+' : ''}
                          ฿{item.profit.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.profit_margin >= 20 ? 'bg-green-100 text-green-800' :
                          item.profit_margin >= 10 ? 'bg-blue-100 text-blue-800' :
                          item.profit_margin >= 0 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.profit_margin >= 0 ? (
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3 mr-1" />
                          )}
                          {item.profit_margin.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
