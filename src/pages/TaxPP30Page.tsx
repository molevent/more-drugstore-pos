import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import { Receipt, TrendingUp, TrendingDown, Calculator, FileText, Calendar, Search, ArrowLeft } from 'lucide-react'

interface InputVatItem {
  id: string
  date: string
  document_number: string
  description: string
  vendor: string
  amount: number
  vat_amount: number
  type: 'expense' | 'purchase'
}

interface OutputVatItem {
  id: string
  date: string
  document_number: string
  description: string
  customer: string
  amount: number
  vat_amount: number
  type: 'sale' | 'invoice'
}

export default function TaxPP30Page() {
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  })
  const [searchTerm, setSearchTerm] = useState('')
  
  // Data states
  const [inputVatItems, setInputVatItems] = useState<InputVatItem[]>([])
  const [outputVatItems, setOutputVatItems] = useState<OutputVatItem[]>([])
  
  // Summary states
  const [totalInputVat, setTotalInputVat] = useState(0)
  const [totalOutputVat, setTotalOutputVat] = useState(0)
  const [vatDifference, setVatDifference] = useState(0)
  
  // Fetch data when month changes
  useEffect(() => {
    fetchVATData()
  }, [selectedMonth])
  
  const fetchVATData = async () => {
    setLoading(true)
    try {
      const [year, month] = selectedMonth.split('-')
      const startDate = `${year}-${month}-01`
      const endDate = `${year}-${month}-31`
      
      // Fetch expenses with VAT (ภาษีซื้อ)
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('id, document_date, expense_date, description, vendor, amount, vat_amount, receipt_number')
        .gte('document_date', startDate)
        .lte('document_date', endDate)
        .gt('vat_amount', 0)
        .order('document_date', { ascending: true })
      
      if (expensesError) throw expensesError
      
      // Fetch sales orders with VAT (ภาษีขาย)
      const { data: salesData, error: salesError } = await supabase
        .from('sales_orders')
        .select('id, order_date, order_number, description, customer_name, total_amount, vat_amount')
        .gte('order_date', startDate)
        .lte('order_date', endDate)
        .gt('vat_amount', 0)
        .order('order_date', { ascending: true })
      
      if (salesError) throw salesError
      
      // Transform expense data
      const inputItems: InputVatItem[] = (expensesData || []).map(expense => ({
        id: expense.id,
        date: expense.document_date || expense.expense_date,
        document_number: expense.receipt_number || '-',
        description: expense.description,
        vendor: expense.vendor || '-',
        amount: expense.amount,
        vat_amount: expense.vat_amount || 0,
        type: 'expense'
      }))
      
      // Transform sales data
      const outputItems: OutputVatItem[] = (salesData || []).map(sale => ({
        id: sale.id,
        date: sale.order_date,
        document_number: sale.order_number,
        description: sale.description || 'ขายสินค้า',
        customer: sale.customer_name || 'ลูกค้าเงินสด',
        amount: sale.total_amount,
        vat_amount: sale.vat_amount || 0,
        type: 'sale'
      }))
      
      setInputVatItems(inputItems)
      setOutputVatItems(outputItems)
      
      // Calculate totals
      const totalInput = inputItems.reduce((sum, item) => sum + item.vat_amount, 0)
      const totalOutput = outputItems.reduce((sum, item) => sum + item.vat_amount, 0)
      
      setTotalInputVat(totalInput)
      setTotalOutputVat(totalOutput)
      setVatDifference(totalOutput - totalInput)
      
    } catch (error) {
      console.error('Error fetching VAT data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // Filter items based on search
  const filteredInputItems = inputVatItems.filter(item => 
    !searchTerm || 
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.document_number.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const filteredOutputItems = outputVatItems.filter(item => 
    !searchTerm || 
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.document_number.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  // Generate month options
  const getMonthOptions = () => {
    const options = []
    const currentYear = new Date().getFullYear()
    const years = [currentYear - 1, currentYear, currentYear + 1]
    
    for (const year of years) {
      for (let month = 1; month <= 12; month++) {
        const value = `${year}-${String(month).padStart(2, '0')}`
        const label = new Date(year, month - 1).toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })
        options.push({ value, label })
      }
    }
    return options
  }
  
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <Link to="/expenses" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#7D735F] mb-2 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            เอกสาร
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-7 w-7 text-amber-600" />
            ภ.พ.30 (VAT Return)
          </h1>
          <p className="text-gray-600 mt-1">รายงานภาษีมูลค่าเพิ่ม ภาษีซื้อและภาษีขาย</p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 px-3 py-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border-none outline-none text-sm text-gray-700 bg-transparent"
          >
            {getMonthOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 px-3 py-2 flex-1 max-w-md">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหารายการ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-none outline-none text-sm text-gray-700 bg-transparent flex-1"
          />
        </div>
      </div>
      
      {/* Summary Cards - Bridgerton Theme */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Input VAT */}
        <Card className="bg-[#E8E0E8] border-[#C4B8D4]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#C4B8D4] rounded-full">
              <TrendingDown className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-[#6B5B7A] font-medium">ภาษีซื้อ (Input VAT)</p>
              <p className="text-2xl font-bold text-[#5A4A6A]">
                ฿{totalInputVat.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-[#8A7A9A]">{filteredInputItems.length} รายการ</p>
            </div>
          </div>
        </Card>
        
        {/* Output VAT */}
        <Card className="bg-[#F5F0E8] border-[#D4A5A5]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#D4A5A5] rounded-full">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-[#8A5A5A] font-medium">ภาษีขาย (Output VAT)</p>
              <p className="text-2xl font-bold text-[#7A4A4A]">
                ฿{totalOutputVat.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-[#9A6A6A]">{filteredOutputItems.length} รายการ</p>
            </div>
          </div>
        </Card>
        
        {/* VAT Difference */}
        <Card className={`${vatDifference >= 0 ? 'bg-[#E8F0E8] border-[#B8C9B8]' : 'bg-[#E8D8C4] border-[#C9A961]'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${vatDifference >= 0 ? 'bg-[#B8C9B8]' : 'bg-[#C9A961]'}`}>
              <Calculator className={`h-6 w-6 text-white`} />
            </div>
            <div>
              <p className={`text-sm font-medium ${vatDifference >= 0 ? 'text-[#5A7A5A]' : 'text-[#8A6A3A]'}`}>
                {vatDifference >= 0 ? 'ต้องนำส่งภาษี' : 'ภาษีเกินสามารถขอคืน'}
              </p>
              <p className={`text-2xl font-bold ${vatDifference >= 0 ? 'text-[#4A6A4A]' : 'text-[#7A5A2A]'}`}>
                ฿{Math.abs(vatDifference).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </p>
              <p className={`text-xs ${vatDifference >= 0 ? 'text-[#6A8A6A]' : 'text-[#9A7A4A]'}`}>
                {vatDifference >= 0 ? 'ภาษีขาย > ภาษีซื้อ' : 'ภาษีซื้อ > ภาษีขาย'}
              </p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* VAT Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input VAT Table */}
        <Card className="border-[#C4B8D4]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#5A4A6A] flex items-center gap-2">
              <Receipt className="h-5 w-5 text-[#8A7A9A]" />
              ภาษีซื้อ (Input VAT)
            </h2>
            <span className="text-sm text-[#8A7A9A]">{filteredInputItems.length} รายการ</span>
          </div>
          
          {loading ? (
            <p className="text-center text-gray-500 py-8">กำลังโหลด...</p>
          ) : filteredInputItems.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">ไม่พบรายการภาษีซื้อ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-600 font-medium">วันที่</th>
                    <th className="px-3 py-2 text-left text-gray-600 font-medium">เลขที่เอกสาร</th>
                    <th className="px-3 py-2 text-left text-gray-600 font-medium">รายการ</th>
                    <th className="px-3 py-2 text-left text-gray-600 font-medium">ผู้จำหน่าย</th>
                    <th className="px-3 py-2 text-right text-gray-600 font-medium">ยอดเงิน</th>
                    <th className="px-3 py-2 text-right text-gray-600 font-medium">ภาษี</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredInputItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-700">
                        {new Date(item.date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{item.document_number}</td>
                      <td className="px-3 py-2 text-gray-700">{item.description}</td>
                      <td className="px-3 py-2 text-gray-600">{item.vendor}</td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-red-600">
                        {item.vat_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#E8E0E8]">
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-right font-medium text-[#5A4A6A]">
                      รวมภาษีซื้อ
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-[#5A4A6A]">
                      {totalInputVat.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
        
        {/* Output VAT Table */}
        <Card className="border-[#D4A5A5]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#7A4A4A] flex items-center gap-2">
              <Receipt className="h-5 w-5 text-[#9A6A6A]" />
              ภาษีขาย (Output VAT)
            </h2>
            <span className="text-sm text-[#9A6A6A]">{filteredOutputItems.length} รายการ</span>
          </div>
          
          {loading ? (
            <p className="text-center text-gray-500 py-8">กำลังโหลด...</p>
          ) : filteredOutputItems.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">ไม่พบรายการภาษีขาย</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-600 font-medium">วันที่</th>
                    <th className="px-3 py-2 text-left text-gray-600 font-medium">เลขที่เอกสาร</th>
                    <th className="px-3 py-2 text-left text-gray-600 font-medium">รายการ</th>
                    <th className="px-3 py-2 text-left text-gray-600 font-medium">ลูกค้า</th>
                    <th className="px-3 py-2 text-right text-gray-600 font-medium">ยอดเงิน</th>
                    <th className="px-3 py-2 text-right text-gray-600 font-medium">ภาษี</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOutputItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-700">
                        {new Date(item.date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{item.document_number}</td>
                      <td className="px-3 py-2 text-gray-700">{item.description}</td>
                      <td className="px-3 py-2 text-gray-600">{item.customer}</td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-green-600">
                        {item.vat_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#F5F0E8]">
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-right font-medium text-[#7A4A4A]">
                      รวมภาษีขาย
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-[#7A4A4A]">
                      {totalOutputVat.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
      </div>
      
      {/* Summary Report Card - Bridgerton Theme */}
      <Card className="mt-6 bg-gradient-to-r from-[#F5F0E8] via-[#E8E0E8] to-[#E8F0E8] border-[#D4A5A5]">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#D4A5A5] rounded-full">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-[#4A4A4A]">สรุปยอดภาษีมูลค่าเพิ่ม</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-[#D4A5A5]">
            <p className="text-sm text-[#8A6A6A]">ภาษีขาย (Output)</p>
            <p className="text-xl font-bold text-[#7A4A4A]">
              ฿{totalOutputVat.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-[#C4B8D4]">
            <p className="text-sm text-[#6B5B7A]">ภาษีซื้อ (Input)</p>
            <p className="text-xl font-bold text-[#5A4A6A]">
              ฿{totalInputVat.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-[#B8C9B8]">
            <p className="text-sm text-[#5A7A5A]">ส่วนต่าง</p>
            <p className={`text-xl font-bold ${vatDifference >= 0 ? 'text-[#4A6A4A]' : 'text-[#8A6A3A]'}`}>
              ฿{Math.abs(vatDifference).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
          
          <div className={`rounded-lg p-4 shadow-sm border ${vatDifference >= 0 ? 'bg-[#E8F0E8] border-[#B8C9B8]' : 'bg-[#E8D8C4] border-[#C9A961]'}`}>
            <p className="text-sm text-[#4A4A4A]">ผลลัพธ์</p>
            <p className={`text-lg font-bold ${vatDifference >= 0 ? 'text-[#4A6A4A]' : 'text-[#7A5A2A]'}`}>
              {vatDifference >= 0 ? 'ต้องนำส่ง' : 'ขอคืนได้'}
            </p>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-white rounded-lg text-sm text-[#4A4A4A] border border-[#C9A961]">
          <p className="font-medium mb-1 text-[#7A5A4A]">หมายเหตุ:</p>
          <ul className="list-disc list-inside space-y-1 text-[#5A5A5A]">
            <li>ภาษีขาย (Output VAT): ภาษีที่เก็บจากลูกค้าเมื่อขายสินค้า/บริการ</li>
            <li>ภาษีซื้อ (Input VAT): ภาษีที่จ่ายให้ผู้ขายเมื่อซื้อสินค้า/บริการ</li>
            <li>หากภาษีขาย {'>'} ภาษีซื้อ = ต้องนำส่งสรรพากร</li>
            <li>หากภาษีซื้อ {'>'} ภาษีขาย = สามารถขอคืนภาษีหรือนำไปหักในเดือนถัดไป</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
