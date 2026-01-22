import { useAuthStore } from '../stores/authStore'
import Card from '../components/common/Card'
import { TrendingUp, Package, AlertTriangle, DollarSign } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuthStore()

  const stats = [
    {
      name: 'ยอดขายวันนี้',
      value: '฿0',
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      name: 'รายการขาย',
      value: '0',
      icon: TrendingUp,
      color: 'bg-blue-500',
    },
    {
      name: 'สินค้าทั้งหมด',
      value: '0',
      icon: Package,
      color: 'bg-purple-500',
    },
    {
      name: 'สินค้าใกล้หมด',
      value: '0',
      icon: AlertTriangle,
      color: 'bg-red-500',
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">แดชบอร์ด</h1>
        <p className="text-gray-600 mt-1">
          ยินดีต้อนรับ, {user?.full_name} ({user?.role})
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <div className="flex items-center">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
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
        <Card title="ยอดขายล่าสุด">
          <p className="text-gray-500 text-center py-8">ยังไม่มีข้อมูลการขาย</p>
        </Card>

        <Card title="สินค้าใกล้หมด">
          <p className="text-gray-500 text-center py-8">ไม่มีสินค้าที่ใกล้หมด</p>
        </Card>
      </div>
    </div>
  )
}
