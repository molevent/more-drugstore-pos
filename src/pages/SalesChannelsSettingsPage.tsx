import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Store, Bike, ShoppingCart, CreditCard, Plus, Trash2, ChevronUp, ChevronDown, Edit2, Check, X } from 'lucide-react'
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
  code?: string
  isCustom?: boolean
  sortOrder?: number
  visiblePaymentMethods?: string[]
}

const DEFAULT_SALES_CHANNELS: SalesChannel[] = [
  { id: 'walk-in', name: 'หน้าร้าน', code: 'WALKIN', icon: 'store', sortOrder: 0 },
  { id: 'grab', name: 'GRAB', code: 'GRAB', icon: 'bike', sortOrder: 1 },
  { id: 'shopee', name: 'SHOPEE', code: 'SHOPEE', icon: 'shoppingcart', sortOrder: 2 },
  { id: 'lineman', name: 'LINEMAN', code: 'LINEMAN', icon: 'bike', sortOrder: 3 },
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
  const [editingChannel, setEditingChannel] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [channelVisiblePayments, setChannelVisiblePayments] = useState<Record<string, string[]>>({})

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
    
    const savedVisiblePayments = localStorage.getItem('pos_channel_visible_payments')
    if (savedVisiblePayments) {
      setChannelVisiblePayments(JSON.parse(savedVisiblePayments))
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
    localStorage.setItem('pos_channel_visible_payments', JSON.stringify(channelVisiblePayments))
    const customChannels = salesChannels.filter(c => c.isCustom)
    localStorage.setItem('pos_sales_channels', JSON.stringify(customChannels))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleAddChannel = () => {
    if (!newChannelName.trim()) return
    
    const code = newChannelName.trim().toUpperCase().replace(/\s+/g, '').substring(0, 10)
    
    const newChannel: SalesChannel = {
      id: `custom-${Date.now()}`,
      name: newChannelName.trim(),
      code: code,
      icon: selectedIcon,
      isCustom: true,
      sortOrder: salesChannels.length,
      visiblePaymentMethods: []
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

  const handleMoveChannel = (index: number, direction: 'up' | 'down') => {
    const newChannels = [...salesChannels]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    if (targetIndex < 0 || targetIndex >= newChannels.length) return
    
    // Swap channels
    const temp = newChannels[index]
    newChannels[index] = newChannels[targetIndex]
    newChannels[targetIndex] = temp
    
    // Update sortOrder for all channels
    newChannels.forEach((channel, i) => {
      channel.sortOrder = i
    })
    
    setSalesChannels(newChannels)
  }

  const getIconComponent = (iconId: string) => {
    const icon = ICON_OPTIONS.find(i => i.id === iconId)
    return icon ? icon.component : Store
  }

  const startEditingChannel = (channel: SalesChannel) => {
    setEditingChannel(channel.id)
    setEditName(channel.name)
    setEditCode(channel.code || '')
  }

  const saveChannelEdit = () => {
    if (!editingChannel) return
    setSalesChannels(prev => prev.map(c => 
      c.id === editingChannel 
        ? { ...c, name: editName, code: editCode.toUpperCase() }
        : c
    ))
    setEditingChannel(null)
    setEditName('')
    setEditCode('')
  }

  const cancelChannelEdit = () => {
    setEditingChannel(null)
    setEditName('')
    setEditCode('')
  }

  const toggleVisiblePayment = (channelId: string, paymentId: string) => {
    setChannelVisiblePayments(prev => {
      const current = prev[channelId] || []
      const updated = current.includes(paymentId)
        ? current.filter(id => id !== paymentId)
        : [...current, paymentId]
      return { ...prev, [channelId]: updated }
    })
  }

  const isPaymentVisible = (channelId: string, paymentId: string) => {
    const visible = channelVisiblePayments[channelId] || []
    return visible.includes(paymentId)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="h-7 w-7 text-[#7D735F]" />
            ตั้งค่าช่องทางการขาย
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            เลือกวิธีชำระเงินเริ่มต้นสำหรับแต่ละช่องทาง ระบบจะเลือกวิธีชำระเงินอัตโนมัติตามที่ตั้งค่าไว้
          </p>
        </div>
      </div>

      {/* Main Card - Summary Style */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm max-w-2xl">
        <div className="p-5">
          {/* Title */}
          <h2 className="text-lg font-semibold text-gray-900 mb-4">ช่องทางการขาย</h2>

          {/* Add New Channel Button */}
          <div className="mb-6">
            <Button
              variant="secondary"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              เพิ่ม
            </Button>
          </div>

          {/* Channel List - Box Style */}
          <div className="space-y-3">
            {salesChannels.map((channel: SalesChannel, index: number) => {
              const selectedPaymentId = channelPaymentMap[channel.id]
              const ChannelIcon = getIconComponent(channel.icon)
              const isEditing = editingChannel === channel.id

              return (
                <div key={channel.id} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  {/* Reordering Buttons */}
                  <div className="flex flex-col gap-0.5 pt-1">
                    <button
                      onClick={() => handleMoveChannel(index, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                      title="ขึ้น"
                    >
                      <ChevronUp className="h-3 w-3 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleMoveChannel(index, 'down')}
                      disabled={index === salesChannels.length - 1}
                      className="p-1 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                      title="ลง"
                    >
                      <ChevronDown className="h-3 w-3 text-gray-600" />
                    </button>
                  </div>

                  {/* Channel Info */}
                  <div className="flex-1 min-w-0">
                    {/* Channel Header with Icon, Name/Code, and Actions */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-[#F5F0E6] flex items-center justify-center">
                        <ChannelIcon className="h-4 w-4 text-[#7D735F] flex-shrink-0" />
                      </div>
                      
                      {isEditing ? (
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
                            placeholder="ชื่อ"
                          />
                          <input
                            type="text"
                            value={editCode}
                            onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                            className="w-24 text-sm border border-gray-300 rounded px-2 py-1"
                            placeholder="รหัส"
                          />
                          <button
                            onClick={saveChannelEdit}
                            className="p-1 bg-green-100 hover:bg-green-200 rounded transition-colors"
                            title="บันทึก"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </button>
                          <button
                            onClick={cancelChannelEdit}
                            className="p-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                            title="ยกเลิก"
                          >
                            <X className="h-4 w-4 text-gray-600" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 truncate">{channel.name}</span>
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{channel.code || '-'}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => startEditingChannel(channel)}
                            className="p-1 hover:bg-blue-100 rounded-full transition-colors flex-shrink-0"
                            title="แก้ไข"
                          >
                            <Edit2 className="h-3 w-3 text-blue-500" />
                          </button>
                          <button
                            onClick={() => handleDeleteChannel(channel.id)}
                            className="p-1 hover:bg-red-100 rounded-full transition-colors flex-shrink-0"
                            title="ลบ"
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Default Payment Dropdown */}
                    <div className="mb-3">
                      <label className="text-xs text-gray-500 mb-1 block">วิธีชำระเงินเริ่มต้น</label>
                      <div className="flex items-center gap-2">
                        {paymentMethods.length > 0 ? (
                          <select
                            value={selectedPaymentId || ''}
                            onChange={(e) => {
                              const value = e.target.value
                              if (value) {
                                handleSelectPayment(channel.id, value)
                              } else {
                                handleClearPayment(channel.id)
                              }
                            }}
                            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#7D735F] focus:border-[#7D735F]"
                          >
                            <option value="">เลือกวิธีชำระเงิน...</option>
                            {paymentMethods.map((method) => (
                              <option key={method.id} value={method.id}>
                                {method.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-gray-500">ยังไม่มีวิธีการชำระเงิน</span>
                        )}
                      </div>
                    </div>

                    {/* Visible Payment Methods - Checkboxes */}
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">แสดงบนหน้า POS</label>
                      <div className="flex flex-wrap gap-2">
                        {paymentMethods.map((method) => (
                          <label
                            key={method.id}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 text-sm cursor-pointer transition-all ${
                              isPaymentVisible(channel.id, method.id)
                                ? 'border-[#7D735F] bg-[#F5F0E6] text-[#5A5346]'
                                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isPaymentVisible(channel.id, method.id)}
                              onChange={() => toggleVisiblePayment(channel.id, method.id)}
                              className="hidden"
                            />
                            <CreditCard className="h-3 w-3" />
                            {method.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
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
