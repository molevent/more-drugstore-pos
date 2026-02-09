import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { useLanguage } from '../contexts/LanguageContext'
import { AlertTriangle, RefreshCw, Package } from 'lucide-react'

export default function InventoryPage() {
  const { t } = useLanguage()
  
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-7 w-7 text-[#7D735F]" />
            {t('inventory.title')}
          </h1>
          <p className="text-gray-600 mt-1">สต็อกสินค้าและการจัดการคลัง</p>
        </div>
        <Button variant="primary">
          <RefreshCw className="h-5 w-5 mr-2" />
          {t('inventory.comingSoon')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="bg-white border-[#B8C9B8] shadow-sm">
          <div className="flex items-center">
            <div className="bg-[#A67B5B] p-3 rounded-lg shadow-sm">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">สินค้าใกล้หมด</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </Card>

        <Card className="bg-white border-[#B8C9B8] shadow-sm">
          <div className="flex items-center">
            <div className="bg-[#B8C9B8] p-3 rounded-lg shadow-sm">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">สินค้าคงเหลือ</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </Card>

        <Card className="bg-white border-[#B8C9B8] shadow-sm">
          <div className="flex items-center">
            <div className="bg-[#D4756A] p-3 rounded-lg shadow-sm">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">สินค้าหมด</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="รายการสินค้าใกล้หมด" className="bg-white border-[#B8C9B8] shadow-sm">
        <div className="text-center py-12 text-gray-500">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-[#B8C9B8]" />
          <p>ไม่มีสินค้าที่ใกล้หมด</p>
          <p className="text-sm mt-2">ระบบจะแจ้งเตือนเมื่อสินค้าใกล้หมด</p>
        </div>
      </Card>
    </div>
  )
}
