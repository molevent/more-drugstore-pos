import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { useLanguage } from '../contexts/LanguageContext'
import { AlertTriangle, RefreshCw, Package } from 'lucide-react'

export default function InventoryPage() {
  const { t } = useLanguage()
  
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center">
            <Package className="h-6 w-6 text-gray-900" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('inventory.title')}</h1>
        </div>
        <Button variant="primary">
          <RefreshCw className="h-5 w-5 mr-2" />
          {t('inventory.comingSoon')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <div className="flex items-center">
            <div className="bg-blue-500 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">สินค้าใกล้หมด</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="bg-green-500 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">สินค้าคงเหลือ</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="bg-red-500 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">สินค้าหมด</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="รายการสินค้าใกล้หมด">
        <div className="text-center py-12 text-gray-500">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p>ไม่มีสินค้าที่ใกล้หมด</p>
          <p className="text-sm mt-2">ระบบจะแจ้งเตือนเมื่อสินค้าใกล้หมด</p>
        </div>
      </Card>
    </div>
  )
}
