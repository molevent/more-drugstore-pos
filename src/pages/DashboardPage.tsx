import { useAuthStore } from '../stores/authStore'
import { useLanguage } from '../contexts/LanguageContext'
import Card from '../components/common/Card'
import { TrendingUp, Package, AlertTriangle, DollarSign } from 'lucide-react'

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
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          {t('dashboard.welcome')}, {user?.full_name} ({user?.role})
        </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title={t('dashboard.recentSales')}>
          <p className="text-gray-500 text-center py-8">{t('dashboard.noSalesData')}</p>
        </Card>

        <Card title={t('dashboard.lowStock')}>
          <p className="text-gray-500 text-center py-8">{t('dashboard.noLowStock')}</p>
        </Card>
      </div>
    </div>
  )
}
