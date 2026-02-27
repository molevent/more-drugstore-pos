import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import { Plus, Search, X, ArrowLeft, Receipt, FileText, Trash2, Eye, Printer } from 'lucide-react'
import { Link } from 'react-router-dom'

interface ReceiptRecord {
  id: string
  receipt_number: string
  receipt_date: string
  receipt_type: 'from_tax_invoice' | 'other'
  customer_name?: string
  customer_tax_id?: string
  customer_address?: string
  description?: string
  subtotal: number
  vat_amount: number
  total_amount: number
  payment_method?: string
  notes?: string
  status: 'draft' | 'issued' | 'cancelled'
  created_at: string
  updated_at: string
}

interface ReceiptItem {
  id?: string
  receipt_id?: string
  tax_invoice_id?: string
  description?: string
  amount: number
  vat_amount: number
  total: number
}

interface TaxInvoice {
  id: string
  tax_invoice_number: string
  customer_name: string
  customer_tax_id: string
  customer_address: string
  total_amount: number
  vat_amount: number
  created_at: string
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'แบบร่าง', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { value: 'issued', label: 'ออกแล้ว', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'cancelled', label: 'ยกเลิก', color: 'bg-red-100 text-red-700 border-red-200' },
]

const PAYMENT_METHODS = ['โอนเงิน', 'เงินสด', 'บัตรเครดิต', 'เช็ค']

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Create flow
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [receiptType, setReceiptType] = useState<'from_tax_invoice' | 'other' | ''>('')

  // Form for "other" type
  const [showOtherForm, setShowOtherForm] = useState(false)

  // Form for "from_tax_invoice" type
  const [showInvoiceSelector, setShowInvoiceSelector] = useState(false)
  const [taxInvoices, setTaxInvoices] = useState<TaxInvoice[]>([])
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set())
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')

  // Shared form data
  const today = new Date().toISOString().split('T')[0]
  const [formData, setFormData] = useState({
    receipt_date: today,
    customer_name: '',
    customer_tax_id: '',
    customer_address: '',
    description: '',
    subtotal: 0,
    vat_amount: 0,
    total_amount: 0,
    payment_method: '',
    notes: '',
  })
  const [manualItems, setManualItems] = useState<ReceiptItem[]>([
    { description: '', amount: 0, vat_amount: 0, total: 0 }
  ])

  // View detail
  const [viewReceipt, setViewReceipt] = useState<ReceiptRecord | null>(null)
  const [viewItems, setViewItems] = useState<ReceiptItem[]>([])

  // Date range filter
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const [dateFrom, setDateFrom] = useState(firstOfMonth.toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(today)

  useEffect(() => {
    fetchReceipts()
  }, [])

  const fetchReceipts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .order('receipt_date', { ascending: false })
      if (!error && data) setReceipts(data)
    } catch (e) {
      console.error('Error fetching receipts:', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchTaxInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('tax_invoices')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) setTaxInvoices(data)
    } catch (e) {
      console.error('Error fetching tax invoices:', e)
    }
  }

  const generateReceiptNumber = async (): Promise<string> => {
    const now = new Date()
    const yy = String(now.getFullYear()).slice(-2)
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const prefix = `RE${yy}${mm}`

    const { data } = await supabase
      .from('receipts')
      .select('receipt_number')
      .ilike('receipt_number', `${prefix}%`)
      .order('receipt_number', { ascending: false })
      .limit(1)

    let seq = 1
    if (data && data.length > 0) {
      const last = data[0].receipt_number.replace(prefix, '')
      const lastNum = parseInt(last)
      if (!isNaN(lastNum)) seq = lastNum + 1
    }
    return `${prefix}${String(seq).padStart(5, '0')}`
  }

  // Step 1: Open type selector modal
  const handleCreateReceipt = () => {
    setReceiptType('')
    setShowTypeModal(true)
  }

  // Step 2: After selecting type, proceed
  const handleProceedCreate = () => {
    if (!receiptType) return
    setShowTypeModal(false)
    resetForm()

    if (receiptType === 'from_tax_invoice') {
      fetchTaxInvoices()
      setSelectedInvoices(new Set())
      setInvoiceSearchTerm('')
      setCustomerFilter('')
      setShowInvoiceSelector(true)
    } else {
      setShowOtherForm(true)
    }
  }

  // For "from_tax_invoice": select invoices then create receipt
  const handleSelectInvoices = () => {
    if (selectedInvoices.size === 0) {
      alert('กรุณาเลือกใบกำกับภาษีอย่างน้อย 1 ใบ')
      return
    }

    const selected = taxInvoices.filter(inv => selectedInvoices.has(inv.id))
    const firstCustomer = selected[0]
    const subtotal = selected.reduce((s, inv) => s + (inv.total_amount - inv.vat_amount), 0)
    const vatTotal = selected.reduce((s, inv) => s + inv.vat_amount, 0)
    const totalAll = selected.reduce((s, inv) => s + inv.total_amount, 0)

    setFormData({
      receipt_date: today,
      customer_name: firstCustomer.customer_name || '',
      customer_tax_id: firstCustomer.customer_tax_id || '',
      customer_address: firstCustomer.customer_address || '',
      description: `รวมจากใบกำกับภาษี ${selected.map(i => i.tax_invoice_number).join(', ')}`,
      subtotal,
      vat_amount: vatTotal,
      total_amount: totalAll,
      payment_method: '',
      notes: '',
    })

    setShowInvoiceSelector(false)
    setShowOtherForm(true)
  }

  const handleSaveReceipt = async () => {
    try {
      const receiptNumber = await generateReceiptNumber()

      let finalSubtotal = formData.subtotal
      let finalVat = formData.vat_amount
      let finalTotal = formData.total_amount

      // For "other" type, calculate from manual items
      if (receiptType === 'other') {
        finalSubtotal = manualItems.reduce((s, i) => s + i.amount, 0)
        finalVat = manualItems.reduce((s, i) => s + i.vat_amount, 0)
        finalTotal = manualItems.reduce((s, i) => s + i.total, 0)
      }

      const { data: receipt, error } = await supabase
        .from('receipts')
        .insert([{
          receipt_number: receiptNumber,
          receipt_date: formData.receipt_date,
          receipt_type: receiptType,
          customer_name: formData.customer_name || null,
          customer_tax_id: formData.customer_tax_id || null,
          customer_address: formData.customer_address || null,
          description: formData.description || null,
          subtotal: finalSubtotal,
          vat_amount: finalVat,
          total_amount: finalTotal,
          payment_method: formData.payment_method || null,
          notes: formData.notes || null,
          status: 'draft',
        }])
        .select('id')
        .single()

      if (error) throw error

      // Insert receipt items
      if (receiptType === 'from_tax_invoice') {
        const selected = taxInvoices.filter(inv => selectedInvoices.has(inv.id))
        const items = selected.map(inv => ({
          receipt_id: receipt.id,
          tax_invoice_id: inv.id,
          description: `ใบกำกับภาษี ${inv.tax_invoice_number}`,
          amount: inv.total_amount - inv.vat_amount,
          vat_amount: inv.vat_amount,
          total: inv.total_amount,
        }))
        const { error: itemErr } = await supabase.from('receipt_items').insert(items)
        if (itemErr) console.error('Error inserting receipt items:', itemErr)
      } else {
        const items = manualItems.filter(i => i.description || i.total > 0).map(i => ({
          receipt_id: receipt.id,
          description: i.description,
          amount: i.amount,
          vat_amount: i.vat_amount,
          total: i.total,
        }))
        if (items.length > 0) {
          const { error: itemErr } = await supabase.from('receipt_items').insert(items)
          if (itemErr) console.error('Error inserting receipt items:', itemErr)
        }
      }

      setShowOtherForm(false)
      resetForm()
      fetchReceipts()
    } catch (err) {
      console.error('Save error:', err)
      alert('เกิดข้อผิดพลาด: ' + (err as Error).message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบใบเสร็จนี้?')) return
    try {
      await supabase.from('receipt_items').delete().eq('receipt_id', id)
      const { error } = await supabase.from('receipts').delete().eq('id', id)
      if (error) throw error
      fetchReceipts()
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleViewReceipt = async (receipt: ReceiptRecord) => {
    setViewReceipt(receipt)
    const { data } = await supabase
      .from('receipt_items')
      .select('*')
      .eq('receipt_id', receipt.id)
      .order('created_at')
    setViewItems(data || [])
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('receipts')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      fetchReceipts()
    } catch (err) {
      console.error('Status update error:', err)
    }
  }

  const handlePrintReceipt = async (receipt: ReceiptRecord, isCopy: boolean = false) => {
    try {
      // Fetch receipt items
      const { data: items } = await supabase
        .from('receipt_items')
        .select('*')
        .eq('receipt_id', receipt.id)
        .order('created_at')
      const receiptItems: ReceiptItem[] = items || []

      // Fetch shop settings
      const { data: shopData } = await supabase
        .from('shop_settings')
        .select('name, address, tax_id, phone, logo_url, stamp_url, signature_url')
        .single()

      const shopName = shopData?.name || 'ห้างหุ้นส่วนจำกัด สะอางพาณิชย์'
      const shopAddress = shopData?.address || ''
      const shopTaxId = shopData?.tax_id || ''
      const shopPhone = shopData?.phone || ''
      const logoUrl = shopData?.logo_url || ''
      const stampUrl = shopData?.stamp_url || ''
      const signatureUrl = shopData?.signature_url || ''

      const totalAmount = receipt.total_amount || 0
      const vatAmount = receipt.vat_amount || 0
      const baseAmount = receipt.subtotal || (totalAmount - vatAmount)

      const copyText = isCopy ? '<div style="display: inline-block; text-align: center; font-size: 12px; color: #666; border: 1px solid #666; padding: 2px 6px; margin-bottom: 8px; font-weight: bold;">สำเนา</div>' : ''
      const copyLabel = isCopy ? 'สำเนา' : 'ต้นฉบับ'

      // Number to Thai baht text
      const numberToThaiText = (num: number): string => {
        if (num === 0) return 'ศูนย์บาทถ้วน'
        const units = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
        const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน']
        const intPart = Math.floor(Math.abs(num))
        const decPart = Math.round((Math.abs(num) - intPart) * 100)
        const convert = (n: number): string => {
          if (n === 0) return ''
          const str = n.toString()
          let result = ''
          for (let i = 0; i < str.length; i++) {
            const digit = parseInt(str[i])
            const pos = str.length - i - 1
            if (digit === 0) continue
            if (pos === 1 && digit === 1) { result += 'สิบ'; continue }
            if (pos === 1 && digit === 2) { result += 'ยี่สิบ'; continue }
            if (pos === 0 && digit === 1 && str.length > 1) { result += 'เอ็ด'; continue }
            result += units[digit] + positions[pos]
          }
          return result
        }
        let text = convert(intPart) + 'บาท'
        if (decPart > 0) {
          text += convert(decPart) + 'สตางค์'
        } else {
          text += 'ถ้วน'
        }
        return text
      }

      const receiptDate = new Date(receipt.receipt_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })

      // Build items rows
      let itemsHtml = ''
      if (receiptItems.length > 0) {
        itemsHtml = receiptItems.map((item, idx) => `
          <tr>
            <td style="border: 1px solid #333; padding: 6px; text-align: center; font-size: 12px;">${idx + 1}</td>
            <td style="border: 1px solid #333; padding: 6px; font-size: 12px;">${item.description || '-'}</td>
            <td style="border: 1px solid #333; padding: 6px; text-align: center; font-size: 12px;">1</td>
            <td style="border: 1px solid #333; padding: 6px; text-align: center; font-size: 12px;">รายการ</td>
            <td style="border: 1px solid #333; padding: 6px; text-align: right; font-size: 12px;">${(item.amount || 0).toFixed(2)}</td>
            <td style="border: 1px solid #333; padding: 6px; text-align: right; font-size: 12px;">-</td>
            <td style="border: 1px solid #333; padding: 6px; text-align: right; font-size: 12px;">${(item.total || 0).toFixed(2)}</td>
          </tr>
        `).join('')
      } else {
        // If no items, show a single line from the receipt itself
        itemsHtml = `
          <tr>
            <td style="border: 1px solid #333; padding: 6px; text-align: center; font-size: 12px;">1</td>
            <td style="border: 1px solid #333; padding: 6px; font-size: 12px;">${receipt.description || 'รับชำระเงิน'}</td>
            <td style="border: 1px solid #333; padding: 6px; text-align: center; font-size: 12px;">1</td>
            <td style="border: 1px solid #333; padding: 6px; text-align: center; font-size: 12px;">รายการ</td>
            <td style="border: 1px solid #333; padding: 6px; text-align: right; font-size: 12px;">${baseAmount.toFixed(2)}</td>
            <td style="border: 1px solid #333; padding: 6px; text-align: right; font-size: 12px;">-</td>
            <td style="border: 1px solid #333; padding: 6px; text-align: right; font-size: 12px;">${baseAmount.toFixed(2)}</td>
          </tr>
        `
      }

      // Add empty rows to fill the table (minimum 8 rows total)
      const currentRows = receiptItems.length > 0 ? receiptItems.length : 1
      for (let i = currentRows; i < 8; i++) {
        itemsHtml += `
          <tr>
            <td style="border: 1px solid #333; padding: 6px; text-align: center; font-size: 12px;">&nbsp;</td>
            <td style="border: 1px solid #333; padding: 6px; font-size: 12px;">&nbsp;</td>
            <td style="border: 1px solid #333; padding: 6px; text-align: center; font-size: 12px;">&nbsp;</td>
            <td style="border: 1px solid #333; padding: 6px; text-align: center; font-size: 12px;">&nbsp;</td>
            <td style="border: 1px solid #333; padding: 6px; text-align: right; font-size: 12px;">&nbsp;</td>
            <td style="border: 1px solid #333; padding: 6px; text-align: right; font-size: 12px;">&nbsp;</td>
            <td style="border: 1px solid #333; padding: 6px; text-align: right; font-size: 12px;">&nbsp;</td>
          </tr>
        `
      }

      // Payment method checkboxes
      const payMethods = ['เงินสด', 'เช็ค', 'โอนเงิน', 'บัตรเครดิต']
      const paymentCheckboxes = payMethods.map(m => {
        const checked = receipt.payment_method === m
        return `<span style="margin-right: 15px;"><span style="border: 1px solid #333; display: inline-block; width: 12px; height: 12px; margin-right: 3px; vertical-align: middle; text-align: center; font-size: 10px; line-height: 12px;">${checked ? '✓' : ''}</span> ${m}</span>`
      }).join('')

      const printContent = `
        <div style="font-family: 'TH Sarabun New', 'Angsana New', sans-serif; width: 210mm; min-height: 297mm; padding: 15px; font-size: 14px; box-sizing: border-box;">
          <!-- Header Section -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
            <tr>
              <!-- Logo/Company Info -->
              <td style="width: 60%; vertical-align: top;">
                ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="width: 80px; height: 80px; object-fit: contain; margin-bottom: 10px;" />` : `<div style="border: 2px solid #333; border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;"><span style="font-size: 12px; text-align: center; color: #666;">Logo</span></div>`}
                <p style="margin: 3px 0; font-size: 13px; font-weight: bold;">${shopName}</p>
                <p style="margin: 3px 0; font-size: 12px;">${shopAddress}</p>
                <p style="margin: 3px 0; font-size: 12px;">เลขประจำตัวผู้เสียภาษี: ${shopTaxId}</p>
                <p style="margin: 3px 0; font-size: 12px;">โทร: ${shopPhone}</p>
              </td>
              <!-- Receipt Details -->
              <td style="width: 40%; vertical-align: top; text-align: right;">
                ${copyText}
                <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: bold;">ใบเสร็จรับเงิน</h2>
                <p style="margin: 3px 0; font-size: 18px; font-weight: bold; color: #333;">RECEIPT</p>
                <p style="margin: 3px 0; font-size: 11px; color: #666;">${copyLabel} (เอกสารออกเป็นคู่ฉบับ)</p>
                <table style="width: 100%; margin-top: 10px; font-size: 12px;">
                  <tr>
                    <td style="text-align: left; padding: 2px 0;">เลขที่</td>
                    <td style="text-align: right; padding: 2px 0; font-weight: bold;">${receipt.receipt_number}</td>
                  </tr>
                  <tr>
                    <td style="text-align: left; padding: 2px 0;">วันที่</td>
                    <td style="text-align: right; padding: 2px 0;">${receiptDate}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Customer Section -->
          <table style="width: 100%; border: 1px solid #333; border-collapse: collapse; margin-bottom: 15px;">
            <tr>
              <td style="padding: 10px; vertical-align: top; width: 50%; border-right: 1px solid #333;">
                <p style="margin: 3px 0; font-size: 12px; color: #666;">ได้รับเงินจาก / Received from</p>
                <p style="margin: 5px 0; font-size: 13px; font-weight: bold;">${receipt.customer_name || 'ลูกค้าทั่วไป'}</p>
                <p style="margin: 3px 0; font-size: 12px;">${receipt.customer_address || '-'}</p>
                <p style="margin: 3px 0; font-size: 12px;">เลขประจำตัวผู้เสียภาษี: ${receipt.customer_tax_id || '-'}</p>
              </td>
              <td style="padding: 10px; vertical-align: top; width: 50%;">
                <p style="margin: 3px 0; font-size: 12px; color: #666;">เรื่อง / Subject</p>
                <p style="margin: 5px 0; font-size: 13px;">${receipt.receipt_type === 'from_tax_invoice' ? 'ชำระค่าสินค้าตามใบกำกับภาษี' : (receipt.description || 'รับชำระเงิน')}</p>
              </td>
            </tr>
          </table>

          <!-- Items Table -->
          <table style="width: 100%; border: 1px solid #333; border-collapse: collapse; margin-bottom: 0;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="border: 1px solid #333; padding: 8px; text-align: center; width: 5%; font-size: 12px;">#</th>
                <th style="border: 1px solid #333; padding: 8px; text-align: left; width: 35%; font-size: 12px;">รายละเอียด</th>
                <th style="border: 1px solid #333; padding: 8px; text-align: center; width: 10%; font-size: 12px;">จำนวน</th>
                <th style="border: 1px solid #333; padding: 8px; text-align: center; width: 10%; font-size: 12px;">หน่วย</th>
                <th style="border: 1px solid #333; padding: 8px; text-align: right; width: 15%; font-size: 12px;">ราคาต่อหน่วย</th>
                <th style="border: 1px solid #333; padding: 8px; text-align: right; width: 12%; font-size: 12px;">ส่วนลด</th>
                <th style="border: 1px solid #333; padding: 8px; text-align: right; width: 13%; font-size: 12px;">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Totals Section -->
          <table style="width: 100%; border: 1px solid #333; border-collapse: collapse; border-top: none;">
            <tr>
              <td style="width: 50%; border-right: 1px solid #333; padding: 10px; vertical-align: top; font-size: 11px;">
                <p style="margin: 3px 0;">(${numberToThaiText(totalAmount)})</p>
                <p style="margin: 10px 0 3px 0; font-weight: bold;">หมายเหตุ</p>
                <p style="margin: 3px 0;">${receipt.notes || '-'}</p>
              </td>
              <td style="width: 50%; padding: 0; vertical-align: top;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 10px; text-align: right; font-size: 12px; border-bottom: 1px solid #ddd;">รวมเป็นเงิน</td>
                    <td style="padding: 6px 10px; text-align: right; font-size: 12px; border-bottom: 1px solid #ddd; width: 120px;">${baseAmount.toFixed(2)} บาท</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 10px; text-align: right; font-size: 12px; border-bottom: 1px solid #ddd;">ภาษีมูลค่าเพิ่ม 7%</td>
                    <td style="padding: 6px 10px; text-align: right; font-size: 12px; border-bottom: 1px solid #ddd;">${vatAmount.toFixed(2)} บาท</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 10px; text-align: right; font-size: 12px; border-bottom: 1px solid #ddd;">ราคาไม่รวมภาษีมูลค่าเพิ่ม</td>
                    <td style="padding: 6px 10px; text-align: right; font-size: 12px; border-bottom: 1px solid #ddd;">${baseAmount.toFixed(2)} บาท</td>
                  </tr>
                  <tr style="background-color: #f5f5f5;">
                    <td style="padding: 8px 10px; text-align: right; font-size: 13px; font-weight: bold; border-top: 2px solid #333;">จำนวนเงินรวมทั้งสิ้น</td>
                    <td style="padding: 8px 10px; text-align: right; font-size: 13px; font-weight: bold; border-top: 2px solid #333;">${totalAmount.toFixed(2)} บาท</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Payment Section -->
          <table style="width: 100%; border: 1px solid #333; border-collapse: collapse; margin-top: 15px;">
            <tr>
              <td style="padding: 10px; vertical-align: top; width: 60%;">
                <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold;">ชำระเงินโดย:</p>
                <div style="font-size: 12px;">
                  ${paymentCheckboxes}
                </div>
                <table style="width: 100%; margin-top: 10px; font-size: 11px; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 4px; border: 1px solid #ddd; width: 30%;">ธนาคาร</td>
                    <td style="padding: 4px; border: 1px solid #ddd;">เลขที่</td>
                    <td style="padding: 4px; border: 1px solid #ddd; width: 25%;">วันที่</td>
                    <td style="padding: 4px; border: 1px solid #ddd; width: 25%;">จำนวนเงิน</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px; border: 1px solid #ddd;">&nbsp;</td>
                    <td style="padding: 4px; border: 1px solid #ddd;">&nbsp;</td>
                    <td style="padding: 4px; border: 1px solid #ddd;">&nbsp;</td>
                    <td style="padding: 4px; border: 1px solid #ddd;">&nbsp;</td>
                  </tr>
                </table>
              </td>
              <td style="padding: 10px; vertical-align: top; width: 40%; text-align: center;">
                <p style="margin: 0 0 5px 0; font-size: 11px; color: #666;">ขอแสดงความนับถือ</p>
                <div style="margin-top: 40px;">
                  <p style="margin: 0; font-size: 12px;">_____________________</p>
                  <p style="margin: 5px 0 0 0; font-size: 12px;">ผู้จ่ายเงิน</p>
                </div>
              </td>
            </tr>
          </table>

          <!-- Footer Signatures -->
          <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
            <tr>
              <td style="width: 35%; text-align: center; vertical-align: top; padding: 10px;">
                <p style="margin: 0; font-size: 12px;">_____________________</p>
                <p style="margin: 5px 0 0 0; font-size: 12px;">ผู้จ่ายเงิน</p>
              </td>
              <td style="width: 30%; text-align: center; vertical-align: middle; padding: 10px;">
                ${stampUrl ? `<img src="${stampUrl}" alt="Stamp" style="width: 100px; height: 100px; object-fit: contain;" />` : `<div style="border: 2px solid #0066cc; border-radius: 50%; width: 100px; height: 100px; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: #0066cc; font-weight: bold;"><span style="font-size: 11px; text-align: center;">ตราบริษัท</span></div>`}
              </td>
              <td style="width: 35%; text-align: center; vertical-align: top; padding: 10px;">
                ${signatureUrl ? `<img src="${signatureUrl}" alt="Signature" style="max-width: 120px; max-height: 60px; object-fit: contain; margin-bottom: 5px;" /><br/>` : `<p style="margin: 0; font-size: 12px;">_____________________</p>`}
                <p style="margin: 5px 0 0 0; font-size: 12px;">ผู้รับเงิน</p>
                <p style="margin: 3px 0 0 0; font-size: 11px; color: #666;">${receiptDate}</p>
              </td>
            </tr>
          </table>
        </div>
      `

      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>ใบเสร็จรับเงิน - ${receipt.receipt_number}</title>
              <style>
                @media print {
                  body { margin: 0; }
                  * { -webkit-print-color-adjust: exact !important; }
                }
              </style>
            </head>
            <body>${printContent}</body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    } catch (error) {
      console.error('Error printing receipt:', error)
      alert('เกิดข้อผิดพลาดในการพิมพ์ใบเสร็จ')
    }
  }

  const resetForm = () => {
    setFormData({
      receipt_date: today,
      customer_name: '',
      customer_tax_id: '',
      customer_address: '',
      description: '',
      subtotal: 0,
      vat_amount: 0,
      total_amount: 0,
      payment_method: '',
      notes: '',
    })
    setManualItems([{ description: '', amount: 0, vat_amount: 0, total: 0 }])
    setSelectedInvoices(new Set())
  }

  const addManualItem = () => {
    setManualItems(prev => [...prev, { description: '', amount: 0, vat_amount: 0, total: 0 }])
  }

  const updateManualItem = (idx: number, field: string, value: string | number) => {
    setManualItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: value }
      if (field === 'amount') {
        const amt = typeof value === 'number' ? value : parseFloat(value) || 0
        updated.amount = amt
        updated.total = amt + updated.vat_amount
      }
      if (field === 'vat_amount') {
        const vat = typeof value === 'number' ? value : parseFloat(value) || 0
        updated.vat_amount = vat
        updated.total = updated.amount + vat
      }
      return updated
    }))
  }

  const removeManualItem = (idx: number) => {
    setManualItems(prev => prev.filter((_, i) => i !== idx))
  }

  // Filtered
  const filteredReceipts = receipts.filter(r => {
    if (dateFrom && r.receipt_date < dateFrom) return false
    if (dateTo && r.receipt_date > dateTo) return false
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return (
        r.receipt_number?.toLowerCase().includes(term) ||
        r.customer_name?.toLowerCase().includes(term) ||
        r.description?.toLowerCase().includes(term)
      )
    }
    return true
  })

  // Tax invoice filtering for selector
  const filteredInvoices = taxInvoices.filter(inv => {
    if (customerFilter && !inv.customer_name?.toLowerCase().includes(customerFilter.toLowerCase())) return false
    if (invoiceSearchTerm) {
      const term = invoiceSearchTerm.toLowerCase()
      return (
        inv.tax_invoice_number?.toLowerCase().includes(term) ||
        inv.customer_name?.toLowerCase().includes(term)
      )
    }
    return true
  })

  const selectedInvoiceTotal = taxInvoices
    .filter(inv => selectedInvoices.has(inv.id))
    .reduce((s, inv) => s + inv.total_amount, 0)

  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find(s => s.value === status)
    return opt || { label: status, color: 'bg-gray-100 text-gray-700 border-gray-200' }
  }

  const totalAll = filteredReceipts.reduce((s, r) => s + r.total_amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/expenses"
            className="p-2 text-gray-400 hover:text-[#7D735F] hover:bg-[#F5F0E6] rounded-full transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="h-7 w-7 text-[#7D735F]" />
              ใบเสร็จรับเงิน
            </h1>
            <p className="text-gray-600 mt-1">ออกใบเสร็จรับเงินจากใบกำกับภาษี หรือรับเงินอื่นๆ</p>
          </div>
        </div>
        <button
          onClick={handleCreateReceipt}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#E8F4F8] hover:bg-[#D5EAE7] text-gray-900 border border-[#B8C9B8] rounded-full text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          สร้างใบเสร็จรับเงิน
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <div className="p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">ทั้งหมด</p>
            <p className="text-xl font-bold text-gray-900">{filteredReceipts.length}</p>
            <p className="text-xs text-gray-500">฿{totalAll.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
          </div>
        </Card>
        {STATUS_OPTIONS.map(opt => {
          const count = filteredReceipts.filter(r => r.status === opt.value).length
          const sum = filteredReceipts.filter(r => r.status === opt.value).reduce((s, r) => s + r.total_amount, 0)
          return (
            <Card key={opt.value}>
              <div className="p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{opt.label}</p>
                <p className="text-xl font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500">฿{sum.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-2 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#A8C4D9] focus:border-[#A8C4D9] w-[130px]"
        />
        <span className="text-gray-400">-</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-2 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#A8C4D9] focus:border-[#A8C4D9] w-[130px]"
        />
        <div className="flex-1 min-w-[200px] relative">
          <div className="flex items-center gap-2 bg-[#E8EBF0] rounded-full px-3 py-2 border border-transparent focus-within:border-[#A8C4D9] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#A8C4D9]/20 transition-all">
            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาเลขที่ใบเสร็จ, ลูกค้า..."
              className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-sm min-w-0"
            />
          </div>
        </div>
        <button
          onClick={fetchReceipts}
          className="px-3 py-2 bg-[#A8C4D9] hover:bg-[#8FB3CC] text-white rounded-lg text-sm font-medium transition-colors"
        >
          GO
        </button>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">No.</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">เลขที่ใบเสร็จ</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">ลูกค้า</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">ประเภท</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">จำนวนเงิน</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-500">กำลังโหลด...</td></tr>
              ) : filteredReceipts.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-500">ไม่พบรายการ</td></tr>
              ) : (
                filteredReceipts.map((r, idx) => {
                  const badge = getStatusBadge(r.status)
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-gray-700">{idx + 1}</td>
                      <td className="px-3 py-3 text-blue-600 font-medium cursor-pointer hover:underline" onClick={() => handleViewReceipt(r)}>
                        {r.receipt_number}
                      </td>
                      <td className="px-3 py-3 text-gray-700">{r.receipt_date}</td>
                      <td className="px-3 py-3 text-gray-700">{r.customer_name || '-'}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          r.receipt_type === 'from_tax_invoice'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          {r.receipt_type === 'from_tax_invoice' ? 'จากใบกำกับภาษี' : 'รับเงินอื่นๆ'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={r.status}
                          onChange={(e) => handleStatusChange(r.id, e.target.value)}
                          className={`text-xs border rounded px-2 py-1 font-medium ${badge.color}`}
                        >
                          {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3 text-right text-gray-900 font-medium">
                        ฿{r.total_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleViewReceipt(r)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="ดูรายละเอียด"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handlePrintReceipt(r, false)}
                            className="p-1.5 text-[#7D735F] hover:bg-[#F5F0E6] rounded-lg transition-colors"
                            title="พิมพ์ต้นฉบับ"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="ลบ"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          <div className="flex justify-end items-center gap-4 px-4 py-3 bg-gray-50 border-t text-sm font-medium">
            <span className="text-gray-600">รวม</span>
            <span className="text-gray-900">
              ฿{totalAll.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </Card>

      {/* ===== Modal 1: Select Receipt Type ===== */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4">
              <div />
              <h2 className="text-xl font-bold text-[#2B9CD8]">สร้างใบเสร็จรับเงิน</h2>
              <button onClick={() => setShowTypeModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 pb-2">
              <p className="text-sm font-semibold text-gray-800 mb-3">ประเภทใบเสร็จรับเงิน:</p>

              {/* Option 1: From Tax Invoice */}
              <label
                className={`block mb-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  receiptType === 'from_tax_invoice'
                    ? 'border-[#2B9CD8] bg-blue-50/50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="receipt_type"
                    value="from_tax_invoice"
                    checked={receiptType === 'from_tax_invoice'}
                    onChange={() => setReceiptType('from_tax_invoice')}
                    className="mt-1 w-4 h-4 text-[#2B9CD8]"
                  />
                  <div>
                    <p className="font-semibold text-[#2B9CD8]">รับเงินจากใบกำกับภาษี (ใบเสร็จรวม)</p>
                    <p className="text-sm text-gray-500 mt-0.5">สร้างโดยเลือกจากการใบกำกับภาษีใบเดียว หรือหลายใบ</p>
                  </div>
                </div>
              </label>

              {/* Option 2: Other */}
              <label
                className={`block mb-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  receiptType === 'other'
                    ? 'border-[#2B9CD8] bg-blue-50/50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="receipt_type"
                    value="other"
                    checked={receiptType === 'other'}
                    onChange={() => setReceiptType('other')}
                    className="mt-1 w-4 h-4 text-[#2B9CD8]"
                  />
                  <div>
                    <p className="font-semibold text-[#2B9CD8]">รับเงินอื่นๆ</p>
                    <p className="text-sm text-gray-500 mt-0.5">เช่น เงินประกัน เงินมัดจำ รับเงินล่วงหน้า หรืออื่นๆ</p>
                  </div>
                </div>
              </label>
            </div>
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <span className="text-sm text-[#2B9CD8] cursor-pointer hover:underline">ℹ เรียนรู้การสร้างใบเสร็จ</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTypeModal(false)}
                  className="px-5 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleProceedCreate}
                  disabled={!receiptType}
                  className="px-5 py-2 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  สร้าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal 2: Tax Invoice Selector ===== */}
      {showInvoiceSelector && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <h2 className="text-lg font-bold text-[#2B9CD8]">กรุณาเลือกชื่อลูกค้าและเอกสาร</h2>
              <button onClick={() => setShowInvoiceSelector(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Search and summary */}
            <div className="px-6 py-3 border-b flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1 mr-4">
                  <label className="text-xs text-gray-500 mb-1 block">ค้นหาชื่อลูกค้า</label>
                  <input
                    type="text"
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value)}
                    placeholder="เลือกลูกค้า หรือพิมพ์เพื่อสร้างใหม่"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#A8C4D9]"
                  />
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">รายการ</p>
                  <p className="text-lg font-bold text-gray-900">{selectedInvoices.size}</p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-xs text-gray-500">รวมทั้งสิ้น</p>
                  <p className="text-lg font-bold text-gray-900">
                    {selectedInvoiceTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Invoice list */}
            <div className="flex-1 overflow-y-auto px-6 py-3">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b text-[#2B9CD8]">
                    <th className="px-2 py-2 text-left w-8">
                      <input
                        type="checkbox"
                        checked={filteredInvoices.length > 0 && filteredInvoices.every(inv => selectedInvoices.has(inv.id))}
                        onChange={() => {
                          if (filteredInvoices.every(inv => selectedInvoices.has(inv.id))) {
                            setSelectedInvoices(new Set())
                          } else {
                            setSelectedInvoices(new Set(filteredInvoices.map(inv => inv.id)))
                          }
                        }}
                        className="w-4 h-4"
                      />
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium">เลขที่เอกสาร</th>
                    <th className="px-2 py-2 text-left text-xs font-medium">ชื่อลูกค้า/ชื่อโปรเจค</th>
                    <th className="px-2 py-2 text-left text-xs font-medium">วันครบกำหนด</th>
                    <th className="px-2 py-2 text-right text-xs font-medium">จำนวนเงิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-10 w-10 text-gray-300" />
                          <p>กรุณาเลือกชื่อลูกค้า เพื่อค้นหาเอกสารค้างรับ</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={selectedInvoices.has(inv.id)}
                            onChange={() => {
                              setSelectedInvoices(prev => {
                                const next = new Set(prev)
                                if (next.has(inv.id)) next.delete(inv.id)
                                else next.add(inv.id)
                                return next
                              })
                            }}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="px-2 py-2 text-blue-600 font-medium">{inv.tax_invoice_number}</td>
                        <td className="px-2 py-2 text-gray-700">{inv.customer_name}</td>
                        <td className="px-2 py-2 text-gray-500">{inv.created_at?.split('T')[0]}</td>
                        <td className="px-2 py-2 text-right text-gray-900 font-medium">
                          {inv.total_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="px-6 py-3 border-t flex justify-end gap-2 flex-shrink-0">
              <button
                onClick={() => setShowInvoiceSelector(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSelectInvoices}
                disabled={selectedInvoices.size === 0}
                className="px-4 py-2 bg-[#2B9CD8] hover:bg-[#2488C0] disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
              >
                เลือกเอกสาร
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal 3: Receipt Form (shared for both types) ===== */}
      {showOtherForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">
                {receiptType === 'from_tax_invoice' ? 'สร้างใบเสร็จรับเงิน (จากใบกำกับภาษี)' : 'สร้างใบเสร็จรับเงิน (รับเงินอื่นๆ)'}
              </h2>
              <button onClick={() => { setShowOtherForm(false); resetForm() }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ใบเสร็จ</label>
                  <input
                    type="date"
                    value={formData.receipt_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, receipt_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#A8C4D9]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ช่องทางชำระเงิน</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#A8C4D9]"
                  >
                    <option value="">เลือก</option>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อลูกค้า</label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#A8C4D9]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เลขผู้เสียภาษี</label>
                  <input
                    type="text"
                    value={formData.customer_tax_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_tax_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#A8C4D9]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่ลูกค้า</label>
                <textarea
                  value={formData.customer_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_address: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#A8C4D9] resize-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#A8C4D9]"
                />
              </div>

              {/* Line items for "other" type */}
              {receiptType === 'other' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">รายการ</label>
                    <button
                      type="button"
                      onClick={addManualItem}
                      className="text-xs text-[#2B9CD8] hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> เพิ่มรายการเอกสาร
                    </button>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#2B9CD8] text-white">
                          <th className="px-3 py-2 text-left text-xs">ลำดับ</th>
                          <th className="px-3 py-2 text-left text-xs">เลขที่เอกสาร</th>
                          <th className="px-3 py-2 text-right text-xs">จำนวนเงิน</th>
                          <th className="px-3 py-2 text-right text-xs">ภาษีมูลค่าเพิ่ม</th>
                          <th className="px-3 py-2 text-right text-xs">รวม</th>
                          <th className="px-3 py-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {manualItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={item.description || ''}
                                onChange={(e) => updateManualItem(idx, 'description', e.target.value)}
                                placeholder="รายละเอียด"
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-[#A8C4D9]"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={item.amount || ''}
                                onChange={(e) => updateManualItem(idx, 'amount', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right focus:ring-1 focus:ring-[#A8C4D9]"
                                step="0.01"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={item.vat_amount || ''}
                                onChange={(e) => updateManualItem(idx, 'vat_amount', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right focus:ring-1 focus:ring-[#A8C4D9]"
                                step="0.01"
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900">
                              {item.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2">
                              {manualItems.length > 1 && (
                                <button onClick={() => removeManualItem(idx)} className="text-red-400 hover:text-red-600">
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end mt-2 text-sm space-x-6">
                    <span className="text-gray-500">รวมรายการ: <strong>{manualItems.length}</strong></span>
                    <span className="text-gray-900 font-medium">
                      รวมเป็นเงิน: ฿{manualItems.reduce((s, i) => s + i.total, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {/* Summary for from_tax_invoice */}
              {receiptType === 'from_tax_invoice' && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">ยอดก่อนภาษี</span>
                    <span className="font-medium">฿{formData.subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">ภาษีมูลค่าเพิ่ม</span>
                    <span className="font-medium">฿{formData.vat_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t pt-2">
                    <span>รวมทั้งสิ้น</span>
                    <span>฿{formData.total_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#A8C4D9] resize-none"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="px-6 py-4 border-t flex justify-end gap-2 flex-shrink-0">
              <button
                onClick={() => { setShowOtherForm(false); resetForm() }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveReceipt}
                className="px-4 py-2 bg-[#A8C4D9] hover:bg-[#8FB3CC] text-white rounded-lg text-sm font-medium transition-colors"
              >
                บันทึกใบเสร็จ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal 4: View Receipt Detail ===== */}
      {viewReceipt && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">ใบเสร็จรับเงิน {viewReceipt.receipt_number}</h2>
              <button onClick={() => setViewReceipt(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-gray-500">วันที่:</span> <span className="font-medium">{viewReceipt.receipt_date}</span></div>
                <div><span className="text-gray-500">สถานะ:</span> <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(viewReceipt.status).color}`}>{getStatusBadge(viewReceipt.status).label}</span></div>
                <div><span className="text-gray-500">ลูกค้า:</span> <span className="font-medium">{viewReceipt.customer_name || '-'}</span></div>
                <div><span className="text-gray-500">เลขผู้เสียภาษี:</span> <span className="font-medium">{viewReceipt.customer_tax_id || '-'}</span></div>
              </div>
              {viewReceipt.description && (
                <div><span className="text-gray-500">รายละเอียด:</span> <span className="font-medium">{viewReceipt.description}</span></div>
              )}
              {viewItems.length > 0 && (
                <div>
                  <p className="text-gray-500 mb-1">รายการ:</p>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="px-3 py-2 text-left text-xs text-gray-500">#</th>
                          <th className="px-3 py-2 text-left text-xs text-gray-500">รายละเอียด</th>
                          <th className="px-3 py-2 text-right text-xs text-gray-500">จำนวนเงิน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {viewItems.map((item, idx) => (
                          <tr key={item.id || idx}>
                            <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                            <td className="px-3 py-2 text-gray-700">{item.description || '-'}</td>
                            <td className="px-3 py-2 text-right font-medium">฿{item.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">ยอดก่อนภาษี</span><span className="font-medium">฿{viewReceipt.subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">ภาษีมูลค่าเพิ่ม</span><span className="font-medium">฿{viewReceipt.vat_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>รวมทั้งสิ้น</span><span>฿{viewReceipt.total_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span></div>
              </div>
              {viewReceipt.notes && (
                <div><span className="text-gray-500">หมายเหตุ:</span> {viewReceipt.notes}</div>
              )}
            </div>
            <div className="px-6 py-3 border-t flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => handlePrintReceipt(viewReceipt, false)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#7D735F] bg-[#F5F0E6] hover:bg-[#EDE5D4] rounded-lg transition-colors font-medium"
                >
                  <Printer className="h-4 w-4" />
                  พิมพ์ต้นฉบับ
                </button>
                <button
                  onClick={() => handlePrintReceipt(viewReceipt, true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  <Printer className="h-4 w-4" />
                  พิมพ์สำเนา
                </button>
              </div>
              <button
                onClick={() => setViewReceipt(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
