import Card from '../components/common/Card'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import { useLanguage } from '../contexts/LanguageContext'
import { Save, ExternalLink, CheckCircle, XCircle } from 'lucide-react'
import { useState } from 'react'

export default function SettingsPage() {
  const { t } = useLanguage()
  
  // FlowAccount settings state
  const [flowAccount, setFlowAccount] = useState({
    enabled: false,
    clientId: '',
    clientSecret: '',
    redirectUri: '',
    accessToken: '',
    refreshToken: '',
    connected: false
  })

  const handleSaveFlowAccount = () => {
    // TODO: Save to Supabase/localStorage
    alert('บันทึกการตั้งค่า FlowAccount สำเร็จ')
  }

  const handleConnectFlowAccount = () => {
    // TODO: Implement OAuth flow
    window.open('https://developer.flowaccount.com/oauth/authorize', '_blank')
  }
  
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">{t('settings.title')}</h1>

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

        <Card title="การเชื่อมต่อ FlowAccount">
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                เชื่อมต่อกับ FlowAccount เพื่อส่งข้อมูลบัญชีและใบกำกับภาษีโดยอัตโนมัติ
              </p>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              {flowAccount.connected ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-green-700 font-medium">เชื่อมต่อแล้ว</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-sm text-red-700 font-medium">ยังไม่ได้เชื่อมต่อ</span>
                </>
              )}
            </div>

            <Input 
              label="Client ID" 
              placeholder="flow_xxxxxxxxxxxxxxxx"
              value={flowAccount.clientId}
              onChange={(e) => setFlowAccount({...flowAccount, clientId: e.target.value})}
            />
            
            <Input 
              label="Client Secret" 
              type="password"
              placeholder="••••••••"
              value={flowAccount.clientSecret}
              onChange={(e) => setFlowAccount({...flowAccount, clientSecret: e.target.value})}
            />
            
            <Input 
              label="Redirect URI" 
              placeholder="https://your-app.com/auth/flowaccount/callback"
              value={flowAccount.redirectUri}
              onChange={(e) => setFlowAccount({...flowAccount, redirectUri: e.target.value})}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Access Token" 
                type="password"
                placeholder="••••••••"
                value={flowAccount.accessToken}
                onChange={(e) => setFlowAccount({...flowAccount, accessToken: e.target.value})}
              />
              <Input 
                label="Refresh Token" 
                type="password"
                placeholder="••••••••"
                value={flowAccount.refreshToken}
                onChange={(e) => setFlowAccount({...flowAccount, refreshToken: e.target.value})}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="primary" onClick={handleSaveFlowAccount}>
                <Save className="h-5 w-5 mr-2" />
                บันทึก
              </Button>
              <Button variant="secondary" onClick={handleConnectFlowAccount}>
                <ExternalLink className="h-5 w-5 mr-2" />
                เชื่อมต่อกับ FlowAccount
              </Button>
            </div>

            <div className="text-xs text-gray-500 pt-2 border-t">
              <p>ขั้นตอนการเชื่อมต่อ:</p>
              <ol className="list-decimal list-inside space-y-1 mt-1">
                <li>สมัคร Developer Account ที่ <a href="https://developer.flowaccount.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">developer.flowaccount.com</a></li>
                <li>สร้าง App และรับ Client ID และ Client Secret</li>
                <li>กรอกข้อมูลด้านบนและบันทึก</li>
                <li>คลิก "เชื่อมต่อกับ FlowAccount" เพื่ออนุญาตการเข้าถึง</li>
              </ol>
            </div>
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
