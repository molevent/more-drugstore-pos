import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Store, Bike, ShoppingCart, Bike as BikeIcon } from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { supabase } from '../services/supabase'

interface PaymentMethod {
  id: string
  name: string
  is_active: boolean
}

const SALES_CHANNELS = [
  { id: 'walk-in', name: 'หน้าร้าน', icon: Store },
  { id: 'grab', name: 'GRAB', icon: Bike },
  { id: 'shopee', name: 'SHOPEE', icon: ShoppingCart },
  { id: 'lineman', name: 'LINEMAN', icon: BikeIcon },
]

export default function SalesChannelsSettingsPage() {
  const navigate = useNavigate()
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [channelPaymentMap, setChannelPaymentMap] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  // Load payment methods
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const { data, error } = await supabase
          .from('payment_methods')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
        
        if (error) {
          console.error('Error fetching payment methods:', error)
          return
        }
        
        if (data) {
          setPaymentMethods(data)
        }
      } catch (error) {
        console.error('Error fetching payment methods:', error)
      }
    }

    fetchPaymentMethods()
  }, [])

  // Load saved channel payment map
  useEffect(() => {
    const saved = localStorage.getItem('pos_channel_payment_map')
    if (saved) {
      setChannelPaymentMap(JSON.parse(saved))
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem('pos_channel_payment_map', JSON.stringify(channelPaymentMap))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Store className="h-7 w-7 text-blue-600" />
          ตั้งค่าช่องทางการขาย
        </h1>
      </div>

      <Card className="max-w-2xl">
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            เลือกวิธีชำระเงินเริ่มต้นสำหรับแต่ละช่องทางการขาย 
            เมื่อเปลี่ยนช่องทางการขายในหน้า POS ระบบจะเลือกวิธีชำระเงินอัตโนมัติตามที่ตั้งค่าไว้
          </p>

          {SALES_CHANNELS.map((channel) => {
            const Icon = channel.icon
            return (
              <div key={channel.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-900">{channel.name}</span>
                </div>
                <select
                  value={channelPaymentMap[channel.id] || ''}
                  onChange={(e) => {
                    const paymentId = e.target.value
                    if (paymentId) {
                      setChannelPaymentMap(prev => ({ ...prev, [channel.id]: paymentId }))
                    } else {
                      setChannelPaymentMap(prev => {
                        const { [channel.id]: _, ...rest } = prev
                        return rest
                      })
                    }
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                >
                  <option value="">-- ไม่ตั้งค่า --</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>{method.name}</option>
                  ))}
                </select>
              </div>
            )
          })}

          {saved && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">บันทึกการตั้งค่าสำเร็จ!</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => navigate('/settings')}
              className="flex-1"
            >
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              className="flex-1"
            >
              บันทึกการตั้งค่า
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
