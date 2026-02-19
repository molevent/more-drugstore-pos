import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useLanguage } from '../contexts/LanguageContext'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import { TrendingUp, Package, AlertTriangle, DollarSign, Home, Calendar, ShoppingCart } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    todaySales: 0,
    salesCount: 0,
    totalProducts: 0,
    lowStock: 0,
  })
  const [paymentStats, setPaymentStats] = useState({
    cash: 0,
    credit: 0,
    transfer: 0,
    promptpay: 0,
  })
  const [recentOrders, setRecentOrders] = useState<any[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      
      // Fetch today's sales
      const { data: todayOrders, error: ordersError } = await supabase
        .from('orders')
        .select('total, payment_method')
        .gte('created_at', today)
        .eq('is_cancelled', false)
      
      if (!ordersError && todayOrders) {
        const totalSales = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0)
        const paymentBreakdown = { cash: 0, credit: 0, transfer: 0, promptpay: 0 }
        
        todayOrders.forEach(order => {
          if (order.payment_method === 'cash') paymentBreakdown.cash += order.total
          else if (order.payment_method === 'credit_card') paymentBreakdown.credit += order.total
          else if (order.payment_method === 'transfer') paymentBreakdown.transfer += order.total
          else if (order.payment_method === 'promptpay') paymentBreakdown.promptpay += order.total
        })
        
        setStats(prev => ({
          ...prev,
          todaySales: totalSales,
          salesCount: todayOrders.length,
        }))
        setPaymentStats(paymentBreakdown)
      }

      // Fetch total products
      const { count: productCount, error: productError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
      
      if (!productError) {
        setStats(prev => ({ ...prev, totalProducts: productCount || 0 }))
      }

      // Fetch low stock products
      const { count: lowStockCount, error: stockError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lt('stock_quantity', 10)
        .eq('is_active', true)
      
      if (!stockError) {
        setStats(prev => ({ ...prev, lowStock: lowStockCount || 0 }))
      }

      // Fetch recent orders
      const { data: recentOrdersData, error: recentError } = await supabase
        .from('orders')
        .select('order_number, total, created_at, customer_name')
        .eq('is_cancelled', false)
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (!recentError && recentOrdersData) {
        setRecentOrders(recentOrdersData)
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return '฿' + amount.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  const statCards = [
    {
      name: t('dashboard.todaySales'),
      value: formatCurrency(stats.todaySales),
      icon: DollarSign,
      color: 'text-[#7D735F]',
      bgColor: 'bg-[#F5E6C8]',
    },
    {
      name: t('dashboard.salesCount'),
      value: stats.salesCount.toString(),
      icon: TrendingUp,
      color: 'text-[#2E5266]',
      bgColor: 'bg-[#B8D4E3]',
    },
    {
      name: t('dashboard.totalProducts'),
      value: stats.totalProducts.toString(),
      icon: Package,
      color: 'text-[#5C4A32]',
      bgColor: 'bg-[#C5D5C8]',
    },
    {
      name: t('dashboard.lowStock'),
      value: stats.lowStock.toString(),
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ]

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Home className="h-7 w-7 text-[#7D735F]" />
            {t('dashboard.title')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('dashboard.welcome')}, {user?.full_name} ({user?.role})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.name} className="border-[#E8E0D5]">
            <div className="flex items-center">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-[#8B7355]">{stat.name}</p>
                <p className="text-2xl font-bold text-[#5C4A32]">{loading ? '-' : stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="สรุปยอดขายวันนี้" className="border-[#E8E0D5]">
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-[#8B7355]">ยอดขายรวม</span>
              <span className="font-bold text-[#5C4A32]">{loading ? '-' : formatCurrency(stats.todaySales)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8B7355]">จำนวนรายการ</span>
              <span className="font-bold text-[#5C4A32]">{loading ? '-' : stats.salesCount}</span>
            </div>
          </div>
        </Card>

        <Card title="ช่องทางการชำระเงิน" className="border-[#E8E0D5]">
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-[#8B7355]">เงินสด</span>
              <span className="font-bold text-[#5C4A32]">{loading ? '-' : formatCurrency(paymentStats.cash)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8B7355]">บัตรเครดิต</span>
              <span className="font-bold text-[#5C4A32]">{loading ? '-' : formatCurrency(paymentStats.credit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8B7355]">โอนเงิน</span>
              <span className="font-bold text-[#5C4A32]">{loading ? '-' : formatCurrency(paymentStats.transfer)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8B7355]">พร้อมเพย์</span>
              <span className="font-bold text-[#5C4A32]">{loading ? '-' : formatCurrency(paymentStats.promptpay)}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card title="ประวัติการขายล่าสุด" className="border-[#E8E0D5]">
        {loading ? (
          <div className="text-center py-8 text-[#8B7355]">กำลังโหลด...</div>
        ) : recentOrders.length === 0 ? (
          <div className="text-center py-12 text-[#8B7355]">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-[#C5D5C8]" />
            <p>ยังไม่มีข้อมูลการขาย</p>
            <p className="text-sm mt-2">เริ่มขายสินค้าเพื่อดูรายงาน</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E8E0D5]">
            {recentOrders.map((order) => (
              <div key={order.order_number} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#C5C9E8] rounded-lg">
                    <ShoppingCart className="h-4 w-4 text-[#4A5568]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#5C4A32]">{order.order_number}</p>
                    <p className="text-xs text-[#8B7355]">{order.customer_name || 'ลูกค้าทั่วไป'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#5C4A32]">{formatCurrency(order.total)}</p>
                  <p className="text-xs text-[#8B7355]">{new Date(order.created_at).toLocaleTimeString('th-TH')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
