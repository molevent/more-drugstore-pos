import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Bell, Send, Plus, Trash2, Save, ExternalLink, BookOpen, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import {
  getLineNotifyConfig,
  saveLineNotifyConfig,
  sendLineNotify,
  getCreditTerms,
  saveCreditTerms,
  checkPaymentDueAlerts,
  formatPaymentDueMessage,
  sendPaymentDueAlerts,
  type LineNotifyConfig,
  type CreditTermRule,
} from '../services/lineService'

export default function LineNotifySettingsPage() {
  const [config, setConfig] = useState<LineNotifyConfig>(getLineNotifyConfig())
  const [creditTerms, setCreditTerms] = useState<CreditTermRule[]>(getCreditTerms())
  const [testMessage, setTestMessage] = useState('ทดสอบการแจ้งเตือนจาก More Drug Store 🏪')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null)
  const [alerts, setAlerts] = useState<any[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(false)
  const [sendingAlerts, setSendingAlerts] = useState(false)

  useEffect(() => {
    loadAlerts()
  }, [])

  const loadAlerts = async () => {
    setLoadingAlerts(true)
    try {
      const result = await checkPaymentDueAlerts()
      setAlerts(result)
    } catch (err) {
      console.error('Error loading alerts:', err)
    } finally {
      setLoadingAlerts(false)
    }
  }

  const handleSave = () => {
    saveLineNotifyConfig(config)
    saveCreditTerms(creditTerms)
    setSendResult({ success: true, message: 'บันทึกการตั้งค่าสำเร็จ' })
    setTimeout(() => setSendResult(null), 3000)
  }

  const handleTestSend = async () => {
    setSending(true)
    setSendResult(null)
    const result = await sendLineNotify(testMessage, { channelAccessToken: config.channelAccessToken })
    setSending(false)
    setSendResult({
      success: result.success,
      message: result.success ? 'ส่งข้อความทดสอบสำเร็จ! ตรวจสอบ LINE ของคุณ' : `ส่งไม่สำเร็จ: ${result.error}`
    })
  }

  const handleSendAlerts = async () => {
    setSendingAlerts(true)
    setSendResult(null)

    // Save config first
    saveLineNotifyConfig({ ...config, enabled: true })
    saveCreditTerms(creditTerms)

    const result = await sendPaymentDueAlerts()
    setSendingAlerts(false)

    if (result.alertCount === 0) {
      setSendResult({ success: true, message: 'ไม่มีรายการที่ถึงกำหนดชำระในขณะนี้' })
    } else {
      setSendResult({
        success: result.success,
        message: result.success
          ? `ส่งแจ้งเตือน ${result.alertCount} รายการไป LINE สำเร็จ!`
          : `ส่งไม่สำเร็จ: ${result.error}`
      })
    }
  }

  const handlePreviewMessage = async () => {
    const allAlerts = await checkPaymentDueAlerts()
    if (allAlerts.length === 0) {
      alert('ไม่มีรายการที่ถึงกำหนดชำระ')
      return
    }
    const msg = formatPaymentDueMessage(allAlerts)
    alert(msg)
  }

  const addCreditTerm = () => {
    setCreditTerms([...creditTerms, { vendor_match: '', days: 7 }])
  }

  const removeCreditTerm = (index: number) => {
    setCreditTerms(creditTerms.filter((_, i) => i !== index))
  }

  const updateCreditTerm = (index: number, field: 'vendor_match' | 'days', value: string) => {
    const updated = [...creditTerms]
    if (field === 'days') {
      updated[index] = { ...updated[index], days: parseInt(value) || 1 }
    } else {
      updated[index] = { ...updated[index], vendor_match: value }
    }
    setCreditTerms(updated)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/settings"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="h-7 w-7 text-green-600" />
              ตั้งค่า LINE Messaging
            </h1>
            <p className="text-gray-600 mt-1">แจ้งเตือนกำหนดชำระเงิน และอื่นๆ ผ่าน LINE Official Account</p>
          </div>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-help-modal'))}
          className="p-2 text-gray-400 hover:text-[#7D735F] hover:bg-[#F5F0E6] rounded-full transition-all"
        >
          <BookOpen className="h-5 w-5" />
        </button>
      </div>

      {/* Result message */}
      {sendResult && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
          sendResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {sendResult.success ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600" />
          )}
          <span className={sendResult.success ? 'text-green-800' : 'text-red-800'}>
            {sendResult.message}
          </span>
        </div>
      )}

      <div className="space-y-6">
        {/* LINE Channel Access Token */}
        <Card title="🔑 LINE Channel Access Token">
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 space-y-1">
                <strong>วิธีตั้งค่า:</strong><br />
                1. สร้าง LINE Official Account ที่{' '}
                <a href="https://manager.line.biz/" target="_blank" rel="noopener noreferrer" className="underline font-medium">manager.line.biz</a><br />
                2. ใน LINE OA → <strong>Settings → Messaging API</strong> → กด <strong>Enable</strong><br />
                3. ไป{' '}
                <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer" className="underline font-medium">LINE Developers Console</a>
                {' '}→ เข้า Channel ที่สร้าง → คัดลอก <strong>Channel Access Token (long-lived)</strong><br />
                4. เพิ่มเพื่อน LINE OA ด้วย QR Code → ข้อความจะถูก broadcast ไปยังผู้ติดตามทั้งหมด
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel Access Token</label>
              <input
                type="password"
                value={config.channelAccessToken}
                onChange={(e) => setConfig({ ...config, channelAccessToken: e.target.value })}
                placeholder="วาง Channel Access Token ที่นี่..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enabled"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="h-4 w-4 text-green-600 rounded focus:ring-green-500"
              />
              <label htmlFor="enabled" className="text-sm text-gray-700">
                เปิดใช้งานแจ้งเตือนอัตโนมัติ (ส่งวันละ 1 ครั้ง เมื่อเปิดแอป)
              </label>
            </div>

            {/* Test send */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">ทดสอบส่งข้อความ</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <Button
                  variant="primary"
                  onClick={handleTestSend}
                  disabled={sending || !config.channelAccessToken}
                  className="flex items-center gap-2 !bg-green-600 hover:!bg-green-700"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  ทดสอบ
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Webhook Bot Info */}
        <Card title="🤖 LINE Bot (รับ-ตอบข้อความ)">
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Webhook URL</strong> — วาง URL นี้ในหน้า Messaging API ของ LINE Developers Console:
              </p>
              <div className="mt-2 flex gap-2">
                <code className="flex-1 block bg-white px-3 py-2 rounded border text-xs break-all font-mono">
                  {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/line-webhook`}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/line-webhook`)
                    setSendResult({ success: true, message: 'คัดลอก Webhook URL แล้ว' })
                    setTimeout(() => setSendResult(null), 2000)
                  }}
                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 whitespace-nowrap"
                >
                  คัดลอก
                </button>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">คำสั่งที่บอทรองรับ:</p>
              <div className="space-y-1 text-sm text-gray-600">
                <p>🧠 <strong>"ถามเภสัชกร: อาการ..."</strong> — AI วิเคราะห์อาการแนะนำยา</p>
                <p>📋 <strong>"ยอดค้าง"</strong> — ดูรายการค้างชำระ</p>
                <p>📊 <strong>"ยอดขาย"</strong> — ดูยอดขายวันนี้</p>
                <p>❓ <strong>"ช่วยเหลือ"</strong> — แสดงเมนูคำสั่ง</p>
              </div>
              <div className="mt-2 p-2 bg-purple-50 border border-purple-100 rounded">
                <p className="text-xs font-medium text-purple-700 mb-1">🤖 AI ตอบคำถามทั่วไปเกี่ยวกับร้านได้ เช่น:</p>
                <div className="text-xs text-purple-600 space-y-0.5">
                  <p>• "ราคาพาราเซตามอล" — ถามราคาสินค้า</p>
                  <p>• "วิธีใช้ Amoxicillin" — วิธีใช้ / ข้อมูลยา</p>
                  <p>• "รายละเอียด ยาแก้ไอ" — คำอธิบาย ผลข้างเคียง</p>
                  <p>• "วันนี้ใครเข้างาน" / "เภสัชเข้าวันนี้ใคร"</p>
                  <p>• "สินค้าขายดี 5 อันดับ" / "ยอดขายเดือนนี้"</p>
                  <p>• "สินค้าใกล้หมด" / "ค่าใช้จ่าย" / "ใบรับสินค้า"</p>
                </div>
              </div>
              <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                💡 พิมพ์อาการตรงๆ ก็ได้ เช่น "ปวดหัว มีไข้" — บอทจะจับอาการอัตโนมัติ
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>หมายเหตุ:</strong> ต้อง deploy Edge Function <code className="bg-amber-100 px-1 rounded">line-webhook</code> ก่อน
                และตั้ง Supabase secrets: <code className="bg-amber-100 px-1 rounded">LINE_CHANNEL_ACCESS_TOKEN</code>, <code className="bg-amber-100 px-1 rounded">LINE_CHANNEL_SECRET</code>, <code className="bg-amber-100 px-1 rounded">GEMINI_API_KEY</code>
              </p>
            </div>
          </div>
        </Card>

        {/* Alert Settings */}
        <Card title="⚙️ ตั้งค่าการแจ้งเตือน">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="alertOverdue"
                checked={config.alertOverdue}
                onChange={(e) => setConfig({ ...config, alertOverdue: e.target.checked })}
                className="h-4 w-4 text-red-600 rounded focus:ring-red-500"
              />
              <label htmlFor="alertOverdue" className="text-sm text-gray-700">
                🔴 แจ้งเตือนรายการที่เลยกำหนดชำระ
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="alertOnDueDay"
                checked={config.alertOnDueDay}
                onChange={(e) => setConfig({ ...config, alertOnDueDay: e.target.checked })}
                className="h-4 w-4 text-yellow-600 rounded focus:ring-yellow-500"
              />
              <label htmlFor="alertOnDueDay" className="text-sm text-gray-700">
                🟡 แจ้งเตือนรายการที่ครบกำหนดวันนี้
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="alertBefore"
                checked={config.alertDaysBefore > 0}
                onChange={(e) => setConfig({ ...config, alertDaysBefore: e.target.checked ? 1 : 0 })}
                className="h-4 w-4 text-green-600 rounded focus:ring-green-500"
              />
              <label htmlFor="alertBefore" className="text-sm text-gray-700">
                🟢 แจ้งเตือนล่วงหน้า
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={config.alertDaysBefore}
                onChange={(e) => setConfig({ ...config, alertDaysBefore: parseInt(e.target.value) || 1 })}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
              />
              <span className="text-sm text-gray-600">วัน</span>
            </div>
          </div>
        </Card>

        {/* Credit Terms */}
        <Card title="📅 กำหนดเครดิตตามผู้ขาย">
          <div className="space-y-3">
            <p className="text-sm text-gray-500">กำหนดวันเครดิตของแต่ละซัพพลายเออร์ เพื่อคำนวณวันครบกำหนดชำระ</p>

            {creditTerms.map((term, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">ชื่อผู้ขาย (บางส่วน)</label>
                  <input
                    type="text"
                    value={term.vendor_match}
                    onChange={(e) => updateCreditTerm(index, 'vendor_match', e.target.value)}
                    placeholder="เช่น ฟาร์มาแคร์"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs text-gray-500 mb-1">เครดิต (วัน)</label>
                  <input
                    type="number"
                    min="1"
                    value={term.days}
                    onChange={(e) => updateCreditTerm(index, 'days', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center"
                  />
                </div>
                <button
                  onClick={() => removeCreditTerm(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-full mt-5"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            <Button variant="secondary" onClick={addCreditTerm} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              เพิ่มผู้ขาย
            </Button>
          </div>
        </Card>

        {/* Current Alerts Preview */}
        <Card title="📋 รายการที่ใกล้ถึง/เลยกำหนดชำระ">
          <div className="space-y-3">
            {loadingAlerts ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                กำลังโหลด...
              </div>
            ) : alerts.length === 0 ? (
              <p className="text-center text-gray-500 py-8">ไม่มีรายการที่ถึงกำหนดชำระ</p>
            ) : (
              <>
                {alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      alert.is_overdue
                        ? 'bg-red-50 border-red-200'
                        : alert.days_remaining === 0
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-green-50 border-green-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{alert.vendor}</p>
                        <p className="text-sm text-gray-600">{alert.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          กำหนดชำระ: {new Date(alert.due_date).toLocaleDateString('th-TH')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          ฿{new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(alert.amount)}
                        </p>
                        <p className={`text-sm font-medium ${
                          alert.is_overdue ? 'text-red-600' :
                          alert.days_remaining === 0 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {alert.is_overdue
                            ? `เลยกำหนด ${Math.abs(alert.days_remaining)} วัน`
                            : alert.days_remaining === 0
                            ? 'ครบกำหนดวันนี้'
                            : `อีก ${alert.days_remaining} วัน`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="secondary"
                    onClick={handlePreviewMessage}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    ดูตัวอย่างข้อความ
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSendAlerts}
                    disabled={sendingAlerts || !config.channelAccessToken}
                    className="flex-1 flex items-center justify-center gap-2 !bg-green-600 hover:!bg-green-700"
                  >
                    {sendingAlerts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    ส่งแจ้งเตือนไป LINE ตอนนี้
                  </Button>
                </div>
              </>
            )}

            <Button
              variant="secondary"
              onClick={loadAlerts}
              disabled={loadingAlerts}
              className="w-full"
            >
              โหลดข้อมูลใหม่
            </Button>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleSave}
            className="flex items-center gap-2 px-8"
          >
            <Save className="h-5 w-5" />
            บันทึกการตั้งค่า
          </Button>
        </div>
      </div>
    </div>
  )
}
