import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  CreditCard, 
  Calendar, 
  ChevronLeft, 
  RefreshCw,
  Printer,
  BookOpen,
  DollarSign,
  Wallet,
  QrCode,
  ArrowRightLeft
} from 'lucide-react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'

interface PaymentChannel {
  id: string
  name: string
  icon: React.ReactNode
  color: string
  amount: number
  transaction_count: number
}

interface PaymentSummary {
  date: string
  total_amount: number
  total_transactions: number
  channels: PaymentChannel[]
}

const salesChannels = [
  { id: 'walk-in', name: 'หน้าร้าน', color: 'bg-blue-100 text-blue-700' },
  { id: 'grab', name: 'Grab', color: 'bg-green-100 text-green-700' },
  { id: 'shopee', name: 'Shopee', color: 'bg-orange-100 text-orange-700' },
  { id: 'lineman', name: 'Lineman', color: 'bg-yellow-100 text-yellow-700' }
]

export default function PaymentSummaryPage() {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [summary, setSummary] = useState<PaymentSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentMethods, setPaymentMethods] = useState<{id: string; name: string}[]>([])

  useEffect(() => {
    fetchPaymentMethods()
  }, [])

  useEffect(() => {
    fetchPaymentSummary()
  }, [selectedDate])

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order')
      
      if (error) throw error
      setPaymentMethods(data || [])
    } catch (error) {
      console.error('Error fetching payment methods:', error)
    }
  }

  const fetchPaymentSummary = async () => {
    setLoading(true)
    try {
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)

      // Fetch orders with their payments and sales channel info
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          total,
          payment_method,
          platform_id,
          created_at
        `)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .eq('payment_status', 'paid')

      if (error) throw error

      // Initialize channels with payment methods
      const channels: PaymentChannel[] = paymentMethods.map(pm => ({
        id: pm.id,
        name: pm.name,
        icon: getPaymentIcon(pm.name),
        color: getPaymentColor(pm.name),
        amount: 0,
        transaction_count: 0
      }))

      // Also add sales channel summary
      const salesChannelSummary: Record<string, { amount: number; count: number }> = {}
      
      salesChannels.forEach(sc => {
        salesChannelSummary[sc.id] = { amount: 0, count: 0 }
      })

      let totalAmount = 0
      let totalTransactions = 0

      orders?.forEach(order => {
        // Find the payment method channel
        const channel = channels.find(c => {
          // Match by payment method name (case insensitive)
          const orderPM = (order.payment_method || '').toLowerCase()
          const channelName = c.name.toLowerCase()
          return orderPM.includes(channelName) || 
                 (orderPM.includes('cash') && channelName.includes('เงินสด')) ||
                 (orderPM.includes('transfer') && channelName.includes('โอน')) ||
                 (orderPM.includes('promptpay') && (channelName.includes('พร้อมเพย์') || channelName.includes('qr'))) ||
                 (orderPM.includes('credit') && channelName.includes('บัตร'))
        })
        
        if (channel) {
          channel.amount += order.total || 0
          channel.transaction_count += 1
        }
        totalAmount += order.total || 0
        totalTransactions += 1

        // Aggregate by sales channel (platform_id)
        const platformId = order.platform_id || 'walk-in'
        if (salesChannelSummary[platformId]) {
          salesChannelSummary[platformId].amount += order.total || 0
          salesChannelSummary[platformId].count += 1
        }
      })

      setSummary({
        date: selectedDate,
        total_amount: totalAmount,
        total_transactions: totalTransactions,
        channels: channels.filter(c => c.amount > 0)
      })

    } catch (error) {
      console.error('Error fetching payment summary:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPaymentIcon = (name: string) => {
    const lowerName = name.toLowerCase()
    if (lowerName.includes('cash') || lowerName.includes('เงินสด')) return <DollarSign className="h-5 w-5" />
    if (lowerName.includes('qr') || lowerName.includes('พร้อมเพย์') || lowerName.includes('ถุงเงิน')) return <QrCode className="h-5 w-5" />
    if (lowerName.includes('transfer') || lowerName.includes('โอน')) return <ArrowRightLeft className="h-5 w-5" />
    return <Wallet className="h-5 w-5" />
  }

  const getPaymentColor = (name: string) => {
    const lowerName = name.toLowerCase()
    if (lowerName.includes('cash') || lowerName.includes('เงินสด')) return 'bg-green-100 text-green-700'
    if (lowerName.includes('qr') || lowerName.includes('พร้อมเพย์') || lowerName.includes('ถุงเงิน')) return 'bg-blue-100 text-blue-700'
    if (lowerName.includes('transfer') || lowerName.includes('โอน')) return 'bg-purple-100 text-purple-700'
    return 'bg-gray-100 text-gray-700'
  }

  const handlePrint = () => {
    if (!summary) return
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const date = new Date(summary.date).toLocaleDateString('th-TH')
    const time = new Date().toLocaleTimeString('th-TH')
    
    const channelRows = summary.channels.map(ch => `
      <tr>
        <td style="text-align:left;padding:6px 0;border-bottom:1px dashed #ddd;">
          ${ch.name}
        </td>
        <td style="text-align:right;padding:6px 0;border-bottom:1px dashed #ddd;font-weight:500;">
          ฿${ch.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
        </td>
        <td style="text-align:center;padding:6px 0;border-bottom:1px dashed #ddd;color:#666;font-size:10px;">
          ${ch.transaction_count} รายการ
        </td>
      </tr>
    `).join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>สรุปยอดชำระเงิน - ${date}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { font-family: 'Sarabun', sans-serif; width: 80mm; padding: 5mm; margin: 0; font-size: 12px; }
          .header { text-align: center; border-bottom: 1px dashed #999; padding-bottom: 8px; margin-bottom: 8px; }
          .header h1 { font-size: 14px; margin: 0; font-weight: bold; }
          .header h2 { font-size: 12px; margin: 4px 0; color: #333; }
          .header p { font-size: 10px; margin: 2px 0; color: #666; }
          table { width: 100%; border-collapse: collapse; }
          .summary { background: #f5f5f5; padding: 8px; border-radius: 4px; margin: 8px 0; }
          .summary-row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 11px; }
          .total { font-size: 14px; font-weight: bold; border-top: 2px solid #333; padding-top: 8px; margin-top: 8px; }
          .footer { text-align: center; font-size: 10px; color: #999; margin-top: 16px; border-top: 1px dashed #999; padding-top: 8px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MORE DRUGSTORE</h1>
          <h2>สรุปยอดชำระเงิน</h2>
          <p>วันที่: ${date} ${time}</p>
        </div>
        
        <table>
          <thead>
            <tr style="font-size:10px;color:#666;border-bottom:1px solid #999;">
              <th style="text-align:left;padding:4px 0;">ช่องทาง</th>
              <th style="text-align:right;padding:4px 0;">ยอดเงิน</th>
              <th style="text-align:center;padding:4px 0;">รายการ</th>
            </tr>
          </thead>
          <tbody>
            ${channelRows}
          </tbody>
        </table>

        <div class="summary total">
          <div class="summary-row">
            <span>ยอดรวมทั้งหมด:</span>
            <span>฿${summary.total_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
          </div>
          <div class="summary-row" style="font-size:10px;color:#666;margin-top:4px;">
            <span>จำนวนรายการ:</span>
            <span>${summary.total_transactions} รายการ</span>
          </div>
        </div>

        <div class="footer">
          <p>ลงชื่อ _________________________</p>
          <p style="margin-top:4px;">ผู้ตรวจสอบ</p>
        </div>
        
        <div class="no-print" style="margin-top:20px;text-align:center;">
          <button onclick="window.print()" style="padding:8px 16px;font-size:12px;cursor:pointer;background:#A67B5B;color:white;border:none;border-radius:4px;">
            พิมพ์ใบสรุป
          </button>
        </div>
      </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <CreditCard className="h-8 w-8 text-[#a67c52] mt-1" />
          <div>
            <h1 className="text-2xl font-bold text-[#5c4a32]">สรุปยอดชำระเงิน</h1>
            <p className="text-[#8b7355]">สรุปยอดเงินที่เข้ามาในทุกช่องทาง</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-help-modal'))}
            className="p-2 text-gray-400 hover:text-[#7D735F] hover:bg-[#F5F0E6] rounded-full transition-all"
            title="คู่มือการใช้งาน"
          >
            <BookOpen className="h-5 w-5" />
          </button>
          <Link 
            to="/cashier-closing-report"
            className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-gray-300 bg-white text-gray-600 text-sm whitespace-nowrap hover:bg-gray-50 transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
            กลับไปรายงานปิดร้าน
          </Link>
        </div>
      </div>

      {/* Date Filter */}
      <Card className="mb-6 border-[#e8e0d5]">
        <div className="p-4 flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#a67c52]" />
            <span className="text-sm font-medium text-[#5c4a32]">เลือกวันที่:</span>
          </div>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full sm:w-48"
          />
          <Button
            variant="secondary"
            onClick={fetchPaymentSummary}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            รีเฟรช
          </Button>
        </div>
      </Card>

      {/* Summary Cards */}
      {loading ? (
        <Card className="p-8 text-center border-[#e8e0d5]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#a67c52] mx-auto"></div>
          <p className="text-[#8b7355] mt-2">กำลังโหลด...</p>
        </Card>
      ) : summary && summary.channels.length > 0 ? (
        <>
          {/* Total Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <Card className="bg-[#f5f0e8] border-[#d4c9b8] text-[#5c4a32]">
              <div className="p-4 text-center">
                <p className="text-xs text-[#8b7355] mb-1">ยอดรวมทั้งหมด</p>
                <p className="text-2xl font-bold text-[#5c4a32]">
                  ฿{summary.total_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </Card>
            <Card className="bg-[#faf6f0] border-[#d4c9b8] text-[#5c4a32]">
              <div className="p-4 text-center">
                <p className="text-xs text-[#8b7355] mb-1">จำนวนรายการ</p>
                <p className="text-2xl font-bold text-[#5c4a32]">
                  {summary.total_transactions} รายการ
                </p>
              </div>
            </Card>
          </div>

          {/* Channel Breakdown */}
          <Card className="mb-6 border-[#e8e0d5]">
            <div className="p-4 border-b border-[#e8e0d5] bg-[#faf8f5]">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#5c4a32]">รายละเอียดตามช่องทางชำระเงิน</h2>
                <Button
                  variant="primary"
                  onClick={handlePrint}
                  className="flex items-center gap-2 bg-[#a67c52] hover:bg-[#8b7355]"
                >
                  <Printer className="h-4 w-4" />
                  พิมพ์ใบสรุป
                </Button>
              </div>
            </div>
            <div className="divide-y divide-[#e8e0d5]">
              {summary.channels.map((channel) => (
                <div key={channel.id} className="p-4 flex items-center justify-between hover:bg-[#faf8f5]">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-[#f5f0e8] text-[#a67c52]`}>
                      {channel.icon}
                    </div>
                    <div>
                      <p className="font-medium text-[#5c4a32]">{channel.name}</p>
                      <p className="text-xs text-[#8b7355]">{channel.transaction_count} รายการ</p>
                    </div>
                  </div>
                  <p className="font-bold text-lg text-[#5c4a32]">
                    ฿{channel.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Print Preview */}
          <Card className="border-dashed border-2 border-[#d4c9b8] bg-[#faf8f5]">
            <div className="p-4 text-center">
              <Printer className="h-8 w-8 text-[#a67c52] mx-auto mb-2" />
              <p className="text-sm text-[#8b7355] mb-3">
                สามารถพิมพ์ใบสรุปยอดชำระเงินออกกระดาษขนาด 80mm
              </p>
              <Button
                variant="primary"
                onClick={handlePrint}
                className="flex items-center gap-2 mx-auto bg-[#a67c52] hover:bg-[#8b7355]"
              >
                <Printer className="h-4 w-4" />
                พิมพ์ใบสรุป (ขนาด 80mm)
              </Button>
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-8 text-center border-[#e8e0d5]">
          <CreditCard className="h-12 w-12 text-[#d4c9b8] mx-auto mb-3" />
          <p className="text-[#8b7355]">ไม่พบข้อมูลการชำระเงินในวันที่เลือก</p>
          <p className="text-sm text-[#a67c52] mt-1">ลองเลือกวันที่อื่นหรือตรวจสอบรายการขาย</p>
        </Card>
      )}
    </div>
  )
}
