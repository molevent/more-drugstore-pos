import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Store, Bike, ShoppingCart, Bike as BikeIcon, X, CreditCard } from 'lucide-react'
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

  const getPaymentMethodName = (paymentId: string) => {
    return paymentMethods.find(m => m.id === paymentId)?.name || ''
  }

  const handleClearPayment = (channelId: string) => {
    setChannelPaymentMap(prev => {
      const { [channelId]: _, ...rest } = prev
      return rest
    })
  }

  const handleSelectPayment = (channelId: string, paymentId: string) => {
    if (paymentId) {
      setChannelPaymentMap(prev => ({ ...prev, [channelId]: paymentId }))
    }
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

      {/* Main Card - Summary Style */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm max-w-2xl">
        <div className="p-5">
          {/* Title */}
          <h2 className="text-lg font-semibold text-gray-900 mb-4">ช่องทางการขาย</h2>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-6">
            เลือกวิธีชำระเงินเริ่มต้นสำหรับแต่ละช่องทาง ระบบจะเลือกวิธีชำระเงินอัตโนมัติตามที่ตั้งค่าไว้
          </p>

          {/* Channel List - Summary Card Style */}
          <div className="space-y-4">
            {SALES_CHANNELS.map((channel) => {
              const selectedPaymentId = channelPaymentMap[channel.id]
              const selectedPaymentName = getPaymentMethodName(selectedPaymentId)

              return (
                <div key={channel.id}>
                  {/* Channel Label */}
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    {channel.name}
                  </label>

                  {/* Selected Payment Display */}
                  {selectedPaymentId ? (
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-gray-500" />
                        <span className="text-gray-900 font-medium">{selectedPaymentName}</span>
                      </div>
                      <button
                        onClick={() => handleClearPayment(channel.id)}
                        className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                        title="ล้างการเลือก"
                      >
                        <X className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  ) : (
                    /* Payment Method Selection */
                    <div className="flex flex-wrap gap-2">
                      {paymentMethods.length > 0 ? (
                        paymentMethods.map((method) => (
                          <button
                            key={method.id}
                            onClick={() => handleSelectPayment(channel.id, method.id)}
                            className="px-4 py-2 rounded-full border-2 border-gray-200 bg-white text-gray-600 text-sm hover:border-blue-400 hover:bg-blue-50 transition-all"
                          >
                            {method.name}
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">ยังไม่มีวิธีการชำระเงิน</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Success Message */}
          {saved && (
            <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">บันทึกการตั้งค่าสำเร็จ!</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
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
      </div>
    </div>
  )
}
