import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../services/supabase'
import { 
  Banknote, 
  Plus, 
  Search, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Wallet,
  Receipt,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  X,
  Download,
  FileText,
  Trash2,
  Edit3,
  Printer,
  FileDown
} from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'

interface PettyCashFund {
  id: string
  month: number
  year: number
  initial_amount: number
  current_balance: number
  status: 'active' | 'closed' | 'replenished'
  created_at: string
}

interface PettyCashExpense {
  id: string
  fund_id: string
  expense_date: string
  amount: number
  category: string
  description: string
  receipt_number?: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

const EXPENSE_CATEGORIES = [
  { value: 'office_supplies', label: 'วัสดุสำนักงาน', icon: '📝' },
  { value: 'postage', label: 'ค่าส่งไปรษณีย์', icon: '✉️' },
  { value: 'grab', label: 'ค่าส่ง Grab', icon: '🛵' },
  { value: 'water', label: 'ค่าน้ำปะปา', icon: '💧' },
  { value: 'phone', label: 'ค่าโทรศัพท์', icon: '📞' },
  { value: 'travel', label: 'ค่าเดินทาง', icon: '🚗' },
  { value: 'food', label: 'ค่าอาหาร', icon: '🍽️' },
  { value: 'maintenance', label: 'ค่าซ่อมแซม', icon: '🔧' },
  { value: 'housekeeping', label: 'ค่าแม่บ้าน', icon: '🧹' },
  { value: 'products', label: 'ค่าสินค้า', icon: '📦' },
  { value: 'other', label: 'อื่นๆ', icon: '📋' }
]

const MONTHLY_FUND = 542.59 // วงเงินสดย่อยยกมาจากปี 2568

export default function PettyCashPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [fund, setFund] = useState<PettyCashFund | null>(null)
  const [expenses, setExpenses] = useState<PettyCashExpense[]>([])
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<PettyCashExpense | null>(null)
  const [editForm, setEditForm] = useState({
    category: '',
    description: '',
    amount: '',
    status: 'approved'
  })
  const [showFundModal, setShowFundModal] = useState(false)
  const [fundAmount, setFundAmount] = useState('')
  const [fundDescription, setFundDescription] = useState('')
  const [fundDate, setFundDate] = useState(new Date().toISOString().split('T')[0])
  const [showStatementModal, setShowStatementModal] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const [csvTransactions, setCsvTransactions] = useState<Array<{
    date: string, 
    time: string, 
    type: string, 
    withdrawal: number, 
    deposit: number, 
    balance: number, 
    channel: string, 
    details: string,
    matched?: boolean,
    existingExpenseId?: string
  }>>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  
  const [expenseForm, setExpenseForm] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    amount: '',
    category: '',
    description: '',
    receipt_number: ''
  })

  // Fetch fund and expenses for current month
  useEffect(() => {
    fetchFundAndExpenses()
  }, [currentDate])

  const fetchFundAndExpenses = async () => {
    const month = currentDate.getMonth() + 1
    const year = currentDate.getFullYear()
    
    try {
      // Get or create fund for this month
      let { data: fundData, error: fundError } = await supabase
        .from('petty_cash_funds')
        .select('*')
        .eq('month', month)
        .eq('year', year)
        .single()

      if (fundError && fundError.code === 'PGRST116') {
        // Fund doesn't exist, create it
        const { data: newFund, error: createError } = await supabase
          .from('petty_cash_funds')
          .insert({
            month,
            year,
            initial_amount: MONTHLY_FUND,
            current_balance: MONTHLY_FUND,
            status: 'active'
          })
          .select()
          .single()
        
        if (createError) throw createError
        fundData = newFund
      } else if (fundError) {
        throw fundError
      }

      setFund(fundData)

      // Get expenses for this fund
      if (fundData) {
        const { data: expensesData, error: expensesError } = await supabase
          .from('petty_cash_expenses')
          .select('*')
          .eq('fund_id', fundData.id)
          .order('expense_date', { ascending: false })
        
        if (expensesError) throw expensesError
        setExpenses(expensesData || [])
      }
    } catch (error) {
      console.error('Error fetching petty cash data:', error)
    }
  }

  // Calculate statistics
  const stats = useMemo(() => {
    if (!fund) return null
    
    // Filter expenses by current month/year for stats
    const monthlyExpenses = expenses.filter(e => {
      const expenseDate = new Date(e.expense_date)
      return expenseDate.getFullYear() === currentDate.getFullYear() && 
             expenseDate.getMonth() === currentDate.getMonth()
    })
    
    // Calculate total replenishments (income) for current month
    const totalReplenishments = monthlyExpenses
      .filter(e => e.category === 'income')
      .reduce((sum, e) => sum + Math.abs(e.amount), 0)
    
    const totalExpenses = monthlyExpenses
      .filter(e => e.category !== 'income')
      .reduce((sum, e) => sum + e.amount, 0)
    const approvedExpenses = monthlyExpenses
      .filter(e => e.status === 'approved' && e.category !== 'income')
      .reduce((sum, e) => sum + e.amount, 0)
    const pendingExpenses = monthlyExpenses
      .filter(e => e.status === 'pending' && e.category !== 'income')
      .reduce((sum, e) => sum + e.amount, 0)
    
    // Calculate remaining balance = totalReplenishments - totalExpenses
    const currentBalance = totalReplenishments - totalExpenses
    
    // Category breakdown - only for current month (exclude income)
    const categoryTotals = monthlyExpenses
      .filter(e => e.category !== 'income')
      .reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount
        return acc
      }, {} as Record<string, number>)
    
    return {
      initialAmount: totalReplenishments,
      totalReplenishments,
      currentBalance,
      totalExpenses,
      approvedExpenses,
      pendingExpenses,
      remainingPercentage: totalReplenishments > 0 ? (currentBalance / totalReplenishments) * 100 : 0,
      categoryTotals
    }
  }, [fund, expenses, currentDate])

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const matchesSearch = 
        expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.receipt_number?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = !selectedCategory || expense.category === selectedCategory
      // Filter by current month/year
      const expenseDate = new Date(expense.expense_date)
      const matchesMonth = expenseDate.getFullYear() === currentDate.getFullYear() && 
                          expenseDate.getMonth() === currentDate.getMonth()
      return matchesSearch && matchesCategory && matchesMonth
    })
  }, [expenses, searchQuery, selectedCategory, currentDate])

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fund) return

    const amount = parseFloat(expenseForm.amount)
    if (amount <= 0 || amount > fund.current_balance) {
      alert('จำนวนเงินไม่ถูกต้อง หรือเกินวงเงินที่เหลือ')
      return
    }

    try {
      // Add expense
      const { error: expenseError } = await supabase
        .from('petty_cash_expenses')
        .insert({
          fund_id: fund.id,
          expense_date: expenseForm.expense_date,
          amount,
          category: expenseForm.category,
          description: expenseForm.description,
          receipt_number: expenseForm.receipt_number || null,
          status: 'approved' // Auto-approve for now
        })

      if (expenseError) throw expenseError

      // Update fund balance
      const { error: fundError } = await supabase
        .from('petty_cash_funds')
        .update({ 
          current_balance: fund.current_balance - amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', fund.id)

      if (fundError) throw fundError

      // Reset form and refresh
      setExpenseForm({
        expense_date: new Date().toISOString().split('T')[0],
        amount: '',
        category: '',
        description: '',
        receipt_number: ''
      })
      setShowExpenseModal(false)
      await fetchFundAndExpenses()
      
    } catch (error) {
      console.error('Error adding expense:', error)
      alert('ไม่สามารถบันทึกรายการได้')
    }
  }

  const handleReplenish = async () => {
    if (!fund) return
    
    if (!confirm('ต้องการเติมเงินสดย่อยใหม่ (รายเดือน) ใช่หรือไม่?')) return

    try {
      // Close current fund
      await supabase
        .from('petty_cash_funds')
        .update({ 
          status: 'replenished',
          replenished_at: new Date().toISOString()
        })
        .eq('id', fund.id)

      // Create new fund for next month or refresh current
      const nextMonth = currentDate.getMonth() + 2 // +1 for next month, +1 because getMonth is 0-indexed
      const nextYear = currentDate.getFullYear()
      
      await supabase
        .from('petty_cash_funds')
        .insert({
          month: nextMonth > 12 ? 1 : nextMonth,
          year: nextMonth > 12 ? nextYear + 1 : nextYear,
          initial_amount: MONTHLY_FUND,
          current_balance: MONTHLY_FUND,
          status: 'active'
        })

      await fetchFundAndExpenses()
      alert('เติมเงินสดย่อยเรียบร้อย')
      
    } catch (error) {
      console.error('Error replenishing fund:', error)
    }
  }

  const exportCSV = () => {
    if (!stats) return
    
    const monthName = currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric', calendar: 'gregory' })
    
    // Sort by date (oldest first)
    const sortedExpenses = [...filteredExpenses].sort((a, b) => 
      new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime()
    )
    
    const csvContent = [
      ['วันที่', 'หมวดหมู่', 'รายการ', 'จำนวนเงิน', 'สถานะ', 'เลขที่ใบเสร็จ'].join(','),
      ...sortedExpenses.map(e => [
        new Date(e.expense_date).toLocaleDateString('th-TH', { calendar: 'gregory' }),
        EXPENSE_CATEGORIES.find(c => c.value === e.category)?.label || (e.category === 'income' ? 'เติมเงิน' : e.category),
        e.description,
        e.amount,
        e.status === 'approved' ? 'อนุมัติ' : e.status === 'pending' ? 'รออนุมัติ' : 'ปฏิเสธ',
        e.receipt_number || '-'
      ].join(','))
    ].join('\n')

    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `รายงานเงินสดย่อย_${monthName}.csv`
    link.click()
    setShowExportMenu(false)
  }

  const printReport = () => {
    if (!stats) return
    
    const monthName = currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric', calendar: 'gregory' })
    
    // Sort by date (oldest first)
    const sortedExpenses = [...filteredExpenses].sort((a, b) => 
      new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime()
    )
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>รายงานเงินสดย่อย ${monthName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 15px; font-size: 12px; }
          h1 { text-align: center; color: #5C4A32; font-size: 18px; margin-bottom: 10px; }
          p { font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: left; font-size: 11px; }
          th { background-color: #A67B5B; color: white; font-size: 11px; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .text-right { text-align: right; }
          @media print {
            body { margin: 0; font-size: 10px; }
            th, td { font-size: 10px; padding: 4px; }
          }
        </style>
      </head>
      <body>
        <h1>รายงานเงินสดย่อย ${monthName}</h1>
        <p style="text-align: center; font-size: 14px; margin-bottom: 20px;">ตั้งวงเงินสดย่อย : 5,000.00 บาท</p>
        <table>
          <thead>
            <tr>
              <th>วันที่</th>
              <th>รายการ</th>
              <th>รายละเอียด</th>
              <th class="text-right">เงินสดรับ</th>
              <th class="text-right">เงินสดจ่าย</th>
              <th>เลขที่ใบเสร็จ</th>
            </tr>
          </thead>
          <tbody>
            ${sortedExpenses.map(e => `
              <tr>
                <td>${new Date(e.expense_date).toLocaleDateString('th-TH', { calendar: 'gregory' })}</td>
                <td>${EXPENSE_CATEGORIES.find(c => c.value === e.category)?.label || (e.category === 'income' ? 'เติมเงิน' : e.category)}</td>
                <td>${e.description}</td>
                <td class="text-right">${e.category === 'income' ? Math.abs(e.amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                <td class="text-right">${e.category !== 'income' ? e.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                <td>${e.receipt_number || '-'}</td>
              </tr>
            `).join('')}
            <tr style="font-weight: bold; background-color: #f5f5f5;">
              <td colspan="3" style="text-align: right;">ยอดคงเหลือ</td>
              <td class="text-right" colspan="2">${stats.currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">พิมพ์ / บันทึก PDF</button>
        </div>
        <style>
          @media print {
            .no-print { display: none !important; }
          }
        </style>
      </body>
      </html>
    `
    
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    setShowExportMenu(false)
  }

  const exportReport = () => {
    if (!stats) return
    
    const monthName = currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric', calendar: 'gregory' })
    
    // Sort by date (oldest first)
    const sortedExpenses = [...filteredExpenses].sort((a, b) => 
      new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime()
    )
    
    const csvContent = [
      ['วันที่', 'หมวดหมู่', 'รายการ', 'จำนวนเงิน', 'สถานะ', 'เลขที่ใบเสร็จ'].join(','),
      ...sortedExpenses.map(e => [
        new Date(e.expense_date).toLocaleDateString('th-TH', { calendar: 'gregory' }),
        EXPENSE_CATEGORIES.find(c => c.value === e.category)?.label || (e.category === 'income' ? 'เติมเงิน' : e.category),
        e.description,
        e.amount,
        e.status === 'approved' ? 'อนุมัติ' : e.status === 'pending' ? 'รออนุมัติ' : 'ปฏิเสธ',
        e.receipt_number || '-'
      ].join(','))
    ].join('\n')

    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `รายงานเงินสดย่อย_${monthName}.csv`
    link.click()
  }

  const handleAddFund = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fund) return

    const amount = parseFloat(fundAmount)
    if (amount <= 0) {
      alert('จำนวนเงินต้องมากกว่า 0')
      return
    }

    try {
      // 1. Update fund balance
      const { error: updateError } = await supabase
        .from('petty_cash_funds')
        .update({ 
          current_balance: fund.current_balance + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', fund.id)

      if (updateError) throw updateError

      // 2. Create income entry in petty_cash_expenses
      const { error: insertError } = await supabase
        .from('petty_cash_expenses')
        .insert({
          fund_id: fund.id,
          expense_date: fundDate,
          amount: -amount, // negative for income
          category: 'income',
          description: fundDescription || 'เติมเงินสดย่อย',
          receipt_number: null,
          status: 'approved'
        })

      if (insertError) throw insertError

      setFundAmount('')
      setFundDescription('')
      setFundDate(new Date().toISOString().split('T')[0])
      setShowFundModal(false)
      await fetchFundAndExpenses()
      alert('เติมเงินเรียบร้อย')
    } catch (error) {
      console.error('Error adding fund:', error)
      alert('ไม่สามารถเติมเงินได้')
    }
  }

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (!text) return

      const lines = text.split('\n').filter(line => line.trim())
      const transactions: Array<{
        date: string, 
        time: string, 
        type: string, 
        withdrawal: number, 
        deposit: number, 
        balance: number, 
        channel: string, 
        details: string,
        matched?: boolean,
        existingExpenseId?: string
      }> = []
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
        
        if (cols.length >= 8) {
          const date = cols[0]
          const time = cols[1]
          const type = cols[2]
          const withdrawal = parseFloat(cols[3]) || 0
          const deposit = parseFloat(cols[4]) || 0
          const balance = parseFloat(cols[5]) || 0
          const channel = cols[6]
          const details = cols[7]
          
          // Convert statement date format (05-01-26) to ISO format (2026-01-05)
          const dateParts = date.split('-')
          let isoDate = date
          if (dateParts.length === 3) {
            const day = dateParts[0]
            const month = dateParts[1]
            const year = '20' + dateParts[2] // 26 -> 2026
            isoDate = `${year}-${month}-${day}`
          }
          
          // Check if this transaction matches any existing expense
          const amount = withdrawal > 0 ? withdrawal : deposit
          const matchedExpense = expenses.find(exp => {
            const expDate = new Date(exp.expense_date).toISOString().split('T')[0]
            // For withdrawals, match positive amounts; for deposits, match negative amounts (income records)
            const expAmount = withdrawal > 0 ? exp.amount : -exp.amount
            return expDate === isoDate && Math.abs(expAmount - amount) < 0.01
          })
          
          if (date && (withdrawal > 0 || deposit > 0)) {
            transactions.push({ 
              date, 
              time, 
              type, 
              withdrawal, 
              deposit, 
              balance, 
              channel, 
              details,
              matched: !!matchedExpense,
              existingExpenseId: matchedExpense?.id
            })
          }
        }
      }
      
      setCsvTransactions(transactions)
      if (transactions.length === 0) {
        alert('ไม่พบรายการในไฟล์ กรุณาตรวจสอบรูปแบบไฟล์ CSV')
      }
    }
    reader.readAsText(file)
  }

  const handleImportStatementTransactions = async () => {
    if (!fund) return
    
    // Include both withdrawals (expenses) and deposits (income)
    const unmatchedTransactions = csvTransactions.filter(tx => !tx.matched && (tx.withdrawal > 0 || tx.deposit > 0))
    if (unmatchedTransactions.length === 0) {
      alert('ไม่มีรายการใหม่ที่ต้องนำเข้า')
      return
    }

    try {
      let importedCount = 0
      let skippedCount = 0
      
      // Check for existing transactions before importing
      const { data: existingExpenses } = await supabase
        .from('petty_cash_expenses')
        .select('expense_date, description, amount')
        .eq('fund_id', fund.id)
      
      const existingSet = new Set(
        (existingExpenses || []).map(e => `${e.expense_date}|${e.description}|${Math.abs(e.amount)}`)
      )
      
      for (const tx of unmatchedTransactions) {
        // Convert date format
        const dateParts = tx.date.split('-')
        let isoDate = tx.date
        if (dateParts.length === 3) {
          const day = dateParts[0]
          const month = dateParts[1]
          const year = '20' + dateParts[2]
          isoDate = `${year}-${month}-${day}`
        }

        // Check if this transaction already exists
        const description = tx.withdrawal > 0 
          ? `${tx.type} - ${tx.details}`
          : `เงินเข้า - ${tx.type} - ${tx.details}`
        const amount = tx.withdrawal > 0 ? tx.withdrawal : tx.deposit
        const key = `${isoDate}|${description}|${amount}`
        
        if (existingSet.has(key)) {
          skippedCount++
          continue
        }

        if (tx.withdrawal > 0) {
          // Add as expense (withdrawal)
          const { error } = await supabase
            .from('petty_cash_expenses')
            .insert({
              fund_id: fund.id,
              expense_date: isoDate,
              amount: tx.withdrawal,
              category: 'other',
              description: `${tx.type} - ${tx.details}`,
              receipt_number: null,
              status: 'approved'
            })
          if (!error) importedCount++
        } else if (tx.deposit > 0) {
          // Add as income/deposit - create a special income record
          const { error } = await supabase
            .from('petty_cash_expenses')
            .insert({
              fund_id: fund.id,
              expense_date: isoDate,
              amount: -tx.deposit,
              category: 'income',
              description: `เงินเข้า - ${tx.type} - ${tx.details}`,
              receipt_number: null,
              status: 'approved'
            })
          if (!error) importedCount++
        }
      }

      // Update fund balance
      const importedWithdrawals = unmatchedTransactions
        .filter(tx => tx.withdrawal > 0 && !existingSet.has(`${(() => {
          const dateParts = tx.date.split('-')
          let isoDate = tx.date
          if (dateParts.length === 3) {
            const day = dateParts[0]
            const month = dateParts[1]
            const year = '20' + dateParts[2]
            isoDate = `${year}-${month}-${day}`
          }
          return `${isoDate}|${tx.type} - ${tx.details}|${tx.withdrawal}`
        })()}`))
        .reduce((sum, tx) => sum + tx.withdrawal, 0)
      
      const importedDeposits = unmatchedTransactions
        .filter(tx => tx.deposit > 0 && !existingSet.has(`${(() => {
          const dateParts = tx.date.split('-')
          let isoDate = tx.date
          if (dateParts.length === 3) {
            const day = dateParts[0]
            const month = dateParts[1]
            const year = '20' + dateParts[2]
            isoDate = `${year}-${month}-${day}`
          }
          return `${isoDate}|เงินเข้า - ${tx.type} - ${tx.details}|${tx.deposit}`
        })()}`))
        .reduce((sum, tx) => sum + tx.deposit, 0)
      
      const netChange = importedDeposits - importedWithdrawals
      
      await supabase
        .from('petty_cash_funds')
        .update({ 
          current_balance: fund.current_balance + netChange,
          updated_at: new Date().toISOString()
        })
        .eq('id', fund.id)

      await fetchFundAndExpenses()
      setCsvTransactions([])
      setShowStatementModal(false)
      const alreadyMatchedCount = csvTransactions.filter(tx => tx.matched && (tx.withdrawal > 0 || tx.deposit > 0)).length
      alert(`นำเข้าสำเร็จ ${importedCount} รายการ (ข้าม ${skippedCount + alreadyMatchedCount} รายการที่มีอยู่แล้ว)${importedCount > 0 ? ` - เงินออก: ฿${importedWithdrawals.toLocaleString()}, เงินเข้า: ฿${importedDeposits.toLocaleString()}` : ''}`)
    } catch (error) {
      console.error('Error importing transactions:', error)
      alert('ไม่สามารถนำเข้ารายการได้')
    }
  }

  const handleConfirmMatch = async (tx: typeof csvTransactions[0]) => {
    if (!tx.existingExpenseId) return
    
    try {
      // Update existing expense to mark as reconciled
      await supabase
        .from('petty_cash_expenses')
        .update({ 
          status: 'reconciled',
          updated_at: new Date().toISOString()
        })
        .eq('id', tx.existingExpenseId)

      // Mark this transaction as confirmed
      setCsvTransactions(prev => prev.map(t => 
        t.date === tx.date && t.details === tx.details 
          ? { ...t, matched: true, confirmed: true }
          : t
      ))
      
      await fetchFundAndExpenses()
    } catch (error) {
      console.error('Error confirming match:', error)
    }
  }

  const handleDeleteExpense = async (expenseId: string, amount: number) => {
    if (!fund) return
    
    if (!confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) return

    try {
      const { error: deleteError } = await supabase
        .from('petty_cash_expenses')
        .delete()
        .eq('id', expenseId)

      if (deleteError) throw deleteError

      const { error: fundError } = await supabase
        .from('petty_cash_funds')
        .update({ 
          current_balance: fund.current_balance + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', fund.id)

      if (fundError) throw fundError

      await fetchFundAndExpenses()
      alert('ลบรายการเรียบร้อย')
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('ไม่สามารถลบรายการได้')
    }
  }

  const handleEditExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExpense) return

    try {
      const { error } = await supabase
        .from('petty_cash_expenses')
        .update({
          category: editForm.category,
          description: editForm.description,
          status: editForm.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingExpense.id)

      if (error) throw error

      setShowEditModal(false)
      setEditingExpense(null)
      await fetchFundAndExpenses()
      alert('แก้ไขรายการเรียบร้อย')
    } catch (error) {
      console.error('Error editing expense:', error)
      alert('ไม่สามารถแก้ไขรายการได้')
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Banknote className="h-8 w-8 text-[#A67B5B] mt-1" />
          <div>
            <h1 className="text-2xl font-bold text-[#5C4A32]">เงินสดย่อย</h1>
            <p className="text-[#8B7355]">จัดการเงินสดย่อย</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div ref={exportMenuRef} className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#A67B5B] bg-white text-[#A67B5B] text-sm whitespace-nowrap hover:bg-[#A67B5B]/10 transition-all shadow-sm"
            >
              <Download className="h-4 w-4" />
              ส่งออกรายงาน
              <ChevronDown className="h-3 w-3" />
            </button>
            
            {showExportMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <button
                  onClick={printReport}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print Preview / PDF
                </button>
                <button
                  onClick={exportCSV}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  Export CSV
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowStatementModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#8B7355] bg-white text-[#8B7355] text-sm whitespace-nowrap hover:bg-[#8B7355]/10 transition-all shadow-sm"
          >
            <FileText className="h-4 w-4" />
            กระทบยอด Statement
          </button>
          <button
            onClick={() => setShowFundModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#2E7D32] bg-white text-[#2E7D32] text-sm whitespace-nowrap hover:bg-[#2E7D32]/10 transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            เติมเงิน
          </button>
          <button
            onClick={() => setShowExpenseModal(true)}
            disabled={!fund || fund.current_balance <= 0}
            className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#A67B5B] bg-white text-[#A67B5B] text-sm whitespace-nowrap hover:bg-[#A67B5B]/10 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            บันทึกค่าใช้จ่าย
          </button>
        </div>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-between mb-6 bg-[#F5F0E8] rounded-lg p-3">
        <button
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
          className="p-2 hover:bg-[#E8E0D5] rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-[#5C4A32]" />
        </button>
        <span className="text-base font-medium text-[#5C4A32]">
          {currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric', calendar: 'gregory' })}
        </span>
        <button
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
          className="p-2 hover:bg-[#E8E0D5] rounded-lg transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-[#5C4A32]" />
        </button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Card className="bg-white border-gray-200">
            <div className="p-4 flex flex-col items-center justify-center h-full min-h-[120px]">
              <Banknote className="h-6 w-6 text-black mb-2" />
              <p className="text-xs text-black text-center whitespace-nowrap">ยอดยกมา+เติมเงิน</p>
              <p className="text-lg font-bold text-green-600 text-center">฿{stats.totalReplenishments.toLocaleString()}</p>
            </div>
          </Card>
          <Card className="bg-white border-gray-200">
            <div className="p-4 flex flex-col items-center justify-center h-full min-h-[120px]">
              <Receipt className="h-6 w-6 text-black mb-2" />
              <p className="text-xs text-black text-center whitespace-nowrap">ใช้ไปแล้ว</p>
              <p className="text-lg font-bold text-black text-center">฿{stats.totalExpenses.toLocaleString()}</p>
            </div>
          </Card>
          <Card className="bg-white border-gray-200">
            <div className="p-4 flex flex-col items-center justify-center h-full min-h-[120px]">
              <Wallet className="h-6 w-6 text-black mb-2" />
              <p className="text-xs text-black text-center whitespace-nowrap">คงเหลือ</p>
              <p className="text-lg font-bold text-black text-center">฿{stats.currentBalance.toLocaleString()}</p>
            </div>
          </Card>
          <Card className="bg-white border-gray-200">
            <div className="p-4 flex flex-col items-center justify-center h-full min-h-[120px]">
              <TrendingDown className="h-6 w-6 text-black mb-2" />
              <p className="text-xs text-black text-center whitespace-nowrap">เปอร์เซ็นต์ที่เหลือ</p>
              <p className="text-lg font-bold text-black text-center">{stats.remainingPercentage.toFixed(1)}%</p>
            </div>
          </Card>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="ค้นหารายการ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A67B5B] bg-white"
        >
          <option value="">ทั้งหมด</option>
          {EXPENSE_CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Category Breakdown */}
      {stats && Object.keys(stats.categoryTotals).length > 0 && (
        <Card className="mb-6 border-[#E8E0D5]">
          <div className="p-4 border-b border-[#E8E0D5] bg-[#FAF8F5]">
            <h2 className="text-base font-bold text-[#5C4A32]">สรุปตามหมวดหมู่</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.categoryTotals)
                .filter(([category]) => category !== 'income')
                .map(([category, total]) => {
                const cat = EXPENSE_CATEGORIES.find(c => c.value === category)
                // Show positive value for income (stored as negative in DB)
                const displayTotal = category === 'income' ? Math.abs(total) : total
                return (
                  <div 
                    key={category} 
                    onClick={() => {
                      setSelectedCategory(category)
                      // Scroll to expense list
                      document.getElementById('expense-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }}
                    className="flex items-center gap-3 p-3 bg-[#F5F0E8] rounded-lg cursor-pointer hover:bg-[#E8E0D5] transition-colors"
                  >
                    <span className="text-2xl">{cat?.icon || '📋'}</span>
                    <div>
                      <p className="text-xs text-[#8B7355]">{cat?.label || category}</p>
                      <p className="font-bold text-[#5C4A32]">฿{displayTotal.toLocaleString()}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Calendar View - Daily Summary */}
      <Card className="border-[#E8E0D5] mb-6">
        <div className="p-4 border-b border-[#E8E0D5] bg-[#FAF8F5]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#5C4A32]">สรุปรายการค่าใช้จ่ายรายวัน</h2>
            <div className="text-sm text-[#8B7355]">
              {filteredExpenses.filter(e => e.category !== 'income').length} รายการ | ฿{filteredExpenses.filter(e => e.category !== 'income').reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
            </div>
          </div>
        </div>
        
        {/* Calendar Grid */}
        <div className="p-4">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-[#8B7355] py-2 bg-[#F5F0E8] rounded">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Days - Summary Only */}
          <div className="grid grid-cols-7 gap-1">
            {(() => {
              const year = currentDate.getFullYear()
              const month = currentDate.getMonth()
              const firstDay = new Date(year, month, 1)
              const lastDay = new Date(year, month + 1, 0)
              const daysInMonth = lastDay.getDate()
              const startDayOfWeek = firstDay.getDay()
              
              const days = []
              
              // Empty cells for days before the 1st
              for (let i = 0; i < startDayOfWeek; i++) {
                days.push(<div key={`empty-${i}`} className="h-20 bg-gray-50 rounded" />)
              }
              
              // Days of the month
              for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const dayExpenses = filteredExpenses.filter(e => e.expense_date === dateStr && e.category !== 'income')
                const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0)
                const isToday = new Date().toDateString() === new Date(year, month, day).toDateString()
                const hasExpenses = dayExpenses.length > 0
                
                days.push(
                  <div 
                    key={day} 
                    className={`h-20 border rounded p-2 flex flex-col justify-between cursor-pointer transition-colors ${
                      isToday ? 'border-[#A67B5B] bg-[#FAF8F5]' : hasExpenses ? 'border-[#E8E0D5] bg-white hover:bg-[#F5F0E8]' : 'border-[#E8E0D5] bg-white'
                    }`}
                    onClick={() => {
                      if (hasExpenses) {
                        // Scroll to the list section for this date
                        document.getElementById(`date-${dateStr}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }
                    }}
                  >
                    <div className={`text-sm font-medium ${isToday ? 'text-[#A67B5B]' : 'text-[#5C4A32]'}`}>
                      {day}
                    </div>
                    {hasExpenses && (
                      <div className="text-right">
                        <div className="text-xs text-[#8B7355]">{dayExpenses.length} รายการ</div>
                        <div className="text-sm font-bold text-[#E65100]">฿{dayTotal.toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                )
              }
              
              return days
            })()}
          </div>
        </div>
      </Card>

      {/* Income/Replenishment List */}
      {filteredExpenses.filter(e => e.category === 'income').length > 0 && (
        <Card className="border-[#E8E0D5] mb-6">
          <div className="p-4 border-b border-[#E8E0D5] bg-[#FAF8F5]">
            <h2 className="text-base font-bold text-[#5C4A32]">รายการเติมเงิน</h2>
          </div>
          <div className="divide-y divide-[#E8E0D5]">
            {filteredExpenses
              .filter(e => e.category === 'income')
              .map((expense) => (
                <div 
                  key={expense.id} 
                  className="p-4 flex items-center justify-between hover:bg-[#FAF8F5]"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Banknote className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-[#5C4A32]">{expense.description}</p>
                      <p className="text-sm text-[#8B7355]">
                        {new Date(expense.expense_date).toLocaleDateString('th-TH', { calendar: 'gregory' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-green-600">+฿{Math.abs(expense.amount).toLocaleString()}</p>
                    <button
                      onClick={() => handleDeleteExpense(expense.id, expense.amount)}
                      className="p-1.5 hover:bg-red-100 rounded text-red-500 transition-colors"
                      title="ลบรายการ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Expenses List - Original Style */}
      <div id="expense-list">
        <Card className="border-[#E8E0D5]">
        <div className="p-4 border-b border-[#E8E0D5] bg-[#FAF8F5]">
          <h2 className="text-base font-bold text-[#5C4A32]">รายการค่าใช้จ่าย</h2>
        </div>
        <div className="divide-y divide-[#E8E0D5]">
          {filteredExpenses.filter(e => e.category !== 'income').length === 0 ? (
            <div className="p-8 text-center">
              <Receipt className="h-12 w-12 text-[#D4C9B8] mx-auto mb-3" />
              <p className="text-[#8B7355]">ไม่มีรายการค่าใช้จ่ายในเดือนนี้</p>
            </div>
          ) : (
            filteredExpenses
              .filter(e => e.category !== 'income')
              .map((expense) => {
              const category = EXPENSE_CATEGORIES.find(c => c.value === expense.category)
              return (
                <div 
                  key={expense.id} 
                  id={`date-${expense.expense_date}`}
                  className="p-4 flex items-center justify-between hover:bg-[#FAF8F5]"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-[#F5F0E8] rounded-lg">
                      <span className="text-xl">{category?.icon || '📋'}</span>
                    </div>
                    <div>
                      <p className="font-medium text-[#5C4A32]">{expense.description}</p>
                      <p className="text-sm text-[#8B7355]">
                        {new Date(expense.expense_date).toLocaleDateString('th-TH', { calendar: 'gregory' })} • <span className={expense.category === 'other' ? 'text-red-500 font-semibold' : ''}>{category?.label}</span>
                      </p>
                      {expense.receipt_number && (
                        <p className="text-xs text-[#A67B52]">เลขที่: {expense.receipt_number}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#E65100]">฿{expense.amount.toLocaleString()}</p>
                    <div className="flex items-center gap-2 justify-end mt-1">
                      {expense.status === 'approved' ? (
                        <span className="text-xs text-[#2E7D32] flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> อนุมัติ
                        </span>
                      ) : expense.status === 'pending' ? (
                        <span className="text-xs text-[#F57C00]">รออนุมัติ</span>
                      ) : (
                        <span className="text-xs text-[#C62828]">ปฏิเสธ</span>
                      )}
                      <button
                        onClick={() => {
                          setEditingExpense(expense)
                          setEditForm({
                            category: expense.category,
                            description: expense.description,
                            amount: expense.amount.toString(),
                            status: expense.status
                          })
                          setShowEditModal(true)
                        }}
                        className="p-1 hover:bg-blue-100 rounded text-blue-500 transition-colors"
                        title="แก้ไขรายการ"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense.id, expense.amount)}
                        className="p-1 hover:bg-red-100 rounded text-red-500 transition-colors"
                        title="ลบรายการ"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>

      {/* Fund Modal */}
      {showFundModal && fund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[#E8E0D5]">
              <h3 className="text-lg font-bold text-[#5C4A32]">เติมเงินสดย่อย</h3>
              <button
                onClick={() => setShowFundModal(false)}
                className="p-2 hover:bg-[#F5F0E8] rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-[#8B7355]" />
              </button>
            </div>
            
            <form onSubmit={handleAddFund} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">วันที่เติมเงิน</label>
                <Input
                  type="date"
                  value={fundDate}
                  onChange={(e) => setFundDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">จำนวนเงินที่จะเติม (บาท)</label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">คำอธิบาย (ไม่บังคับ)</label>
                <Input
                  type="text"
                  value={fundDescription}
                  onChange={(e) => setFundDescription(e.target.value)}
                  placeholder="เช่น เติมเงินประจำเดือน หรือ รับโอนเงิน"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  onClick={() => setShowFundModal(false)} 
                  className="flex-1 bg-white border-2 border-gray-300 !text-black hover:bg-gray-50"
                >
                  ยกเลิก
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-[#2E7D32] border-2 border-[#2E7D32] !text-white hover:bg-[#1B5E20]"
                >
                  เติมเงิน
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
      {showExpenseModal && fund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[#E8E0D5]">
              <h3 className="text-lg font-bold text-[#5C4A32]">บันทึกค่าใช้จ่าย</h3>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="p-2 hover:bg-[#F5F0E8] rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-[#8B7355]" />
              </button>
            </div>
            
            <form onSubmit={handleAddExpense} className="p-4 space-y-4">
              {/* Balance Warning */}
              <div className="p-3 bg-[#F5F0E8] rounded-lg">
                <p className="text-sm text-[#8B7355]">วงเงินคงเหลือ: <span className="font-bold text-[#A67B5B]">฿{fund.current_balance.toLocaleString()}</span></p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">วันที่</label>
                <Input
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">หมวดหมู่</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A67B5B] bg-white"
                  required
                >
                  <option value="">เลือกหมวดหมู่</option>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">รายการ</label>
                <Input
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="เช่น ค่าซื้อกระดาษ A4"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">จำนวนเงิน (บาท)</label>
                <Input
                  type="number"
                  min="0"
                  max={fund.current_balance}
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5C4A32] mb-1">เลขที่ใบเสร็จ (ถ้ามี)</label>
                <Input
                  value={expenseForm.receipt_number}
                  onChange={(e) => setExpenseForm({ ...expenseForm, receipt_number: e.target.value })}
                  placeholder="RE-2024-001"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  onClick={() => setShowExpenseModal(false)} 
                  className="flex-1 bg-white border-2 border-gray-300 !text-black hover:bg-gray-50"
                >
                  ยกเลิก
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-[#A67B5B] border-2 border-[#A67B5B] !text-white hover:bg-[#8B7355]"
                >
                  บันทึก
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Statement Reconciliation Modal */}
      {showStatementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-black">กระทบยอด Bank Statement</h3>
              <button
                onClick={() => setShowStatementModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-black" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  อัพโหลดไฟล์ Statement ธนาคาร (PDF) เพื่อกระทบยอดกับรายการเงินสดย่อย
                </p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                  id="statement-upload"
                />
                <label 
                  htmlFor="statement-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <FileText className="h-12 w-12 text-gray-400" />
                  <span className="text-gray-600">คลิกเพื่ออัพโหลดไฟล์ CSV</span>
                  <span className="text-xs text-gray-400">รองรับไฟล์ CSV จากธนาคารไทย</span>
                </label>
              </div>

              {csvTransactions.length > 0 && (
                <div className="border rounded-lg">
                  <div className="p-3 bg-gray-50 border-b">
                    <h4 className="font-medium text-black">รายการจาก Statement ({csvTransactions.length} รายการ)</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {csvTransactions.filter(tx => tx.matched).length} รายการตรงกับในระบบ | 
                      {csvTransactions.filter(tx => !tx.matched && (tx.withdrawal > 0 || tx.deposit > 0)).length} รายการใหม่
                    </p>
                  </div>
                  <div className="p-3 max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {csvTransactions.map((tx, idx) => (
                        <div key={idx} className={`flex items-center justify-between p-3 border rounded-lg ${tx.matched ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${tx.matched ? 'bg-green-100' : 'bg-blue-100'}`}>
                              {tx.matched ? '✓' : (tx.withdrawal > 0 ? '⬆️' : '⬇️')}
                            </div>
                            <div>
                              <p className="font-medium text-black text-sm">{tx.type} - {tx.details}</p>
                              <p className="text-xs text-gray-500">{tx.date} {tx.time} | {tx.channel}</p>
                              {tx.matched && <span className="text-xs text-green-600">ตรงกับรายการในระบบ</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${tx.withdrawal > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {tx.withdrawal > 0 ? '-' : '+'}฿{(tx.withdrawal || tx.deposit).toLocaleString()}
                            </p>
                            {tx.matched && tx.existingExpenseId && (
                              <button
                                onClick={() => handleConfirmMatch(tx)}
                                className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 mt-1"
                              >
                                Confirm
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>คำแนะนำ:</strong> ระบบจะเปรียบเทียบรายการจาก Statement กับรายการที่บันทึกไว้ในระบบ
                </p>
              </div>

              <div className="border rounded-lg">
                <div className="p-3 bg-gray-50 border-b">
                  <h4 className="font-medium text-black">รายการที่ต้องกระทบยอด - {currentDate.toLocaleString('th-TH', { month: 'long', year: 'numeric' })}</h4>
                </div>
                <div className="p-3">
                  {expenses.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">ไม่มีรายการค่าใช้จ่ายในเดือนนี้</p>
                  ) : (
                    <div className="space-y-2">
                      {expenses.map((expense) => (
                        <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              {EXPENSE_CATEGORIES.find(c => c.value === expense.category)?.icon || '📋'}
                            </div>
                            <div>
                              <p className="font-medium text-black text-sm">{expense.description}</p>
                              <p className="text-xs text-gray-500">{expense.expense_date} | {expense.receipt_number || 'ไม่มีเลขที่'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-black">฿{expense.amount.toLocaleString()}</p>
                            <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                              รอดำเนินการ
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  onClick={() => {
                    setCsvTransactions([])
                    setShowStatementModal(false)
                  }} 
                  className="flex-1 bg-white border-2 border-gray-300 !text-black hover:bg-gray-50"
                >
                  ยกเลิก
                </Button>
                <Button 
                  type="button"
                  onClick={handleImportStatementTransactions}
                  disabled={csvTransactions.filter(tx => !tx.matched && (tx.withdrawal > 0 || tx.deposit > 0)).length === 0}
                  className="flex-1 bg-[#A67B5B] border-2 border-[#A67B5B] !text-white hover:bg-[#8B7355] disabled:opacity-50"
                >
                  นำเข้ารายการใหม่ ({csvTransactions.filter(tx => !tx.matched && (tx.withdrawal > 0 || tx.deposit > 0)).length})
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-black">แก้ไขรายการค่าใช้จ่าย</h3>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingExpense(null)
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-black" />
              </button>
            </div>
            
            <form onSubmit={handleEditExpense} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">ประเภทค่าใช้จ่าย</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-black"
                >
                  <option value="">เลือกประเภท</option>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">รายละเอียด</label>
                <Input
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="รายละเอียดค่าใช้จ่าย"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">จำนวนเงิน</label>
                <Input
                  type="number"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  placeholder="0.00"
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">* ไม่สามารถแก้ไขจำนวนเงินได้ (ต้องลบแล้วเพิ่มใหม่)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">สถานะ</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-black"
                >
                  <option value="pending">รออนุมัติ</option>
                  <option value="approved">อนุมัติ</option>
                  <option value="rejected">ปฏิเสธ</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingExpense(null)
                  }} 
                  className="flex-1 bg-white border-2 border-gray-300 !text-black hover:bg-gray-50">
                  ยกเลิก
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-[#A67B5B] border-2 border-[#A67B5B] !text-white hover:bg-[#8B7355]"
                >
                  บันทึก
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
