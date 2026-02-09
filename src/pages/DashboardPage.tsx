import { useAuthStore } from '../stores/authStore'
import { useLanguage } from '../contexts/LanguageContext'
import Card from '../components/common/Card'
import { TrendingUp, Package, AlertTriangle, DollarSign, Home, Calendar } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { t } = useLanguage()

  const stats = [
    {
      name: t('dashboard.todaySales'),
      value: '฿0',
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      name: t('dashboard.salesCount'),
      value: '0',
      icon: TrendingUp,
      color: 'text-blue-600',
    },
    {
      name: t('dashboard.totalProducts'),
      value: '0',
      icon: Package,
      color: 'text-purple-600',
    },
    {
      name: t('dashboard.lowStock'),
      value: '0',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
  ]

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center">
          <Home className="h-6 w-6 text-gray-900" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-sm sm:text-base text-gray-600">
            {t('dashboard.welcome')}, {user?.full_name} ({user?.role})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <div className="flex items-center">
              <div className="p-3">
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="สรุปยอดขายวันนี้">
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">ยอดขายรวม</span>
              <span className="font-bold text-gray-900">฿0.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">จำนวนรายการ</span>
              <span className="font-bold text-gray-900">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">สินค้าที่ขาย</span>
              <span className="font-bold text-gray-900">0</span>
            </div>
          </div>
        </Card>

        <Card title="ช่องทางการชำระเงิน">
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">เงินสด</span>
              <span className="font-bold text-gray-900">฿0.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">บัตรเครดิต</span>
              <span className="font-bold text-gray-900">฿0.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">โอนเงิน</span>
              <span className="font-bold text-gray-900">฿0.00</span>
            </div>
          </div>
        </Card>
      </div>

      <Card title="ประวัติการขาย">
        <div className="text-center py-12 text-gray-500">
          <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p>ยังไม่มีข้อมูลการขาย</p>
          <p className="text-sm mt-2">เริ่มขายสินค้าเพื่อดูรายงาน</p>
        </div>
      </Card>
    </div>
  )
}
