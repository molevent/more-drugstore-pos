import Card from '../components/common/Card'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import { useLanguage } from '../contexts/LanguageContext'
import { Save } from 'lucide-react'

export default function SettingsPage() {
  const { t } = useLanguage()
  
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('settings.title')}</h1>

      <div className="space-y-6">
        <Card title="ข้อมูลร้าน">
          <div className="space-y-4">
            <Input label="ชื่อร้าน" placeholder="More Drug Store" />
            <Input label="ที่อยู่" placeholder="123 ถนน..." />
            <Input label="เบอร์โทร" placeholder="02-xxx-xxxx" />
            <Input label="เลขประจำตัวผู้เสียภาษี" placeholder="x-xxxx-xxxxx-xx-x" />
            <Button variant="primary">
              <Save className="h-5 w-5 mr-2" />
              บันทึก
            </Button>
          </div>
        </Card>

        <Card title="การเชื่อมต่อ ZortOut">
          <div className="space-y-4">
            <Input label="API URL" placeholder="https://api.zortout.com" />
            <Input label="API Key" type="password" placeholder="••••••••" />
            <Button variant="primary">
              <Save className="h-5 w-5 mr-2" />
              บันทึก
            </Button>
          </div>
        </Card>

        <Card title="การจัดการผู้ใช้">
          <div className="text-center py-8 text-gray-500">
            <p>ฟังก์ชันการจัดการผู้ใช้จะพร้อมใช้งานเร็วๆ นี้</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
