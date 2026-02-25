import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { Percent, Plus, Search, Trash2, Edit2, BookOpen, ArrowLeft, Upload, X, CheckSquare, Square, RefreshCw, Download } from 'lucide-react'
import { syncWhtToFlowAccount, getWithholdingTaxes } from '../services/flowaccount'

interface WithholdingTax {
  id: string
  document_date: string
  document_number: string
  payer_name: string
  payer_tax_id?: string
  payee_name: string
  payee_tax_id?: string
  income_type: string
  income_amount: number
  tax_rate: number
  tax_amount: number
  payment_date?: string
  notes?: string
  created_at: string
  updated_at: string
}

const INCOME_TYPES = [
  { value: 'ค่าจ้าง', rate: 3 },
  { value: 'ค่าบริการ', rate: 3 },
  { value: 'ค่าเช่า', rate: 5 },
  { value: 'ค่าโฆษณา', rate: 2 },
  { value: 'ค่าสิทธิ', rate: 3 },
  { value: 'ค่าธรรมเนียม', rate: 3 },
  { value: 'ค่าดอกเบี้ย', rate: 15 },
  { value: 'เงินปันผล', rate: 10 },
  { value: 'อื่นๆ', rate: 0 }
]

export default function WithholdingTaxPage() {
  const [taxes, setTaxes] = useState<WithholdingTax[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingTax, setEditingTax] = useState<WithholdingTax | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // FlowAccount Sync states
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [selectedSyncIds, setSelectedSyncIds] = useState<Set<string>>(new Set())
  const [syncingToFa, setSyncingToFa] = useState(false)
  const [syncProgress, setSyncProgress] = useState('')
  const [importing, setImporting] = useState(false)
  
  const [formData, setFormData] = useState({
    document_date: new Date().toISOString().split('T')[0],
    document_number: '',
    payer_name: '',
    payer_tax_id: '',
    payee_name: '',
    payee_tax_id: '',
    income_type: 'ค่าจ้าง',
    income_amount: '',
    tax_rate: '3',
    tax_amount: '',
    payment_date: '',
    notes: ''
  })

  useEffect(() => {
    fetchTaxes()
  }, [])

  const fetchTaxes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('withholding_taxes')
        .select('*')
        .order('document_date', { ascending: false })

      if (error) throw error
      setTaxes(data || [])
    } catch (error) {
      console.error('Error fetching taxes:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateTaxAmount = (income: number, rate: number) => {
    return (income * rate) / 100
  }

  const handleIncomeChange = (amount: string, type: string) => {
    const incomeType = INCOME_TYPES.find(t => t.value === type)
    const rate = incomeType?.rate || 0
    const income = parseFloat(amount) || 0
    const tax = calculateTaxAmount(income, rate)
    
    setFormData(prev => ({
      ...prev,
      income_amount: amount,
      tax_rate: rate.toString(),
      tax_amount: tax.toFixed(2)
    }))
  }

  const handleTypeChange = (type: string) => {
    const incomeType = INCOME_TYPES.find(t => t.value === type)
    const rate = incomeType?.rate || 0
    const income = parseFloat(formData.income_amount) || 0
    const tax = calculateTaxAmount(income, rate)
    
    setFormData(prev => ({
      ...prev,
      income_type: type,
      tax_rate: rate.toString(),
      tax_amount: tax.toFixed(2)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const taxData = {
        document_date: formData.document_date,
        document_number: formData.document_number,
        payer_name: formData.payer_name,
        payer_tax_id: formData.payer_tax_id || null,
        payee_name: formData.payee_name,
        payee_tax_id: formData.payee_tax_id || null,
        income_type: formData.income_type,
        income_amount: parseFloat(formData.income_amount) || 0,
        tax_rate: parseFloat(formData.tax_rate) || 0,
        tax_amount: parseFloat(formData.tax_amount) || 0,
        payment_date: formData.payment_date || null,
        notes: formData.notes || null
      }

      if (editingTax) {
        const { error } = await supabase
          .from('withholding_taxes')
          .update(taxData)
          .eq('id', editingTax.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('withholding_taxes')
          .insert([taxData])
        
        if (error) throw error
      }

      setShowModal(false)
      resetForm()
      fetchTaxes()
    } catch (error) {
      console.error('Error saving tax:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบรายการหัก ณ ที่จ่ายนี้?')) return
    
    try {
      const { error } = await supabase
        .from('withholding_taxes')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      fetchTaxes()
    } catch (error) {
      console.error('Error deleting tax:', error)
      alert('เกิดข้อผิดพลาดในการลบ')
    }
  }

  const handleEdit = (tax: WithholdingTax) => {
    setEditingTax(tax)
    setFormData({
      document_date: tax.document_date,
      document_number: tax.document_number,
      payer_name: tax.payer_name,
      payer_tax_id: tax.payer_tax_id || '',
      payee_name: tax.payee_name,
      payee_tax_id: tax.payee_tax_id || '',
      income_type: tax.income_type,
      income_amount: tax.income_amount.toString(),
      tax_rate: tax.tax_rate.toString(),
      tax_amount: tax.tax_amount.toString(),
      payment_date: tax.payment_date || '',
      notes: tax.notes || ''
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      document_date: new Date().toISOString().split('T')[0],
      document_number: '',
      payer_name: '',
      payer_tax_id: '',
      payee_name: '',
      payee_tax_id: '',
      income_type: 'ค่าจ้าง',
      income_amount: '',
      tax_rate: '3',
      tax_amount: '',
      payment_date: '',
      notes: ''
    })
    setEditingTax(null)
  }

  const filteredTaxes = taxes.filter(tax => {
    // Date range filter
    if (dateFrom && tax.document_date < dateFrom) return false
    if (dateTo && tax.document_date > dateTo) return false

    // Search across all fields
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      return (
        tax.document_number.toLowerCase().includes(s) ||
        tax.document_date.includes(s) ||
        tax.payer_name.toLowerCase().includes(s) ||
        (tax.payer_tax_id || '').toLowerCase().includes(s) ||
        tax.payee_name.toLowerCase().includes(s) ||
        (tax.payee_tax_id || '').toLowerCase().includes(s) ||
        tax.income_type.toLowerCase().includes(s) ||
        tax.income_amount.toFixed(2).includes(s) ||
        tax.tax_rate.toString().includes(s) ||
        tax.tax_amount.toFixed(2).includes(s) ||
        (tax.notes || '').toLowerCase().includes(s)
      )
    }
    return true
  })

  const totalIncome = filteredTaxes.reduce((sum, tax) => sum + tax.income_amount, 0)
  const totalTax = filteredTaxes.reduce((sum, tax) => sum + tax.tax_amount, 0)

  // Import WHT from FlowAccount
  const handleImportFromFa = async () => {
    if (!confirm('ดึงรายการหัก ณ ที่จ่ายจาก FlowAccount?')) return
    setImporting(true)
    try {
      const result = await getWithholdingTaxes(1, 200)
      const faList = result?.data?.list || []
      if (faList.length === 0) {
        alert('ไม่มีรายการหัก ณ ที่จ่ายใน FlowAccount')
        return
      }

      // Get existing flowaccount_ids to avoid duplicates
      const { data: existingData } = await supabase
        .from('withholding_taxes')
        .select('flowaccount_id')
        .not('flowaccount_id', 'is', null)
      const existingFaIds = new Set((existingData || []).map((e: any) => e.flowaccount_id))

      let imported = 0, skipped = 0
      for (const fa of faList) {
        const faId = fa.recordId || fa.documentId
        if (existingFaIds.has(faId)) {
          skipped++
          continue
        }

        // Map FlowAccount WHT item to local format
        // FA fields: item.taxAmount=ยอดเงินได้, item.withheld=ภาษีหัก, item.taxRate=อัตรา%, item.incomeType=ประเภท
        const item = fa.WithholidingTaxItem?.[0] || {}
        const incomeAmount = parseFloat(item.taxAmount) || parseFloat(fa.total) || 0
        const taxAmount = parseFloat(item.withheld) || parseFloat(fa.totalTaxWithheld) || 0
        const taxRate = parseFloat(item.taxRate) || (incomeAmount > 0 ? (taxAmount / incomeAmount) * 100 : 0)

        // Map FA incomeType code to local income_type
        // FA incomeType: 21=40(1)เงินเดือน, 22=40(2)นายหน้า, 23=40(3)ค่าสิทธิ, 24=40(4)(a)ดอกเบี้ย
        // 25=40(4)(b)เงินปันผล, 26=ค่าเช่า, 27=ค่าจ้างทำของ, 28=ค่าโฆษณา, 29=อื่นๆ
        const incomeTypeMap: Record<string, string> = {
          '21': 'ค่าจ้าง', '22': 'ค่าธรรมเนียม', '23': 'ค่าสิทธิ',
          '24': 'ค่าดอกเบี้ย', '25': 'เงินปันผล', '26': 'ค่าเช่า',
          '27': 'ค่าจ้าง', '28': 'ค่าโฆษณา', '29': 'อื่นๆ'
        }
        const incomeType = incomeTypeMap[String(item.incomeType)] || item.description || 'อื่นๆ'

        const { error } = await supabase.from('withholding_taxes').insert([{
          document_date: (fa.publishedOn || '').split('T')[0],
          document_number: fa.documentSerial || '',
          payer_name: fa.company?.companyName || '',
          payer_tax_id: fa.company?.companyTaxId || '',
          payee_name: fa.contactName || '',
          payee_tax_id: fa.contactTaxId || '',
          income_type: incomeType,
          income_amount: incomeAmount,
          tax_rate: Math.round(taxRate * 100) / 100,
          tax_amount: taxAmount,
          notes: fa.remarks || '',
          flowaccount_id: faId,
          flowaccount_synced_at: new Date().toISOString()
        }])

        if (error) {
          console.warn('Failed to import WHT', faId, error)
        } else {
          imported++
        }
      }

      alert(`ดึงข้อมูลเสร็จสิ้น!\n\n✅ นำเข้าใหม่: ${imported}\n⏭️ ข้ามซ้ำ: ${skipped}\nทั้งหมดใน FA: ${faList.length}`)
      if (imported > 0) fetchTaxes()
    } catch (err) {
      console.error('Import WHT error:', err)
      alert('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + (err as Error).message)
    } finally {
      setImporting(false)
    }
  }

  // FlowAccount Sync handlers
  const handleOpenSyncModal = () => {
    setShowSyncModal(true)
    setSelectedSyncIds(new Set())
    setSyncProgress('')
  }

  const toggleSyncItem = (id: string) => {
    setSelectedSyncIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedSyncIds.size === filteredTaxes.length) {
      setSelectedSyncIds(new Set())
    } else {
      setSelectedSyncIds(new Set(filteredTaxes.map(t => t.id)))
    }
  }

  const handleSyncToFa = async () => {
    const toSync = filteredTaxes.filter(t => selectedSyncIds.has(t.id))
    if (toSync.length === 0) {
      alert('กรุณาเลือกรายการที่ต้องการ sync')
      return
    }
    if (!confirm(`ต้องการ sync ${toSync.length} รายการหัก ณ ที่จ่ายไปยัง FlowAccount?`)) return

    setSyncingToFa(true)
    try {
      const result = await syncWhtToFlowAccount(
        toSync.map(t => ({
          ...t,
          flowaccount_id: (t as any).flowaccount_id
        })),
        (_c, _t, action) => setSyncProgress(action)
      )

      // Update local DB with flowaccount_id
      for (const r of result.results) {
        if (r.faId && (r.action === 'created' || r.action === 'updated')) {
          await supabase
            .from('withholding_taxes')
            .update({
              flowaccount_id: r.faId,
              flowaccount_synced_at: new Date().toISOString()
            })
            .eq('id', r.localId)
        }
      }

      setSyncProgress('')
      alert(`Sync เสร็จสิ้น!\n\n✅ สร้างใหม่: ${result.created}\n📝 อัปเดต: ${result.updated}\n❌ ล้มเหลว: ${result.failed}`)

      if (result.created > 0 || result.updated > 0) fetchTaxes()
      setShowSyncModal(false)
    } catch (err) {
      console.error('WHT Sync error:', err)
      alert('เกิดข้อผิดพลาดในการ sync: ' + (err as Error).message)
    } finally {
      setSyncingToFa(false)
      setSyncProgress('')
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <a
            href="/expenses"
            className="p-2 text-gray-400 hover:text-[#7D735F] hover:bg-[#F5F0E6] rounded-full transition-all"
            title="กลับไปหน้าเอกสาร"
          >
            <ArrowLeft className="h-5 w-5" />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Percent className="h-7 w-7 text-blue-600" />
              หัก ณ ที่จ่าย
            </h1>
            <p className="text-gray-600 mt-1">บันทึกและจัดการภาษีหัก ณ ที่จ่าย (50 ทวิ)</p>
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div>
            <p className="text-sm text-blue-600 font-medium">ยอดรายได้รวม</p>
            <p className="text-2xl font-bold text-blue-900">
              ฿{totalIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </Card>
        <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <div>
            <p className="text-sm text-red-600 font-medium">ภาษีหัก ณ ที่จ่ายรวม</p>
            <p className="text-2xl font-bold text-red-900">
              ฿{totalTax.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </Card>
      </div>

      {/* Date Range Filter */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 whitespace-nowrap">ช่วงเวลา:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-gray-400">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo('') }}
            className="text-sm text-red-500 hover:text-red-700 underline"
          >
            ล้างช่วงเวลา
          </button>
        )}
        <span className="text-sm text-gray-500 ml-auto">
          แสดง {filteredTaxes.length} / {taxes.length} รายการ
        </span>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <div className="flex items-center gap-2 bg-[#E8EBF0] rounded-full px-4 py-3 border border-transparent focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาทุกฟิลด์: เลขที่, ชื่อ, เลขประจำตัวผู้เสียภาษี, ยอดเงิน..."
              className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-base"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <button
          onClick={handleImportFromFa}
          disabled={importing}
          className="flex items-center gap-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          title="ดึงจาก FlowAccount"
        >
          <Download className="h-4 w-4" />
          {importing ? 'กำลังดึง...' : 'ดึงจาก FA'}
        </button>
        <button
          onClick={handleOpenSyncModal}
          disabled={syncingToFa}
          className="flex items-center gap-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          title="Sync ไป FlowAccount"
        >
          <Upload className="h-4 w-4" />
          {syncingToFa ? syncProgress || 'กำลัง sync...' : 'Sync FA'}
        </button>
        <Button
          variant="primary"
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มรายการ
        </Button>
      </div>

      {/* Taxes List */}
      <Card>
        {loading ? (
          <p className="text-center text-gray-600 py-8">กำลังโหลด...</p>
        ) : filteredTaxes.length === 0 ? (
          <div className="text-center py-12">
            <Percent className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">ไม่มีรายการหัก ณ ที่จ่าย</p>
            <p className="text-sm text-gray-500 mt-1">คลิก "เพิ่มรายการ" เพื่อบันทึก</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">เลขที่เอกสาร</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">วันที่</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ผู้จ่ายเงิน</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ผู้รับเงิน</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ประเภทเงินได้</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">จำนวนเงิน</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">อัตรา</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">ภาษี</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTaxes.map((tax) => (
                  <tr key={tax.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{tax.document_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(tax.document_date).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{tax.payer_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{tax.payee_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                        {tax.income_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      ฿{tax.income_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{tax.tax_rate}%</td>
                    <td className="px-4 py-3 text-sm text-red-600 text-right font-medium">
                      ฿{tax.tax_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(tax)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tax.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingTax ? 'แก้ไขรายการ' : 'เพิ่มรายการหัก ณ ที่จ่าย'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่เอกสาร *</label>
                  <input
                    type="text"
                    required
                    value={formData.document_number}
                    onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="WT-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เอกสาร *</label>
                  <input
                    type="date"
                    required
                    value={formData.document_date}
                    onChange={(e) => setFormData({ ...formData, document_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ผู้จ่ายเงิน *</label>
                  <input
                    type="text"
                    required
                    value={formData.payer_name}
                    onChange={(e) => setFormData({ ...formData, payer_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="ชื่อผู้จ่ายเงิน"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เลขผู้เสียภาษีผู้จ่าย</label>
                  <input
                    type="text"
                    value={formData.payer_tax_id}
                    onChange={(e) => setFormData({ ...formData, payer_tax_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="เลข 13 หลัก"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ผู้รับเงิน *</label>
                  <input
                    type="text"
                    required
                    value={formData.payee_name}
                    onChange={(e) => setFormData({ ...formData, payee_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="ชื่อผู้รับเงิน"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เลขผู้เสียภาษีผู้รับ</label>
                  <input
                    type="text"
                    value={formData.payee_tax_id}
                    onChange={(e) => setFormData({ ...formData, payee_tax_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="เลข 13 หลัก"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทเงินได้ *</label>
                  <select
                    required
                    value={formData.income_type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {INCOME_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.value} ({type.rate}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนเงินได้ *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.income_amount}
                    onChange={(e) => handleIncomeChange(e.target.value, formData.income_type)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">อัตราภาษี (%)</label>
                  <input
                    type="number"
                    readOnly
                    value={formData.tax_rate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ภาษีที่หัก (บาท)</label>
                  <input
                    type="number"
                    readOnly
                    value={formData.tax_amount}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-red-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่จ่ายเงิน</label>
                <input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="flex-1"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                >
                  {editingTax ? 'บันทึกการแก้ไข' : 'บันทึก'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Sync to FlowAccount Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !syncingToFa && setShowSyncModal(false)}>
          <div className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-white rounded-xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-600" />
                Sync หัก ณ ที่จ่ายไป FlowAccount
              </h2>
              <button onClick={() => !syncingToFa && setShowSyncModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Info */}
            <div className="px-4 py-3 bg-blue-50 border-b text-sm text-blue-700 flex-shrink-0">
              เลือกรายการหัก ณ ที่จ่ายที่ต้องการ sync ไปยัง FlowAccount เป็นเอกสาร ภ.ง.ด.53
            </div>

            {/* Tax List */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {filteredTaxes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">ไม่มีรายการหัก ณ ที่จ่าย</div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600">
                      {selectedSyncIds.size === filteredTaxes.length ? (
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                      เลือกทั้งหมด ({filteredTaxes.length})
                    </button>
                    <span className="text-sm text-gray-500">เลือกแล้ว {selectedSyncIds.size} รายการ</span>
                  </div>
                  <div className="space-y-1">
                    {filteredTaxes.map((tax) => {
                      const isSynced = !!(tax as any).flowaccount_id
                      return (
                        <div
                          key={tax.id}
                          onClick={() => toggleSyncItem(tax.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedSyncIds.has(tax.id) ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                          }`}
                        >
                          {selectedSyncIds.has(tax.id) ? (
                            <CheckSquare className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">{tax.payee_name}</div>
                            <div className="text-xs text-gray-500 flex gap-3 mt-0.5">
                              <span>{tax.document_date}</span>
                              <span>{tax.document_number}</span>
                              <span className="text-gray-400">{tax.income_type} ({tax.tax_rate}%)</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-medium text-gray-900">฿{tax.income_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
                            <div className="text-xs text-red-600">หัก ฿{tax.tax_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
                          </div>
                          {isSynced && (
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full whitespace-nowrap">FA✓</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex items-center justify-between flex-shrink-0">
              {syncingToFa ? (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {syncProgress || 'กำลัง sync...'}
                </div>
              ) : (
                <span className="text-sm text-gray-500">
                  เลือก: {selectedSyncIds.size} | ภาษีรวม: ฿{filteredTaxes.filter(t => selectedSyncIds.has(t.id)).reduce((s, t) => s + t.tax_amount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSyncModal(false)}
                  disabled={syncingToFa}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  ปิด
                </button>
                <button
                  onClick={handleSyncToFa}
                  disabled={selectedSyncIds.size === 0 || syncingToFa}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Sync ภ.ง.ด. {selectedSyncIds.size > 0 ? `(${selectedSyncIds.size})` : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
