import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  AlertTriangle,
  Receipt,
  Users,
  ShoppingCart,
  CreditCard,
  Wallet,
  Calendar,
  ArrowUpRight,
  BarChart3,
  PieChart,
  Activity,
  Store,
  UserPlus
} from 'lucide-react'

interface SummaryData {
  todaySales: number
  todayOrders: number
  todayItems: number
  monthSales: number
  monthOrders: number
  todayExpenses: number
  monthExpenses: number
  pendingExpenses: number
  totalProducts: number
  lowStock: number
  nearExpiry: number
  negativeStock: number
  todayCash: number
  todayCredit: number
  todayTransfer: number
  todayEWallet: number
  totalCustomers: number
  newCustomersToday: number
}

export default function ExecutiveSummaryPage() {
  const [summaryData, setSummaryData] = useState<SummaryData>({
    todaySales: 0,
    todayOrders: 0,
    todayItems: 0,
    monthSales: 0,
    monthOrders: 0,
    todayExpenses: 0,
    monthExpenses: 0,
    pendingExpenses: 0,
    totalProducts: 0,
    lowStock: 0,
    nearExpiry: 0,
    negativeStock: 0,
    todayCash: 0,
    todayCredit: 0,
    todayTransfer: 0,
    todayEWallet: 0,
    totalCustomers: 0,
    newCustomersToday: 0
  })
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    fetchSummaryData()
    const interval = setInterval(fetchSummaryData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchSummaryData = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

      const { data: todayOrders } = await supabase
        .from('orders')
        .select('total_amount, payment_method')
        .gte('created_at', today)
        .lte('created_at', today + 'T23:59:59')

      const { data: monthOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', firstDayOfMonth)

      const { data: todayExpensesData } = await supabase
        .from('expenses')
        .select('amount')
        .gte('expense_date', today)
        .lte('expense_date', today + 'T23:59:59')

      const { data: monthExpensesData } = await supabase
        .from('expenses')
        .select('amount')
        .gte('expense_date', firstDayOfMonth)

      const { data: pendingExpensesData } = await supabase
        .from('expenses')
        .select('amount')
        .eq('payment_status', 'pending')

      const { data: products } = await supabase
        .from('products')
        .select('quantity, reorder_point')
      
      const { data: nearExpiryProducts } = await supabase
        .from('products')
        .select('id')
        .lte('expiry_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
        .gte('expiry_date', today)

      const { data: negativeStockProducts } = await supabase
        .from('products')
        .select('id')
        .lt('quantity', 0)

      const { data: customers } = await supabase
        .from('contacts')
        .select('created_at')
        .eq('type', 'customer')

      const { data: newCustomers } = await supabase
        .from('contacts')
        .select('id')
        .eq('type', 'customer')
        .gte('created_at', today)

      const todaySalesTotal = todayOrders?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0
      const monthSalesTotal = monthOrders?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0
      
      const todayCashTotal = todayOrders?.filter((o: any) => o.payment_method === 'cash').reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0
      const todayCreditTotal = todayOrders?.filter((o: any) => o.payment_method === 'credit_card').reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0
      const todayTransferTotal = todayOrders?.filter((o: any) => o.payment_method === 'transfer').reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0
      const todayEWalletTotal = todayOrders?.filter((o: any) => ['grab_wallet', 'shopee_wallet', 'lineman_wallet'].includes(o.payment_method)).reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0

      const lowStockCount = products?.filter((p: any) => p.quantity <= p.reorder_point).length || 0

      setSummaryData({
        todaySales: todaySalesTotal,
        todayOrders: todayOrders?.length || 0,
        todayItems: 0,
        monthSales: monthSalesTotal,
        monthOrders: monthOrders?.length || 0,
        todayExpenses: todayExpensesData?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0,
        monthExpenses: monthExpensesData?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0,
        pendingExpenses: pendingExpensesData?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0,
        totalProducts: products?.length || 0,
        lowStock: lowStockCount,
        nearExpiry: nearExpiryProducts?.length || 0,
        negativeStock: negativeStockProducts?.length || 0,
        todayCash: todayCashTotal,
        todayCredit: todayCreditTotal,
        todayTransfer: todayTransferTotal,
        todayEWallet: todayEWalletTotal,
        totalCustomers: customers?.length || 0,
        newCustomersToday: newCustomers?.length || 0
      })
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching summary data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('th-TH').format(value)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-7 w-7 text-[#7D735F]" />
                สรุปภาพรวมธุรกิจ (Executive Summary)
              </h1>
              <p className="text-gray-600 mt-1 text-sm">
                รายงานสรุปสำหรับผู้บริหาร - อัปเดตล่าสุด: {lastUpdated.toLocaleTimeString('th-TH')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchSummaryData}
                disabled={loading}
                className="px-4 py-2 bg-[#7D735F] hover:bg-[#7D735F]/90 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Activity className="h-4 w-4" />
                {loading ? 'กำลังโหลด...' : 'รีเฟรชข้อมูล'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-8">
        {/* Today's Sales Summary */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-800">ยอดขายวันนี้</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-green-100">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">ยอดขายรวม</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summaryData.todaySales)}</p>
                </div>
              </div>
            </Card>
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Receipt className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">จำนวนออเดอร์</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(summaryData.todayOrders)}</p>
                  <p className="text-xs text-gray-500 mt-1">ออเดอร์วันนี้</p>
                </div>
              </div>
            </Card>
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-[#7D735F]/10">
                      <TrendingUp className="h-5 w-5 text-[#7D735F]" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">ยอดขายเดือนนี้</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summaryData.monthSales)}</p>
                </div>
              </div>
            </Card>
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <ShoppingCart className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">จำนวนออเดอร์เดือนนี้</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(summaryData.monthOrders)}</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Payment Methods */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">ช่องทางการชำระเงินวันนี้</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-emerald-100">
                      <Wallet className="h-5 w-5 text-emerald-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">เงินสด</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summaryData.todayCash)}</p>
                </div>
              </div>
            </Card>
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">บัตรเครดิต</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summaryData.todayCredit)}</p>
                </div>
              </div>
            </Card>
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-cyan-100">
                      <ArrowUpRight className="h-5 w-5 text-cyan-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">โอนเงิน</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summaryData.todayTransfer)}</p>
                </div>
              </div>
            </Card>
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Store className="h-5 w-5 text-orange-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">E-Wallet</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summaryData.todayEWallet)}</p>
                  <p className="text-xs text-gray-500 mt-1">Grab, Shopee, LINE</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Expenses */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-800">ค่าใช้จ่าย</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-red-100">
                      <DollarSign className="h-5 w-5 text-red-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">ค่าใช้จ่ายวันนี้</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summaryData.todayExpenses)}</p>
                </div>
              </div>
            </Card>
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <PieChart className="h-5 w-5 text-orange-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">ค่าใช้จ่ายเดือนนี้</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summaryData.monthExpenses)}</p>
                </div>
              </div>
            </Card>
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-yellow-100">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">ค่าใช้จ่ายค้างจ่าย</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summaryData.pendingExpenses)}</p>
                  <p className="text-xs text-gray-500 mt-1">รอการชำระ</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Inventory */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-5 w-5 text-[#A67B5B]" />
            <h2 className="text-lg font-semibold text-gray-800">สินค้าและสต็อก</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-[#A67B5B]/10">
                      <Package className="h-5 w-5 text-[#A67B5B]" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">จำนวนสินค้าทั้งหมด</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(summaryData.totalProducts)}</p>
                </div>
              </div>
            </Card>
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-yellow-100">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">สินค้าใกล้หมด</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(summaryData.lowStock)}</p>
                  <p className="text-xs text-gray-500 mt-1">ต่ำกว่าจุดสั่งซื้อ</p>
                </div>
              </div>
            </Card>
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Calendar className="h-5 w-5 text-orange-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">สินค้าใกล้หมดอายุ</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(summaryData.nearExpiry)}</p>
                  <p className="text-xs text-gray-500 mt-1">หมดอายุใน 30 วัน</p>
                </div>
              </div>
            </Card>
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-red-100">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">สต็อกติดลบ</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(summaryData.negativeStock)}</p>
                  <p className="text-xs text-gray-500 mt-1">ต้องตรวจสอบด่วน</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Customers */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-800">ลูกค้า</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">ลูกค้าทั้งหมด</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(summaryData.totalCustomers)}</p>
                </div>
              </div>
            </Card>
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-pink-100">
                      <UserPlus className="h-5 w-5 text-pink-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">ลูกค้าใหม่วันนี้</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(summaryData.newCustomersToday)}</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Quick Links */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">เข้าถึงรายงานด่วน</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { title: 'รายงานยอดขาย', link: '/sales-report', icon: TrendingUp, color: 'bg-green-100 text-green-600' },
              { title: 'รายงานค่าใช้จ่าย', link: '/expenses', icon: PieChart, color: 'bg-red-100 text-red-600' },
              { title: 'รายงานสต็อก', link: '/inventory', icon: Package, color: 'bg-amber-100 text-amber-600' },
              { title: 'รายงานการเงิน', link: '/payment-summary', icon: DollarSign, color: 'bg-blue-100 text-blue-600' },
              { title: 'รายงานปิดร้าน', link: '/cashier-closing-report', icon: Wallet, color: 'bg-purple-100 text-purple-600' },
              { title: 'รายงานออเดอร์', link: '/sales-orders', icon: ShoppingCart, color: 'bg-pink-100 text-pink-600' },
            ].map((item) => (
              <a
                key={item.link}
                href={item.link}
                className="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200 hover:border-[#7D735F] hover:shadow-md transition-all"
              >
                <div className={`p-3 rounded-full ${item.color} mb-2`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-gray-700 text-center">{item.title}</span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
