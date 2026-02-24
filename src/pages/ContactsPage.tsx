import { useState, useEffect } from 'react'
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
  AlertCircle
} from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { supabase } from '../services/supabase'
import { syncContactToFlowAccount, convertContactToFlowAccount } from '../services/flowaccount'

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
  created_at: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'buyer' | 'seller' | 'both'>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [syncingContact, setSyncingContact] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<Record<string, { status: 'synced' | 'pending' | 'failed', lastSync?: string }>>({})
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
          const flowData = convertContactToFlowAccount({ ...contactData, id: editingContact.id, name: contactData.name || editingContact.name })
          await syncContactToFlowAccount(flowData)
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
            const flowData = convertContactToFlowAccount(newContact)
            await syncContactToFlowAccount(flowData)
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
    setSyncStatus(prev => ({ ...prev, [contact.id]: { status: 'pending' } }))
    
    try {
      const flowContactData = convertContactToFlowAccount(contact)
      
      const result = await syncContactToFlowAccount(flowContactData)
      console.log(`FlowAccount sync: ${result.action}`, result.contact)
      
      setSyncStatus(prev => ({ 
        ...prev, 
        [contact.id]: { status: 'synced', lastSync: new Date().toISOString() }
      }))
    } catch (error) {
      console.error('FlowAccount sync error:', error)
      setSyncStatus(prev => ({ 
        ...prev, 
        [contact.id]: { status: 'failed', lastSync: new Date().toISOString() }
      }))
      alert('Sync to FlowAccount failed')
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
    return matchesSearch && matchesType
  })

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
            ผู้ติดต่อ
          </h1>
          <p className="text-gray-600 mt-1">จัดการผู้ซื้อ ผู้ขาย และคู่ค้า</p>
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
        </div>
      </Card>

      {/* Contacts List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredContacts.map((contact) => {
          const typeInfo = getTypeLabel(contact.type)
          const TypeIcon = typeInfo.icon
          
          return (
            <Card 
              key={contact.id} 
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openEditModal(contact)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${typeInfo.color} flex items-center justify-center`}>
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
                  {syncStatus[contact.id]?.status === 'synced' && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Synced
                    </span>
                  )}
                  {syncStatus[contact.id]?.status === 'failed' && (
                    <span className="flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      Failed
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
                      handleSyncToFlowAccount(contact)
                    }}
                    disabled={syncingContact === contact.id}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(contact.id)
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
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
    </div>
  )
}
