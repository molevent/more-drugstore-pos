import { useState, useEffect } from 'react'
import { X, Calculator, Wallet, Coins, Banknote, Save, Printer } from 'lucide-react'
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

const BILLS: Denomination[] = [
  { value: 1000, type: 'bill', label: 'แบงค์ 1,000', count: 0 },
  { value: 500, type: 'bill', label: 'แบงค์ 500', count: 0 },
  { value: 100, type: 'bill', label: 'แบงค์ 100', count: 0 },
  { value: 50, type: 'bill', label: 'แบงค์ 50', count: 0 },
  { value: 20, type: 'bill', label: 'แบงค์ 20', count: 0 },
]

const COINS: Denomination[] = [
  { value: 10, type: 'coin', label: 'เหรียญ 10', count: 0 },
  { value: 5, type: 'coin', label: 'เหรียญ 5', count: 0 },
  { value: 2, type: 'coin', label: 'เหรียญ 2', count: 0 },
  { value: 1, type: 'coin', label: 'เหรียญ 1', count: 0 },
]

const INITIAL_DENOMINATIONS: Denomination[] = [...BILLS, ...COINS]

const BILL_COLORS: Record<number, { bg: string; border: string; text: string; icon: string }> = {
  1000: { bg: 'from-orange-50 to-amber-50', border: 'border-orange-200', text: 'text-orange-700', icon: 'bg-orange-400' },
  500: { bg: 'from-purple-50 to-violet-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'bg-purple-400' },
  100: { bg: 'from-red-50 to-rose-50', border: 'border-red-200', text: 'text-red-700', icon: 'bg-red-400' },
  50: { bg: 'from-blue-50 to-sky-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'bg-blue-400' },
  20: { bg: 'from-green-50 to-emerald-50', border: 'border-green-200', text: 'text-green-700', icon: 'bg-green-400' },
}

export default function CashierClosingModal({ isOpen, onClose, onSaved }: CashierClosingModalProps) {
  const [denominations, setDenominations] = useState<Denomination[]>(INITIAL_DENOMINATIONS)
  const [dailySales, setDailySales] = useState(0)
  const [dailyCashSales, setDailyCashSales] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedData, setSavedData] = useState<any>(null)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchDailySales()
      setSavedData(null)
    }
  }, [isOpen])

  const fetchDailySales = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
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

  const handleCountChange = (value: number, count: number) => {
    setDenominations(prev => prev.map(d => 
      d.value === value ? { ...d, count: Math.max(0, count) } : d
    ))
  }

  const billsTotal = BILLS.reduce((sum, b) => sum + (denominations.find(d => d.value === b.value)?.count || 0) * b.value, 0)
  const coinsTotal = COINS.reduce((sum, c) => sum + (denominations.find(d => d.value === c.value)?.count || 0) * c.value, 0)
  const totalCalculated = billsTotal + coinsTotal
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

      const { error } = await supabase.from('cashier_closings').insert(closingData)
      if (error) throw error

      setSavedData(closingData)
      onSaved?.()
      alert('บันทึกการปิดร้านสำเร็จ!')
    } catch (error) {
      console.error('Error saving cashier closing:', error)
      alert('ไม่สามารถบันทึกข้อมูลได้')
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const today = new Date().toLocaleDateString('th-TH')
    const closingTime = new Date().toLocaleTimeString('th-TH')
    
    const billRows = BILLS.map(b => {
      const count = denominations.find(d => d.value === b.value)?.count || 0
      if (count === 0) return ''
      return `<tr><td style="text-align:left;padding:4px 0;">${b.label}</td><td style="text-align:center;padding:4px 0;">× ${count}</td><td style="text-align:right;padding:4px 0;">฿${(b.value * count).toLocaleString()}</td></tr>`
    }).join('')

    const coinRows = COINS.map(c => {
      const count = denominations.find(d => d.value === c.value)?.count || 0
      if (count === 0) return ''
      return `<tr><td style="text-align:left;padding:4px 0;">${c.label}</td><td style="text-align:center;padding:4px 0;">× ${count}</td><td style="text-align:right;padding:4px 0;">฿${(c.value * count).toLocaleString()}</td></tr>`
    }).join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ใบปิดร้าน - ${today}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { font-family: 'Sarabun', sans-serif; width: 80mm; padding: 8mm; margin: 0; font-size: 12px; }
          .header { text-align: center; border-bottom: 1px dashed #999; padding-bottom: 8px; margin-bottom: 8px; }
          .header h1 { font-size: 16px; margin: 0; }
          .header p { font-size: 10px; margin: 4px 0; color: #666; }
          .section { margin: 8px 0; }
          .section-title { font-size: 11px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; }
          .summary { background: #f5f5f5; padding: 8px; border-radius: 4px; margin: 8px 0; }
          .summary-row { display: flex; justify-content: space-between; margin: 4px 0; }
          .total { font-size: 14px; font-weight: bold; border-top: 2px solid #333; padding-top: 8px; margin-top: 8px; }
          .footer { text-align: center; font-size: 10px; color: #999; margin-top: 16px; border-top: 1px dashed #999; padding-top: 8px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MORE DRUGSTORE</h1>
          <p>ใบปิดร้าน / Cashier Closing</p>
          <p>${today} ${closingTime}</p>
        </div>
        <div class="summary">
          <div class="summary-row"><span>ยอดขายเงินสดวันนี้:</span><span>฿${dailyCashSales.toLocaleString()}</span></div>
          <div class="summary-row"><span>เงินคงเหลือในเก๊ะ:</span><span>฿${RESERVE_AMOUNT.toLocaleString()}</span></div>
          <div class="summary-row" style="font-weight:bold;"><span>เงินที่ควรมี:</span><span>฿${expectedAmount.toLocaleString()}</span></div>
        </div>
        ${billRows ? `<div class="section"><div class="section-title">ธนบัตร</div><table>${billRows}</table></div>` : ''}
        ${coinRows ? `<div class="section"><div class="section-title">เหรียญ</div><table>${coinRows}</table></div>` : ''}
        <div class="summary total"><div class="summary-row"><span>ยอดรวมที่นับได้:</span><span>฿${totalCalculated.toLocaleString()}</span></div></div>
        <div class="summary" style="background: ${difference === 0 ? '#e8f5e9' : difference > 0 ? '#e3f2fd' : '#ffebee'};">
          <div class="summary-row"><span>${difference === 0 ? '✓ ยอดตรง' : difference > 0 ? 'เกิน' : 'ขาด'}:</span><span>${difference > 0 ? '+' : ''}฿${difference.toLocaleString()}</span></div>
          ${amountToRemove > 0 ? `<div class="summary-row" style="font-weight:bold;color:#1976d2;"><span>เงินที่ต้องนำออก:</span><span>฿${amountToRemove.toLocaleString()}</span></div>` : ''}
        </div>
        ${notes ? `<div class="section"><div class="section-title">หมายเหตุ</div><p style="font-size:10px;margin:4px 0;">${notes}</p></div>` : ''}
        <div class="footer"><p>ลงชื่อ _________________________</p><p style="margin-top:4px;">ผู้ปิดร้าน</p></div>
        <div class="no-print" style="margin-top:20px;text-align:center;"><button onclick="window.print()" style="padding:8px 16px;font-size:12px;cursor:pointer;">พิมพ์ใบปิดร้าน</button></div>
      </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const renderDenomination = (denom: Denomination) => {
    const colors = denom.type === 'bill' ? BILL_COLORS[denom.value] : null
    const currentCount = denominations.find(d => d.value === denom.value)?.count || 0
    const total = denom.value * currentCount

    return (
      <div
        key={denom.value}
        className={`relative rounded-xl p-3 border transition-all ${
          denom.type === 'bill'
            ? `bg-gradient-to-br ${colors?.bg || 'from-gray-50 to-gray-100'} ${colors?.border || 'border-gray-200'} hover:shadow-md`
            : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 hover:shadow-md'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          {denom.type === 'bill' ? (
            <div className={`w-10 h-6 rounded ${colors?.icon || 'bg-gray-400'} flex items-center justify-center shadow-sm`}>
              <span className="text-[9px] font-bold text-white">฿{denom.value}</span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow-sm border-2 border-amber-300">
              <span className="text-[8px] font-bold text-white">฿{denom.value}</span>
            </div>
          )}
          <span className={`text-sm font-semibold ${denom.type === 'bill' ? (colors?.text || 'text-gray-700') : 'text-amber-700'}`}>
            {denom.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCountChange(denom.value, currentCount - 1)}
            className="w-8 h-8 rounded-lg bg-white border border-[#B8C9B8] flex items-center justify-center hover:bg-[#B8C9B8]/10 active:scale-95 transition-all"
          >
            <span className="text-gray-600">-</span>
          </button>
          <input
            type="number"
            min="0"
            value={currentCount}
            onChange={(e) => handleCountChange(denom.value, parseInt(e.target.value) || 0)}
            className="flex-1 w-full h-9 text-center text-sm font-semibold bg-white border border-[#B8C9B8] rounded-lg focus:ring-2 focus:ring-[#B8C9B8]/30 focus:border-[#B8C9B8] outline-none"
          />
          <button
            onClick={() => handleCountChange(denom.value, currentCount + 1)}
            className="w-8 h-8 rounded-lg bg-white border border-[#B8C9B8] flex items-center justify-center hover:bg-[#B8C9B8]/10 active:scale-95 transition-all"
          >
            <span className="text-gray-600">+</span>
          </button>
        </div>
        {currentCount > 0 && (
          <div className="mt-2 text-right">
            <span className={`text-xs font-bold ${denom.type === 'bill' ? (colors?.text || 'text-gray-600') : 'text-amber-600'}`}>
              = ฿{total.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-[#B8C9B8]/30">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#B8C9B8]/20 to-[#B8C9B8]/10 px-6 py-4 rounded-t-2xl border-b border-[#B8C9B8]/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#B8C9B8] rounded-xl flex items-center justify-center shadow-sm">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">ปิดร้าน / นับเงิน</h2>
                <p className="text-sm text-gray-500">บันทึกยอดเงินในเก๊ะสิ้นวัน</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white rounded-lg flex items-center justify-center hover:bg-[#B8C9B8]/20 transition-colors shadow-sm border border-[#B8C9B8]/30"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Sales Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#B8C9B8]/10 rounded-xl p-4 text-center border border-[#B8C9B8]/30">
              <p className="text-xs text-gray-600 mb-1">ยอดขายวันนี้</p>
              {loading ? <p className="text-lg font-bold text-gray-400">กำลังโหลด...</p> : <p className="text-lg font-bold text-gray-800">฿{dailySales.toLocaleString()}</p>}
            </div>
            <div className="bg-[#B8C9B8]/10 rounded-xl p-4 text-center border border-[#B8C9B8]/30">
              <p className="text-xs text-gray-600 mb-1">เงินสดที่ได้</p>
              {loading ? <p className="text-lg font-bold text-gray-400">กำลังโหลด...</p> : <p className="text-lg font-bold text-gray-800">฿{dailyCashSales.toLocaleString()}</p>}
            </div>
            <div className="bg-[#B8C9B8]/10 rounded-xl p-4 text-center border border-[#B8C9B8]/30">
              <p className="text-xs text-gray-600 mb-1">เงินคงเหลือในเก๊ะ</p>
              <p className="text-lg font-bold text-gray-800">฿{RESERVE_AMOUNT.toLocaleString()}</p>
            </div>
          </div>

          {/* Expected Amount */}
          <div className="bg-[#B8C9B8]/10 rounded-xl p-4 border border-[#B8C9B8]/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-[#6B7B6B]" />
                <span className="text-sm font-medium text-gray-700">เงินที่ควรมีในเก๊ะ (คงเหลือ + ขายได้)</span>
              </div>
              <span className="text-xl font-bold text-gray-800">฿{expectedAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Bills Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Banknote className="w-4 h-4 text-gray-600" />
              ธนบัตร (รวม: ฿{billsTotal.toLocaleString()})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {BILLS.map(renderDenomination)}
            </div>
          </div>

          {/* Coins Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-500" />
              เหรียญ (รวม: ฿{coinsTotal.toLocaleString()})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {COINS.map(renderDenomination)}
            </div>
          </div>

          {/* Total Calculated */}
          <div className="bg-[#B8C9B8]/20 rounded-xl p-4 border-2 border-[#B8C9B8]/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#6B7B6B]" />
                <span className="font-semibold text-gray-800">ยอดรวมที่นับได้</span>
              </div>
              <span className="text-2xl font-bold text-gray-800">฿{totalCalculated.toLocaleString()}</span>
            </div>
          </div>

          {/* Difference */}
          <div className={`rounded-xl p-4 border-2 ${difference === 0 ? 'bg-green-50 border-green-200' : difference > 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between">
              <span className={`font-semibold ${difference === 0 ? 'text-green-700' : difference > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {difference === 0 ? '✓ ยอดตรง' : difference > 0 ? 'เกิน' : 'ขาด'}
              </span>
              <span className={`text-xl font-bold ${difference === 0 ? 'text-green-700' : difference > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {difference > 0 ? '+' : ''}฿{difference.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Amount to Remove */}
          {amountToRemove > 0 && (
            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">เงินที่ต้องนำออกจากเก๊ะ</p>
                  <p className="text-xs text-blue-500">ให้เหลือเงินในเก๊ะ ฿2,500</p>
                </div>
                <span className="text-xl font-bold text-blue-700">฿{amountToRemove.toLocaleString()}</span>
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
              className="w-full h-20 p-3 text-sm bg-gray-50 border border-[#B8C9B8]/30 rounded-xl focus:ring-2 focus:ring-[#B8C9B8]/30 focus:border-[#B8C9B8] outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-[#B8C9B8]/30 rounded-b-2xl">
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1 rounded-xl border-[#B8C9B8]/50">
              ยกเลิก
            </Button>
            {savedData ? (
              <Button onClick={handlePrint} className="flex-1 bg-[#B8C9B8] hover:bg-[#A8B9A8] text-gray-800 rounded-xl shadow-md">
                <Printer className="w-4 h-4 mr-2" />
                พิมพ์ใบปิดร้าน
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[#B8C9B8] hover:bg-[#A8B9A8] text-gray-800 rounded-xl shadow-md">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'กำลังบันทึก...' : 'บันทึกปิดร้าน'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
