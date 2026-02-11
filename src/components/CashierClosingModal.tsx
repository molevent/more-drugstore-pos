import { useState, useEffect } from 'react'
import { X, Calculator, Wallet, Coins, Banknote, Save } from 'lucide-react'
import { supabase } from '../services/supabase'
import Button from './common/Button'

interface Denomination {
  value: number
  type: 'bill' | 'coin'
  label: string
  count: number
}

interface CashierClosingModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: () => void
}

const RESERVE_AMOUNT = 2500

const INITIAL_DENOMINATIONS: Denomination[] = [
  { value: 1000, type: 'bill', label: 'แบงค์ 1,000', count: 0 },
  { value: 500, type: 'bill', label: 'แบงค์ 500', count: 0 },
  { value: 100, type: 'bill', label: 'แบงค์ 100', count: 0 },
  { value: 50, type: 'bill', label: 'แบงค์ 50', count: 0 },
  { value: 20, type: 'bill', label: 'แบงค์ 20', count: 0 },
  { value: 10, type: 'coin', label: 'เหรียญ 10', count: 0 },
  { value: 5, type: 'coin', label: 'เหรียญ 5', count: 0 },
  { value: 2, type: 'coin', label: 'เหรียญ 2', count: 0 },
  { value: 1, type: 'coin', label: 'เหรียญ 1', count: 0 },
]

export default function CashierClosingModal({ isOpen, onClose, onSaved }: CashierClosingModalProps) {
  const [denominations, setDenominations] = useState<Denomination[]>(INITIAL_DENOMINATIONS)
  const [dailySales, setDailySales] = useState(0)
  const [dailyCashSales, setDailyCashSales] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchDailySales()
    }
  }, [isOpen])

  const fetchDailySales = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Get today's orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select('total, payment_method')
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`)
        .eq('payment_status', 'paid')

      if (error) throw error

      const totalSales = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
      const cashSales = orders?.filter(o => o.payment_method === 'cash').reduce((sum, order) => sum + (order.total || 0), 0) || 0

      setDailySales(totalSales)
      setDailyCashSales(cashSales)
    } catch (error) {
      console.error('Error fetching daily sales:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCountChange = (index: number, count: number) => {
    setDenominations(prev => prev.map((d, i) => 
      i === index ? { ...d, count: Math.max(0, count) } : d
    ))
  }

  const totalCalculated = denominations.reduce((sum, d) => sum + (d.value * d.count), 0)
  const expectedAmount = RESERVE_AMOUNT + dailyCashSales
  const difference = totalCalculated - expectedAmount
  const amountToRemove = Math.max(0, totalCalculated - RESERVE_AMOUNT)

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      
      const closingData = {
        user_id: userData.user?.id,
        closing_date: new Date().toISOString().split('T')[0],
        reserve_amount: RESERVE_AMOUNT,
        daily_cash_sales: dailyCashSales,
        expected_amount: expectedAmount,
        actual_amount: totalCalculated,
        difference: difference,
        amount_to_remove: amountToRemove,
        denominations: denominations.map(d => ({ value: d.value, count: d.count })),
        notes: notes
      }

      const { error } = await supabase
        .from('cashier_closings')
        .insert(closingData)

      if (error) throw error

      alert('บันทึกการปิดร้านสำเร็จ!')
      onSaved?.()
      onClose()
      setDenominations(INITIAL_DENOMINATIONS)
      setNotes('')
    } catch (error) {
      console.error('Error saving cashier closing:', error)
      alert('ไม่สามารถบันทึกข้อมูลได้')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-pink-100 via-purple-50 to-blue-100 px-6 py-4 rounded-t-3xl border-b border-pink-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Wallet className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">ปิดร้าน / นับเงิน</h2>
                <p className="text-sm text-gray-500">บันทึกยอดเงินในเก๊ะสิ้นวัน</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-pink-100 transition-colors shadow-sm"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Sales Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-4 text-center">
              <p className="text-xs text-pink-600 mb-1">ยอดขายวันนี้</p>
              {loading ? (
                <p className="text-lg font-bold text-pink-400">กำลังโหลด...</p>
              ) : (
                <p className="text-lg font-bold text-pink-700">฿{dailySales.toLocaleString()}</p>
              )}
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 text-center">
              <p className="text-xs text-green-600 mb-1">เงินสดที่ได้</p>
              {loading ? (
                <p className="text-lg font-bold text-green-400">กำลังโหลด...</p>
              ) : (
                <p className="text-lg font-bold text-green-700">฿{dailyCashSales.toLocaleString()}</p>
              )}
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 text-center">
              <p className="text-xs text-blue-600 mb-1">เงินคงเหลือในเก๊ะ</p>
              <p className="text-lg font-bold text-blue-700">฿{RESERVE_AMOUNT.toLocaleString()}</p>
            </div>
          </div>

          {/* Expected Amount */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-4 border border-purple-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium text-purple-700">เงินที่ควรมีในเก๊ะ (คงเหลือ + ขายได้)</span>
              </div>
              <span className="text-xl font-bold text-purple-700">฿{expectedAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Denominations Grid */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-500" />
              นับเงินตามมูลค่า
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {denominations.map((denom, index) => (
                <div
                  key={denom.value}
                  className={`relative rounded-2xl p-3 border-2 transition-all ${
                    denom.type === 'bill'
                      ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 hover:border-emerald-300'
                      : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {denom.type === 'bill' ? (
                      <div className="w-8 h-5 rounded bg-emerald-400 flex items-center justify-center shadow-sm">
                        <span className="text-[8px] font-bold text-white">฿</span>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
                        <span className="text-[8px] font-bold text-white">฿</span>
                      </div>
                    )}
                    <span className={`text-sm font-semibold ${
                      denom.type === 'bill' ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                      {denom.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCountChange(index, denom.count - 1)}
                      className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all"
                    >
                      <span className="text-gray-500">-</span>
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={denom.count}
                      onChange={(e) => handleCountChange(index, parseInt(e.target.value) || 0)}
                      className="flex-1 w-full h-8 text-center text-sm font-semibold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300 outline-none"
                    />
                    <button
                      onClick={() => handleCountChange(index, denom.count + 1)}
                      className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all"
                    >
                      <span className="text-gray-500">+</span>
                    </button>
                  </div>
                  <div className="mt-2 text-right">
                    <span className={`text-xs font-medium ${
                      denom.type === 'bill' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      = ฿{(denom.value * denom.count).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Calculated */}
          <div className="bg-gradient-to-r from-pink-100 to-rose-100 rounded-2xl p-4 border-2 border-pink-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-pink-600" />
                <span className="font-semibold text-pink-800">ยอดรวมที่นับได้</span>
              </div>
              <span className="text-2xl font-bold text-pink-700">฿{totalCalculated.toLocaleString()}</span>
            </div>
          </div>

          {/* Difference */}
          <div className={`rounded-2xl p-4 border-2 ${
            difference === 0
              ? 'bg-green-50 border-green-200'
              : difference > 0
                ? 'bg-blue-50 border-blue-200'
                : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`font-semibold ${
                difference === 0
                  ? 'text-green-700'
                  : difference > 0
                    ? 'text-blue-700'
                    : 'text-red-700'
              }`}>
                {difference === 0 ? '✅ ยอดตรง!' : difference > 0 ? '💰 เกิน' : '⚠️ ขาด'}
              </span>
              <span className={`text-xl font-bold ${
                difference === 0
                  ? 'text-green-700'
                  : difference > 0
                    ? 'text-blue-700'
                    : 'text-red-700'
              }`}>
                {difference > 0 ? '+' : ''}฿{difference.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Amount to Remove */}
          {amountToRemove > 0 && (
            <div className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-2xl p-4 border-2 border-indigo-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-600">เงินที่ต้องนำออกจากเก๊ะ</p>
                  <p className="text-xs text-indigo-500">ให้เหลือเงินในเก๊ะ ฿2,500</p>
                </div>
                <span className="text-xl font-bold text-indigo-700">฿{amountToRemove.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">หมายเหตุ</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น ยอดไม่ตรงเพราะ..."
              className="w-full h-20 p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-200 focus:border-pink-300 outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 rounded-b-3xl">
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1 rounded-xl"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white rounded-xl shadow-lg shadow-pink-200"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'กำลังบันทึก...' : 'บันทึกปิดร้าน'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
