import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { Download, Calendar } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">รายงาน</h1>
        <Button variant="primary">
          <Download className="h-5 w-5 mr-2" />
          ส่งออก CSV
        </Button>
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
