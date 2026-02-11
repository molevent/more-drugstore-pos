import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Wallet, 
  Calendar, 
  ChevronLeft, 
  ChevronUp,
  RefreshCw,
  Printer,
  User,
  ArrowDown,
  ArrowUp,
  Minus
} from 'lucide-react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'

interface CashierClosing {
  id: string
  user_id: string
  closing_date: string
  reserve_amount: number
  daily_cash_sales: number
  expected_amount: number
  actual_amount: number
  difference: number
  amount_to_remove: number
  denominations: { value: number; count: number }[]
  notes: string
  created_at: string
  user?: { full_name: string }
}

export default function CashierClosingReportPage() {
  const [closings, setClosings] = useState<CashierClosing[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchClosings()
  }, [])

  const fetchClosings = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('cashier_closings')
        .select(`
          *,
          user:users(full_name)
        `)
        .order('closing_date', { ascending: false })
        .limit(30)

      if (error) throw error
      setClosings(data || [])
    } catch (error) {
      console.error('Error fetching cashier closings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = (closing: CashierClosing) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const date = new Date(closing.closing_date).toLocaleDateString('th-TH')
    const time = new Date(closing.created_at).toLocaleTimeString('th-TH')
    const userName = closing.user?.full_name || 'ไม่ระบุ'
    
    const billRows = [1000, 500, 100, 50, 20].map(value => {
      const denom = closing.denominations.find(d => d.value === value)
      const count = denom?.count || 0
      if (count === 0) return ''
      return `<tr><td style="text-align:left;padding:4px 0;">แบงค์ ${value}</td><td style="text-align:center;padding:4px 0;">× ${count}</td><td style="text-align:right;padding:4px 0;">฿${(value * count).toLocaleString()}</td></tr>`
    }).join('')

    const coinRows = [10, 5, 2, 1].map(value => {
      const denom = closing.denominations.find(d => d.value === value)
      const count = denom?.count || 0
      if (count === 0) return ''
      return `<tr><td style="text-align:left;padding:4px 0;">เหรียญ ${value}</td><td style="text-align:center;padding:4px 0;">× ${count}</td><td style="text-align:right;padding:4px 0;">฿${(value * count).toLocaleString()}</td></tr>`
    }).join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ใบปิดร้าน - ${date}</title>
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
          <p>${date} ${time}</p>
          <p>ผู้ปิดร้าน: ${userName}</p>
        </div>
        <div class="summary">
          <div class="summary-row"><span>ยอดขายเงินสด:</span><span>฿${closing.daily_cash_sales.toLocaleString()}</span></div>
          <div class="summary-row"><span>เงินคงเหลือในเก๊ะ:</span><span>฿${closing.reserve_amount.toLocaleString()}</span></div>
          <div class="summary-row" style="font-weight:bold;"><span>เงินที่ควรมี:</span><span>฿${closing.expected_amount.toLocaleString()}</span></div>
        </div>
        ${billRows ? `<div class="section"><div class="section-title">ธนบัตร</div><table>${billRows}</table></div>` : ''}
        ${coinRows ? `<div class="section"><div class="section-title">เหรียญ</div><table>${coinRows}</table></div>` : ''}
        <div class="summary total"><div class="summary-row"><span>ยอดรวมที่นับได้:</span><span>฿${closing.actual_amount.toLocaleString()}</span></div></div>
        <div class="summary" style="background: ${closing.difference === 0 ? '#e8f5e9' : closing.difference > 0 ? '#e3f2fd' : '#ffebee'};">
          <div class="summary-row"><span>${closing.difference === 0 ? '✓ ยอดตรง' : closing.difference > 0 ? 'เกิน' : 'ขาด'}:</span><span>${closing.difference > 0 ? '+' : ''}฿${closing.difference.toLocaleString()}</span></div>
          ${closing.amount_to_remove > 0 ? `<div class="summary-row" style="font-weight:bold;color:#1976d2;"><span>เงินที่ต้องนำออก:</span><span>฿${closing.amount_to_remove.toLocaleString()}</span></div>` : ''}
        </div>
        ${closing.notes ? `<div class="section"><div class="section-title">หมายเหตุ</div><p style="font-size:10px;margin:4px 0;">${closing.notes}</p></div>` : ''}
        <div class="footer"><p>ลงชื่อ _________________________</p><p style="margin-top:4px;">ผู้ปิดร้าน</p></div>
        <div class="no-print" style="margin-top:20px;text-align:center;"><button onclick="window.print()" style="padding:8px 16px;font-size:12px;cursor:pointer;">พิมพ์ใบปิดร้าน</button></div>
      </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const getDifferenceIcon = (diff: number) => {
    if (diff === 0) return <Minus className="w-4 h-4 text-green-600" />
    if (diff > 0) return <ArrowUp className="w-4 h-4 text-blue-600" />
    return <ArrowDown className="w-4 h-4 text-red-600" />
  }

  const getDifferenceClass = (diff: number) => {
    if (diff === 0) return 'text-green-700 bg-green-50'
    if (diff > 0) return 'text-blue-700 bg-blue-50'
    return 'text-red-700 bg-red-50'
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="h-7 w-7 text-[#B8C9B8]" />
            รายงานปิดร้าน / นับเงิน
          </h1>
          <p className="text-gray-600 mt-1">ตรวจสอบประวัติการปิดร้านและยอดเงินในเก๊ะ</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={fetchClosings}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            รีเฟรช
          </Button>
          <Link to="/pos">
            <Button className="bg-[#B8C9B8] hover:bg-[#A8B9A8] text-gray-800">
              <Wallet className="h-4 w-4 mr-2" />
              ปิดร้านวันนี้
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card className="bg-[#B8C9B8]/10 border-[#B8C9B8]/30">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">จำนวนครั้งที่ปิดร้าน</p>
            <p className="text-2xl font-bold text-gray-800">{closings.length}</p>
          </div>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">ยอดขายเงินสดเฉลี่ย/วัน</p>
            <p className="text-2xl font-bold text-blue-700">
              ฿{closings.length > 0 ? Math.round(closings.reduce((sum, c) => sum + c.daily_cash_sales, 0) / closings.length).toLocaleString() : '0'}
            </p>
          </div>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">ยอดตรง (ครั้ง)</p>
            <p className="text-2xl font-bold text-green-700">
              {closings.filter(c => c.difference === 0).length}
            </p>
          </div>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">ยอดไม่ตรง (ครั้ง)</p>
            <p className="text-2xl font-bold text-amber-700">
              {closings.filter(c => c.difference !== 0).length}
            </p>
          </div>
        </Card>
      </div>

      {/* Closing List */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#B8C9B8]" />
            ประวัติการปิดร้าน
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-[#B8C9B8] animate-spin mx-auto mb-2" />
            <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
          </div>
        ) : closings.length === 0 ? (
          <div className="p-8 text-center">
            <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">ยังไม่มีประวัติการปิดร้าน</p>
            <Link to="/pos" className="text-[#B8C9B8] hover:underline text-sm mt-2 inline-block">
              ไปที่หน้า POS เพื่อปิดร้าน
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {closings.map((closing) => (
              <div key={closing.id} className="hover:bg-gray-50">
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === closing.id ? null : closing.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#B8C9B8]/10 rounded-xl flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-[#B8C9B8]" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {new Date(closing.closing_date).toLocaleDateString('th-TH', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <User className="w-3 h-3" />
                          <span>{closing.user?.full_name || 'ไม่ระบุ'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-gray-800">฿{closing.actual_amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">นับได้ / ควรมี ฿{closing.expected_amount.toLocaleString()}</p>
                      </div>
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getDifferenceClass(closing.difference)}`}>
                        {getDifferenceIcon(closing.difference)}
                        <span>{closing.difference > 0 ? '+' : ''}฿{closing.difference.toLocaleString()}</span>
                      </div>
                      {expandedId === closing.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronLeft className="w-5 h-5 text-gray-400" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === closing.id && (
                  <div className="px-4 pb-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                      {/* Denominations */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">รายละเอียดเงิน</h4>
                        <div className="space-y-2">
                          {closing.denominations.filter(d => d.count > 0).map((d) => (
                            <div key={d.value} className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
                              <span className="text-sm text-gray-600">
                                {d.value >= 20 ? 'แบงค์' : 'เหรียญ'} {d.value}
                              </span>
                              <div className="flex items-center gap-4">
                                <span className="text-sm font-medium">× {d.count}</span>
                                <span className="text-sm font-bold text-gray-800 w-20 text-right">
                                  ฿{(d.value * d.count).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Summary */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">สรุปยอด</h4>
                        <div className="space-y-2 bg-white rounded-xl p-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">ยอดขายเงินสด</span>
                            <span className="font-medium">฿{closing.daily_cash_sales.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">เงินคงเหลือในเก๊ะ</span>
                            <span className="font-medium">฿{closing.reserve_amount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm font-semibold border-t pt-2">
                            <span>เงินที่ควรมี</span>
                            <span>฿{closing.expected_amount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">ยอดที่นับได้</span>
                            <span className="font-bold">฿{closing.actual_amount.toLocaleString()}</span>
                          </div>
                          {closing.amount_to_remove > 0 && (
                            <div className="flex justify-between text-sm text-blue-600 font-semibold bg-blue-50 p-2 rounded-lg">
                              <span>เงินที่ต้องนำออก</span>
                              <span>฿{closing.amount_to_remove.toLocaleString()}</span>
                            </div>
                          )}
                          {closing.notes && (
                            <div className="mt-3 pt-3 border-t">
                              <span className="text-xs text-gray-500">หมายเหตุ:</span>
                              <p className="text-sm text-gray-700 mt-1">{closing.notes}</p>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="secondary"
                          onClick={() => handlePrint(closing)}
                          className="w-full mt-3 flex items-center justify-center gap-2"
                        >
                          <Printer className="w-4 h-4" />
                          พิมพ์ใบปิดร้าน
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
