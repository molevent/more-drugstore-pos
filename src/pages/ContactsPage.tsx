import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  Trash2, 
  X,
  Building2,
  User,
  ArrowLeftRight,
  BookOpen,
  Image as ImageIcon,
  CreditCard,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  CheckSquare,
  Square,
  Upload,
  CloudOff,
  Download,
  Eye,
  FileText,
  ShoppingCart,
  Package,
  Star
} from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { supabase } from '../services/supabase'
import { createContact as createFlowContact, updateContact as updateFlowContact, convertContactToFlowAccount, getContacts as getFlowContacts } from '../services/flowaccount'

interface Contact {
  id: string
  name: string
  type: 'buyer' | 'seller' | 'both'
  person_type?: 'individual' | 'company'
  sub_types?: string[]
  credit_days?: number
  business_location?: 'thailand' | 'foreign'
  phone?: string
  mobile?: string
  email?: string
  address?: string
  shipping_address?: string
  postal_code?: string
  company_name?: string
  tax_id?: string
  national_id?: string
  office_type?: 'headquarters' | 'branch'
  branch_code?: string
  code?: string
  notes?: string
  // Bank information
  bank_name?: string
  bank_account_name?: string
  bank_account_number?: string
  bank_branch_code?: string
  bank_branch_name?: string
  bank_account_type?: 'savings' | 'current'
  bank_qr_code_url?: string
  flowaccount_id?: number
  flowaccount_synced_at?: string
  is_starred?: boolean
  created_at: string
}

export default function ContactsPage() {
  const { t } = useLanguage()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'buyer' | 'seller' | 'both'>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [syncingContact, setSyncingContact] = useState<string | null>(null)
  const [syncFilter, setSyncFilter] = useState<'all' | 'synced' | 'not_synced'>('all')
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [isBatchSyncing, setIsBatchSyncing] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [faContacts, setFaContacts] = useState<any[]>([])
  const [loadingFaContacts, setLoadingFaContacts] = useState(false)
  const [importingContacts, setImportingContacts] = useState(false)
  const [selectedFaContacts, setSelectedFaContacts] = useState<Set<number>>(new Set())
  const [importProgress, setImportProgress] = useState('')
  const [faSearchTerm, setFaSearchTerm] = useState('')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailContact, setDetailContact] = useState<Contact | null>(null)
  const [detailOrders, setDetailOrders] = useState<any[]>([])
  const [detailPOs, setDetailPOs] = useState<any[]>([])
  const [detailExpenses, setDetailExpenses] = useState<any[]>([])
  const [detailQuotations, setDetailQuotations] = useState<any[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTab, setDetailTab] = useState<'sales' | 'purchases' | 'quotations'>('sales')
  const [formData, setFormData] = useState({
    name: '',
    type: 'buyer' as 'buyer' | 'seller' | 'both',
    person_type: 'company' as 'individual' | 'company',
    sub_types: [] as string[],
    credit_days: '',
    business_location: 'thailand' as 'thailand' | 'foreign',
    phone: '',
    mobile: '',
    email: '',
    address: '',
    shipping_address: '',
    postal_code: '',
    company_name: '',
    tax_id: '',
    national_id: '',
    office_type: 'headquarters' as 'headquarters' | 'branch',
    branch_code: '',
    code: '',
    notes: '',
    // Bank fields
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_branch_code: '',
    bank_branch_name: '',
    bank_account_type: 'savings' as 'savings' | 'current',
    bank_qr_code_url: ''
  })

  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setContacts(data || [])
    } catch (error) {
      console.error('Error fetching contacts:', error)
      // Demo data
      setContacts([
        {
          id: '1',
          name: 'ร้านขายยาดีเภสัช',
          type: 'seller',
          phone: '02-123-4567',
          email: 'contact@deepharmacy.com',
          address: '123 ถนนสุขุมวิท กรุงเทพฯ',
          company_name: 'บริษัท ดีเภสัช จำกัด',
          tax_id: '1234567890123',
          notes: 'ผู้จำหน่ายหลัก',
          created_at: '2024-01-01'
        },
        {
          id: '2',
          name: 'คลินิกหมอสมชาย',
          type: 'buyer',
          phone: '02-987-6543',
          email: 'clinic@example.com',
          address: '456 ถนนราชดำริ กรุงเทพฯ',
          company_name: 'คลินิกสมชาย',
          tax_id: '0987654321098',
          notes: 'ลูกค้าประจำ',
          created_at: '2024-01-15'
        },
        {
          id: '3',
          name: 'ร้านขายยาเพชรบุรี',
          type: 'both',
          phone: '02-555-8888',
          email: 'pharmacy@example.com',
          address: '789 ถนนเพชรบุรี กรุงเทพฯ',
          company_name: 'ร้านขายยาเพชรบุรี',
          tax_id: '5555555555555',
          notes: 'ซื้อขายร่วมกัน',
          created_at: '2024-02-01'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStar = async (contact: Contact) => {
    const newStarred = !contact.is_starred
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ is_starred: newStarred })
        .eq('id', contact.id)
      if (error) throw error
      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, is_starred: newStarred } : c))
    } catch (error) {
      console.error('Error toggling star:', error)
    }
  }

  const handleViewDetail = async (contact: Contact) => {
    setDetailContact(contact)
    setShowDetailModal(true)
    setDetailLoading(true)
    setDetailTab('sales')
    try {
      // Fetch sales orders for this contact
      const { data: orders } = await supabase
        .from('orders')
        .select('id, created_at, total_amount, payment_method, status, channel, items:order_items(quantity, product_name, price)')
        .eq('customer_id', contact.id)
        .order('created_at', { ascending: false })
        .limit(50)
      setDetailOrders(orders || [])

      // Fetch purchase orders where supplier_name matches contact name or company_name
      const names = [contact.name, contact.company_name].filter(Boolean)
      let poResults: any[] = []
      for (const n of names) {
        if (n) {
          const { data } = await supabase
            .from('purchase_orders')
            .select('*')
            .ilike('supplier_name', `%${n}%`)
            .order('order_date', { ascending: false })
            .limit(50)
          if (data) poResults.push(...data)
        }
      }
      // Deduplicate
      const uniquePOs = Array.from(new Map(poResults.map(p => [p.id, p])).values())
      setDetailPOs(uniquePOs)

      // Fetch expenses where vendor matches contact name or company_name
      let expResults: any[] = []
      for (const n of names) {
        if (n) {
          const { data } = await supabase
            .from('expenses')
            .select('*')
            .ilike('vendor', `%${n}%`)
            .order('expense_date', { ascending: false })
            .limit(50)
          if (data) expResults.push(...data)
        }
      }
      const uniqueExpenses = Array.from(new Map(expResults.map(e => [e.id, e])).values())
      setDetailExpenses(uniqueExpenses)

      // Fetch quotations
      const { data: quotations } = await supabase
        .from('quotations')
        .select('*')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false })
        .limit(50)
      setDetailQuotations(quotations || [])
    } catch (error) {
      console.error('Error fetching contact details:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Minimal validation - only name is required
    if (!formData.name.trim()) {
      alert('กรุณากรอกชื่อ-นามสกุล')
      return
    }
    
    try {
      const contactData: Partial<Contact> = {
        name: formData.name.trim(),
        type: formData.type,
        // All other fields are optional
        person_type: formData.person_type,
        sub_types: formData.sub_types,
        credit_days: formData.credit_days ? parseInt(formData.credit_days) : undefined,
        business_location: formData.business_location,
        phone: formData.phone?.trim() || undefined,
        mobile: formData.mobile?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        shipping_address: formData.shipping_address?.trim() || undefined,
        postal_code: formData.postal_code?.trim() || undefined,
        company_name: formData.company_name?.trim() || undefined,
        tax_id: formData.tax_id?.trim() || undefined,
        national_id: formData.national_id?.trim() || undefined,
        office_type: formData.office_type,
        branch_code: formData.branch_code?.trim() || undefined,
        code: formData.code?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
        // Bank fields
        bank_name: formData.bank_name?.trim() || undefined,
        bank_account_name: formData.bank_account_name?.trim() || undefined,
        bank_account_number: formData.bank_account_number?.trim() || undefined,
        bank_branch_code: formData.bank_branch_code?.trim() || undefined,
        bank_branch_name: formData.bank_branch_name?.trim() || undefined,
        bank_account_type: formData.bank_account_type,
        bank_qr_code_url: formData.bank_qr_code_url || undefined
      }
      
      if (editingContact) {
        const { error } = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', editingContact.id)
        
        if (error) throw error
        
        // Sync to FlowAccount
        try {
          await updateFlowContact(editingContact.id, contactData as any)
        } catch (flowError) {
          console.warn('FlowAccount sync failed:', flowError)
        }
      } else {
        const { data: newContact, error } = await supabase
          .from('contacts')
          .insert([contactData])
          .select()
          .single()
        
        if (error) throw error
        
        // Sync to FlowAccount
        try {
          if (newContact) {
            await createFlowContact(contactData as any)
          }
        } catch (flowError) {
          console.warn('FlowAccount sync failed:', flowError)
        }
      }
      
      setShowModal(false)
      resetForm()
      fetchContacts()
    } catch (error) {
      console.error('Error saving contact:', error)
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบผู้ติดต่อนี้?')) return
    
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id)
      if (error) throw error
      fetchContacts()
    } catch (error) {
      console.error('Error deleting contact:', error)
      alert('เกิดข้อผิดพลาดในการลบข้อมูล')
    }
  }

  const handleSyncToFlowAccount = async (contact: Contact) => {
    setSyncingContact(contact.id)
    
    try {
      const flowContactData = convertContactToFlowAccount(contact)
      const result = await createFlowContact(flowContactData) as any
      
      // Extract FlowAccount ID from response
      const flowId = result?.data?.list?.[0]?.id || result?.id
      const now = new Date().toISOString()
      
      // Save sync status to database
      try {
        await supabase
          .from('contacts')
          .update({ 
            flowaccount_id: flowId || null,
            flowaccount_synced_at: now
          })
          .eq('id', contact.id)
      } catch (dbErr) {
        console.warn('DB update failed (columns may not exist yet):', dbErr)
      }
      
      // Update local state
      setContacts(prev => prev.map(c => 
        c.id === contact.id 
          ? { ...c, flowaccount_id: flowId, flowaccount_synced_at: now }
          : c
      ))
    } catch (error) {
      console.error('FlowAccount sync error:', error)
      alert('Sync to FlowAccount failed: ' + (error as Error).message)
    } finally {
      setSyncingContact(null)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'buyer',
      person_type: 'company',
      sub_types: [],
      credit_days: '',
      business_location: 'thailand',
      phone: '',
      mobile: '',
      email: '',
      address: '',
      shipping_address: '',
      postal_code: '',
      company_name: '',
      tax_id: '',
      national_id: '',
      office_type: 'headquarters',
      branch_code: '',
      code: '',
      notes: '',
      // Bank fields
      bank_name: '',
      bank_account_name: '',
      bank_account_number: '',
      bank_branch_code: '',
      bank_branch_name: '',
      bank_account_type: 'savings',
      bank_qr_code_url: ''
    })
  }

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact)
    setFormData({
      name: contact.name,
      type: contact.type,
      person_type: contact.person_type || 'company',
      sub_types: contact.sub_types || [],
      credit_days: contact.credit_days?.toString() || '',
      business_location: contact.business_location || 'thailand',
      phone: contact.phone || '',
      mobile: contact.mobile || '',
      email: contact.email || '',
      address: contact.address || '',
      shipping_address: contact.shipping_address || '',
      postal_code: contact.postal_code || '',
      company_name: contact.company_name || '',
      tax_id: contact.tax_id || '',
      national_id: contact.national_id || '',
      office_type: contact.office_type || 'headquarters',
      branch_code: contact.branch_code || '',
      code: contact.code || '',
      notes: contact.notes || '',
      // Bank fields
      bank_name: contact.bank_name || '',
      bank_account_name: contact.bank_account_name || '',
      bank_account_number: contact.bank_account_number || '',
      bank_branch_code: contact.bank_branch_code || '',
      bank_branch_name: contact.bank_branch_name || '',
      bank_account_type: contact.bank_account_type || 'savings',
      bank_qr_code_url: contact.bank_qr_code_url || ''
    })
    setShowModal(true)
  }

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.phone?.includes(searchTerm) ||
                         contact.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || contact.type === filterType
    const matchesSync = syncFilter === 'all' 
      || (syncFilter === 'synced' && !!contact.flowaccount_id)
      || (syncFilter === 'not_synced' && !contact.flowaccount_id)
    return matchesSearch && matchesType && matchesSync
  }).sort((a, b) => (b.is_starred ? 1 : 0) - (a.is_starred ? 1 : 0))

  const notSyncedCount = contacts.filter(c => !c.flowaccount_id).length
  const syncedCount = contacts.filter(c => !!c.flowaccount_id).length

  const toggleSelectContact = (id: string) => {
    setSelectedContacts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set())
    } else {
      setSelectedContacts(new Set(filteredContacts.map(c => c.id)))
    }
  }

  const handleBatchSync = async () => {
    const toSync = contacts.filter(c => selectedContacts.has(c.id) && !c.flowaccount_id)
    if (toSync.length === 0) {
      alert('ไม่มีผู้ติดต่อที่ต้อง sync (อาจ sync ไปแล้วทั้งหมด)')
      return
    }
    
    if (!confirm(`ต้องการ sync ${toSync.length} ผู้ติดต่อไปยัง FlowAccount?`)) return
    
    setIsBatchSyncing(true)
    let successCount = 0
    let failCount = 0
    const failedNames: string[] = []
    
    for (let i = 0; i < toSync.length; i++) {
      const contact = toSync[i]
      setSyncingContact(contact.id)
      try {
        const flowContactData = convertContactToFlowAccount(contact)
        const result = await createFlowContact(flowContactData) as any
        const flowId = result?.data?.list?.[0]?.id || result?.id
        const now = new Date().toISOString()
        
        // Try to save to DB (may fail if columns don't exist yet)
        try {
          await supabase
            .from('contacts')
            .update({ flowaccount_id: flowId || null, flowaccount_synced_at: now })
            .eq('id', contact.id)
        } catch (dbErr) {
          console.warn('DB update failed (columns may not exist yet):', dbErr)
        }
        
        setContacts(prev => prev.map(c => 
          c.id === contact.id ? { ...c, flowaccount_id: flowId, flowaccount_synced_at: now } : c
        ))
        successCount++
      } catch (error) {
        console.error(`Sync failed for ${contact.name}:`, error)
        failedNames.push(contact.name)
        failCount++
      }
      
      // Small delay between requests to avoid rate limiting
      if (i < toSync.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    setSyncingContact(null)
    setIsBatchSyncing(false)
    setSelectedContacts(new Set())
    
    let msg = `Sync เสร็จสิ้น: สำเร็จ ${successCount} รายการ`
    if (failCount > 0) msg += `\nล้มเหลว ${failCount} รายการ: ${failedNames.join(', ')}`
    alert(msg)
  }

  // Import contacts from FlowAccount
  const handleFetchFaContacts = async () => {
    setLoadingFaContacts(true)
    setFaContacts([])
    setSelectedFaContacts(new Set())
    try {
      let allContacts: any[] = []
      let page = 1
      while (true) {
        const res = await getFlowContacts(page, 100) as any
        const list = res?.data?.list || res?.list || (Array.isArray(res) ? res : [])
        if (!list || list.length === 0) break
        allContacts = allContacts.concat(list)
        if (list.length < 100) break
        page++
      }
      console.log('FA contacts fetched:', allContacts.length)
      // Sort by ID descending (newest first)
      allContacts.sort((a: any, b: any) => (Number(b.id) || 0) - (Number(a.id) || 0))
      setFaContacts(allContacts)
      if (allContacts.length === 0) {
        alert('ไม่พบผู้ติดต่อใน FlowAccount')
      }
    } catch (err) {
      console.error('Fetch FA contacts error:', err)
      alert('ดึงข้อมูลจาก FlowAccount ล้มเหลว: ' + (err as Error).message)
    } finally {
      setLoadingFaContacts(false)
    }
  }

  const handleImportFaContacts = async () => {
    const toImport = faContacts.filter(c => selectedFaContacts.has(c.id))
    if (toImport.length === 0) {
      alert('กรุณาเลือกผู้ติดต่อที่ต้องการนำเข้า')
      return
    }
    if (!confirm(`ต้องการนำเข้า ${toImport.length} ผู้ติดต่อจาก FlowAccount?`)) return

    setImportingContacts(true)
    let imported = 0, failed = 0

    for (let i = 0; i < toImport.length; i++) {
      const fa = toImport[i]
      setImportProgress(`${i + 1}/${toImport.length} ${fa.contactName || '-'}`)
      try {
        // Map FA contact type: 3=buyer, 5=seller, 7=both
        const faType = String(fa.contactType)
        let localType: 'buyer' | 'seller' | 'both' = 'buyer'
        if (faType === '5') localType = 'seller'
        else if (faType === '7') localType = 'both'

        // Check if already exists by flowaccount_id or name
        const { data: existing } = await supabase
          .from('contacts')
          .select('id')
          .or(`flowaccount_id.eq.${fa.id},name.eq.${fa.contactName}`)
          .limit(1)

        if (existing && existing.length > 0) {
          // Update existing
          await supabase
            .from('contacts')
            .update({
              name: fa.contactName || '-',
              type: localType,
              phone: fa.contactMobile || fa.contactOffice || undefined,
              email: fa.contactEmail || undefined,
              address: fa.contactAddress || undefined,
              shipping_address: fa.contactShippingAddress || undefined,
              postal_code: fa.contactZipCode || undefined,
              tax_id: fa.contactTaxId || undefined,
              branch_code: fa.contactBranchCode || undefined,
              code: fa.contactCode || undefined,
              notes: fa.contactNote || undefined,
              bank_account_number: fa.contactBankAccountNumber || undefined,
              bank_branch_name: fa.contactBankBranch || undefined,
              flowaccount_id: fa.id,
              flowaccount_synced_at: new Date().toISOString()
            })
            .eq('id', existing[0].id)
          imported++
        } else {
          // Insert new
          await supabase
            .from('contacts')
            .insert([{
              name: fa.contactName || '-',
              type: localType,
              person_type: 'company',
              phone: fa.contactMobile || fa.contactOffice || undefined,
              email: fa.contactEmail || undefined,
              address: fa.contactAddress || undefined,
              shipping_address: fa.contactShippingAddress || undefined,
              postal_code: fa.contactZipCode || undefined,
              tax_id: fa.contactTaxId || undefined,
              branch_code: fa.contactBranchCode || undefined,
              code: fa.contactCode || undefined,
              notes: fa.contactNote || undefined,
              bank_account_number: fa.contactBankAccountNumber || undefined,
              bank_branch_name: fa.contactBankBranch || undefined,
              flowaccount_id: fa.id,
              flowaccount_synced_at: new Date().toISOString()
            }])
          imported++
        }
      } catch (err) {
        console.error('Import failed for', fa.contactName, err)
        failed++
      }

      if (i < toImport.length - 1) await new Promise(r => setTimeout(r, 50))
    }

    setImportingContacts(false)
    setImportProgress('')
    alert(`นำเข้าเสร็จสิ้น!\n\n✅ สำเร็จ: ${imported}\n❌ ล้มเหลว: ${failed}`)
    setShowImportModal(false)
    fetchContacts()
  }

  const toggleSelectFaContact = (id: number) => {
    setSelectedFaContacts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredFaContacts = faSearchTerm.trim()
    ? faContacts.filter(c => {
        const term = faSearchTerm.toLowerCase()
        return (
          (c.contactName || '').toLowerCase().includes(term) ||
          (c.contactEmail || '').toLowerCase().includes(term) ||
          (c.contactMobile || '').toLowerCase().includes(term) ||
          (c.contactTaxId || '').toLowerCase().includes(term) ||
          (c.contactCode || '').toLowerCase().includes(term) ||
          String(c.id).includes(term)
        )
      })
    : faContacts

  const toggleSelectAllFa = () => {
    if (selectedFaContacts.size === filteredFaContacts.length) {
      setSelectedFaContacts(new Set())
    } else {
      setSelectedFaContacts(new Set(filteredFaContacts.map(c => c.id)))
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'buyer': return { label: 'ผู้ซื้อ', color: 'bg-[#7D735F]/10 text-[#7D735F]', icon: User }
      case 'seller': return { label: 'ผู้ขาย', color: 'bg-[#B8C9B8]/10 text-[#B8C9B8]', icon: Building2 }
      case 'both': return { label: 'ซื้อ/ขาย', color: 'bg-[#A67B5B]/10 text-[#A67B5B]', icon: ArrowLeftRight }
      default: return { label: type, color: 'bg-gray-100', icon: User }
    }
  }

  const getTypeCount = (type: 'buyer' | 'seller' | 'both') => {
    return contacts.filter(c => c.type === type).length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-7 w-7 text-[#7D735F]" />
            {t('page.contacts.title')}
          </h1>
          <p className="text-gray-600 mt-1">{t('page.contacts.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-help-modal'))}
            className="p-2 text-gray-400 hover:text-[#7D735F] hover:bg-[#F5F0E6] rounded-full transition-all"
            title="คู่มือการใช้งาน"
          >
            <BookOpen className="h-5 w-5" />
          </button>
          <button
            onClick={() => { setShowImportModal(true); handleFetchFaContacts() }}
            className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#2B9CD8] bg-white text-[#2B9CD8] text-sm whitespace-nowrap hover:bg-[#2B9CD8]/10 transition-all shadow-sm"
          >
            <Download className="h-4 w-4" />
            ดึงจาก FA
          </button>
          <button
            onClick={() => { setEditingContact(null); resetForm(); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#A67B5B] bg-white text-[#A67B5B] text-sm whitespace-nowrap hover:bg-[#A67B5B]/10 transition-all shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            เพิ่มผู้ติดต่อ
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-white border-[#B8C9B8] shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="flex items-center gap-2 bg-[#E8EBF0] rounded-full px-4 py-3 border border-transparent focus-within:border-[#7D735F] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#B8C9B8] transition-all">
              <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-base"
                placeholder="ค้นหาชื่อ, เบอร์โทร, อีเมล..."
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: 'ทั้งหมด', count: contacts.length },
              { key: 'buyer', label: 'ผู้ซื้อ', count: getTypeCount('buyer') },
              { key: 'seller', label: 'ผู้ขาย', count: getTypeCount('seller') },
              { key: 'both', label: 'ซื้อ/ขาย', count: getTypeCount('both') }
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setFilterType(filter.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === filter.key
                    ? 'bg-[#7D735F] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
          {/* Sync Filter */}
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs text-gray-500 mr-1">Sync:</span>
            {[
              { key: 'all', label: 'ทั้งหมด', icon: Users },
              { key: 'not_synced', label: `ยังไม่ sync (${notSyncedCount})`, icon: CloudOff },
              { key: 'synced', label: `Synced (${syncedCount})`, icon: CheckCircle2 }
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => { setSyncFilter(f.key as any); setSelectedContacts(new Set()) }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  syncFilter === f.key
                    ? f.key === 'not_synced' ? 'bg-orange-500 text-white' : f.key === 'synced' ? 'bg-green-600 text-white' : 'bg-[#7D735F] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <f.icon className="h-3 w-3" />
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Batch Actions Bar */}
      {filteredContacts.length > 0 && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-1.5">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#7D735F] transition-colors"
            >
              {selectedContacts.size === filteredContacts.length && filteredContacts.length > 0 ? (
                <CheckSquare className="h-4 w-4 text-[#7D735F]" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              {selectedContacts.size > 0 ? `เลือก ${selectedContacts.size}` : 'เลือกทั้งหมด'}
            </button>
            {selectedContacts.size > 0 && (
              <button
                onClick={() => setSelectedContacts(new Set())}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                ยกเลิก
              </button>
            )}
          </div>
          <button
            onClick={handleBatchSync}
            disabled={selectedContacts.size === 0 || isBatchSyncing}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              selectedContacts.size > 0 && !isBatchSyncing
                ? 'bg-[#2B9CD8] text-white hover:bg-[#2488C0]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isBatchSyncing ? (
              <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Sync...</>
            ) : (
              <><Upload className="h-3.5 w-3.5" /> Sync ({selectedContacts.size})</>
            )}
          </button>
        </div>
      )}

      {/* Contacts List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredContacts.map((contact) => {
          const typeInfo = getTypeLabel(contact.type)
          const TypeIcon = typeInfo.icon
          
          return (
            <Card 
              key={contact.id} 
              className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${selectedContacts.has(contact.id) ? 'ring-2 ring-[#2B9CD8] bg-[#2B9CD8]/5' : ''}`}
              onClick={() => openEditModal(contact)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelectContact(contact.id) }}
                    className="flex-shrink-0"
                  >
                    {selectedContacts.has(contact.id) ? (
                      <CheckSquare className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-300 hover:text-gray-500" />
                    )}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleStar(contact) }}
                    className="flex-shrink-0 p-2 rounded-full hover:bg-yellow-50 active:bg-yellow-100 transition-colors"
                    title={contact.is_starred ? 'เลิกติดดาว' : 'ติดดาว'}
                  >
                    <Star className={`h-5 w-5 ${contact.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`} />
                  </button>
                  <div className={`w-10 h-10 rounded-full ${typeInfo.color} flex items-center justify-center`}>
                    <TypeIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                    {contact.company_name && (
                      <p className="text-sm text-gray-500">{contact.company_name}</p>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                  {typeInfo.label}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                {contact.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>{contact.phone}</span>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}
                {contact.address && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{contact.address}</span>
                  </div>
                )}
                {contact.tax_id && (
                  <div className="text-gray-500 text-xs">
                    เลขผู้เสียภาษี: {contact.tax_id}
                  </div>
                )}
              </div>

              {contact.notes && (
                <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-600">
                  {contact.notes}
                </div>
              )}

              {/* Sync Status & Actions */}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {contact.flowaccount_id && (
                    <span className="flex items-center gap-1 text-xs text-green-600" title={contact.flowaccount_synced_at ? `Synced: ${new Date(contact.flowaccount_synced_at).toLocaleString('th-TH')}` : ''}>
                      <CheckCircle2 className="h-3 w-3" />
                      Synced (ID: {contact.flowaccount_id})
                    </span>
                  )}
                  {!contact.flowaccount_id && !syncingContact && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <AlertCircle className="h-3 w-3" />
                      Not synced
                    </span>
                  )}
                  {syncingContact === contact.id && (
                    <span className="flex items-center gap-1 text-xs text-blue-600">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Syncing...
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewDetail(contact)
                    }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="ดูรายละเอียดการซื้อ-ขาย"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSyncToFlowAccount(contact)
                    }}
                    disabled={syncingContact === contact.id}
                    className="p-1.5 text-gray-400 hover:text-[#2B9CD8] hover:bg-[#2B9CD8]/10 rounded transition-colors"
                    title="Sync to FlowAccount"
                  >
                    <RefreshCw className={`h-4 w-4 ${syncingContact === contact.id ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openEditModal(contact)
                    }}
                    className="p-1.5 text-gray-400 hover:text-[#7D735F] hover:bg-[#7D735F]/10 rounded transition-colors"
                    title="Edit"
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {filteredContacts.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">ไม่พบผู้ติดต่อ</p>
          <p className="text-sm text-gray-500">ลองค้นหาด้วยคำอื่น หรือเพิ่มผู้ติดต่อใหม่</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {editingContact ? 'แก้ไขผู้ติดต่อ' : 'เพิ่มผู้ติดต่อ'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Contact Info */}
                <div className="space-y-4">
                  {/* Person Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ประเภทผู้ติดต่อ</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="person_type"
                          checked={formData.person_type === 'individual'}
                          onChange={() => setFormData({ ...formData, person_type: 'individual' })}
                          className="w-4 h-4 text-[#4A90A4]"
                        />
                        <span className="text-sm">บุคคลธรรมดา</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="person_type"
                          checked={formData.person_type === 'company'}
                          onChange={() => setFormData({ ...formData, person_type: 'company' })}
                          className="w-4 h-4 text-[#4A90A4]"
                        />
                        <span className="text-sm">นิติบุคคล</span>
                      </label>
                    </div>
                  </div>

                  {/* Main Type Checkboxes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ประเภท</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.sub_types.includes('buyer')}
                          onChange={(e) => {
                            const types = e.target.checked 
                              ? [...formData.sub_types, 'buyer']
                              : formData.sub_types.filter(t => t !== 'buyer')
                            setFormData({ ...formData, sub_types: types })
                          }}
                          className="w-4 h-4 text-[#4A90A4] rounded"
                        />
                        <span className="text-sm">ลูกค้า</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.sub_types.includes('fuel_payer')}
                          onChange={(e) => {
                            const types = e.target.checked 
                              ? [...formData.sub_types, 'fuel_payer']
                              : formData.sub_types.filter(t => t !== 'fuel_payer')
                            setFormData({ ...formData, sub_types: types })
                          }}
                          className="w-4 h-4 text-[#4A90A4] rounded"
                        />
                        <span className="text-sm">ผู้จำหน่าย</span>
                      </label>
                    </div>
                  </div>

                  {/* Credit Days */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">เครดิต (วัน)</label>
                    <input
                      type="number"
                      value={formData.credit_days}
                      onChange={(e) => setFormData({ ...formData, credit_days: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90A4] focus:border-[#4A90A4]"
                      placeholder="0"
                    />
                  </div>

                  {/* Business Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ที่ตั้งธุรกิจ</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="business_location"
                          checked={formData.business_location === 'thailand'}
                          onChange={() => setFormData({ ...formData, business_location: 'thailand' })}
                          className="w-4 h-4 text-[#4A90A4]"
                        />
                        <span className="text-sm">ไทย</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="business_location"
                          checked={formData.business_location === 'foreign'}
                          onChange={() => setFormData({ ...formData, business_location: 'foreign' })}
                          className="w-4 h-4 text-[#4A90A4]"
                        />
                        <span className="text-sm">ต่างประเทศ</span>
                      </label>
                    </div>
                  </div>

                  {/* Contact Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผู้ติดต่อ</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90A4] focus:border-[#4A90A4]"
                      placeholder="PN00000"
                    />
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90A4] focus:border-[#4A90A4]"
                      placeholder="ชื่อผู้ติดต่อหรือบริษัท"
                    />
                  </div>

                  {/* National ID / Tax ID */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">เลขบัตรประชาชน</label>
                      <input
                        type="text"
                        value={formData.national_id}
                        onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90A4] focus:border-[#4A90A4]"
                        placeholder="1529900603811"
                        maxLength={13}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">เลขผู้เสียภาษี</label>
                      <input
                        type="text"
                        value={formData.tax_id}
                        onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90A4] focus:border-[#4A90A4]"
                        placeholder="เลข 13 หลัก"
                        maxLength={13}
                      />
                    </div>
                  </div>

                  {/* Office Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">สำนักงาน/สาขา</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="office_type"
                          checked={formData.office_type === 'headquarters'}
                          onChange={() => setFormData({ ...formData, office_type: 'headquarters' })}
                          className="w-4 h-4 text-[#4A90A4]"
                        />
                        <span className="text-sm">สำนักงานใหญ่</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="office_type"
                          checked={formData.office_type === 'branch'}
                          onChange={() => setFormData({ ...formData, office_type: 'branch' })}
                          className="w-4 h-4 text-[#4A90A4]"
                        />
                        <span className="text-sm">สาขา</span>
                      </label>
                    </div>
                    {formData.office_type === 'branch' && (
                      <input
                        type="text"
                        value={formData.branch_code}
                        onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })}
                        className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90A4] focus:border-[#4A90A4]"
                        placeholder="รหัสสาขา"
                      />
                    )}
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90A4] focus:border-[#4A90A4]"
                      rows={2}
                      placeholder="ที่อยู่สำหรับจัดส่งหรือติดต่อ"
                    />
                  </div>

                  {/* Postal Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">รหัสไปรษณีย์</label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90A4] focus:border-[#4A90A4]"
                      placeholder="10110"
                      maxLength={5}
                    />
                  </div>

                  {/* Shipping Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ข้อมูลจัดส่ง</label>
                    <textarea
                      value={formData.shipping_address}
                      onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90A4] focus:border-[#4A90A4]"
                      rows={2}
                      placeholder="ที่อยู่สำหรับจัดส่ง (ถ้าไม่เหมือนที่อยู่ปกติ)"
                    />
                  </div>
                </div>

                {/* Right Column - Contact Details & Bank Info */}
                <div className="space-y-4">
                  {/* Contact Details Section */}
                  <div>
                    <h4 className="text-[#4A90A4] font-medium mb-3 text-base">รายละเอียดผู้ติดต่อ</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้ติดต่อ</label>
                        <input
                          type="text"
                          value={formData.company_name}
                          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90A4] focus:border-[#4A90A4]"
                          placeholder="ชื่อผู้ติดต่อ"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90A4] focus:border-[#4A90A4]"
                          placeholder="email@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์มือถือ</label>
                        <input
                          type="tel"
                          value={formData.mobile}
                          onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90A4] focus:border-[#4A90A4]"
                          placeholder="0619942106"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90A4] focus:border-[#4A90A4]"
                          placeholder="02-xxx-xxxx"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bank Information Section */}
                  <div>
                    <h4 className="text-[#4A90A4] font-medium mb-3 text-base flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      ข้อมูลธนาคาร
                    </h4>
                    <div className="space-y-3">
                      {/* Bank Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ธนาคาร</label>
                        <select
                          value={formData.bank_name}
                          onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90A4] focus:border-[#4A90A4]"
                        >
                          <option value="">เลือกธนาคาร</option>
                          <option value="กสิกรไทย">ธนาคารกสิกรไทย</option>
                          <option value="กรุงไทย">ธนาคารกรุงไทย</option>
                          <option value="กรุงเทพ">ธนาคารกรุงเทพ</option>
                          <option value="ไทยพาณิชย์">ธนาคารไทยพาณิชย์</option>
                          <option value="ทหารไทย">ธนาคารทหารไทย</option>
                          <option value="กรุงศรี">ธนาคารกรุงศรีอยุธยา</option>
                          <option value="ยูโอบี">ธนาคารยูโอบี</option>
                          <option value="ออมสิน">ธนาคารออมสิน</option>
                          <option value="ธ.ก.ส.">ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร</option>
                        </select>
                      </div>

                      {/* Account Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อบัญชี</label>
                        <input
                          type="text"
                          value={formData.bank_account_name}
                          onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90A4] focus:border-[#4A90A4]"
                          placeholder="ชื่อบัญชีธนาคาร"
                        />
                      </div>

                      {/* Account Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่บัญชี</label>
                        <input
                          type="text"
                          value={formData.bank_account_number}
                          onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90A4] focus:border-[#4A90A4]"
                          placeholder="0881181258"
                        />
                      </div>

                      {/* Branch Code & Name */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">รหัสสาขา</label>
                          <input
                            type="text"
                            value={formData.bank_branch_code}
                            onChange={(e) => setFormData({ ...formData, bank_branch_code: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90A4] focus:border-[#4A90A4]"
                            placeholder="รหัสสาขา"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อสาขา</label>
                          <input
                            type="text"
                            value={formData.bank_branch_name}
                            onChange={(e) => setFormData({ ...formData, bank_branch_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90A4] focus:border-[#4A90A4]"
                            placeholder="ชื่อสาขา"
                          />
                        </div>
                      </div>

                      {/* Account Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ประเภทบัญชี</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="bank_account_type"
                              checked={formData.bank_account_type === 'savings'}
                              onChange={() => setFormData({ ...formData, bank_account_type: 'savings' })}
                              className="w-4 h-4 text-[#4A90A4]"
                            />
                            <span className="text-sm">ออมทรัพย์</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="bank_account_type"
                              checked={formData.bank_account_type === 'current'}
                              onChange={() => setFormData({ ...formData, bank_account_type: 'current' })}
                              className="w-4 h-4 text-[#4A90A4]"
                            />
                            <span className="text-sm">กระแสรายวัน</span>
                          </label>
                        </div>
                      </div>

                      {/* QR Code Upload */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">คิวอาร์โค้ดรับเงิน</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-[#4A90A4] transition-colors">
                          {formData.bank_qr_code_url ? (
                            <div className="relative">
                              <img 
                                src={formData.bank_qr_code_url} 
                                alt="QR Code" 
                                className="max-h-32 mx-auto"
                              />
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, bank_qr_code_url: '' })}
                                className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer block">
                              <div className="space-y-2">
                                <ImageIcon className="h-8 w-8 mx-auto text-gray-400" />
                                <p className="text-sm text-gray-500">คลิกเพื่ออัปโหลด QR code ที่นี่</p>
                                <p className="text-xs text-gray-400">รองรับไฟล์ JPG, PNG</p>
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    // Upload to Supabase Storage
                                    const fileExt = file.name.split('.').pop()
                                    const fileName = `qr_${Date.now()}.${fileExt}`
                                    const { error } = await supabase.storage
                                      .from('contact-attachments')
                                      .upload(fileName, file)
                                    
                                    if (error) {
                                      alert('อัปโหลดรูปภาพไม่สำเร็จ')
                                      return
                                    }
                                    
                                    const { data: { publicUrl } } = supabase.storage
                                      .from('contact-attachments')
                                      .getPublicUrl(fileName)
                                    
                                    setFormData({ ...formData, bank_qr_code_url: publicUrl })
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90A4] focus:border-[#4A90A4]"
                      rows={2}
                      placeholder="บันทึกเพิ่มเติม"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button type="submit" variant="primary" className="flex-1">
                  {editingContact ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ติดต่อ'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                  ยกเลิก
                </Button>
                {editingContact && (
                  <button
                    type="button"
                    onClick={() => {
                      if (editingContact) {
                        handleDelete(editingContact.id)
                        setShowModal(false)
                      }
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="ลบผู้ติดต่อ"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Import from FlowAccount Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowImportModal(false)}>
          <div className="w-full max-w-2xl max-h-[80vh] flex flex-col bg-white rounded-xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Download className="h-5 w-5 text-blue-600" />
                ดึงผู้ติดต่อจาก FlowAccount
              </h2>
              <button onClick={() => setShowImportModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {loadingFaContacts ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-500 mr-2" />
                  <span className="text-gray-600">กำลังดึงข้อมูลจาก FlowAccount...</span>
                </div>
              ) : faContacts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">ไม่พบผู้ติดต่อใน FlowAccount</div>
              ) : (
                <>
                  <div className="mb-3">
                    <div className="relative mb-2">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={faSearchTerm}
                        onChange={e => setFaSearchTerm(e.target.value)}
                        placeholder="ค้นหาชื่อ, อีเมล, เบอร์โทร, Tax ID..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={toggleSelectAllFa}
                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600"
                      >
                        {selectedFaContacts.size === filteredFaContacts.length && filteredFaContacts.length > 0 ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                        เลือกทั้งหมด ({filteredFaContacts.length})
                      </button>
                      <span className="text-sm text-gray-500">เลือกแล้ว {selectedFaContacts.size} รายการ</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {filteredFaContacts.map((fa) => {
                      const faType = String(fa.contactType)
                      const typeLabel = faType === '5' ? 'ผู้ขาย' : faType === '7' ? 'ซื้อ/ขาย' : 'ผู้ซื้อ'
                      const typeColor = faType === '5' ? 'text-green-600' : faType === '7' ? 'text-orange-600' : 'text-blue-600'
                      return (
                        <div
                          key={fa.id}
                          onClick={() => toggleSelectFaContact(fa.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedFaContacts.has(fa.id) ? 'bg-[#2B9CD8]/10 border border-[#2B9CD8]/30' : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                          }`}
                        >
                          {selectedFaContacts.has(fa.id) ? (
                            <CheckSquare className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">{fa.contactName || '-'}</div>
                            <div className="text-xs text-gray-500 flex gap-3 mt-0.5">
                              {fa.contactMobile && <span>📱 {fa.contactMobile}</span>}
                              {fa.contactEmail && <span>✉ {fa.contactEmail}</span>}
                              {fa.contactTaxId && <span>🏢 {fa.contactTaxId}</span>}
                            </div>
                          </div>
                          <span className={`text-xs font-medium ${typeColor}`}>{typeLabel}</span>
                          <span className="text-xs text-gray-400">FA#{fa.id}</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t flex items-center justify-between">
              {importingContacts ? (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {importProgress || 'กำลังนำเข้า...'}
                </div>
              ) : (
                <span className="text-sm text-gray-500">
                  ผู้ติดต่อใน FA: {faContacts.length} | เลือก: {selectedFaContacts.size}
                </span>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  ปิด
                </button>
                <button
                  onClick={handleImportFaContacts}
                  disabled={selectedFaContacts.size === 0 || importingContacts}
                  className="px-4 py-2 text-sm text-white bg-[#2B9CD8] rounded-lg hover:bg-[#2488C0] disabled:opacity-50"
                >
                  นำเข้า {selectedFaContacts.size > 0 ? `(${selectedFaContacts.size})` : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Detail Modal */}
      {showDetailModal && detailContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-[900px] w-full my-8 max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#7D735F]/10 flex items-center justify-center">
                  {detailContact.person_type === 'company' ? <Building2 className="h-5 w-5 text-[#7D735F]" /> : <User className="h-5 w-5 text-[#7D735F]" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{detailContact.name}</h2>
                  <p className="text-sm text-gray-500">{detailContact.company_name || detailContact.phone || detailContact.email || ''}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 px-4 pt-3 pb-2 border-b">
              <button
                onClick={() => setDetailTab('sales')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  detailTab === 'sales' ? 'bg-green-50 text-green-700 border-green-300' : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                }`}
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                บิลขาย ({detailOrders.length})
              </button>
              <button
                onClick={() => setDetailTab('purchases')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  detailTab === 'purchases' ? 'bg-orange-50 text-orange-700 border-orange-300' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                }`}
              >
                <Package className="h-3.5 w-3.5" />
                บิลซื้อ ({detailPOs.length + detailExpenses.length})
              </button>
              <button
                onClick={() => setDetailTab('quotations')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  detailTab === 'quotations' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                ใบเสนอราคา ({detailQuotations.length})
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">กำลังโหลด...</span>
                </div>
              ) : (
                <>
                  {/* Sales Orders */}
                  {detailTab === 'sales' && (
                    <div>
                      {detailOrders.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <ShoppingCart className="h-8 w-8 mx-auto mb-2" />
                          <p>ยังไม่มีบิลขาย</p>
                        </div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-gray-600">วันที่</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-600">ช่องทาง</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-600">สินค้า</th>
                              <th className="px-3 py-2 text-right font-medium text-gray-600">ยอดรวม</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-600">ชำระ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {detailOrders.map((order: any) => (
                              <tr key={order.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 whitespace-nowrap">{new Date(order.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100">{order.channel || 'POS'}</span>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="max-w-[250px] truncate">
                                    {order.items?.map((item: any) => `${item.product_name} x${item.quantity}`).join(', ') || '-'}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-right font-medium">฿{(order.total_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                <td className="px-3 py-2 whitespace-nowrap">{order.payment_method || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-green-50 font-medium">
                            <tr>
                              <td colSpan={3} className="px-3 py-2 text-right">รวมทั้งหมด</td>
                              <td className="px-3 py-2 text-right text-green-700">฿{detailOrders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      )}
                    </div>
                  )}

                  {/* Purchase Orders + Expenses */}
                  {detailTab === 'purchases' && (
                    <div className="space-y-4">
                      {detailPOs.length === 0 && detailExpenses.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <Package className="h-8 w-8 mx-auto mb-2" />
                          <p>ยังไม่มีบิลซื้อ</p>
                        </div>
                      ) : (
                        <>
                          {/* Purchase Orders Section */}
                          {detailPOs.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <Package className="h-3.5 w-3.5" />
                                ใบสั่งซื้อ ({detailPOs.length})
                              </h4>
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-medium text-gray-600">เลข PO</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-600">วันที่สั่ง</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-600">ซัพพลายเออร์</th>
                                    <th className="px-3 py-2 text-right font-medium text-gray-600">ยอดรวม</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-600">สถานะ</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {detailPOs.map((po: any) => (
                                    <tr key={po.id} className="hover:bg-gray-50">
                                      <td className="px-3 py-2 font-medium text-blue-600">{po.po_number}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">{new Date(po.order_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                                      <td className="px-3 py-2">{po.supplier_name}</td>
                                      <td className="px-3 py-2 text-right font-medium">฿{(po.total_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                      <td className="px-3 py-2">
                                        <span className={`px-1.5 py-0.5 rounded text-xs ${po.status === 'received' ? 'bg-green-100 text-green-700' : po.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                          {po.status || '-'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="bg-orange-50/50 font-medium">
                                  <tr>
                                    <td colSpan={3} className="px-3 py-2 text-right text-sm">รวมใบสั่งซื้อ</td>
                                    <td className="px-3 py-2 text-right text-orange-700">฿{detailPOs.reduce((sum: number, po: any) => sum + (po.total_amount || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                    <td></td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          )}

                          {/* Expenses Section */}
                          {detailExpenses.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5" />
                                ค่าใช้จ่าย ({detailExpenses.length})
                              </h4>
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-medium text-gray-600">รายละเอียด</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-600">วันที่</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-600">หมวดหมู่</th>
                                    <th className="px-3 py-2 text-right font-medium text-gray-600">จำนวนเงิน</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-600">ชำระ</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {detailExpenses.map((exp: any) => (
                                    <tr key={exp.id} className="hover:bg-gray-50">
                                      <td className="px-3 py-2">
                                        <div className="max-w-[200px] truncate">{exp.description || '-'}</div>
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap">{new Date(exp.expense_date || exp.document_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                                      <td className="px-3 py-2">
                                        <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100">{exp.category || '-'}</span>
                                      </td>
                                      <td className="px-3 py-2 text-right font-medium">฿{(exp.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs">{exp.payment_method || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="bg-orange-50/50 font-medium">
                                  <tr>
                                    <td colSpan={3} className="px-3 py-2 text-right text-sm">รวมค่าใช้จ่าย</td>
                                    <td className="px-3 py-2 text-right text-orange-700">฿{detailExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                    <td></td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          )}

                          {/* Combined Total */}
                          {(detailPOs.length > 0 && detailExpenses.length > 0) && (
                            <div className="bg-orange-50 rounded-lg p-3 text-right">
                              <span className="text-sm text-orange-700 font-bold">
                                รวมบิลซื้อทั้งหมด: ฿{(
                                  detailPOs.reduce((sum: number, po: any) => sum + (po.total_amount || 0), 0) +
                                  detailExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
                                ).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Quotations */}
                  {detailTab === 'quotations' && (
                    <div>
                      {detailQuotations.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <FileText className="h-8 w-8 mx-auto mb-2" />
                          <p>ยังไม่มีใบเสนอราคา</p>
                        </div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-gray-600">เลขที่</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-600">วันที่</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-600">ชื่อผู้ติดต่อ</th>
                              <th className="px-3 py-2 text-right font-medium text-gray-600">ยอดรวม</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-600">สถานะ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {detailQuotations.map((q: any) => (
                              <tr key={q.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium text-blue-600">{q.quotation_number}</td>
                                <td className="px-3 py-2 whitespace-nowrap">{new Date(q.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                                <td className="px-3 py-2">{q.contact_name || '-'}</td>
                                <td className="px-3 py-2 text-right font-medium">฿{(q.grand_total || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                <td className="px-3 py-2">
                                  <span className={`px-1.5 py-0.5 rounded text-xs ${q.status === 'accepted' ? 'bg-green-100 text-green-700' : q.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {q.status || 'draft'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-blue-50 font-medium">
                            <tr>
                              <td colSpan={3} className="px-3 py-2 text-right">รวมทั้งหมด</td>
                              <td className="px-3 py-2 text-right text-blue-700">฿{detailQuotations.reduce((sum: number, q: any) => sum + (q.grand_total || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
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
