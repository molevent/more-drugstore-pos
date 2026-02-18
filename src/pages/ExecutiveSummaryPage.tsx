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
  UserPlus,
  LineChart as LineChartIcon
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'

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
  // Tax Summary
  inputVat: number
  outputVat: number
  vatBalance: number
  // Cash Flow
  cashIn: number
  cashOut: number
  cashFlowBalance: number
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
    newCustomersToday: 0,
    inputVat: 0,
    outputVat: 0,
    vatBalance: 0,
    cashIn: 0,
    cashOut: 0,
    cashFlowBalance: 0
  })
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  
  // 12-month chart data
  const [monthlyChartData, setMonthlyChartData] = useState<any[]>([])

  useEffect(() => {
    fetchSummaryData()
    // Real-time updates every 30 seconds
    const interval = setInterval(fetchSummaryData, 30 * 1000)
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

      // Fetch VAT data from orders (Output VAT - ภาษีขาย)
      const { data: ordersWithVat } = await supabase
        .from('orders')
        .select('vat_amount')
        .gte('created_at', firstDayOfMonth)

      // Fetch VAT data from expenses (Input VAT - ภาษีซื้อ)
      const { data: expensesWithVat } = await supabase
        .from('expenses')
        .select('vat_amount')
        .gte('expense_date', firstDayOfMonth)

      const todaySalesTotal = todayOrders?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0
      const monthSalesTotal = monthOrders?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0
      
      const todayCashTotal = todayOrders?.filter((o: any) => o.payment_method === 'cash').reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0
      const todayCreditTotal = todayOrders?.filter((o: any) => o.payment_method === 'credit_card').reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0
      const todayTransferTotal = todayOrders?.filter((o: any) => o.payment_method === 'transfer').reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0
      const todayEWalletTotal = todayOrders?.filter((o: any) => ['grab_wallet', 'shopee_wallet', 'lineman_wallet'].includes(o.payment_method)).reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0

      const lowStockCount = products?.filter((p: any) => p.quantity <= p.reorder_point).length || 0

      // Calculate VAT
      const outputVatTotal = ordersWithVat?.reduce((sum: number, o: any) => sum + (o.vat_amount || 0), 0) || 0
      const inputVatTotal = expensesWithVat?.reduce((sum: number, e: any) => sum + (e.vat_amount || 0), 0) || 0
      const vatDiff = outputVatTotal - inputVatTotal

      // Calculate Cash Flow (monthly)
      const cashInTotal = monthSalesTotal
      const cashOutTotal = monthExpensesData?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0
      const cashFlowDiff = cashInTotal - cashOutTotal

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
        newCustomersToday: newCustomers?.length || 0,
        inputVat: inputVatTotal,
        outputVat: outputVatTotal,
        vatBalance: vatDiff,
        cashIn: cashInTotal,
        cashOut: cashOutTotal,
        cashFlowBalance: cashFlowDiff
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

  // Fetch 12 months of data for chart
  const fetchMonthlyChartData = async () => {
    try {
      const months = []
      const now = new Date()
      
      // Generate last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthStart = d.toISOString().split('T')[0]
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
        const monthName = d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })
        
        // Fetch orders for this month
        const { data: monthOrders } = await supabase
          .from('orders')
          .select('total_amount, cost_price, vat_amount')
          .gte('created_at', monthStart)
          .lte('created_at', monthEnd + 'T23:59:59')
        
        // Fetch expenses for this month
        const { data: monthExpenses } = await supabase
          .from('expenses')
          .select('amount, vat_amount')
          .gte('expense_date', monthStart)
          .lte('expense_date', monthEnd)
        
        const sales = monthOrders?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0
        const costs = monthOrders?.reduce((sum: number, o: any) => sum + ((o.cost_price || 0) * (o.quantity || 1)), 0) || 0
        const expenses = monthExpenses?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0
        const profit = sales - costs - expenses
        const cashIn = sales
        const cashOut = expenses
        
        months.push({
          month: monthName,
          sales,
          cashIn,
          cashOut,
          profit
        })
      }
      
      setMonthlyChartData(months)
    } catch (error) {
      console.error('Error fetching monthly chart data:', error)
    }
  }

  // Fetch chart data on mount
  useEffect(() => {
    fetchMonthlyChartData()
  }, [])

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
                รายงานสรุปสำหรับผู้บริหาร - อัปเดต Real-time ทุก 30 วินาที | ล่าสุด: {lastUpdated.toLocaleTimeString('th-TH')}
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

        {/* 12-Month Comparison Chart */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <LineChartIcon className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-800">กราฟเปรียบเทียบ 12 เดือน</h2>
          </div>
          <Card className="p-4">
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    name="ยอดขาย" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cashIn" 
                    name="กระแสเงินสดบวก (เงินเข้า)" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cashOut" 
                    name="กระแสเงินสดลบ (เงินออก)" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    name="กำไร/ขาดทุน" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
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

        {/* Tax Summary - VAT */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-800">สรุปภาษีมูลค่าเพิ่ม (VAT) เดือนนี้</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-green-500">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-green-100">
                      <Receipt className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">ภาษีซื้อ (Input VAT)</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summaryData.inputVat)}</p>
                  <p className="text-xs text-gray-500 mt-1">จากค่าใช้จ่าย/ซื้อสินค้า</p>
                </div>
              </div>
            </Card>
            <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-blue-500">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Receipt className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">ภาษีขาย (Output VAT)</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summaryData.outputVat)}</p>
                  <p className="text-xs text-gray-500 mt-1">จากยอดขาย</p>
                </div>
              </div>
            </Card>
            <Card className={`hover:shadow-lg transition-all cursor-pointer border-l-4 ${summaryData.vatBalance >= 0 ? 'border-l-red-500' : 'border-l-green-500'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-2 rounded-lg ${summaryData.vatBalance >= 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                      <DollarSign className={`h-5 w-5 ${summaryData.vatBalance >= 0 ? 'text-red-600' : 'text-green-600'}`} />
                    </div>
                    <p className="text-sm font-medium text-gray-600">ส่วนต่างภาษีซื้อ-ขาย</p>
                  </div>
                  <p className={`text-2xl font-bold ${summaryData.vatBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {summaryData.vatBalance >= 0 ? '+' : ''}{formatCurrency(summaryData.vatBalance)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {summaryData.vatBalance >= 0 ? 'ต้องนำส่งกรมสรรพากร' : 'ได้รับคืน/เคลม'}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Cash Flow Summary */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-semibold text-gray-800">กระแสเงินสด (Cash Flow) เดือนนี้</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-green-500">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-green-100">
                      <ArrowUpRight className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">เงินเข้า</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summaryData.cashIn)}</p>
                  <p className="text-xs text-gray-500 mt-1">ยอดขายรวมเดือนนี้</p>
                </div>
              </div>
            </Card>
            <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-red-500">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-red-100">
                      <ArrowUpRight className="h-5 w-5 text-red-600 rotate-180" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">เงินออก</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summaryData.cashOut)}</p>
                  <p className="text-xs text-gray-500 mt-1">ค่าใช้จ่ายเดือนนี้</p>
                </div>
              </div>
            </Card>
            <Card className={`hover:shadow-lg transition-all cursor-pointer border-l-4 ${summaryData.cashFlowBalance >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-2 rounded-lg ${summaryData.cashFlowBalance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                      <DollarSign className={`h-5 w-5 ${summaryData.cashFlowBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <p className="text-sm font-medium text-gray-600">ส่วนต่างเงินเข้า-ออก</p>
                  </div>
                  <p className={`text-2xl font-bold ${summaryData.cashFlowBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {summaryData.cashFlowBalance >= 0 ? '+' : ''}{formatCurrency(summaryData.cashFlowBalance)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {summaryData.cashFlowBalance >= 0 ? 'กระแสเงินสดบวก' : 'กระแสเงินสดลบ'}
                  </p>
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
