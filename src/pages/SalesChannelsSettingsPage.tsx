import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Store, Bike, ShoppingCart, X, CreditCard, Plus, Trash2 } from 'lucide-react'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { supabase } from '../services/supabase'

interface PaymentMethod {
  id: string
  name: string
  is_active: boolean
}

interface SalesChannel {
  id: string
  name: string
  icon: string
  isCustom?: boolean
}

const DEFAULT_SALES_CHANNELS: SalesChannel[] = [
  { id: 'walk-in', name: 'หน้าร้าน', icon: 'store' },
  { id: 'grab', name: 'GRAB', icon: 'bike' },
  { id: 'shopee', name: 'SHOPEE', icon: 'shoppingcart' },
  { id: 'lineman', name: 'LINEMAN', icon: 'bike' },
]

const ICON_OPTIONS = [
  { id: 'store', name: 'ร้านค้า', component: Store },
  { id: 'bike', name: 'จักรยาน', component: Bike },
  { id: 'shoppingcart', name: 'ตะกร้า', component: ShoppingCart },
  { id: 'creditcard', name: 'บัตร', component: CreditCard },
]

export default function SalesChannelsSettingsPage() {
  const navigate = useNavigate()
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [channelPaymentMap, setChannelPaymentMap] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [salesChannels, setSalesChannels] = useState<SalesChannel[]>(DEFAULT_SALES_CHANNELS)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('store')

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

  // Load saved channel payment map and custom channels
  useEffect(() => {
    const savedMap = localStorage.getItem('pos_channel_payment_map')
    if (savedMap) {
      setChannelPaymentMap(JSON.parse(savedMap))
    }
    
    const savedChannels = localStorage.getItem('pos_sales_channels')
    if (savedChannels) {
      try {
        const customChannels = JSON.parse(savedChannels)
        setSalesChannels([...DEFAULT_SALES_CHANNELS, ...customChannels])
      } catch (error) {
        console.error('Error parsing saved channels:', error)
      }
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem('pos_channel_payment_map', JSON.stringify(channelPaymentMap))
    const customChannels = salesChannels.filter(c => c.isCustom)
    localStorage.setItem('pos_sales_channels', JSON.stringify(customChannels))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleAddChannel = () => {
    if (!newChannelName.trim()) return
    
    const newChannel: SalesChannel = {
      id: `custom-${Date.now()}`,
      name: newChannelName.trim(),
      icon: selectedIcon,
      isCustom: true
    }
    
    setSalesChannels([...salesChannels, newChannel])
    setNewChannelName('')
    setSelectedIcon('store')
    setShowAddModal(false)
  }

  const handleDeleteChannel = (channelId: string) => {
    if (!confirm('ต้องการลบช่องทางการขายนี้?')) return
    setSalesChannels(salesChannels.filter(c => c.id !== channelId))
    // Also remove from payment map
    setChannelPaymentMap(prev => {
      const { [channelId]: _, ...rest } = prev
      return rest
    })
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

  const getIconComponent = (iconId: string) => {
    const icon = ICON_OPTIONS.find(i => i.id === iconId)
    return icon ? icon.component : Store
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

          {/* Add New Channel Button */}
          <div className="mb-6">
            <Button
              variant="secondary"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              เพิ่มช่องทางการขาย
            </Button>
          </div>

          {/* Channel List - Summary Card Style */}
          <div className="space-y-4">
            {salesChannels.map((channel: SalesChannel) => {
              const selectedPaymentId = channelPaymentMap[channel.id]
              const selectedPaymentName = getPaymentMethodName(selectedPaymentId)
              const ChannelIcon = getIconComponent(channel.icon)

              return (
                <div key={channel.id}>
                  {/* Channel Label */}
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <ChannelIcon className="h-4 w-4" />
                      {channel.name}
                    </label>
                    {channel.isCustom && (
                      <button
                        onClick={() => handleDeleteChannel(channel.id)}
                        className="p-1 hover:bg-red-100 rounded-full transition-colors"
                        title="ลบช่องทางการขาย"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    )}
                  </div>

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

      {/* Add Channel Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">เพิ่มช่องทางการขาย</h3>
            
            {/* Channel Name Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อช่องทางการขาย
              </label>
              <Input
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="เช่น PANDA GO, ROBINHOOD"
                className="w-full"
              />
            </div>

            {/* Icon Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เลือกไอคอน
              </label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map((icon) => {
                  const IconComponent = icon.component
                  return (
                    <button
                      key={icon.id}
                      onClick={() => setSelectedIcon(icon.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                        selectedIcon === icon.id
                          ? 'border-[#7D735F] bg-[#F5F0E6]'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <IconComponent className="h-4 w-4" />
                      <span className="text-sm">{icon.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAddModal(false)
                  setNewChannelName('')
                  setSelectedIcon('store')
                }}
                className="flex-1"
              >
                ยกเลิก
              </Button>
              <Button
                variant="primary"
                onClick={handleAddChannel}
                disabled={!newChannelName.trim()}
                className="flex-1"
              >
                เพิ่ม
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
